import express from "express"
import { createRateLimiter } from "./security.js"
import path from "node:path"
import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"

const app = express()
app.disable("x-powered-by")
app.use((req, res, next) => {
  res.set("X-Content-Type-Options", "nosniff")
  res.set("X-Frame-Options", "DENY")
  res.set("Referrer-Policy", "strict-origin-when-cross-origin")
  res.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()")
  res.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups")
  if (req.secure) res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
  next()
})
// In-memory IP limit protects the upstream metadata and playback APIs from bursts.
// Keep proxy trust disabled unless deployment explicitly configures a trusted proxy.
app.use("/api", createRateLimiter({ windowMs: 60_000, max: 180 }))
app.use(express.json({ limit: "16kb" }))

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.resolve(__dirname, "../dist")

// Load optional local .env values without overriding variables supplied by the host.
try {
  const envText = await readFile(path.resolve(__dirname, "../.env"), "utf8")
  for (const line of envText.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (!match || process.env[match[1]] !== undefined) continue
    let value = match[2]
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    process.env[match[1]] = value
  }
} catch {
  // Production environments may inject variables directly instead.
}

// Apply proxy trust only after optional .env loading; set this only behind one trusted proxy.
if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1)

const PORT = Number(process.env.PORT || 3001)
const ANILIST_URL = "https://graphql.anilist.co"
const KITSU_URL = "https://kitsu.io/api/edge"
const cache = new Map()
const DEFAULT_TTL = 15 * 60 * 1000

function cached(key, loader, ttl = DEFAULT_TTL) {
  const found = cache.get(key)
  if (found && found.expiresAt > Date.now()) return Promise.resolve(found.value)
  return Promise.resolve().then(loader).then((value) => {
    cache.set(key, { value, expiresAt: Date.now() + ttl })
    if (cache.size > 600) {
      const now = Date.now()
      for (const [cacheKey, item] of cache) if (item.expiresAt <= now) cache.delete(cacheKey)
      while (cache.size > 600) cache.delete(cache.keys().next().value)
    }
    return value
  })
}

async function getJson(url) {
  return cached("GET:" + url, async () => {
    const response = await fetch(url, {
      headers: { Accept: "application/vnd.api+json, application/json", "User-Agent": "Aniscroll/1.0" },
      signal: AbortSignal.timeout(12000),
    })
    if (!response.ok) throw new Error("Upstream API returned " + response.status)
    return response.json()
  })
}

async function probeEmbedAvailability(url, referer) {
  return cached("EMBED_AVAILABILITY:" + url, async () => {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
          "User-Agent": "Mozilla/5.0 (compatible; Aniscroll/1.0)",
          Referer: referer,
        },
        redirect: "follow",
        signal: AbortSignal.timeout(8000),
      })
      const body = (await response.text()).slice(0, 160000).toLowerCase()
      const unavailableMarkers = [
        "episode not found", "episode unavailable", "not available in this language",
        "no source found", "no stream found", "stream unavailable",
        "video not found", "invalid episode", "content unavailable",
        "dub not available", "sub not available", "no video found",
        "episode does not exist", "this video is unavailable", "playback error",
        "just a moment", "verify you are human", "cf-chl-", "cloudflare ray id",
      ]
      const explicitFailure = unavailableMarkers.some((marker) => body.includes(marker))
      return { available: response.ok && !explicitFailure, status: response.status, checkedAt: Date.now() }
    } catch (error) {
      return { available: false, status: 0, error: String(error?.message || "Provider request failed"), checkedAt: Date.now() }
    }
  }, 2 * 60 * 1000)
}
async function queryAniList(query, variables = {}) {
  return cached("ANI:" + JSON.stringify({ query, variables }), async () => {
    const response = await fetch(ANILIST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": "Aniscroll/1.0" },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(12000),
    })
    const retryAfterHeader = Number(response.headers.get("retry-after") || 0)
    const resetAt = Number(response.headers.get("x-ratelimit-reset") || 0)
    const retryAfterSeconds = Math.max(0, retryAfterHeader || (resetAt > Date.now() / 1000 ? Math.ceil(resetAt - Date.now() / 1000) : 0))
    if (!response.ok) {
      const error = new Error("AniList returned " + response.status)
      error.statusCode = response.status
      error.retryAfterSeconds = retryAfterSeconds
      throw error
    }
    const payload = await response.json()
    if (payload.errors?.length) {
      const firstError = payload.errors[0]
      const error = new Error(firstError.message || "AniList query failed")
      error.statusCode = Number(firstError.status || 0)
      error.retryAfterSeconds = retryAfterSeconds
      throw error
    }
    return payload.data
  })
}

const MEDIA_FIELDS = `
  id
  idMal
  isAdult
  title { romaji english native }
  description(asHtml: false)
  coverImage { extraLarge large }
  bannerImage
  genres
  tags { name }
  season
  seasonYear
  startDate { year }
  averageScore
  popularity
  trending
  status
  episodes
  nextAiringEpisode { airingAt timeUntilAiring episode }
  format
  studios(isMain: true) { nodes { name } }
`

