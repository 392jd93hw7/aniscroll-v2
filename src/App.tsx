import { useState, useEffect, useRef } from "react"
import type { ReactNode } from "react"
import {
  storyFor,
  isFilm,
  runtimeFor,
  formatTime,
  libraryStatuses,
} from "./catalog"
import type { LibraryStatus, ViewingProgress } from "./catalog"
import { hasSupabaseConfig, supabase } from "./supabase"
import { AppPageProvider } from "./context/AppPageContext"
import HomePage from "./pages/HomePage"
import DiscoverPage from "./pages/DiscoverPage"
import MoviesPage from "./pages/MoviesPage"
import AnimeDetailsPage from "./pages/AnimeDetailsPage"
import WatchPage from "./pages/WatchPage"
import WatchlistPage from "./pages/WatchlistPage"
import SchedulePage from "./pages/SchedulePage"
import ProfilePage from "./pages/ProfilePage"
import AdminPage from "./pages/AdminPage"
import AuthPage from "./pages/AuthPage"

type Anime = {
  id?: number
  title: string
  image: string
  banner?: string
  synopsis?: string
  altTitle?: string
  score: string
  year: number
  genre: string
  genres?: string[]
  tags?: string[]
  label?: string
  isAdult?: boolean
}
type ScheduleRelease = {
  id: number
  airingAt: number
  timeUntilAiring: number
  episode: number
  media: any
}
const anime: Anime[] = [
  {
    title: "Demon Slayer: Kimetsu no Yaiba",
    image: "https://cdn.myanimelist.net/images/anime/1286/99889l.jpg",
    score: "8.7",
    year: 2024,
    genre: "Action",
    label: "TRENDING",
  },
  {
    title: "Jujutsu Kaisen",
    image: "https://cdn.myanimelist.net/images/anime/1171/109222l.jpg",
    score: "8.6",
    year: 2023,
    genre: "Action",
  },
  {
    title: "Solo Leveling",
    image: "https://cdn.myanimelist.net/images/anime/1448/147351l.jpg",
    score: "8.5",
    year: 2025,
    genre: "Fantasy",
    label: "NEW EPISODE",
  },
  {
    title: "Frieren: Beyond Journey’s End",
    image: "https://cdn.myanimelist.net/images/anime/1015/138006l.jpg",
    score: "9.3",
    year: 2023,
    genre: "Fantasy",
  },
  {
    title: "Attack on Titan",
    image: "https://cdn.myanimelist.net/images/anime/10/47347l.jpg",
    score: "9.1",
    year: 2023,
    genre: "Action",
  },
  {
    title: "One Piece",
    image: "https://cdn.myanimelist.net/images/anime/6/73245l.jpg",
    score: "8.7",
    year: 2024,
    genre: "Adventure",
  },
  {
    title: "Your Name.",
    image: "https://cdn.myanimelist.net/images/anime/5/87048l.jpg",
    score: "8.8",
    year: 2016,
    genre: "Romance",
  },
  {
    title: "SPY × FAMILY",
    image: "https://cdn.myanimelist.net/images/anime/1441/122795l.jpg",
    score: "8.5",
    year: 2022,
    genre: "Comedy",
  },
]
const featured = anime[6]
const slugify = (value: string) =>
  String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
