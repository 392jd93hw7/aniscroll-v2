import express from "express"
import path from "node:path"
import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"

const app = express()
app.disable("x-powered-by")
app.use(express.json({ limit: "16kb" }))

const PORT = Number(process.env.PORT || 3001)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.resolve(__dirname, "../dist")
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

async function queryAniList(query, variables = {}) {
  return cached("ANI:" + JSON.stringify({ query, variables }), async () => {
    const response = await fetch(ANILIST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": "Aniscroll/1.0" },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(12000),
    })
    if (!response.ok) throw new Error("AniList returned " + response.status)
    const payload = await response.json()
    if (payload.errors?.length) throw new Error(payload.errors[0].message || "AniList query failed")
    return payload.data
  })
}

const MEDIA_FIELDS = `
  id
  idMal
  title { romaji english native }
  description(asHtml: false)
  coverImage { extraLarge large }
  bannerImage
  genres
  season
  seasonYear
  startDate { year }
  averageScore
  popularity
  trending
  status
  episodes
  format
  studios(isMain: true) { nodes { name } }
`

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
    const query = "query($search: String!) { Page(page: 1, perPage: 8) { media(type: ANIME, search: $search, sort: [SEARCH_MATCH], isAdult: false) { " + MEDIA_FIELDS + " } } }"
    const data = await queryAniList(query, { search })
    const candidates = data.Page.media || []
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
    "Disallow: /profile",
    "Disallow: /watchlist",
    "Disallow: /admin",
    "Disallow: /sign-in",
    "Sitemap: " + origin + "/sitemap.xml",
    "",
  ].join("\n"))
})

app.get("/sitemap.xml", async (req, res) => {
  const origin = publicOrigin(req)
  const paths = new Set(["/", "/discover", "/anime", "/movies"])
  try {
    const query = "query { Page(page: 1, perPage: 50) { media(type: ANIME, sort: [TRENDING_DESC, POPULARITY_DESC], isAdult: false) { title { english romaji native } } } }"
    const data = await queryAniList(query)
    for (const item of data.Page.media || []) {
      const title = item.title?.english || item.title?.romaji || item.title?.native
      if (title) paths.add("/anime/" + slugify(title))
    }
  } catch {
    // Keep a usable sitemap containing the main public browse routes.
  }
  const today = new Date().toISOString().slice(0, 10)
  const urls = Array.from(paths).map((route) => "<url><loc>" + escapeHtml(origin + route) + "</loc><lastmod>" + today + "</lastmod></url>")
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

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "aniscroll-api" }))

app.get("/api/anilist/trending", async (_req, res) => {
  try {
    const query = `query { Page(page: 1, perPage: 24) { media(type: ANIME, sort: [TRENDING_DESC, POPULARITY_DESC], isAdult: false) { ${MEDIA_FIELDS} } } }`
    const data = await queryAniList(query)
    res.json({ results: data.Page.media })
  } catch {
    res.status(502).json({ error: "AniList is temporarily unavailable" })
  }
})

app.get("/api/anilist/search", async (req, res) => {
  const search = String(req.query.q || "").trim().slice(0, 100)
  if (search.length < 2) return res.status(400).json({ error: "Search needs at least two characters" })
  try {
    const query = `query($search: String!) { Page(page: 1, perPage: 24) { media(type: ANIME, search: $search, sort: [SEARCH_MATCH], isAdult: false) { ${MEDIA_FIELDS} } } }`
    const data = await queryAniList(query, { search })
    res.json({ results: data.Page.media })
  } catch {
    res.status(502).json({ error: "AniList search failed" })
  }
})

app.get("/api/anilist/resolve", async (req, res) => {
  const title = String(req.query.title || "").trim().slice(0, 120)
  if (!title) return res.status(400).json({ error: "A title is required" })
  try {
    const query = `query($search: String!) { Page(page: 1, perPage: 8) { media(type: ANIME, search: $search, sort: [SEARCH_MATCH], isAdult: false) { ${MEDIA_FIELDS} } } }`
    const data = await queryAniList(query, { search: title })
    const candidates = data.Page.media || []
    const normalize = (value) => String(value || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]/g, "")
    const exact = candidates.find((item) => [item.title?.english, item.title?.romaji, item.title?.native].some((name) => normalize(name) === normalize(title)))
    const anime = exact || candidates[0]
    if (!anime) return res.status(404).json({ error: "Anime was not found on AniList" })
    res.json({ anime })
  } catch {
    res.status(502).json({ error: "Unable to resolve anime on AniList" })
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
        const payload = await getJson(episodesUrl.toString())
        return { anime, episodes: (payload.data || []).map((ep) => normalizeKitsuEpisode(ep, anime.poster || anime.banner)) }
      } catch { return { anime, episodes: [] } }
    }, 30 * 60 * 1000)
    res.json(result)
  } catch {
    res.json({ anime: null, episodes: [], warning: "Kitsu metadata is temporarily unavailable" })
  }
})

app.use(express.static(DIST))
app.use((req, res, next) => {
  if (req.method !== "GET" || req.path.startsWith("/api/")) return next()
  res.sendFile(path.join(DIST, "index.html"), (error) => { if (error) next(error) })
})
app.use((error, _req, res, _next) => {
  console.error(error)
  res.status(500).json({ error: "Unexpected server error" })
})
app.listen(PORT, () => console.log("Aniscroll server listening on port " + PORT))