async function queryAniListMedia({ search = null, perPage = 24, sort = ["POPULARITY_DESC"] } = {}) {
  const query = "query($search: String, $perPage: Int!, $sort: [MediaSort], $isAdult: Boolean!) { Page(page: 1, perPage: $perPage) { media(type: ANIME, search: $search, sort: $sort, isAdult: $isAdult) { " + MEDIA_FIELDS + " } } }"
  // isAdult filters one category at a time, so merge both results by AniList ID.
  const variants = await Promise.all([false, true].map(async (isAdult) => {
    const data = await queryAniList(query, { search, perPage, sort, isAdult })
    return data.Page.media || []
  }))
  const unique = new Map()
  for (const item of variants.flat()) unique.set(Number(item.id), item)
  const results = Array.from(unique.values())
  if (search) {
    const normalize = (value) => String(value || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]/g, "")
    const needle = normalize(search)
    const exactMatch = (item) => [item.title?.english, item.title?.romaji, item.title?.native].some((title) => normalize(title) === needle)
    results.sort((a, b) => Number(exactMatch(b)) - Number(exactMatch(a)))
  }
  return results
}
function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function publicOrigin(req) {
  const configured = String(process.env.PUBLIC_SITE_URL || "").trim().replace(/\/+$/, "")
  return configured || (req.protocol + "://" + req.get("host"))
}

async function sendAnimeSeoIndex(req, res, next, slug, mode, season = 1, episode = 1) {
  try {
    const search = String(slug || "").split("-").filter(Boolean).join(" ")
    const candidates = await queryAniListMedia({ search, perPage: 8, sort: ["SEARCH_MATCH"] })
    const animeSlug = (item) => [item.title?.english, item.title?.romaji, item.title?.native].map(slugify).find(Boolean)
    const anime = candidates.find((item) => [item.title?.english, item.title?.romaji, item.title?.native].some((name) => slugify(name) === slug)) || candidates[0]
    if (!anime) return next()

    const name = anime.title?.english || anime.title?.romaji || anime.title?.native || "Anime"
    const description = String(anime.description || "Explore the story, episodes, and details for " + name + ".").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 280)
    const origin = publicOrigin(req)
    const canonicalPath = mode === "watch"
      ? "/watch/" + slugify(name) + "/season-" + season + "/episode-" + episode
      : "/anime/" + (animeSlug(anime) || slugify(name))
    const canonical = origin + canonicalPath
    const pageTitle = mode === "watch"
      ? "Watch " + name + " Season " + season + " Episode " + episode + " | Aniscroll"
      : name + " Anime — Synopsis, Episodes & Info | Aniscroll"
    const image = anime.bannerImage || anime.coverImage?.extraLarge || anime.coverImage?.large || ""
    const structured = {
      "@context": "https://schema.org",
      "@type": anime.format === "MOVIE" ? "Movie" : "TVSeries",
      name,
      description,
      image: image || undefined,
      datePublished: anime.startDate?.year || anime.seasonYear || undefined,
      genre: anime.genres || undefined,
      url: canonical,
      aggregateRating: anime.averageScore ? {
        "@type": "AggregateRating",
        ratingValue: Number(anime.averageScore) / 10,
        bestRating: 10,
      } : undefined,
    }
    const jsonLd = JSON.stringify(structured).replace(/</g, "\\u003c")
    const seoBlock = [
      "<!-- SEO_DYNAMIC_START -->",
      "<title>" + escapeHtml(pageTitle) + "</title>",
      '<meta name="description" content="' + escapeHtml(description) + '" />',
      '<meta name="robots" content="index,follow" />',
      '<link rel="canonical" href="' + escapeHtml(canonical) + '" />',
      '<meta property="og:type" content="' + (anime.format === "MOVIE" ? "video.movie" : "video.tv_show") + '" />',
      '<meta property="og:title" content="' + escapeHtml(pageTitle) + '" />',
      '<meta property="og:description" content="' + escapeHtml(description) + '" />',
      '<meta property="og:url" content="' + escapeHtml(canonical) + '" />',
      '<meta property="og:image" content="' + escapeHtml(image) + '" />',
      '<meta name="twitter:card" content="summary_large_image" />',
      '<meta name="twitter:title" content="' + escapeHtml(pageTitle) + '" />',
      '<meta name="twitter:description" content="' + escapeHtml(description) + '" />',
      '<script id="anime-structured-data" type="application/ld+json">' + jsonLd + "</script>",
      "<!-- SEO_DYNAMIC_END -->",
    ].join("\n")
    const html = await readFile(path.join(DIST, "index.html"), "utf8")
    const marker = /<!-- SEO_DYNAMIC_START -->[\s\S]*?<!-- SEO_DYNAMIC_END -->/
    if (!marker.test(html)) return next()
    res.set("Cache-Control", "public, max-age=300")
    return res.type("html").send(html.replace(marker, seoBlock))
  } catch {
    return next()
  }
}

app.get("/robots.txt", (req, res) => {
  const origin = publicOrigin(req)
  res.type("text/plain").send([
    "User-agent: *",
    "Allow: /",
    "Sitemap: " + origin + "/sitemap.xml",
    "",
  ].join("\n"))
})

app.get("/sitemap.xml", async (req, res) => {
  const origin = publicOrigin(req)
  const paths = new Set(["/", "/discover", "/anime", "/movies"])
  try {
    const items = await queryAniListMedia({ perPage: 50, sort: ["TRENDING_DESC", "POPULARITY_DESC"] })
    for (const item of items) {
      const title = item.title?.english || item.title?.romaji || item.title?.native
      if (title) paths.add("/anime/" + slugify(title))
    }
  } catch {
    // Keep a usable sitemap containing the main public browse routes.
  }
  const urls = Array.from(paths).map((route) => "<url><loc>" + escapeHtml(origin + route) + "</loc></url>")
  res.set("Cache-Control", "public, max-age=900")
  res.type("application/xml").send('<?xml version="1.0" encoding="UTF-8"?>' + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + urls.join("") + "</urlset>")
})