const PAGE_PATHS: Record<string, string> = {
  Home: "/", Discover: "/discover", Movies: "/movie",
  Schedule: "/schedule", Watchlist: "/watchlist", Profile: "/profile",
  Admin: "/admin", Auth: "/sign-in",
}
const PATH_PAGES: Record<string, string> = { ...Object.fromEntries(Object.entries(PAGE_PATHS).map(([page, path]) => [path, page])), "/movies": "Movies" }
const localDateKey = (date: Date) => date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0")
const animePath = (title: string) => "/anime/" + slugify(title)
const watchPath = (title: string, season: number, episode: number) => "/watch/" + slugify(title) + "/season-" + season + "/episode-" + episode
const GENRE_OPTIONS = [
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Fantasy",
  "Horror",
  "Mystery",
  "Romance",
  "Sci-Fi",
  "Slice of Life",
  "Sports",
  "Supernatural",
  "Suspense",
  "Avant Garde",
  "Award Winning",
  "Gourmet",
  "Ecchi",
  "Hentai",
  "Mahou Shoujo",
  "Mecha",
  "Music",
  "Psychological",
  "Thriller",
  "Isekai",
  "Reincarnation",
  "Time Travel",
  "Martial Arts",
  "Demons",
  "Magic",
  "Vampire",
  "Historical",
  "Military",
  "School",
  "Seinen",
  "Shoujo",
  "Shounen",
  "Josei",
  "Parody",
  "Survival",
  "Detective",
]
const FEATURED_GENRES = ["Action", "Adventure", "Fantasy", "Romance", "Comedy", "Sci-Fi", "Mystery", "Horror", "Isekai", "Supernatural"]

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback }
  catch { return fallback }
}
type IconProps = {
  name: string
  size?: number
}
function Icon({ name, size = 20 }: IconProps) {
  const paths: Record<string, ReactNode> = {
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 4 4" />
      </>
    ),
    bookmark: <path d="M6 4h12v17l-6-4-6 4z" />,
    chevron: <path d="m9 5 7 7-7 7" />,
    down: <path d="m6 9 6 6 6-6" />,
    plus: <path d="M12 5v14M5 12h14" />,
    check: <path d="m5 12 4 4 10-10" />,
    play: <path d="m8 5 11 7-11 7z" />,
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v6M12 7h.01" />
      </>
    ),
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    home: (
      <>
        <path d="m3 10 9-7 9 7v11H3z" />
        <path d="M9 21v-8h6v8" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M7 3v5M17 3v5M3 11h18" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 22v-3a8 8 0 0 1 16 0v3" />
      </>
    ),
    bell: (
      <>
        <path d="M5 17h14l-2-4V9a5 5 0 0 0-10 0v4zM10 21h4" />
      </>
    ),
    close: <path d="m6 6 12 12M6 18 18 6" />,
    globe: (
      <>
        <circle cx="12" cy="12" r="9" />
        <ellipse cx="12" cy="12" rx="4" ry="9" />
        <path d="M3 12h18" />
      </>
    ),
    volume: (
      <>
        <path d="m3 9 4 0 5-4v14l-5-4H3zM16 8q6 4 0 8" />
      </>
    ),
    expand: <path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5" />,
    pause: (
      <>
        <path d="M8 5v14M16 5v14" />
      </>
    ),
    keyboard: (
      <>
        <rect x="2.5" y="5" width="19" height="14" rx="2" />
        <path d="M6 9h.01M9 9h.01M12 9h.01M15 9h.01M18 9h.01M6 12h.01M9 12h.01M12 12h.01M15 12h.01M18 12h.01M8 16h8" />
      </>
    ),
    captions: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M7 10h4M7 14h3M14 10h3M14 14h4" />
      </>
    ),
    mic: (
      <>
        <rect x="9" y="3" width="6" height="12" rx="3" />
        <path d="M5 11v1a7 7 0 0 0 14 0v-1M12 19v3M9 22h6" />
      </>
    ),
    list: <path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01" />,
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="m10 3 4 0 1 3 3 1 3 3v4l-3 1-1 3-3 3h-4l-1-3-3-1-3-3v-4l3-1 1-3z" />
      </>
    ),
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={name === "play" ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.info}
    </svg>
  )
}
function Logo() {
  return (
    <span className="logo">
      <svg viewBox="0 0 32 32" width="32" height="32" fill="none">
        <path d="m5 26 10-21h5l9 21h-7l-5-13-6 13z" fill="currentColor" />
        <path d="m4 21 19-5-3 7-18 5z" fill="#bba2ff" />
      </svg>
      aniscroll<span className="logo-dot">.</span>
    </span>
  )
}
function App() {
  const [page, setPage] = useState("Home"),
    [selected, setSelected] = useState<Anime>(featured),
    [saved, setSaved] = useState<string[]>(() => readStorage("aniscroll:saved", [])),
    [query, setQuery] = useState(""),
    [genre, setGenre] = useState("All genres"),
    [seasonFilter, setSeasonFilter] = useState("All seasons"),
    [season, setSeason] = useState(1),
    [loading, setLoading] = useState(false),
    [librarySort, setLibrarySort] = useState("Recently saved"),
    [statuses, setStatuses] = useState<Record<string, LibraryStatus>>(() => readStorage("aniscroll:statuses", {})),
    [history, setHistory] = useState<Record<string, ViewingProgress>>(() => readStorage("aniscroll:history", {})),
    [preferences, setPreferences] = useState(() => readStorage("aniscroll:preferences", {
      name: "Kaito",
      audio: "Japanese",
      subtitles: "English",
      autoplay: true,
      notifications: true,
    })),
    [draftPreferences, setDraftPreferences] = useState(preferences),
    [signedIn, setSignedIn] = useState(false),
    [audio, setAudio] = useState("Japanese"),
    [subtitles, setSubtitles] = useState("English"),
    [speed, setSpeed] = useState("1"),
    [quality, setQuality] = useState("1080p"),
    [volume, setVolume] = useState(70),
    [autoplay, setAutoplay] = useState(true),
    [controlsVisible, setControlsVisible] = useState(true),
    [playerSettings, setPlayerSettings] = useState(false),
    [fullscreen, setFullscreen] = useState(false),
    [year, setYear] = useState("All years"),
    [sort, setSort] = useState("Popularity"),
    [toast, setToast] = useState(""),
    [menu, setMenu] = useState(""),
    [slide, setSlide] = useState(0),
    [tab, setTab] = useState("Episodes"),
    [episode, setEpisode] = useState(1),
    [playing, setPlaying] = useState(false),
    [progress, setProgress] = useState(18),
    [auth, setAuth] = useState("Sign in"),
    [password, setPassword] = useState(false),
    [readMore, setReadMore] = useState(false),
    [compact, setCompact] = useState(false),
    [reminders, setReminders] = useState<string[]>([]),
    [remoteAnime, setRemoteAnime] = useState<Anime[]>([]),
    [homeTrendingAnime, setHomeTrendingAnime] = useState<Anime[]>([]),
    [homeTrendingLoading, setHomeTrendingLoading] = useState(false),
    [homeTrendingError, setHomeTrendingError] = useState(""),
    [homeKitsuBanners, setHomeKitsuBanners] = useState<Record<number, string>>({}),
    [homeGenreBanners, setHomeGenreBanners] = useState<any[]>([]),
    [homeGenreLoading, setHomeGenreLoading] = useState(false),
    [homeGenreError, setHomeGenreError] = useState(""),
    [animeResults, setAnimeResults] = useState<Anime[]>([]),
    [animePage, setAnimePage] = useState(() => { const value = Number(new URLSearchParams(typeof window === "undefined" ? "" : window.location.search).get("page") || 1); return Number.isSafeInteger(value) && value > 0 ? Math.min(value, 1000) : 1 }),
    [animeHasNextPage, setAnimeHasNextPage] = useState(false),
    [animeTotal, setAnimeTotal] = useState(0),
    [animeLoading, setAnimeLoading] = useState(false),
    [animeError, setAnimeError] = useState(""),
    [animeReloadNonce, setAnimeReloadNonce] = useState(0),
    [movieResults, setMovieResults] = useState<Anime[]>([]),
    [moviesPage, setMoviesPage] = useState(() => { const value = Number(new URLSearchParams(typeof window === "undefined" ? "" : window.location.search).get("page") || 1); return Number.isSafeInteger(value) && value > 0 ? Math.min(value, 1000) : 1 }),
    [moviesHasNextPage, setMoviesHasNextPage] = useState(false),
    [moviesLoading, setMoviesLoading] = useState(false),
    [moviesError, setMoviesError] = useState(""),
    [moviesReloadNonce, setMoviesReloadNonce] = useState(0),
    [aniListId, setAniListId] = useState<number | null>(null),
    [aniListMeta, setAniListMeta] = useState<any>(null),
    [aniListDetails, setAniListDetails] = useState<any>(null),
    [aniListDetailsLoading, setAniListDetailsLoading] = useState(false),
    [kitsuAnime, setKitsuAnime] = useState<any>(null),
    [kitsuEpisodes, setKitsuEpisodes] = useState<any[]>([]),
    [streamServer, setStreamServer] = useState("HD-1"),
    [mikazaProvider, setMikazaProvider] = useState<"kira" | "haiku" | "naoka">("haiku"),
    [audioTrack, setAudioTrack] = useState<"sub" | "dub">("sub"),
    [embedError, setEmbedError] = useState(false),
    [audioAvailability, setAudioAvailability] = useState<any>(null),
    [audioAvailabilityLoading, setAudioAvailabilityLoading] = useState(false),
    [audioAvailabilityError, setAudioAvailabilityError] = useState(""),
    [metadataLoading, setMetadataLoading] = useState(false),
    [sessionUserId, setSessionUserId] = useState<string | null>(null),
    [isAdmin, setIsAdmin] = useState(false),
    [adminOverrides, setAdminOverrides] = useState<any[]>([])
  const [routePath, setRoutePath] = useState(() => typeof window === "undefined" ? "/" : window.location.pathname)
  const lastAppliedRouteRef = useRef("")
  const resolvedRouteRef = useRef("")
  const metadataRequestRef = useRef("")
  const [airingSchedule, setAiringSchedule] = useState<ScheduleRelease[]>([])
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [scheduleError, setScheduleError] = useState("")
  const [scheduleDate, setScheduleDate] = useState(() => localDateKey(new Date()))
  const [scheduleWeekOffset, setScheduleWeekOffset] = useState(0)
  const notify = (text: string) => {
    setToast(text)
    window.setTimeout(() => setToast(""), 3200)
  }
  const normalizeAniList = (item: any): Anime => ({
    id: Number(item.id),
    title: item.title?.english || item.title?.romaji || item.title?.native || "Untitled anime",
    image: item.coverImage?.extraLarge || item.coverImage?.large || "https://placehold.co/300x440/17131f/e8dcff?text=Anime",
    banner: item.bannerImage || undefined,
    synopsis: String(item.description || "").replace(/<br[^>]*>/gi, " ").replace(/<[^>]*>/g, " "),
    altTitle: item.title?.native || item.title?.romaji || "",
    score: item.averageScore ? (Number(item.averageScore) / 10).toFixed(1) : "—",
    year: Number(item.seasonYear || item.startDate?.year || new Date().getFullYear()),
    genre: item.genres?.[0] || "Anime",
    genres: Array.isArray(item.genres) ? item.genres : [],
    tags: Array.isArray(item.tags) ? item.tags.map((tag: any) => typeof tag === "string" ? tag : tag?.name).filter(Boolean) : [],
    isAdult: Boolean(item.isAdult),
    label: item.trending ? "TRENDING" : undefined,
  })
  const catalog: Anime[] = [
    ...remoteAnime,
    ...anime.filter((fallback) => !remoteAnime.some((item) => item.title.toLowerCase() === fallback.title.toLowerCase())),
  ]
    .filter((item) => !adminOverrides.some((override) => Number(override.anilist_id) === Number(item.id) && override.hidden))
    .map((item) => {
      const override = adminOverrides.find((row) => Number(row.anilist_id) === Number(item.id))
      return {
        ...item,
        title: override?.title_override || item.title,
        image: override?.cover_url || item.image,
        banner: override?.banner_url || item.banner,
        synopsis: override?.synopsis_override || item.synopsis,
        label: override?.featured ? "FEATURED" : item.label,
      }
    })
  useEffect(() => {
    try {
      localStorage.setItem("aniscroll:saved", JSON.stringify(saved))
      localStorage.setItem("aniscroll:statuses", JSON.stringify(statuses))
      localStorage.setItem("aniscroll:history", JSON.stringify(history))
      localStorage.setItem("aniscroll:preferences", JSON.stringify(preferences))
    } catch { /* storage may be disabled */ }
  }, [saved, statuses, history, preferences])
  useEffect(() => {
    if (page === "Movies") return
    let active = true
    const term = query.trim()
    const timer = window.setTimeout(async () => {
      try {
        const endpoint = term.length > 1 ? "/api/anilist/search?q=" + encodeURIComponent(term) : "/api/anilist/trending"
        const response = await fetch(endpoint)
        if (!response.ok) throw new Error("AniList request failed")
        const data = await response.json()
        if (active && Array.isArray(data.results)) setRemoteAnime(data.results.map(normalizeAniList))
      } catch { /* keep curated fallback catalog */ }
    }, term.length > 1 ? 260 : 50)
    return () => { active = false; window.clearTimeout(timer) }
  }, [query, page])
  useEffect(() => {
    if (page !== "Home") return
    let active = true
    setHomeTrendingLoading(true)
    setHomeTrendingError("")
    setHomeGenreLoading(true)
    setHomeGenreError("")
    void fetch("/api/anilist/genre-banners", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload.error || "Genre anime could not be loaded")
        return payload
      })
      .then((payload) => {
        if (!active) return
        setHomeGenreBanners(Array.isArray(payload.results) ? payload.results : [])
      })
      .catch((error) => {
        if (!active) return
        setHomeGenreBanners([])
        setHomeGenreError(error instanceof Error ? error.message : "Unable to load genre artwork.")
      })
      .finally(() => { if (active) setHomeGenreLoading(false) })
    void fetch("/api/anilist/trending", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload.error || "AniList trending feed is unavailable")
        return payload
      })
      .then((payload) => {
        if (!active) return
        if (!Array.isArray(payload.results) || !payload.results.length) {
          setHomeTrendingAnime([])
          setHomeTrendingError("AniList has no trending anime to show right now.")
          return
        }
        const trending = payload.results
          .map((item: any) => ({ ...normalizeAniList(item), label: "TRENDING" }))
          .filter((item: Anime) => Number(item.id) > 0)
        setHomeTrendingAnime(trending)
        // Kitsu cover artwork is used as the wide home hero background.
        const bannerRequests = trending.slice(0, 4).map(async (item: Anime) => {
          try {
            const response = await fetch("/api/kitsu/" + item.id)
            if (!response.ok) return null
            const kitsu = await response.json()
            const banner = kitsu.anime?.banner || null
            return banner ? [Number(item.id), banner] as [number, string] : null
          } catch {
            return null
          }
        })
        void Promise.all(bannerRequests).then((entries) => {
          if (!active) return
          setHomeKitsuBanners(Object.fromEntries(entries.filter(Boolean) as [number, string][]))
        })
        if (!trending.length) setHomeTrendingError("AniList returned no valid trending anime.")
      })
      .catch((error) => {
        if (active) {
          setHomeTrendingAnime([])
          setHomeTrendingError(error instanceof Error ? error.message : "Could not load trending anime from AniList.")
        }
      })
      .finally(() => { if (active) setHomeTrendingLoading(false) })
    return () => { active = false }
  }, [page])
  useEffect(() => {
    const path = window.location.pathname.replace(/\/+$/, "") || "/"
    const isDiscover = page === "Discover" && path === "/discover"
    const isMovies = page === "Movies" && (path === "/movie" || path === "/movies")
    if (!isDiscover && !isMovies) return

    // Page state is the source of truth after navigation. The initial state
    // reads ?page= from the URL, and popstate handles browser back/forward.
    // Do not re-read the URL here, or a click to page 2 gets reset to page 1.
    const currentPage = isDiscover ? animePage : moviesPage
    const nextUrl = new URL(window.location.href)
    if (currentPage <= 1) nextUrl.searchParams.delete("page")
    else nextUrl.searchParams.set("page", String(currentPage))
    const next = nextUrl.pathname + nextUrl.search + nextUrl.hash
    const current = window.location.pathname + window.location.search + window.location.hash
    if (next !== current) window.history.pushState({ path: nextUrl.pathname }, "", next)
  }, [page, animePage, moviesPage])

  useEffect(() => {
    const handlePagePopState = () => {
      const path = window.location.pathname.replace(/\/+$/, "") || "/"
      const value = Number(new URLSearchParams(window.location.search).get("page") || 1)
      const safePage = Number.isSafeInteger(value) && value > 0 ? Math.min(value, 1000) : 1
      if (path === "/discover") setAnimePage(safePage)
      if (path === "/movie" || path === "/movies") setMoviesPage(safePage)
    }
    window.addEventListener("popstate", handlePagePopState)
    return () => window.removeEventListener("popstate", handlePagePopState)
  }, [])

  useEffect(() => {
    if (page !== "Anime" && page !== "Discover") return
    let active = true
    setAnimeLoading(true)
    setAnimeError("")
    const params = new URLSearchParams({ page: String(animePage), sort })
    const term = query.trim()
    if (term) params.set("q", term)
    if (genre !== "All genres") params.set("genre", genre)
    if (year !== "All years") params.set("year", year)
    if (seasonFilter !== "All seasons") params.set("season", seasonFilter)
    const requestTimer = window.setTimeout(() => {
      const gqlQuery = "        query DiscoverAnime($page: Int, $perPage: Int, $search: String, $genres: [String], $season: MediaSeason, $seasonYear: Int, $sort: [MediaSort]) {\n          Page(page: $page, perPage: $perPage) {\n            pageInfo { currentPage hasNextPage perPage }\n            media(type: ANIME, search: $search, genre_in: $genres, season: $season, seasonYear: $seasonYear, sort: $sort, isAdult: false) {\n              id idMal\n              title { romaji english native }\n              coverImage { large extraLarge color }\n              bannerImage description(asHtml: false) genres averageScore popularity episodes status season seasonYear format\n              startDate { year month day }\n              studios(isMain: true) { nodes { name } }\n              countryOfOrigin isAdult\n            }\n          }\n        }"
      const sortMap: Record<string, string[]> = {
        Popularity: ["POPULARITY_DESC"],
        "Recently Added": ["ID_DESC"],
        "Top Rated": ["SCORE_DESC"],
        Trending: ["TRENDING_DESC"],
        "Release Date": ["START_DATE_DESC"],
      }
      const variables: Record<string, unknown> = {
        page: animePage,
        perPage: 30,
        sort: sortMap[sort] || ["POPULARITY_DESC"],
      }
      if (term) variables.search = term
      if (genre !== "All genres") variables.genres = [genre]
      if (seasonFilter !== "All seasons") variables.season = seasonFilter.toUpperCase()
      if (year !== "All years") variables.seasonYear = Number(year)
      void fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ query: gqlQuery, variables }),
      })
        .then(async (response) => {
          const payload = await response.json().catch(() => ({}))
          if (!response.ok || payload.errors?.length) {
            throw new Error(payload.errors?.[0]?.message || "Could not load anime from AniList")
          }
          return payload.data?.Page
        })
        .then((payload) => {
          if (!active) return
          setAnimeResults(Array.isArray(payload?.media) ? payload.media.map(normalizeAniList) : [])
          setAnimeHasNextPage(Boolean(payload?.pageInfo?.hasNextPage))
          setAnimeTotal(0)
        })
        .catch((error) => {
          if (!active) return
          setAnimeResults([])
          setAnimeHasNextPage(false)
          setAnimeTotal(0)
          setAnimeError(error instanceof Error ? error.message : "Could not load anime from AniList. Please try again.")
        })
        .finally(() => { if (active) setAnimeLoading(false) })
    }, term ? 280 : 0)
    return () => {
      active = false
      window.clearTimeout(requestTimer)
    }
  }, [page, query, genre, year, seasonFilter, sort, animePage, animeReloadNonce])

  useEffect(() => {
    if (page !== "Movies") return
    let active = true
    const term = query.trim()
    setMoviesLoading(true)
    setMoviesError("")
    const params = new URLSearchParams({ page: String(moviesPage) })
    if (term) params.set("q", term)
    void fetch("/api/anilist/movies?" + params.toString())
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload.error || ("Movie catalog request failed (" + response.status + ")"))
        return payload
      })
      .then((payload) => {
        if (!active) return
        setMovieResults(Array.isArray(payload.results) ? payload.results.map(normalizeAniList) : [])
        setMoviesHasNextPage(Boolean(payload.pageInfo?.hasNextPage))
      })
      .catch((error) => {
        if (active) {
          setMovieResults([])
          setMoviesHasNextPage(false)
          setMoviesError(error instanceof Error ? error.message : "Could not load movies from AniList. Please try again.")
        }
      })
      .finally(() => { if (active) setMoviesLoading(false) })
    return () => { active = false }
  }, [page, query, moviesPage, moviesReloadNonce])
  useEffect(() => {
    if (page !== "Schedule" && page !== "Home") return
    let active = true
    setScheduleLoading(true)
    setScheduleError("")
    const rangeStart = new Date()
    rangeStart.setHours(0, 0, 0, 0)
    rangeStart.setDate(rangeStart.getDate() - ((rangeStart.getDay() + 6) % 7) + scheduleWeekOffset * 7)
    const rangeEnd = new Date(rangeStart)
    rangeEnd.setDate(rangeEnd.getDate() + 7)
    const from = Math.floor(rangeStart.getTime() / 1000)
    const to = Math.floor(rangeEnd.getTime() / 1000)
    void fetch("/api/anilist/schedule?from=" + from + "&to=" + to, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("AniList schedule is unavailable")
        return response.json()
      })
      .then((payload) => {
        if (active) setAiringSchedule(Array.isArray(payload.results) ? payload.results : [])
      })
      .catch(() => {
        if (active) setScheduleError("Could not load the live AniList airing schedule. Please try again.")
      })
      .finally(() => { if (active) setScheduleLoading(false) })
    return () => { active = false }
  }, [page, scheduleWeekOffset])
  useEffect(() => {
    if (page !== "Details" && page !== "Player") return
    const requestKey = String(selected.id || "") + ":" + selected.title
    if (metadataRequestRef.current === requestKey && (aniListMeta || aniListDetails)) return
    metadataRequestRef.current = requestKey
    let active = true
    const loadMetadata = async () => {
      setMetadataLoading(true)
      try {
        const resolved = selected.id ? { anime: { id: selected.id } } : await fetch("/api/anilist/resolve?title=" + encodeURIComponent(selected.title)).then((r) => {
          if (!r.ok) throw new Error("Could not resolve AniList title")
          return r.json()
        })
        const id = Number(resolved.anime?.id)
        if (!id) throw new Error("No AniList ID found")
        setAniListId(id)
        setAniListDetailsLoading(true)
        const [aniData, kitsuData, detailsData] = await Promise.all([
          fetch("/api/anilist/" + id).then((r) => r.ok ? r.json() : { anime: resolved.anime }).catch(() => ({ anime: resolved.anime })),
          fetch("/api/kitsu/" + id).then((r) => r.ok ? r.json() : { anime: null, episodes: [] }).catch(() => ({ anime: null, episodes: [] })),
          fetch("/api/anilist/" + id + "/details").then((r) => r.ok ? r.json() : { details: null }).catch(() => ({ details: null })),
        ])
        if (!active) return
        setAniListMeta(aniData.anime || resolved.anime || null)
        setAniListDetails(detailsData.details || null)
        setKitsuAnime(kitsuData.anime || null)
        setKitsuEpisodes(Array.isArray(kitsuData.episodes) ? kitsuData.episodes : [])
      } catch {
        if (active) { metadataRequestRef.current = ""; setAniListId(selected.id ? Number(selected.id) : null); setAniListMeta(null); setAniListDetails(null); setKitsuAnime(null); setKitsuEpisodes([]) }
      } finally { if (active) { setMetadataLoading(false); setAniListDetailsLoading(false) } }
    }
    void loadMetadata()
    return () => { active = false }
  }, [selected.title, selected.id, page])
  useEffect(() => {
    if (!hasSupabaseConfig || !supabase) return
    let active = true
    const startSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (!active) return
      const userId = data.session?.user.id || null
      setSessionUserId(userId)
      setSignedIn(Boolean(userId))
    }
    void startSession()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user.id || null
      setSessionUserId(userId)
      setSignedIn(Boolean(userId))
    })
    return () => { active = false; subscription.unsubscribe() }
  }, [])
  useEffect(() => {
    if (!hasSupabaseConfig || !supabase || !sessionUserId) return
    let active = true
    void (async () => {
      const { data: rows, error } = await supabase
        .from("watchlist")
        .select("anime_title,status")
        .eq("user_id", sessionUserId)
      if (!active || error || !rows) return
      const cloudTitles = rows.map((row) => String(row.anime_title)).filter(Boolean)
      setSaved((current) => Array.from(new Set([...current, ...cloudTitles])))
      setStatuses((current) => ({
        ...current,
        ...Object.fromEntries(rows.map((row) => [String(row.anime_title), row.status as LibraryStatus])),
      }))
    })()
    return () => { active = false }
  }, [hasSupabaseConfig, sessionUserId])
  useEffect(() => {
    if (!hasSupabaseConfig || !supabase) {
      setIsAdmin(false)
      setAdminOverrides([])
      return
    }
    let active = true
    const loadAdminData = async () => {
      try {
        const { data: overrides } = await supabase
          .from("anime_overrides")
          .select("*")
          .order("updated_at", { ascending: false })
        if (active && overrides) setAdminOverrides(overrides)
        if (sessionUserId) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", sessionUserId)
            .maybeSingle()
          if (active) setIsAdmin(profile?.role === "admin")
        } else if (active) setIsAdmin(false)
      } catch {
        if (active) setIsAdmin(false)
      }
    }
    void loadAdminData()
    return () => { active = false }
  }, [sessionUserId])
  useEffect(() => {
    const handlePopState = () => setRoutePath(window.location.pathname)
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])
  useEffect(() => {
    const path = routePath.replace(/\/+$/, "") || "/"
    if (path === "/anime") {
      if (lastAppliedRouteRef.current !== path) {
        lastAppliedRouteRef.current = path
        window.history.replaceState({}, "", "/discover")
        setRoutePath("/discover")
        setPage("Discover")
      }
      return
    }
    const staticPage = PATH_PAGES[path]
    if (staticPage) {
      if (lastAppliedRouteRef.current !== path) {
        lastAppliedRouteRef.current = path
        setPage(staticPage)
        if (staticPage === "Schedule") setTab("Today")
        if (staticPage === "Watchlist") setTab("Watchlist")
      }
      return
    }
    const watchMatch = path.match(/^\/watch\/([^/]+)\/season-(\d+)\/episode-(\d+)$/)
    const detailMatch = path.match(/^\/anime\/([^/]+)$/)
    if (!watchMatch && !detailMatch) {
      if (lastAppliedRouteRef.current !== path) {
        lastAppliedRouteRef.current = path
        setPage("Home")
      }
      return
    }
    const slug = (watchMatch ? watchMatch[1] : detailMatch?.[1]) || ""
    const applyAnimeRoute = (item: Anime) => {
      if (lastAppliedRouteRef.current === path) return
      lastAppliedRouteRef.current = path
      setSelected(item)
      setReadMore(false)
      setTab("Episodes")
      if (watchMatch) {
        const nextSeason = Number(watchMatch[2])
        const nextEpisode = Number(watchMatch[3])
        if (selected.title !== item.title || season !== nextSeason || episode !== nextEpisode) setProgress(0)
        setSeason(nextSeason)
        setEpisode(nextEpisode)
        setPlaying(false)
        setPage("Player")
      } else {
        setSeason(1)
        setPage("Details")
      }
    }
    const match = catalog.find((item) => slugify(item.title) === slug)
    if (match) {
      applyAnimeRoute(match)
      return
    }
    if (resolvedRouteRef.current === path) return
    resolvedRouteRef.current = path
    let active = true
    const searchTitle = slug.split("-").filter(Boolean).join(" ")
    void fetch("/api/anilist/resolve?title=" + encodeURIComponent(searchTitle))
      .then((response) => {
        if (!response.ok) throw new Error("Anime route could not be resolved")
        return response.json()
      })
      .then((payload) => {
        const item = payload?.anime ? normalizeAniList(payload.anime) : null
        if (!active || !item?.id) return
        setRemoteAnime((items) => [item, ...items.filter((existing) => Number(existing.id) !== Number(item.id))])
        applyAnimeRoute(item)
      })
      .catch(() => {
        if (active && lastAppliedRouteRef.current !== path) setPage("Home")
      })
    return () => { active = false }
  }, [routePath, remoteAnime, adminOverrides])
  const writePath = (path: string, replace = false) => {
    if (window.location.pathname !== path) {
      if (replace) window.history.replaceState({ path }, "", path)
      else window.history.pushState({ path }, "", path)
    }
    lastAppliedRouteRef.current = path
    setRoutePath(path)
  }
  const go = (p: string, explicitPath?: string) => {
    setPage(p)
    setMenu("")
    if (p === "Schedule") setTab("Today")
    if (p === "Watchlist") setTab("Watchlist")
    const nextPath = explicitPath || PAGE_PATHS[p]
    if (nextPath) writePath(nextPath)
    window.scrollTo({ top: 0, behavior: "instant" })
    requestAnimationFrame(() =>
      document.getElementById("main-content")?.focus({ preventScroll: true }),
    )
  }
  const detail = (a: Anime) => {
    if (selected.title !== a.title) { setAniListId(a.id ? Number(a.id) : null); setAniListMeta(null); setAniListDetails(null); setKitsuAnime(null); setKitsuEpisodes([]) }
    setSelected(a)
    setSeason(1)
    setReadMore(false)
    setTab("Episodes")
    go("Details", animePath(a.title))
  }
  const persistWatchlist = async (a: Anime, status: LibraryStatus, remove = false) => {
    if (!hasSupabaseConfig || !supabase || !sessionUserId) return
    try {
      let id = a.id ? Number(a.id) : 0
      if (!id) {
        const payload = await fetch("/api/anilist/resolve?title=" + encodeURIComponent(a.title)).then((r) => r.json())
        id = Number(payload.anime?.id || 0)
      }
      if (!id) {
        notify("Saved locally; this title could not be matched to AniList for cloud sync.")
        return
      }
      if (remove) {
        const { error } = await supabase.from("watchlist").delete().eq("user_id", sessionUserId).eq("anilist_id", id)
        if (error) notify("Removed locally; cloud removal could not complete.")
      } else {
        const { error } = await supabase.from("watchlist").upsert({ user_id: sessionUserId, anilist_id: id, anime_title: a.title, cover_image: a.image, status }, { onConflict: "user_id,anilist_id" })
        if (error) notify("Saved locally; account sync could not complete.")
      }
    } catch { notify("Saved locally; account sync could not complete.") }
  }
  const toggle = (a: Anime) => {
    const removing = saved.includes(a.title)
    const nextStatus = history[a.title] ? "Currently Watching" : "Plan to Watch"
    if (!removing) setStatuses((s) => ({ ...s, [a.title]: nextStatus }))
    setSaved((s) => removing ? s.filter((t) => t !== a.title) : [...s, a.title])
    void persistWatchlist(a, (statuses[a.title] || nextStatus) as LibraryStatus, removing)
    notify(removing ? "Removed from your watchlist" : "Added to your watchlist")
  }
  const saveAdminRecord = async (record: any) => {
    if (!isAdmin || !supabase) {
      notify("Admin access is required.")
      return false
    }
    const { data, error } = await supabase
      .from("anime_overrides")
      .upsert({ ...record, updated_at: new Date().toISOString() }, { onConflict: "anilist_id" })
      .select()
      .single()
    if (error) {
      notify(error.message)
      return false
    }
    setAdminOverrides((items) => [...items.filter((item) => Number(item.anilist_id) !== Number(data.anilist_id)), data])
    return true
  }
  const removeAdminRecord = async (anilistId: number) => {
    if (!isAdmin || !supabase) {
      notify("Admin access is required.")
      return
    }
    const { error } = await supabase.from("anime_overrides").delete().eq("anilist_id", anilistId)
    if (error) {
      notify(error.message)
      return
    }
    setAdminOverrides((items) => items.filter((item) => Number(item.anilist_id) !== anilistId))
    notify("Catalog override removed")
  }
  useEffect(() => {
    if (page !== "Player" || !playing) return
    const id = setInterval(
      () =>
        setProgress((p) =>
          Math.min(100, p + (100 * Number(speed)) / runtimeFor(selected.title)),
        ),
      1000,
    )
    return () => clearInterval(id)
  }, [playing, page, speed, selected.title])
  useEffect(() => {
    // Only mark an anime as continue-watching after playback has actually started
    // and progress has advanced. Merely opening the player must not create history.
    if (page === "Player" && playing && progress > 0) {
      setHistory((h) => ({
        ...h,
        [selected.title]: {
          episode,
          season,
          progress,
          lastWatchedAt: new Date().toISOString(),
        },
      }))
    }
  }, [page, playing, selected.title, episode, season, progress])
  useEffect(() => {
    if (!hasSupabaseConfig || !supabase || !sessionUserId || !selected.id) return
    let active = true
    const loadCloudProgress = async () => {
      const { data, error } = await supabase
        .from("watch_progress")
        .select("season_number,episode_number,progress_percent,updated_at")
        .eq("user_id", sessionUserId)
        .eq("anilist_id", Number(selected.id))
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!active || error || !data) return
      const cloudProgress = {
        season: Number(data.season_number) || 1,
        episode: Number(data.episode_number) || 1,
        progress: Math.max(0, Math.min(100, Number(data.progress_percent) || 0)),
      }
      setHistory((current) => {
        const local = current[selected.title]
        if (local) {
          const localPosition = local.season * 10000 + local.episode
          const cloudPosition = cloudProgress.season * 10000 + cloudProgress.episode
          if (localPosition > cloudPosition) return current
          if (localPosition === cloudPosition) {
            return { ...current, [selected.title]: { ...cloudProgress, progress: Math.max(local.progress, cloudProgress.progress) } }
          }
        }
        return { ...current, [selected.title]: cloudProgress }
      })
    }
    void loadCloudProgress()
    return () => { active = false }
  }, [hasSupabaseConfig, sessionUserId, selected.id, selected.title])

  useEffect(() => {
    if (page !== "Player" || !hasSupabaseConfig || !supabase || !sessionUserId || !selected.id) return
    const current = history[selected.title]
    if (!current) return
    const timer = window.setTimeout(() => {
      void supabase.from("watch_progress").upsert({
        user_id: sessionUserId,
        anilist_id: Number(selected.id),
        season_number: Math.max(1, Number(current.season) || 1),
        episode_number: Math.max(1, Number(current.episode) || 1),
        progress_percent: Math.max(0, Math.min(100, Number(current.progress) || 0)),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,anilist_id,season_number" })
    }, 800)
    return () => window.clearTimeout(timer)
  }, [hasSupabaseConfig, sessionUserId, selected.id, selected.title, history])
  useEffect(() => {
    if (!playing || playerSettings || !controlsVisible) return
    const id = window.setTimeout(() => setControlsVisible(false), 3500)
    return () => window.clearTimeout(id)
  }, [playing, playerSettings, controlsVisible])
  useEffect(() => {
    const handler = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener("fullscreenchange", handler)
    return () => document.removeEventListener("fullscreenchange", handler)
  }, [])
  useEffect(() => {
    if (!menu) return
    const close = (e: MouseEvent) => {
      if (!(e.target as Element).closest(".navigation")) setMenu("")
    }
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu("")
        document.querySelector<HTMLButtonElement>(".nav-tools .avatar")?.focus()
      }
    }
    document.addEventListener("click", close)
    document.addEventListener("keydown", escape)
    return () => {
      document.removeEventListener("click", close)
      document.removeEventListener("keydown", escape)
    }
  }, [menu])
  useEffect(() => {
    if (page === "Anime" || page === "Movies") {
      setLoading(false)
      return
    }
    setLoading(true)
    const id = window.setTimeout(() => setLoading(false), 180)
    return () => window.clearTimeout(id)
  }, [page, query, genre, year, seasonFilter])
  useEffect(() => {
    if (page !== "Player") return
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches("input,select,button")) return
      if (e.code === "Space") {
        setControlsVisible(true)
        e.preventDefault()
        setPlaying((p) => !p)
      }
      if (e.code === "ArrowRight") {
        e.preventDefault()
        setProgress((p) => Math.min(100, p + 1))
      }
      if (e.code === "ArrowLeft") {
        e.preventDefault()
        setProgress((p) => Math.max(0, p - 1))
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [page])
  const homeTrendingCatalog: Anime[] = homeTrendingAnime
    .filter((item) => !adminOverrides.some((override) => Number(override.anilist_id) === Number(item.id) && override.hidden))
    .map((item) => {
      const override = adminOverrides.find((row) => Number(row.anilist_id) === Number(item.id))
      return {
        ...item,
        title: override?.title_override || item.title,
        image: override?.cover_url || item.image,
        banner: override?.banner_url || item.banner,
        synopsis: override?.synopsis_override || item.synopsis,
        label: "TRENDING",
      }
    })
  const homeHeroItems = homeTrendingCatalog.slice(0, 4)
  const hero = homeHeroItems[Math.min(slide, Math.max(0, homeHeroItems.length - 1))] || featured
  const homeHeroBanner = hero.id ? homeKitsuBanners[Number(hero.id)] || hero.banner || hero.image : hero.image
  const info = storyFor(selected.title) || {
    synopsis: selected.synopsis || "Explore the story and world of this anime.",
    alternative: selected.altTitle || selected.title,
    studio: "Various studios",
    season: "All",
    seasons: 1,
    episodes: ["Episode 1"],
  }
  const anilistStatus = String(aniListMeta?.status || "")
  const nextAiringEpisodeNumber = Number(aniListMeta?.nextAiringEpisode?.episode || 0)
  const nextAiringAt = Number(aniListMeta?.nextAiringEpisode?.airingAt || 0)
  const hasFutureAniListAiring = nextAiringEpisodeNumber > 0 && nextAiringAt * 1000 > Date.now()
  const announcedEpisodeCount = Number(aniListMeta?.episodes || 0)
  const rawEpisodeTitles: string[] = kitsuEpisodes.length
    ? kitsuEpisodes.map((ep, index) => String(ep.title || ("Episode " + (Number(ep.number) || index + 1))))
    : [...info.episodes]
  // Kitsu may return only a partial title list. AniList's episode count is the
  // fallback source so the UI can still navigate past that partial list.
  if (announcedEpisodeCount > rawEpisodeTitles.length && !isFilm(selected.title)) {
    for (let number = rawEpisodeTitles.length + 1; number <= announcedEpisodeCount; number += 1) {
      rawEpisodeTitles.push("Episode " + number)
    }
  }
  const datedKitsuEpisodes = kitsuEpisodes.filter((ep) =>
    ep.airdate && Number.isFinite(Date.parse(String(ep.airdate))),
  )
  const isKitsuEpisodeAired = (ep: any) => {
    const airdate = String(ep.airdate || "").trim()
    if (!airdate) return false
    // Kitsu often publishes a date without a time. Treat today as not yet confirmed aired.
    if (/^\d{4}-\d{2}-\d{2}$/.test(airdate)) return airdate < localDateKey(new Date())
    const timestamp = Date.parse(airdate)
    return Number.isFinite(timestamp) && timestamp <= Date.now()
  }
  const airedKitsuEpisodeLimit = datedKitsuEpisodes
    .filter(isKitsuEpisodeAired)
    .reduce((max, ep) => Math.max(max, Number(ep.number) || 0), 0)
  const hasUnreleasedDatedKitsuEpisode = datedKitsuEpisodes.some((ep) => !isKitsuEpisodeAired(ep))
  let availableEpisodeLimit = rawEpisodeTitles.length
  if (isFilm(selected.title)) {
    availableEpisodeLimit = 1
  } else if (hasFutureAniListAiring) {
    // AniList tells us the next episode that has not aired; only earlier episodes are available.
    availableEpisodeLimit = Math.max(0, nextAiringEpisodeNumber - 1)
  } else if (hasUnreleasedDatedKitsuEpisode) {
    // A dated Kitsu episode today or in the future is not counted as available, even when AniList status is stale.
    availableEpisodeLimit = airedKitsuEpisodeLimit
  } else if (anilistStatus === "NOT_YET_RELEASED") {
    availableEpisodeLimit = 0
  } else if (anilistStatus === "FINISHED") {
    availableEpisodeLimit = announcedEpisodeCount || airedKitsuEpisodeLimit || rawEpisodeTitles.length
  } else if (anilistStatus === "RELEASING" && datedKitsuEpisodes.length) {
    availableEpisodeLimit = airedKitsuEpisodeLimit
  } else if (anilistStatus === "RELEASING") {
    // If neither source provides dates, use AniList's known episode count when available.
    // Otherwise retain the best-known Kitsu list/history limit.
    availableEpisodeLimit = announcedEpisodeCount > 0
      ? Math.min(rawEpisodeTitles.length, announcedEpisodeCount)
      : Math.max(1, Math.min(rawEpisodeTitles.length, Number(history[selected.title]?.episode || rawEpisodeTitles.length)))
  }
  const episodeTitles = rawEpisodeTitles.slice(0, Math.max(0, Math.min(rawEpisodeTitles.length, availableEpisodeLimit)))
  const duration = runtimeFor(selected.title)
  const episodeCount = episodeTitles.length
  useEffect(() => {
    if (page !== "Player" || progress < 100) return
    if (autoplay && episode < episodeCount) {
      const next = episode + 1
      setEpisode(next)
      setProgress(0)
      writePath(watchPath(selected.title, season, next))
    } else setPlaying(false)
  }, [progress, autoplay, episode, page, selected.title, season, episodeCount])

  useEffect(() => {
    if (page !== "Player" || metadataLoading) return
    if (episodeCount === 0) {
      setPlaying(false)
      setPage("Details")
      writePath(animePath(selected.title), true)
      return
    }
    if (episode > episodeCount) {
      setEpisode(episodeCount)
      setProgress(0)
      setPlaying(false)
      writePath(watchPath(selected.title, season, episodeCount), true)
    }
  }, [page, metadataLoading, episodeCount, episode, season, selected.title])

  const aniListCharacterEdges = Array.isArray(aniListDetails?.characters?.edges) ? aniListDetails.characters.edges.filter((edge: any) => edge?.node) : []
  const aniListRelatedAnime = (Array.isArray(aniListDetails?.relations?.edges) ? aniListDetails.relations.edges : [])
    .filter((edge: any) => edge?.node?.type === "ANIME" && edge.node.id !== aniListDetails?.id)
    .map((edge: any) => ({ ...normalizeAniList(edge.node), relationType: String(edge.relationType || "RELATED") }))
  const aniListRecommendations = (Array.isArray(aniListDetails?.recommendations?.nodes) ? aniListDetails.recommendations.nodes : [])
    .map((item: any) => item?.mediaRecommendation)
    .filter((item: any) => item?.type === "ANIME" && item.id !== aniListDetails?.id)
    .map((item: any) => normalizeAniList(item))

  const scheduleWeekStart = new Date()
  scheduleWeekStart.setHours(0, 0, 0, 0)
  scheduleWeekStart.setDate(scheduleWeekStart.getDate() - ((scheduleWeekStart.getDay() + 6) % 7) + scheduleWeekOffset * 7)
  const scheduleDays = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(scheduleWeekStart)
    date.setDate(scheduleWeekStart.getDate() + offset)
    const todayKey = localDateKey(new Date())
    return {
      key: localDateKey(date),
      label: date.toLocaleDateString(undefined, { weekday: "long" }),
      shortLabel: date.toLocaleDateString(undefined, { weekday: "short" }),
      dateNumber: date.getDate(),
      monthLabel: date.toLocaleDateString(undefined, { month: "short" }).toUpperCase(),
      dateLabel: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      isToday: localDateKey(date) === todayKey,
    }
  })
  const selectedScheduleDay = scheduleDays.find((day) => day.key === scheduleDate) || scheduleDays[Math.min(6, Math.max(0, new Date().getDay() === 0 ? 6 : new Date().getDay() - 1))] || scheduleDays[0]
  const releasesForSelectedDay = airingSchedule
    .filter((release) => localDateKey(new Date(release.airingAt * 1000)) === scheduleDate)
    .sort((a, b) => a.airingAt - b.airingAt)

  const embedUrl = aniListId
    ? streamServer === "HD-1"
      ? "https://aniplayer.xyz/embeds/" + aniListId + "/" + episode + "/" + audioTrack
      : streamServer === "HD-2"
        ? "https://aniembed.se/e/" + aniListId + "/" + episode + "?lang=" + audioTrack
        : "https://mikaza.buzz/embed/" + mikazaProvider + "/ani/" + aniListId + "/" + episode + "/" + audioTrack
    : ""
  const nextEpisode = () => {
    if (episode >= episodeCount) return
    const next = episode + 1
    setEpisode(next)
    setProgress(0)
    setControlsVisible(true)
    writePath(watchPath(selected.title, season, next))
  }
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else
        await document
          .querySelector<HTMLElement>(".video-placeholder")
          ?.requestFullscreen()
    } catch {
      notify(
        "Fullscreen is unavailable in this preview. Open the preview in a new tab.",
      )
    }
  }
  // Discover and Movies render the results fetched for the current server/API page.
  const isServerPagedBrowse = page === "Discover" || page === "Anime" || page === "Movies"
  const filtered = (page === "Movies" ? movieResults : page === "Anime" || page === "Discover" ? animeResults : catalog)
    .filter(
      (a) =>
        (isServerPagedBrowse || a.title.toLowerCase().includes(query.toLowerCase())) &&
        (isServerPagedBrowse || genre === "All genres" || a.genre === genre || a.genres?.includes(genre) || a.tags?.includes(genre)) &&
        (isServerPagedBrowse || year === "All years" || String(a.year) === year) &&
        (isServerPagedBrowse || seasonFilter === "All seasons" ||
          (storyFor(a.title)?.season || "All") === seasonFilter),
    )
    .sort((a, b) =>
      isServerPagedBrowse ? 0 : sort === "Highest rated"
        ? Number(b.score) - Number(a.score)
        : sort === "Latest"
          ? b.year - a.year
          : sort === "Alphabetical"
            ? a.title.localeCompare(b.title)
            : 0,
    )
  const watch = (a: Anime, e = 1, s = 1) => {
    const previous = history[a.title]
    if (selected.title !== a.title) { setAniListId(a.id ? Number(a.id) : null); setAniListMeta(null); setAniListDetails(null); setKitsuAnime(null); setKitsuEpisodes([]) }
    setSelected(a)
    setEpisode(e)
    setSeason(s)
    setProgress(
      previous?.episode === e && previous.season === s ? previous.progress : 0,
    )
    setPlaying(false)
    setControlsVisible(true)
    setPlayerSettings(false)
    if (saved.includes(a.title))
      setStatuses((status) => ({ ...status, [a.title]: "Currently Watching" }))
    go("Player", watchPath(a.title, s, e))
  }
  const libraryTitles = catalog
    .filter((a) => {
      if (tab === "Currently Watching")
        return (
          (statuses[a.title] === tab && saved.includes(a.title)) ||
          Boolean(
            history[a.title] &&
              history[a.title].progress < 100 &&
              !statuses[a.title],
          )
        )
      return (
        saved.includes(a.title) &&
        (tab === "Watchlist" || (statuses[a.title] || "Plan to Watch") === tab)
      )
    })
    .sort((a, b) =>
      librarySort === "Title A–Z"
        ? a.title.localeCompare(b.title)
        : librarySort === "Highest rated"
          ? +b.score - +a.score
          : saved.indexOf(b.title) - saved.indexOf(a.title),
    )
  const card = (a: Anime, i: number) => (
    <article className="poster-card" key={a.title}>
      <a className="poster" href={animePath(a.title)} onClick={(event) => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return; event.preventDefault(); detail(a) }} aria-label={"View " + a.title}>
        <img src={a.image} alt={a.title} loading="lazy" />
        {a.label && (
          <span
            className={`poster-label ${a.label === "TRENDING" ? "hot" : ""}`}
          >
            {a.label}
          </span>
        )}
        {a.isAdult && <span className="adult-content-label">18+</span>}
        <span className="rating">★ {a.score}</span>
        <span className="poster-hover">
          <Icon name="play" size={30} />
          View anime
        </span>
        {page === "Home" && <span className="rank">{i + 1}</span>}
      </a>
      <div className="poster-bottom">
        <button onClick={() => detail(a)} title={a.title}>
          {a.title}
        </button>
        <button
          className={`tiny-save ${saved.includes(a.title) ? "active" : ""}`}
          aria-label={`${
            saved.includes(a.title) ? "Remove" : "Save"
          } ${a.title}${saved.includes(a.title) ? " from" : " to"} watchlist`}
          aria-pressed={saved.includes(a.title)}
          onClick={() => toggle(a)}
        >
          <Icon name={saved.includes(a.title) ? "check" : "plus"} size={17} />
        </button>
      </div>
      <p className="card-meta">
        {a.year}
        <span>•</span>
        {a.genre}
        <span className="sub-dub">SUB | DUB</span>
      </p>
      {page === "Watchlist" && (
        <div className="library-card-controls">
          {history[a.title] && (
            <p>
              {history[a.title].progress >= 100
                ? "Finished"
                : `S${history[a.title].season} · E${history[a.title].episode} · ${Math.round(history[a.title].progress)}% watched`}
            </p>
          )}
          {saved.includes(a.title) && (
            <select
              aria-label={`Library status for ${a.title}`}
              value={statuses[a.title] || "Plan to Watch"}
              onChange={(e) => {
                const status = e.target.value as LibraryStatus
                setStatuses((s) => ({ ...s, [a.title]: status }))
                if (saved.includes(a.title)) void persistWatchlist(a, status)
              }}
            >
              {libraryStatuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          )}
        </div>
      )}
    </article>
  )
  const heading = (title: string, sub?: string, onView?: () => void) => (
    <div className="section-heading">
      <div>
        <h2>
          {title}
          {sub && <span className="heading-note">{sub}</span>}
        </h2>
      </div>
      <button className="text-link" onClick={onView || (() => go("Discover"))}>
        View all <Icon name="chevron" size={15} />
      </button>
    </div>
  )
  const episodes = episodeTitles.map((title, i) => (
    <a
      className="episode-item"
      href={watchPath(selected.title, season, i + 1)}
      onClick={(event) => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return; event.preventDefault(); watch(selected, i + 1, season) }}
      key={i}
      aria-label={"Watch " + (isFilm(selected.title) ? "film" : "season " + season + ", episode " + (i + 1)) + ": " + title}
    >
      <div className="episode-thumb">
        <img src={kitsuEpisodes[i]?.thumbnail || selected.image} alt="" loading="lazy" />
        <Icon name="play" />
        <span>{formatTime(duration)}</span>
        {history[selected.title]?.season === season &&
          history[selected.title]?.episode === i + 1 && (
            <progress
              className="episode-progress"
              max="100"
              value={history[selected.title].progress}
              aria-label="Watch progress"
            />
          )}
      </div>
      <div>
        <span className="eyebrow">
          {isFilm(selected.title)
            ? "FEATURE FILM"
            : `S${season} · EPISODE ${i + 1}`}{" "}
          · SUB / DUB
        </span>
        <h3>
          {season === 1 ? title : `Season ${season} · Preview chapter ${i + 1}`}
        </h3>
        <p>
          {history[selected.title]?.episode === i + 1 &&
          history[selected.title]?.season === season
            ? `${Math.round(history[selected.title].progress)}% watched · Resume your story`
            : "Available now · HD"}
        </p>
      </div>
      <Icon name="play" />
    </a>
  ))
  useEffect(() => {
    if (page !== "Player") {
      setAudioAvailability(null)
      setAudioAvailabilityLoading(false)
      setAudioAvailabilityError("")
      return
    }
    const id = Number(aniListId || selected.id)
    if (!Number.isSafeInteger(id) || id <= 0 || !episode) {
      setAudioAvailability(null)
      setAudioAvailabilityLoading(false)
      setAudioAvailabilityError("AniList ID is unavailable, so server languages cannot be checked.")
      return
    }
    let active = true
    setAudioAvailability(null)
    setAudioAvailabilityLoading(true)
    setAudioAvailabilityError("")
    void fetch("/api/playback/availability/" + id + "/" + episode, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload.error || "Could not check audio availability")
        return payload
      })
      .then((payload) => {
        if (!active) return
        if (typeof payload.languageAvailability?.sub !== "boolean" || typeof payload.languageAvailability?.dub !== "boolean") {
          throw new Error("The playback API is outdated. Update and restart the Aniscroll backend.")
        }
        const subServers = payload.languageAvailability.sub && Array.isArray(payload.available?.sub) ? payload.available.sub : []
        const dubServers = payload.languageAvailability.dub && Array.isArray(payload.available?.dub) ? payload.available.dub : []
        const verifiedPayload = { ...payload, available: { sub: subServers, dub: dubServers } }
        setAudioAvailability(verifiedPayload)
        const chosenTrack = (verifiedPayload.available?.[audioTrack] || []).length ? audioTrack : subServers.length ? "sub" : dubServers.length ? "dub" : null
        if (!chosenTrack) return
        if (chosenTrack !== audioTrack) setAudioTrack(chosenTrack)
        const servers = chosenTrack === "sub" ? subServers : dubServers
        const chosenServer = servers.includes(streamServer) ? streamServer : servers[0]
        if (chosenServer && chosenServer !== streamServer) setStreamServer(chosenServer)
        if (chosenServer === "HD-1") {
          const mikazaOptions = payload.providers?.["HD-3"]?.[chosenTrack] || []
          if (mikazaOptions.length && !mikazaOptions.includes(mikazaProvider)) setMikazaProvider(mikazaOptions[0])
        }
      })
      .catch((error) => {
        if (active) setAudioAvailabilityError(error instanceof Error ? error.message : "Could not check audio availability")
      })
      .finally(() => { if (active) setAudioAvailabilityLoading(false) })
    return () => { active = false }
  }, [page, aniListId, selected.id, episode])
  useEffect(() => {
    if (page !== "Player") return
    const canonicalPath = watchPath(selected.title, season, episode)
    if (window.location.pathname !== canonicalPath) writePath(canonicalPath, true)
  }, [page, selected.title, season, episode])
  useEffect(() => {
    const isAnimeRoute = page === "Details" || page === "Player"
    const pageLabel = page === "Auth" ? "Sign in" : page
    const title = page === "Details"
      ? selected.title + " Anime — Synopsis, Episodes & Info | Aniscroll"
      : page === "Player"
        ? "Watch " + selected.title + " Season " + season + " Episode " + episode + " | Aniscroll"
        : page === "Home"
          ? "Aniscroll — Anime, discovered your way"
          : pageLabel + " | Aniscroll"
    const rawDescription = isAnimeRoute
      ? String(aniListMeta?.description || selected.synopsis || "Explore the story and world of this anime.")
      : page === "Discover" || page === "Anime"
        ? "Discover popular anime, explore genres, and find your next favorite series on Aniscroll."
        : page === "Movies"
          ? "Explore anime movies, from beloved classics to new favorites, on Aniscroll."
          : "Discover anime with Aniscroll, your guide to anime stories, episodes, and recommendations."
    const description = rawDescription.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300)
    document.title = title
    const setMeta = (key: string, value: string, attribute: "name" | "property" = "name") => {
      let tag = document.head.querySelector<HTMLMetaElement>('meta[' + attribute + '="' + key + '"]')
      if (!tag) {
        tag = document.createElement("meta")
        tag.setAttribute(attribute, key)
        document.head.appendChild(tag)
      }
      tag.setAttribute("content", value)
    }
    const canonicalPath = window.location.pathname
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement("link")
      canonical.rel = "canonical"
      document.head.appendChild(canonical)
    }
    canonical.href = window.location.origin + canonicalPath
    setMeta("description", description || "Discover anime with Aniscroll.")
    setMeta("robots", ["Watchlist", "Profile", "Admin", "Auth"].includes(page) ? "noindex,follow" : "index,follow")
    setMeta("og:title", title, "property")
    setMeta("og:description", description || "Discover anime with Aniscroll.", "property")
    setMeta("og:url", window.location.origin + canonicalPath, "property")
    setMeta("og:type", page === "Player" ? "video.episode" : isAnimeRoute ? (isFilm(selected.title) ? "video.movie" : "video.tv_show") : "website", "property")
    setMeta("og:image", isAnimeRoute ? (selected.banner || selected.image) : "https://placehold.co/1200x630/17131f/e8dcff?text=Aniscroll", "property")
    setMeta("twitter:card", "summary_large_image")
    setMeta("twitter:title", title)
    setMeta("twitter:description", description || "Discover anime with Aniscroll.")
    if (isAnimeRoute) {
      const rating = Number(selected.score)
      const structuredData: Record<string, any> = {
        "@context": "https://schema.org",
        "@type": isFilm(selected.title) ? "Movie" : "TVSeries",
        name: selected.title,
        description: description || "Explore " + selected.title + " on Aniscroll.",
        image: selected.banner || selected.image,
        datePublished: String(selected.year),
        genre: selected.genre,
        url: window.location.origin + canonicalPath,
      }
      if (Number.isFinite(rating) && rating > 0) {
        structuredData.aggregateRating = { "@type": "AggregateRating", ratingValue: rating, bestRating: 10 }
      }
      let schema = document.getElementById("anime-structured-data") as HTMLScriptElement | null
      if (!schema) {
        schema = document.createElement("script")
        schema.id = "anime-structured-data"
        schema.type = "application/ld+json"
        document.head.appendChild(schema)
      }
      schema.textContent = JSON.stringify(structuredData)
    } else {
      document.getElementById("anime-structured-data")?.remove()
    }
  }, [page, selected.title, selected.image, selected.banner, selected.synopsis, selected.year, selected.genre, selected.score, aniListMeta, routePath, season, episode])
  const pageData = {
    page,
    setPage,
    selected,
    setSelected,
    saved,
    setSaved,
    query,
    setQuery,
    genre,
    setGenre,
    seasonFilter,
    setSeasonFilter,
    season,
    setSeason,
    loading,
    setLoading,
    librarySort,
    setLibrarySort,
    statuses,
    setStatuses,
    history,
    setHistory,
    preferences,
    setPreferences,
    draftPreferences,
    setDraftPreferences,
    signedIn,
    setSignedIn,
    audio,
    setAudio,
    subtitles,
    setSubtitles,
    speed,
    setSpeed,
    quality,
    setQuality,
    volume,
    setVolume,
    autoplay,
    setAutoplay,
    controlsVisible,
    setControlsVisible,
    playerSettings,
    setPlayerSettings,
    fullscreen,
    setFullscreen,
    year,
    setYear,
    sort,
    setSort,
    toast,
    setToast,
    menu,
    setMenu,
    slide,
    setSlide,
    tab,
    setTab,
    episode,
    setEpisode,
    playing,
    setPlaying,
    progress,
    setProgress,
    auth,
    setAuth,
    password,
    setPassword,
    readMore,
    setReadMore,
    compact,
    setCompact,
    reminders,
    setReminders,
    remoteAnime,
    setRemoteAnime,
    homeTrendingAnime,
    homeTrendingCatalog,
    homeTrendingLoading,
    homeTrendingError,
    homeKitsuBanners,
    homeGenreBanners,
    homeGenreLoading,
    homeGenreError,
    homeHeroItems,
    homeHeroBanner,
    animeResults,
    setAnimeResults,
    animePage,
    setAnimePage,
    animeHasNextPage,
    setAnimeHasNextPage,
    animeTotal,
    animeLoading,
    setAnimeLoading,
    animeError,
    setAnimeError,
    animeReloadNonce,
    setAnimeReloadNonce,
    movieResults,
    setMovieResults,
    moviesPage,
    setMoviesPage,
    moviesHasNextPage,
    setMoviesHasNextPage,
    moviesLoading,
    setMoviesLoading,
    moviesError,
    setMoviesError,
    moviesReloadNonce,
    setMoviesReloadNonce,
    aniListId,
    setAniListId,
    aniListMeta,
    setAniListMeta,
    aniListDetails,
    setAniListDetails,
    aniListDetailsLoading,
    setAniListDetailsLoading,
    kitsuAnime,
    setKitsuAnime,
    kitsuEpisodes,
    setKitsuEpisodes,
    streamServer,
    setStreamServer,
    mikazaProvider,
    setMikazaProvider,
    audioTrack,
    setAudioTrack,
    embedError,
    setEmbedError,
    audioAvailability,
    setAudioAvailability,
    audioAvailabilityLoading,
    setAudioAvailabilityLoading,
    audioAvailabilityError,
    setAudioAvailabilityError,
    metadataLoading,
    setMetadataLoading,
    sessionUserId,
    setSessionUserId,
    isAdmin,
    setIsAdmin,
    adminOverrides,
    setAdminOverrides,
    routePath,
    setRoutePath,
    airingSchedule,
    setAiringSchedule,
    scheduleLoading,
    setScheduleLoading,
    scheduleError,
    setScheduleError,
    scheduleDate,
    setScheduleDate,
    scheduleWeekOffset,
    setScheduleWeekOffset,
    lastAppliedRouteRef,
    resolvedRouteRef,
    metadataRequestRef,
    notify,
    normalizeAniList,
    catalog,
    writePath,
    go,
    detail,
    persistWatchlist,
    toggle,
    saveAdminRecord,
    removeAdminRecord,
    hero,
    info,
    rawEpisodeTitles,
    anilistStatus,
    nextAiringEpisodeNumber,
    nextAiringAt,
    hasFutureAniListAiring,
    announcedEpisodeCount,
    datedKitsuEpisodes,
    isKitsuEpisodeAired,
    airedKitsuEpisodeLimit,
    hasUnreleasedDatedKitsuEpisode,
    availableEpisodeLimit,
    episodeTitles,
    duration,
    episodeCount,
    aniListCharacterEdges,
    aniListRelatedAnime,
    aniListRecommendations,
    scheduleDays,
    selectedScheduleDay,
    releasesForSelectedDay,
    embedUrl,
    nextEpisode,
    toggleFullscreen,
    filtered,
    watch,
    libraryTitles,
    card,
    heading,
    episodes,
    Icon,
    Logo,
    anime,
    featured,
    slugify,
    PAGE_PATHS,
    PATH_PAGES,
    localDateKey,
    animePath,
    watchPath,
    GENRE_OPTIONS,
    FEATURED_GENRES,
    readStorage,
    storyFor,
    isFilm,
    runtimeFor,
    formatTime,
    libraryStatuses,
    hasSupabaseConfig,
    supabase,
  }

  return (
    <AppPageProvider value={pageData}>
      <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="navigation">
        <button
          className="brand-button"
          aria-label="Aniscroll home"
          onClick={() => go("Home")}
        >
          <Logo />
        </button>
        <nav aria-label="Main navigation">
          {["Home", "Discover", "Movies", "Genres", "Schedule"].map(
            (n) => (
              <button
                key={n}
                className={page === n ? "nav-active" : ""}
                aria-current={page === n ? "page" : undefined}
                aria-expanded={n === "Genres" ? menu === "genres" : undefined}
                onClick={() =>
                  n === "Genres"
                    ? setMenu(menu === "genres" ? "" : "genres")
                    : go(n)
                }
              >
                {n}
                {n === "Genres" && <Icon name="down" size={12} />}
              </button>
            ),
          )}
        </nav>
        <div className="nav-tools">
          <button
            aria-label="Search anime"
            onClick={() => {
              go("Discover")
              setTimeout(
                () => document.getElementById("anime-search")?.focus(),
                50,
              )
            }}
          >
            <Icon name="search" />
          </button>
          <button aria-label="Watchlist" onClick={() => go("Watchlist")}>
            <Icon name="bookmark" />
            {saved.length > 0 && <span className="notification-dot" />}
          </button>
          <button
            className="language"
            aria-label="Choose interface language"
            aria-expanded={menu === "language"}
            onClick={() => setMenu(menu === "language" ? "" : "language")}
          >
            <Icon name="globe" size={17} />
            EN
            <Icon name="down" size={12} />
          </button>
          <button
            className="avatar"
            aria-label="Profile menu"
            aria-expanded={menu === "profile"}
            onClick={() => setMenu(menu === "profile" ? "" : "profile")}
          >
            {preferences.name.slice(0, 1).toUpperCase() || "K"}
          </button>
          <button
            className="avatar-chevron"
            aria-label="Open profile menu"
            onClick={() => setMenu(menu === "profile" ? "" : "profile")}
          >
            <Icon name="down" size={13} />
          </button>
        </div>
        {menu && (
          <div
            className={`dropdown ${menu === "genres" ? "genre-dropdown" : ""}`}
          >
            {(menu === "genres"
              ? GENRE_OPTIONS
              : menu === "language"
                ? ["English", "日本語", "Español"]
                : ["My profile", "My watchlist", "Preferences", "Sign in"]
            ).map((item) => (
              <button
                key={item}
                onClick={() => {
                  if (menu === "genres") {
                    setGenre(item)
                    if (page === "Anime") setAnimePage(1)
                    go("Discover")
                  } else if (menu === "language") {
                    notify(`Interface language: ${item} (preview)`)
                    setMenu("")
                  } else
                    go(
                      item === "My watchlist"
                        ? "Watchlist"
                        : item === "Sign in"
                          ? "Auth"
                          : "Profile",
                    )
                }}
              >
                {item}
              </button>
            ))}
          </div>
        )}
      </header>
      <main id="main-content" tabIndex={-1}>
        {page === "Home" && <HomePage />}
        {page === "Discover" && <DiscoverPage />}
        {page === "Movies" && <MoviesPage />}
        {page === "Details" && <AnimeDetailsPage />}
        {page === "Player" && <WatchPage />}
        {page === "Watchlist" && <WatchlistPage />}
        {page === "Schedule" && <SchedulePage />}
        {page === "Profile" && <ProfilePage />}
        {page === "Admin" && <AdminPage />}
        {page === "Auth" && <AuthPage />}
      </main>
      <footer>
        <div className="footer-top">
          <div>
            <button className="brand-button" onClick={() => go("Home")}>
              <Logo />
            </button>
            <p>Your next anime obsession.</p>
          </div>
          <div className="footer-links">
            {["About", "Help Center", "Terms", "Privacy", "Contact"].map(
              (l) => (
                <button
                  key={l}
                  onClick={() =>
                    notify(`${l}: This is an independent Aniscroll UI concept.`)
                  }
                >
                  {l}
                </button>
              ),
            )}
          </div>
          <button
            className="footer-lang"
            onClick={() => notify("Preview language: English")}
          >
            <Icon name="globe" size={17} /> English{" "}
            <Icon name="down" size={13} />
          </button>
        </div>
        <div className="footer-bottom">
          <span>© 2025 Aniscroll. All stories begin here.</span>
          <span>
            Made for the love of anime.{" "}
            <span className="purple-text">Always.</span>
          </span>
        </div>
      </footer>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {[
          ["Home", "home"],
          ["Discover", "search"],
          ["Schedule", "calendar"],
          ["Watchlist", "bookmark"],
          ["Profile", "user"],
        ].map(([p, i]) => (
          <button
            key={p}
            className={page === p ? "active" : ""}
            aria-current={page === p ? "page" : undefined}
            onClick={() => go(p)}
          >
            <Icon name={i} size={21} />
            <span>{p}</span>
          </button>
        ))}
      </nav>
      {toast && (
        <div className="toast" role="status">
          <span className="toast-check">
            <Icon name="check" size={16} />
          </span>
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
    </>
    </AppPageProvider>
  )
}
export default App