app.get("/anime/:slug", (req, res, next) => {
  void sendAnimeSeoIndex(req, res, next, req.params.slug, "detail")
})

app.get("/watch/:slug/season-:season/episode-:episode", (req, res, next) => {
  const season = Number(req.params.season)
  const episode = Number(req.params.episode)
  if (!Number.isSafeInteger(season) || season < 1 || !Number.isSafeInteger(episode) || episode < 1) return res.status(400).send("Invalid anime episode route")
  void sendAnimeSeoIndex(req, res, next, req.params.slug, "watch", season, episode)
})

app.get("/api/health", (_req, res) => {
  res.set("Cache-Control", "no-store")
  res.json({
    ok: true,
    service: "aniscroll-api",
    version: "anime-directory-v2+playback-availability-v6+api-hardening",
    animeDirectoryEndpoint: "/api/catalog/anime",
    playbackAvailabilityRoute: true,
  })
})

app.get("/api/anilist/schedule", async (req, res) => {
  const now = Math.floor(Date.now() / 1000)
  const from = Number(req.query.from ?? now)
  const to = Number(req.query.to ?? (now + 7 * 24 * 60 * 60))
  if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || from < 0 || to <= from || to - from > 15 * 24 * 60 * 60) {
    return res.status(400).json({ error: "Provide a valid schedule range of up to 15 days." })
  }
  try {
    const query = "query($from: Int!, $to: Int!, $page: Int!) { Page(page: $page, perPage: 50) { pageInfo { hasNextPage } airingSchedules(airingAt_greater: $from, airingAt_lesser: $to, sort: [TIME]) { id airingAt timeUntilAiring episode media { " + MEDIA_FIELDS + " } } } }"
    const releases = []
    for (let page = 1; page <= 5; page += 1) {
      const data = await queryAniList(query, { from, to, page })
      releases.push(...(data.Page.airingSchedules || []))
      if (!data.Page.pageInfo?.hasNextPage) break
    }
    const unique = new Map()
    for (const release of releases) if (release.media) unique.set(Number(release.id), release)
    const results = Array.from(unique.values()).sort((a, b) => a.airingAt - b.airingAt)
    res.set("Cache-Control", "public, max-age=300")
    res.json({ results })
  } catch {
    res.status(502).json({ error: "AniList airing schedule is temporarily unavailable" })
  }
})
app.get("/api/anilist/movies", async (req, res) => {
  const page = Number(req.query.page ?? 1)
  const search = String(req.query.q ?? "").trim() || null
  if (!Number.isSafeInteger(page) || page < 1 || page > 1000) {
    return res.status(400).json({ error: "Page must be between 1 and 1000." })
  }
  try {
    const sort = search ? ["SEARCH_MATCH"] : ["POPULARITY_DESC", "SCORE_DESC"]
    const fullQuery = "query($page: Int!, $perPage: Int!, $search: String, $sort: [MediaSort], $isAdult: Boolean!) { Page(page: $page, perPage: $perPage) { pageInfo { currentPage hasNextPage total } media(type: ANIME, format: MOVIE, search: $search, sort: $sort, isAdult: $isAdult) { " + MEDIA_FIELDS + " } } }"
    const fallbackQuery = "query($page: Int!, $perPage: Int!, $search: String, $sort: [MediaSort], $isAdult: Boolean!) { Page(page: $page, perPage: $perPage) { pageInfo { currentPage hasNextPage total } media(type: ANIME, format: MOVIE, search: $search, sort: $sort, isAdult: $isAdult) { id idMal isAdult title { romaji english native } description(asHtml: false) coverImage { extraLarge large } bannerImage genres tags { name } season seasonYear startDate { year } averageScore popularity status episodes format } } }"
    const groups = []
    const errors = []
    let retryAfterSeconds = 0
    // Query sequentially: AniList is currently applying burst and request-rate limits.
    for (const isAdult of [false, true]) {
      const variables = { page, perPage: 30, search, sort, isAdult }
      try {
        const data = await queryAniList(fullQuery, variables)
        groups.push({ results: data.Page.media || [], pageInfo: data.Page.pageInfo || {} })
      } catch (fullError) {
        const fullStatus = Number(fullError?.statusCode || 0)
        if (fullStatus === 429 || fullStatus === 403) {
          errors.push(fullError)
          retryAfterSeconds = Number(fullError?.retryAfterSeconds || 0)
          console.error("AniList movie query stopped for isAdult=" + isAdult + ":", fullError?.message)
          break
        }
        try {
          const data = await queryAniList(fallbackQuery, variables)
          groups.push({ results: data.Page.media || [], pageInfo: data.Page.pageInfo || {} })
        } catch (fallbackError) {
          errors.push(fallbackError)
          const fallbackStatus = Number(fallbackError?.statusCode || 0)
          retryAfterSeconds = Number(fallbackError?.retryAfterSeconds || retryAfterSeconds)
          console.error("AniList movie query failed for isAdult=" + isAdult + ":", fallbackError?.message || fullError?.message)
          if (fallbackStatus === 429 || fallbackStatus === 403) break
        }
      }
    }
    if (!groups.length) {
      const rateLimited = errors.some((error) => Number(error?.statusCode) === 429)
      if (rateLimited) {
        const retrySeconds = retryAfterSeconds || 60
        res.set("Retry-After", String(retrySeconds))
        return res.status(503).json({ error: "AniList is rate-limiting requests. Please wait " + retrySeconds + " seconds, then try again.", retryAfterSeconds: retrySeconds })
      }
      if (errors.some((error) => Number(error?.statusCode) === 403)) {
        return res.status(503).json({ error: "AniList is temporarily unavailable. Please try again later." })
      }
      return res.status(502).json({ error: "AniList movie catalog is temporarily unavailable. Please retry shortly." })
    }
    const unique = new Map()
    for (const group of groups) for (const item of group.results) unique.set(Number(item.id), item)
    let results = Array.from(unique.values())
    if (search) {
      const normalize = (value) => String(value || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]/g, "")
      const needle = normalize(search)
      results.sort((a, b) => {
        const exactA = [a.title?.english, a.title?.romaji, a.title?.native].some((title) => normalize(title) === needle)
        const exactB = [b.title?.english, b.title?.romaji, b.title?.native].some((title) => normalize(title) === needle)
        return Number(exactB) - Number(exactA)
      })
    } else {
      results.sort((a, b) => Number(b.popularity || 0) - Number(a.popularity || 0))
    }
    res.set("Cache-Control", "public, max-age=300")
    res.json({ results: results.slice(0, 30), pageInfo: { currentPage: page, perPage: 30, hasNextPage: groups.some((group) => group.pageInfo.hasNextPage), total: groups.reduce((sum, group) => sum + Number(group.pageInfo.total || 0), 0) }, partial: groups.length < 2 })
  } catch (error) {
    console.error("AniList movie endpoint failed:", error?.message || error)
    res.status(502).json({ error: "AniList movie catalog is temporarily unavailable. Please retry shortly." })
  }
})
app.get("/api/anilist/genre-banners", async (_req, res) => {
  const genreFilters = [
    { name: "Action", field: "genre_in", value: "Action" },
    { name: "Adventure", field: "genre_in", value: "Adventure" },
    { name: "Fantasy", field: "genre_in", value: "Fantasy" },
    { name: "Romance", field: "genre_in", value: "Romance" },
    { name: "Comedy", field: "genre_in", value: "Comedy" },
    { name: "Sci-Fi", field: "genre_in", value: "Sci-Fi" },
    { name: "Mystery", field: "genre_in", value: "Mystery" },
    { name: "Horror", field: "genre_in", value: "Horror" },
    { name: "Isekai", field: "tag_in", value: "Isekai" },
    { name: "Supernatural", field: "genre_in", value: "Supernatural" },
  ]
  try {
    const results = await cached("ANILIST_KITSU_GENRE_BANNERS_V2_UNIQUE", async () => {
      const selections = genreFilters.map((filter, index) => {
        const alias = "genre" + index
        return alias + ': Page(page: 1, perPage: 20) { media(type: ANIME, ' + filter.field + ': [' + JSON.stringify(filter.value) + '], sort: [TRENDING_DESC, POPULARITY_DESC], isAdult: false) { ' + MEDIA_FIELDS + ' } }'
      })
      const payload = await queryAniList("query { " + selections.join(" ") + " }")
      const usedAnimeIds = new Set()
      const items = []
      const normalizeTitle = (value) => String(value || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]/g, "")

      // Process categories in display order and reserve every selected AniList ID.
      // A title already used by an earlier category is never reused.
      for (let index = 0; index < genreFilters.length; index += 1) {
        const filter = genreFilters[index]
        const candidates = (payload["genre" + index]?.media || [])
          .filter((candidate) => Number(candidate.id) > 0 && !usedAnimeIds.has(Number(candidate.id)))

        if (!candidates.length) {
          items.push({ genre: filter.name, title: null, anilistId: null, banner: null, image: null, imageSource: null })
          continue
        }

        const fallbackAnime = candidates[0]
        let anime = null
        let kitsuBanner = null

        // Prefer a distinct candidate with a matching Kitsu cover banner.
        for (const candidate of candidates.slice(0, 5)) {
          try {
            const record = await cached("KITSU_GENRE_BANNER:" + candidate.id, async () => findKitsuAnime(Number(candidate.id)), 12 * 60 * 60 * 1000)
            const attributes = record?.attributes || {}
            const cover = attributes.coverImage || {}
            const titleNames = [candidate.title?.english, candidate.title?.romaji, candidate.title?.native].filter(Boolean)
            const kitsuNames = [attributes.canonicalTitle, attributes.titles?.en, attributes.titles?.en_jp, attributes.titles?.ja_jp].filter(Boolean)
            const titleMatches = titleNames.some((title) => kitsuNames.some((kitsuTitle) => normalizeTitle(title) === normalizeTitle(kitsuTitle)))
            const banner = titleMatches ? cover.original || cover.large || cover.small || null : null
            if (banner) {
              anime = candidate
              kitsuBanner = banner
              break
            }
          } catch (error) {
            console.warn("Kitsu genre banner lookup failed for AniList ID " + candidate.id + ":", error?.message || error)
          }
        }

        // If none of the first distinct candidates has Kitsu cover art, keep the best
        // remaining AniList match and use its AniList banner/cover fallback.
        if (!anime) anime = fallbackAnime
        usedAnimeIds.add(Number(anime.id))

        const fallback = anime.bannerImage || anime.coverImage?.extraLarge || anime.coverImage?.large || null
        items.push({
          genre: filter.name,
          title: anime.title?.english || anime.title?.romaji || anime.title?.native || "Anime",
          anilistId: Number(anime.id),
          banner: kitsuBanner || fallback,
          image: kitsuBanner || fallback,
          imageSource: kitsuBanner ? "Kitsu" : fallback ? "AniList fallback" : null,
        })
      }
      return items
    }, 12 * 60 * 60 * 1000)
    res.set("Cache-Control", "public, max-age=3600")
    res.json({ results, source: "AniList genres + Kitsu cover images" })
  } catch (error) {
    console.error("Genre banner feed failed:", error?.message || error)
    res.status(502).json({ error: "Unable to load anime genre banners." })
  }
})
app.get("/api/anilist/trending", async (_req, res) => {
  try {
    const results = await queryAniListMedia({ perPage: 24, sort: ["TRENDING_DESC"] })
    results.sort((a, b) =>
      Number(b.trending || 0) - Number(a.trending || 0) ||
      Number(b.popularity || 0) - Number(a.popularity || 0)
    )
    res.set("Cache-Control", "public, max-age=300")
    res.json({ results, source: "AniList", sort: "TRENDING_DESC" })
  } catch (error) {
    console.error("AniList trending feed failed:", error?.message || error)
    res.status(502).json({ error: "AniList trending anime is temporarily unavailable" })
  }
})

app.get("/api/catalog/anime", async (req, res) => {
  const page = Number(req.query.page ?? 1)
  const perPage = 30
  const search = String(req.query.q || "").trim().slice(0, 100) || null
  const genre = String(req.query.genre || "").trim().slice(0, 60) || null
  const yearValue = req.query.year === "All years" ? null : Number(req.query.year)
  const seasonInput = String(req.query.season || "").trim().toUpperCase()
  const season = ["WINTER", "SPRING", "SUMMER", "FALL"].includes(seasonInput) ? seasonInput : null
  const sortMap = {
    "Popularity": "POPULARITY_DESC",
    "Highest rated": "SCORE_DESC",
    "Latest": "START_DATE_DESC",
    "Alphabetical": "TITLE_ENGLISH",
  }
  const sort = sortMap[String(req.query.sort || "Popularity")] || "POPULARITY_DESC"
  if (!Number.isSafeInteger(page) || page < 1 || page > 1000) {
    return res.status(400).json({ error: "Page must be between 1 and 1000." })
  }
  if (req.query.year && req.query.year !== "All years" && (!Number.isSafeInteger(yearValue) || yearValue < 1910 || yearValue > 2100)) {
    return res.status(400).json({ error: "Provide a valid anime release year." })
  }
  try {
    const cacheKey = "ANILIST_CATALOG_ANIME_PAGE_30_V2:" + JSON.stringify({ page, search, genre, yearValue, season, sort })
    const result = await cached(cacheKey, async () => {
      const variables = {
        page,
        perPage,
        search,
        genres: genre && !new Set(["Isekai", "Reincarnation", "Time Travel", "Martial Arts", "Demons", "Magic", "Vampire", "Historical", "Military", "School", "Seinen", "Shoujo", "Award Winning"]).has(genre) ? [genre] : null,
        tags: genre && new Set(["Isekai", "Reincarnation", "Time Travel", "Martial Arts", "Demons", "Magic", "Vampire", "Historical", "Military", "School", "Seinen", "Shoujo", "Award Winning"]).has(genre) ? [genre] : null,
        season,
        seasonYear: Number.isSafeInteger(yearValue) ? yearValue : null,
        sort: [sort],
      }
      const query = `query($page: Int!, $perPage: Int!, $search: String, $genres: [String], $tags: [String], $season: MediaSeason, $seasonYear: Int, $sort: [MediaSort]) {
        Page(page: $page, perPage: $perPage) {
          pageInfo { currentPage hasNextPage total perPage }
          media(type: ANIME, search: $search, genre_in: $genres, tag_in: $tags, season: $season, seasonYear: $seasonYear, sort: $sort, isAdult: false) {
            ${MEDIA_FIELDS}
          }
        }
      }`
      try {
        const data = await queryAniList(query, variables)
        return {
          results: data.Page.media || [],
          pageInfo: data.Page.pageInfo || { currentPage: page, hasNextPage: false, total: 0, perPage },
        }
      } catch (primaryError) {
        // AniList occasionally rejects fields during schema changes. Retry once with a
        // smaller, stable field selection, but do not hammer the API when rate-limited.
        if ([429, 403].includes(Number(primaryError?.statusCode))) throw primaryError
        const fallbackFields = `
          id
          idMal
          isAdult
          title { romaji english native }
          description(asHtml: false)
          coverImage { extraLarge large }
          bannerImage
          genres
          tags { name }
          season
          seasonYear
          startDate { year }
          averageScore
          popularity
          status
          episodes
          format
        `
        const fallbackQuery = `query($page: Int!, $perPage: Int!, $search: String, $genres: [String], $tags: [String], $season: MediaSeason, $seasonYear: Int, $sort: [MediaSort]) {
          Page(page: $page, perPage: $perPage) {
            pageInfo { currentPage hasNextPage total perPage }
            media(type: ANIME, search: $search, genre_in: $genres, tag_in: $tags, season: $season, seasonYear: $seasonYear, sort: $sort, isAdult: false) {
              ${fallbackFields}
            }
          }
        }`
        const data = await queryAniList(fallbackQuery, variables)
        return {
          results: data.Page.media || [],
          pageInfo: data.Page.pageInfo || { currentPage: page, hasNextPage: false, total: 0, perPage },
        }
      }
    }, 90 * 1000)
    res.set("Cache-Control", "private, max-age=60")
    res.json({ ...result, page, perPage, source: "AniList", filters: { search, genre, year: yearValue, season, sort } })
  } catch (error) {
    const upstreamStatus = Number(error?.statusCode || 0)
    const retryAfterSeconds = Math.max(0, Number(error?.retryAfterSeconds || 0))
    console.error("AniList anime page request failed:", {
      message: error?.message || String(error),
      statusCode: upstreamStatus || null,
      retryAfterSeconds: retryAfterSeconds || null,
    })
    if (upstreamStatus === 429) {
      const retrySeconds = retryAfterSeconds || 60
      res.set("Retry-After", String(retrySeconds))
      return res.status(503).json({ error: `AniList is temporarily rate-limiting requests. Try again in about ${retrySeconds} seconds.`, retryAfterSeconds: retrySeconds })
    }
    if (upstreamStatus === 403) {
      return res.status(503).json({ error: "AniList temporarily refused the request. Please try again shortly." })
    }
    if (upstreamStatus === 400) {
      return res.status(502).json({ error: "AniList rejected the catalog query. The API schema or filters may have changed." })
    }
    res.set("Retry-After", "15")
    res.status(502).json({ error: "AniList catalog is temporarily unavailable. Please retry in a few seconds." })
  }
})

app.get("/api/anilist/search", async (req, res) => {
  const search = String(req.query.q || "").trim().slice(0, 100)
  if (search.length < 2) return res.status(400).json({ error: "Search needs at least two characters" })
  try {
    const results = await queryAniListMedia({ search, perPage: 24, sort: ["SEARCH_MATCH"] })
    res.json({ results })
  } catch {
    res.status(502).json({ error: "AniList search failed" })
  }
})

app.get("/api/anilist/resolve", async (req, res) => {
  const title = String(req.query.title || "").trim().slice(0, 120)
  if (!title) return res.status(400).json({ error: "A title is required" })
  try {
    const candidates = await queryAniListMedia({ search: title, perPage: 8, sort: ["SEARCH_MATCH"] })
    const normalize = (value) => String(value || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]/g, "")
    const exact = candidates.find((item) => [item.title?.english, item.title?.romaji, item.title?.native].some((name) => normalize(name) === normalize(title)))
    const anime = exact || candidates[0]
    if (!anime) return res.status(404).json({ error: "Anime was not found on AniList" })
    res.json({ anime })
  } catch {
    res.status(502).json({ error: "Unable to resolve anime on AniList" })
  }
})

app.get("/api/anilist/:id/details", async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid AniList ID" })
  try {
    const query = `query($id: Int!) {
      Media(id: $id, type: ANIME) {
        id
        title { romaji english native }
        description(asHtml: false)
        format
        status
        source
        season
        seasonYear
        startDate { year month day }
        episodes
        duration
        averageScore
        meanScore
        popularity
        favourites
        genres
        tags { name rank isMediaSpoiler isGeneralSpoiler }
        studios(isMain: true) { nodes { id name siteUrl } }
        characters(page: 1, perPage: 25, sort: [ROLE]) {
          edges {
            role
            voiceActors(language: JAPANESE) {
              id
              name { full }
              image { large }
              siteUrl
            }
            node {
              id
              name { full native }
              image { large }
              description(asHtml: false)
              gender
              age
              siteUrl
            }
          }
        }
        relations {
          edges {
            relationType
            node {
              id
              type
              title { romaji english native }
              coverImage { extraLarge large }
              bannerImage
              format
              status
              seasonYear
              averageScore
              genres
            }
          }
        }
        recommendations(page: 1, perPage: 12, sort: [RATING_DESC]) {
          nodes {
            rating
            mediaRecommendation {
              id
              type
              title { romaji english native }
              coverImage { extraLarge large }
              bannerImage
              format
              status
              seasonYear
              averageScore
              genres
            }
          }
        }
      }
    }`
    const data = await queryAniList(query, { id })
    if (!data.Media) return res.status(404).json({ error: "Anime was not found on AniList" })
    res.set("Cache-Control", "public, max-age=900")
    res.json({ details: data.Media })
  } catch (error) {
    console.error("AniList detail enrichment failed:", error?.message || error)
    res.status(502).json({ error: "Unable to load AniList characters and related media" })
  }
})
app.get("/api/anilist/:id", async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid AniList ID" })
  try {
    const query = `query($id: Int!) { Media(id: $id, type: ANIME) { ${MEDIA_FIELDS} } }`
    const data = await queryAniList(query, { id })
    if (!data.Media) return res.status(404).json({ error: "Anime was not found on AniList" })
    res.json({ anime: data.Media })
  } catch {
    res.status(502).json({ error: "Unable to load AniList metadata" })
  }
})

async function findKitsuAnime(anilistId) {
  const mappingUrl = new URL(KITSU_URL + "/mappings")
  mappingUrl.searchParams.set("filter[externalSite]", "anilist/anime")
  mappingUrl.searchParams.set("filter[externalId]", String(anilistId))
  mappingUrl.searchParams.set("include", "item")
  const mappingPayload = await getJson(mappingUrl.toString())
  const mapping = mappingPayload.data?.[0]
  const itemRef = mapping?.relationships?.item?.data
  if (itemRef?.type === "anime" && itemRef.id) {
    const included = mappingPayload.included?.find((item) => item.type === "anime" && String(item.id) === String(itemRef.id))
    if (included) return included
    const direct = await getJson(KITSU_URL + "/anime/" + encodeURIComponent(itemRef.id))
    if (direct.data?.type === "anime") return direct.data
  }
  const titleQuery = `query($id: Int!) { Media(id: $id, type: ANIME) { title { english romaji native } } }`
  const aniData = await queryAniList(titleQuery, { id: anilistId })
  const title = aniData.Media?.title?.english || aniData.Media?.title?.romaji || aniData.Media?.title?.native
  if (!title) return null
  const searchUrl = new URL(KITSU_URL + "/anime")
  searchUrl.searchParams.set("filter[text]", title)
  searchUrl.searchParams.set("page[limit]", "8")
  searchUrl.searchParams.set("sort", "-userCount")
  const search = await getJson(searchUrl.toString())
  const normalize = (value) => String(value || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]/g, "")
  return (search.data || []).find((item) => {
    const a = item.attributes || {}
    return [a.canonicalTitle, a.titles?.en, a.titles?.en_jp, a.titles?.ja_jp].some((name) => normalize(name) === normalize(title))
  }) || search.data?.[0] || null
}

function normalizeKitsuAnime(record) {
  if (!record) return null
  const a = record.attributes || {}
  const cover = a.coverImage || {}
  const poster = a.posterImage || {}
  return {
    id: Number(record.id),
    title: a.canonicalTitle || a.titles?.en || a.titles?.en_jp || "Untitled anime",
    banner: cover.original || cover.large || cover.small || null,
    poster: poster.original || poster.large || poster.medium || cover.large || null,
    synopsis: a.synopsis || "",
    startDate: a.startDate || null,
    status: a.status || null,
    ageRating: a.ageRating || null,
  }
}

function normalizeKitsuEpisode(record, fallbackImage) {
  const a = record.attributes || {}
  const thumbnail = a.thumbnail
  return {
    id: String(record.id),
    number: a.number ?? a.relativeNumber ?? 0,
    title: a.canonicalTitle || a.titles?.en || a.titles?.en_jp || ("Episode " + (a.number ?? "")),
    synopsis: a.synopsis || "",
    thumbnail: thumbnail?.original || thumbnail?.large || thumbnail?.url || (typeof thumbnail === "string" ? thumbnail : null) || fallbackImage || null,
    airdate: a.airdate || null,
    length: a.length || null,
  }
}

app.get("/api/kitsu/:anilistId", async (req, res) => {
  const anilistId = Number(req.params.anilistId)
  if (!Number.isSafeInteger(anilistId) || anilistId <= 0) return res.status(400).json({ error: "Invalid AniList ID" })
  try {
    const result = await cached("KITSU_FOR_ANILIST:" + anilistId, async () => {
      const record = await findKitsuAnime(anilistId)
      const anime = normalizeKitsuAnime(record)
      if (!record || !anime) return { anime: null, episodes: [] }
      const episodesUrl = new URL(KITSU_URL + "/episodes")
      episodesUrl.searchParams.set("filter[mediaType]", "Anime")
      episodesUrl.searchParams.set("filter[mediaId]", String(record.id))
      episodesUrl.searchParams.set("page[limit]", "20")
      episodesUrl.searchParams.set("page[offset]", "0")
      episodesUrl.searchParams.set("sort", "number")
      try {
        // Kitsu paginates episode lists; follow its next links so long-running anime
        // aren't silently truncated to the first 20 episodes.
        const allEpisodes = []
        let nextUrl = episodesUrl.toString()
        const seenUrls = new Set()
        while (nextUrl && allEpisodes.length < 2000 && !seenUrls.has(nextUrl)) {
          seenUrls.add(nextUrl)
          const payload = await getJson(nextUrl)
          if (!Array.isArray(payload.data)) break
          allEpisodes.push(...payload.data)
          const next = payload.links?.next
          if (!next || !payload.data.length) break
          nextUrl = new URL(next, KITSU_URL + "/").toString()
        }
        const uniqueEpisodes = [...new Map(allEpisodes.map((ep) => [String(ep.id), ep])).values()]
        uniqueEpisodes.sort((a, b) => {
          const an = Number(a.attributes?.number ?? a.attributes?.relativeNumber ?? 0)
          const bn = Number(b.attributes?.number ?? b.attributes?.relativeNumber ?? 0)
          return an - bn
        })
        return { anime, episodes: uniqueEpisodes.map((ep) => normalizeKitsuEpisode(ep, anime.poster || anime.banner)) }
      } catch { return { anime, episodes: [] } }
    }, 30 * 60 * 1000)
    res.json(result)
  } catch {
    res.json({ anime: null, episodes: [], warning: "Kitsu metadata is temporarily unavailable" })
  }
})

async function getAniweebEpisodeLanguages(anilistId, episode) {
  const payload = await cached("ANIWEEB_EPISODES:" + anilistId, async () => {
    const response = await fetch("https://api.aniweeb.net/episodes/" + anilistId, {
      headers: { Accept: "application/json", "User-Agent": "Aniscroll/1.0" },
      signal: AbortSignal.timeout(12000),
    })
    if (!response.ok) throw new Error("Aniweeb episodes API returned " + response.status)
    return response.json()
  }, 5 * 60 * 1000)
  const episodes = Array.isArray(payload?.episodes)
    ? payload.episodes
    : Array.isArray(payload?.data?.episodes)
      ? payload.data.episodes
      : Array.isArray(payload?.results?.episodes) ? payload.results.episodes : []
  const match = episodes.find((item) => Number(item?.number) === Number(episode))
  if (!match) throw new Error("Aniweeb returned no availability record for episode " + episode)
  if (typeof match.sub !== "boolean" || typeof match.dub !== "boolean") {
    throw new Error("Aniweeb episode response does not contain explicit sub and dub availability flags")
  }
  return { sub: match.sub, dub: match.dub, source: "aniweeb", episode: Number(match.number) }
}
app.get("/api/playback/availability/:anilistId/:episode", async (req, res) => {
  const anilistId = Number(req.params.anilistId)
  const episode = Number(req.params.episode)
  if (!Number.isSafeInteger(anilistId) || anilistId <= 0 || !Number.isSafeInteger(episode) || episode <= 0 || episode > 2000) {
    return res.status(400).json({ error: "A valid AniList ID and episode number are required." })
  }
  try {
    // Language availability is episode-specific. Do not HTTP-probe embed pages server-side:
    // providers may block backend requests even when their browser iframe works.
    const result = await cached("PLAYBACK_LANGUAGES_V5:" + anilistId + ":" + episode, async () => {
      const languageAvailability = await getAniweebEpisodeLanguages(anilistId, episode)
      const providers = {
        "HD-1": { sub: [], dub: [] },
        "HD-2": { sub: [], dub: [] },
        "HD-3": { sub: [], dub: [] },
      }
      for (const language of ["sub", "dub"]) {
        if (!languageAvailability[language]) continue
        // HD-1 (AniPlayer) and HD-2 (AniEmbed) use one embed per confirmed language.
        providers["HD-1"][language].push("HD-1")
        providers["HD-2"][language].push("HD-2")
        // Mikaza exposes three browser embed routes; keep them as selectable fallbacks.
        providers["HD-3"][language].push("haiku", "kira", "naoka")
      }
      const available = {
        sub: languageAvailability.sub ? ["HD-1", "HD-2", "HD-3"] : [],
        dub: languageAvailability.dub ? ["HD-1", "HD-2", "HD-3"] : [],
      }
      return {
        anilistId, episode, available, providers, languageAvailability,
        checkedAt: new Date().toISOString(),
        method: "aniweeb-episode-flags",
      }
    }, 5 * 60 * 1000)
    res.set("Cache-Control", "private, max-age=30")
    res.json(result)
  } catch (error) {
    console.error("Playback availability check failed:", error?.message || error)
    res.status(502).json({ error: "Could not verify SUB/DUB availability for this episode. Unverified audio options are hidden." })
  }
})
app.get(["/profile", "/watchlist", "/admin", "/sign-in"], async (req, res, next) => {
  try {
    const html = await readFile(path.join(DIST, "index.html"), "utf8")
    const origin = publicOrigin(req)
    const pageName = req.path === "/sign-in" ? "Sign in" : req.path.slice(1)
    const title = pageName.charAt(0).toUpperCase() + pageName.slice(1) + " | Aniscroll"
    const seoBlock = [
      "<!-- SEO_DYNAMIC_START -->",
      "<title>" + escapeHtml(title) + "</title>",
      '<meta name="description" content="Aniscroll account and personal library page." />',
      '<meta name="robots" content="noindex,follow" />',
      '<link rel="canonical" href="' + escapeHtml(origin + req.path) + '" />',
      '<meta property="og:type" content="website" />',
      '<meta property="og:title" content="' + escapeHtml(title) + '" />',
      '<meta property="og:description" content="Aniscroll account and personal library page." />',
      '<meta property="og:url" content="' + escapeHtml(origin + req.path) + '" />',
      '<meta name="twitter:card" content="summary" />',
      "<!-- SEO_DYNAMIC_END -->",
    ].join("\n")
    const marker = /<!-- SEO_DYNAMIC_START -->[\s\S]*?<!-- SEO_DYNAMIC_END -->/
    if (!marker.test(html)) return next()
    return res.type("html").send(html.replace(marker, seoBlock))
  } catch {
    return next()
  }
})

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "API endpoint not found" })
})

app.use(express.static(DIST))
app.use((req, res, next) => {
  if (req.method !== "GET" || req.path.startsWith("/api/")) return next()
  res.sendFile(path.join(DIST, "index.html"), (error) => { if (error) next(error) })
})
app.use((error, _req, res, _next) => {
  console.error("Unhandled server error:", error?.message || "unknown error")
  if (res.headersSent) return
  res.status(500).json({ error: "Unexpected server error" })
})
app.listen(PORT, () => console.log("Aniscroll server listening on port " + PORT))
