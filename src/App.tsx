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
  Home: "/", Discover: "/discover", Anime: "/anime", Movies: "/movies",
  Schedule: "/schedule", Watchlist: "/watchlist", Profile: "/profile",
  Admin: "/admin", Auth: "/sign-in",
}
const PATH_PAGES: Record<string, string> = Object.fromEntries(Object.entries(PAGE_PATHS).map(([page, path]) => [path, page]))
const localDateKey = (date: Date) => date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0")
const animePath = (title: string) => "/anime/" + slugify(title)
const watchPath = (title: string, season: number, episode: number) => "/watch/" + slugify(title) + "/season-" + season + "/episode-" + episode
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
    [history, setHistory] = useState<Record<string, ViewingProgress>>(() => readStorage("aniscroll:history", {
      "Jujutsu Kaisen": { episode: 4, season: 1, progress: 66 },
      "Frieren: Beyond Journey’s End": { episode: 3, season: 1, progress: 42 },
      "Demon Slayer: Kimetsu no Yaiba": { episode: 4, season: 1, progress: 77 },
      "SPY × FAMILY": { episode: 6, season: 1, progress: 55 },
    })),
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
    [aniListId, setAniListId] = useState<number | null>(null),
    [aniListMeta, setAniListMeta] = useState<any>(null),
    [kitsuAnime, setKitsuAnime] = useState<any>(null),
    [kitsuEpisodes, setKitsuEpisodes] = useState<any[]>([]),
    [streamServer, setStreamServer] = useState("HD-1"),
    [audioTrack, setAudioTrack] = useState<"sub" | "dub">("sub"),
    [embedError, setEmbedError] = useState(false),
    [metadataLoading, setMetadataLoading] = useState(false),
    [sessionUserId, setSessionUserId] = useState<string | null>(null),
    [isAdmin, setIsAdmin] = useState(false),
    [adminOverrides, setAdminOverrides] = useState<any[]>([])
  const [routePath, setRoutePath] = useState(() => typeof window === "undefined" ? "/" : window.location.pathname)
  const lastAppliedRouteRef = useRef("")
  const resolvedRouteRef = useRef("")
  const [airingSchedule, setAiringSchedule] = useState<ScheduleRelease[]>([])
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [scheduleError, setScheduleError] = useState("")
  const [scheduleDate, setScheduleDate] = useState(() => localDateKey(new Date()))
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
  }, [query])
  useEffect(() => {
    if (page !== "Schedule") return
    let active = true
    setScheduleLoading(true)
    setScheduleError("")
    const from = Math.floor(Date.now() / 1000)
    const rangeEnd = new Date()
    rangeEnd.setDate(rangeEnd.getDate() + 7)
    rangeEnd.setHours(0, 0, 0, 0)
    const to = Math.floor(rangeEnd.getTime() / 1000)
    void fetch("/api/anilist/schedule?from=" + from + "&to=" + to)
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
  }, [page])
  useEffect(() => {
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
        const [aniData, kitsuData] = await Promise.all([
          fetch("/api/anilist/" + id).then((r) => r.ok ? r.json() : Promise.reject(new Error("AniList metadata unavailable"))),
          fetch("/api/kitsu/" + id).then((r) => r.ok ? r.json() : Promise.reject(new Error("Kitsu metadata unavailable"))),
        ])
        if (!active) return
        setAniListMeta(aniData.anime || resolved.anime || null)
        setKitsuAnime(kitsuData.anime || null)
        setKitsuEpisodes(Array.isArray(kitsuData.episodes) ? kitsuData.episodes : [])
      } catch {
        if (active) { setAniListId(selected.id ? Number(selected.id) : null); setAniListMeta(null); setKitsuAnime(null); setKitsuEpisodes([]) }
      } finally { if (active) setMetadataLoading(false) }
    }
    void loadMetadata()
    return () => { active = false }
  }, [selected.title, selected.id])
  useEffect(() => {
    if (!hasSupabaseConfig || !supabase) return
    let active = true
    const startSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (!active) return
      const userId = data.session?.user.id || null
      setSessionUserId(userId)
      setSignedIn(Boolean(userId))
      if (userId) {
        const { data: rows } = await supabase.from("watchlist").select("anime_title,status").eq("user_id", userId)
        if (active && rows?.length) {
          setSaved(rows.map((row) => String(row.anime_title)))
          setStatuses(Object.fromEntries(rows.map((row) => [String(row.anime_title), row.status as LibraryStatus])))
        }
      }
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
    if (selected.title !== a.title) { setAniListId(a.id ? Number(a.id) : null); setAniListMeta(null); setKitsuAnime(null); setKitsuEpisodes([]) }
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
      if (!id) return
      if (remove) await supabase.from("watchlist").delete().eq("user_id", sessionUserId).eq("anilist_id", id)
      else {
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
    if (page === "Player") {
      setHistory((h) => ({
        ...h,
        [selected.title]: { episode, season, progress },
      }))
    }
  }, [page, selected.title, episode, season, progress])
  useEffect(() => {
    if (page !== "Player" || progress < 100) return
    if (autoplay && episode < Math.max(kitsuEpisodes.length, storyFor(selected.title)?.episodes.length || 1)) {
      setEpisode((e) => e + 1)
      setProgress(0)
    } else setPlaying(false)
  }, [progress, autoplay, episode, page, selected.title])
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
    setLoading(true)
    const id = window.setTimeout(() => setLoading(false), 180)
    return () => window.clearTimeout(id)
  }, [query, genre, year, seasonFilter])
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
  const hero = slide === 0 ? featured : catalog[(slide - 1) % Math.max(1, Math.min(6, catalog.length))]
  const info = storyFor(selected.title) || {
    synopsis: selected.synopsis || "Explore the story and world of this anime.",
    alternative: selected.altTitle || selected.title,
    studio: "Various studios",
    season: "All",
    seasons: 1,
    episodes: ["Episode 1"],
  }
  const episodeTitles: string[] = kitsuEpisodes.length ? kitsuEpisodes.map((ep) => String(ep.title || ("Episode " + ep.number))) : info.episodes
  const duration = runtimeFor(selected.title)
  const episodeCount = Math.max(1, episodeTitles.length)
  const scheduleDays = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() + offset)
    return {
      key: localDateKey(date),
      label: offset === 0 ? "Today" : offset === 1 ? "Tomorrow" : date.toLocaleDateString(undefined, { weekday: "long" }),
      dateLabel: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    }
  })
  const selectedScheduleDay = scheduleDays.find((day) => day.key === scheduleDate) || scheduleDays[0]
  const releasesForSelectedDay = airingSchedule
    .filter((release) => localDateKey(new Date(release.airingAt * 1000)) === scheduleDate)
    .sort((a, b) => a.airingAt - b.airingAt)

  const embedUrl = aniListId
    ? streamServer === "HD-1"
      ? "https://anixo.buzz/embed/ani/" + aniListId + "/" + episode + "?track=" + audioTrack
      : streamServer === "HD-2"
        ? "https://aniembed.se/e/" + aniListId + "/" + episode + "?lang=" + audioTrack
        : "https://aniplayer.xyz/embeds/" + aniListId + "/" + episode + "/" + audioTrack
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
  const filtered = catalog
    .filter(
      (a) =>
        a.title.toLowerCase().includes(query.toLowerCase()) &&
        (genre === "All genres" || a.genre === genre) &&
        (year === "All years" || String(a.year) === year) &&
        (seasonFilter === "All seasons" ||
          (storyFor(a.title)?.season || "All") === seasonFilter) &&
        (page !== "Movies" || isFilm(a.title)),
    )
    .sort((a, b) =>
      sort === "Highest rated"
        ? Number(b.score) - Number(a.score)
        : sort === "Latest"
          ? b.year - a.year
          : sort === "Alphabetical"
            ? a.title.localeCompare(b.title)
            : 0,
    )
  const watch = (a: Anime, e = 1, s = 1) => {
    const previous = history[a.title]
    if (selected.title !== a.title) { setAniListId(a.id ? Number(a.id) : null); setAniListMeta(null); setKitsuAnime(null); setKitsuEpisodes([]) }
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
  return (
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
          {["Home", "Discover", "Anime", "Movies", "Genres", "Schedule"].map(
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
              ? [
                  "Action",
                  "Adventure",
                  "Fantasy",
                  "Romance",
                  "Comedy",
                  "Sci-Fi",
                ]
              : menu === "language"
                ? ["English", "日本語", "Español"]
                : ["My profile", "My watchlist", "Preferences", "Sign in"]
            ).map((item) => (
              <button
                key={item}
                onClick={() => {
                  if (menu === "genres") {
                    setGenre(item)
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
        {page === "Home" && (
          <>
            <section
              className="hero"
              style={{
                backgroundImage: `url(${hero.title === selected.title && kitsuAnime?.banner ? kitsuAnime.banner : (slide === 0 ? hero.image : (hero.banner || hero.image))})`,
              }}
            >
              <div className="hero-shade" />
              <div className="hero-content">
                <div className="feature-label">
                  <span /> THE ANISCROLL SPOTLIGHT
                </div>
                <div className="film-kicker">
                  {slide === 0
                    ? "A MAKOTO SHINKAI FILM"
                    : `FROM ${(storyFor(hero.title)?.studio || "ANIME STUDIOS").toUpperCase()}`}
                </div>
                <h1>{hero.title}</h1>
                <div className="hero-alt">
                  {slide === 0
                    ? "君の名は。"
                    : "A story worth getting lost in."}
                </div>
                <div className="hero-meta">
                  <span className="score">★ {hero.score}</span>
                  <span>{hero.year}</span>
                  <span className="age">PG-13</span>
                  <span>{slide === 0 ? "1h 46m" : "Series"}</span>
                  <span className="quality">HD</span>
                </div>
                <p className="hero-description">
                  {slide === 0
                    ? "Two strangers. One extraordinary connection. When their dreams intertwine, a bond forms across time—and a love that could change everything."
                    : "Step into an extraordinary world where courage is tested, friendships are forged, and every episode leaves you wanting more."}
                </p>
                <div className="genres-line">
                  {hero.genre} <span>•</span> Fantasy <span>•</span>{" "}
                  Supernatural
                </div>
                <div className="hero-actions">
                  <button className="button white" onClick={() => watch(hero)}>
                    <Icon name="play" size={19} /> Watch Now
                  </button>
                  <button className="button glass" onClick={() => toggle(hero)}>
                    <Icon
                      name={saved.includes(hero.title) ? "check" : "plus"}
                    />{" "}
                    {saved.includes(hero.title) ? "In My List" : "My List"}
                  </button>
                  <button className="more-info" onClick={() => detail(hero)}>
                    <Icon name="info" size={19} /> More Info
                  </button>
                </div>
              </div>
              <div className="hero-bottom">
                <div className="slide-dots">
                  {[0, 1, 2, 3].map((i) => (
                    <button
                      aria-label={`Featured anime ${i + 1}`}
                      aria-pressed={slide === i}
                      className={slide === i ? "selected" : ""}
                      key={i}
                      onClick={() => setSlide(i)}
                    />
                  ))}
                </div>
                <span className="hero-caption">YOUR NEXT ANIME OBSESSION.</span>
                <div className="carousel-controls">
                  <span>
                    0{slide + 1}
                    <small> / 04</small>
                  </span>
                  <button
                    aria-label="Previous feature"
                    onClick={() => setSlide((slide + 3) % 4)}
                  >
                    <span className="reverse">
                      <Icon name="chevron" size={18} />
                    </span>
                  </button>
                  <button
                    aria-label="Next feature"
                    onClick={() => setSlide((slide + 1) % 4)}
                  >
                    <Icon name="chevron" size={18} />
                  </button>
                </div>
              </div>
            </section>
            <div className="home-content">
              <section>
                {heading(
                  "Pick up where you left off",
                  "Continue Watching",
                  () => {
                    go("Watchlist")
                    setTab("Currently Watching")
                  },
                )}
                <div className="continue-row">
                  {[anime[1], anime[3], anime[0], anime[7]].map((a, i) => (
                    <article className="continue-card" key={a.title}>
                      <button
                        className="continue-image"
                        aria-label={`Resume ${a.title}`}
                        onClick={() =>
                          watch(
                            a,
                            history[a.title].episode,
                            history[a.title].season,
                          )
                        }
                      >
                        <img src={a.image} alt={a.title} />
                        <span className="episode-badge">
                          S{history[a.title].season} E{history[a.title].episode}
                        </span>
                        <span className="resume-play">
                          <Icon name="play" size={22} />
                        </span>
                        <span className="time-left">
                          {Math.ceil(
                            ((100 - history[a.title].progress) *
                              runtimeFor(a.title)) /
                              6000,
                          )}
                          m left
                        </span>
                        <span className="progress-track">
                          <span
                            style={{ width: `${history[a.title].progress}%` }}
                          />
                        </span>
                      </button>
                      <button
                        className="continue-title"
                        onClick={() => detail(a)}
                      >
                        {a.title}
                      </button>
                      <p>
                        {
                          storyFor(a.title).episodes[
                            history[a.title].episode - 1
                          ]
                        }
                      </p>
                    </article>
                  ))}
                </div>
              </section>
              <section>
                {heading("Trending now", "The anime everyone’s talking about")}
                <div
                  className="poster-row"
                  aria-label="Trending anime"
                  tabIndex={0}
                >
                  {catalog.slice(0, 6).map(card)}
                </div>
              </section>
              <section>
                {heading(
                  "Popular this season",
                  "Fresh stories. New obsessions.",
                )}
                <div className="season-banner">
                  <div>
                    <span className="eyebrow">THE SPRING COLLECTION</span>
                    <h2>
                      A new season.
                      <br />A whole new world.
                    </h2>
                    <p>
                      Meet your next favorite. Explore the stories
                      <br />
                      making this season unforgettable.
                    </p>
                    <button
                      className="button white"
                      onClick={() => {
                        setSeasonFilter("Spring")
                        go("Discover")
                      }}
                    >
                      Explore the season <Icon name="chevron" size={17} />
                    </button>
                  </div>
                  <div className="season-posters">
                    {[catalog[3 % catalog.length], catalog[2 % catalog.length], catalog[7 % catalog.length]].map((a) => (
                      <img key={a.title} src={a.image} alt={a.title} />
                    ))}
                  </div>
                </div>
              </section>
              <section>
                {heading(
                  "Made for your watchlist",
                  "Because you watched Jujutsu Kaisen",
                )}
                <div className="poster-row">
                  {[...catalog.slice(2, 6), anime[7], anime[6]].map(card)}
                </div>
              </section>
              <section>
                {heading("Find your kind of adventure")}
                <div className="genre-grid">
                  {[
                    "Action",
                    "Adventure",
                    "Fantasy",
                    "Romance",
                    "Comedy",
                    "Sci-Fi",
                  ].map((g, i) => (
                    <button
                      key={g}
                      onClick={() => {
                        setGenre(g)
                        go("Discover")
                      }}
                      style={{
                        backgroundImage: `linear-gradient(90deg,rgba(20,12,35,.8),rgba(20,12,35,.3)),url(${catalog[i % catalog.length].image})`,
                      }}
                    >
                      <span>{g}</span>
                      <Icon name="chevron" size={18} />
                    </button>
                  ))}
                </div>
              </section>
              <section>
                {heading("Coming up next", "Never miss a moment", () =>
                  go("Schedule"),
                )}
                <div className="schedule-list">
                  {catalog.slice(0, 3).map((a, i) => (
                    <div className="schedule-item" key={a.title}>
                      <img src={a.image} alt="" />
                      <div>
                        <h3>{a.title}</h3>
                        <p>
                          Episode {i + 8} <span>•</span> Today,{" "}
                          {["18:30", "20:00", "21:30"][i]}
                        </p>
                      </div>
                      <button
                        className={reminders.includes(a.title) ? "active" : ""}
                        aria-label={`Remind me about ${a.title}`}
                        onClick={() => {
                          setReminders((r) =>
                            r.includes(a.title)
                              ? r.filter((t) => t !== a.title)
                              : [...r, a.title],
                          )
                          notify("Reminder preference updated")
                        }}
                      >
                        <Icon
                          name={reminders.includes(a.title) ? "check" : "bell"}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </>
        )}
        {["Discover", "Anime", "Movies"].includes(page) && (
          <div className="page-container">
            <span className="eyebrow">FIND YOUR NEXT OBSESSION</span>
            <h1>
              {page === "Movies"
                ? "Stories made for the big screen."
                : "A world of anime awaits."}
            </h1>
            <p className="muted">
              From hidden gems to all-time favorites. Find a story that stays
              with you.
            </p>
            <div className="search-box">
              <Icon name="search" size={23} />
              <input
                id="anime-search"
                aria-label="Search anime titles"
                type="search"
                placeholder="Search your next favorite anime…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button aria-label="Clear search" onClick={() => setQuery("")}>
                  <Icon name="close" />
                </button>
              )}
            </div>
            <div className="trending-search">
              <span>Trending searches</span>
              {["Solo Leveling", "Frieren", "Jujutsu Kaisen"].map((t) => (
                <button onClick={() => setQuery(t)} key={t}>
                  {t} ↗
                </button>
              ))}
            </div>
            <div className="filter-bar">
              <label>
                Genre
                <select
                  aria-label="Genre"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                >
                  {[
                    "All genres",
                    "Action",
                    "Adventure",
                    "Fantasy",
                    "Romance",
                    "Comedy",
                    "Sci-Fi",
                    "Horror",
                    "Isekai",
                    "Drama",
                    "Slice of Life",
                  ].map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </label>
              <label>
                Year
                <select
                  aria-label="Year"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                >
                  {["All years", "2025", "2024", "2023", "2022", "2016"].map(
                    (y) => (
                      <option key={y}>{y}</option>
                    ),
                  )}
                </select>
              </label>
              <label>
                Season
                <select
                  aria-label="Release season"
                  value={seasonFilter}
                  onChange={(e) => setSeasonFilter(e.target.value)}
                >
                  {["All seasons", "Winter", "Spring", "Summer", "Fall"].map(
                    (s) => (
                      <option key={s}>{s}</option>
                    ),
                  )}
                </select>
              </label>
              <label>
                Sort by
                <select
                  aria-label="Sort results"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  {[
                    "Popularity",
                    "Highest rated",
                    "Latest",
                    "Alphabetical",
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <button
                className="text-link reset"
                onClick={() => {
                  setQuery("")
                  setGenre("All genres")
                  setYear("All years")
                  setSeasonFilter("All seasons")
                }}
              >
                Reset filters
              </button>
              <button
                className="icon-button"
                aria-label="Toggle compact view"
                aria-pressed={compact}
                onClick={() => setCompact(!compact)}
              >
                <Icon name="grid" />
              </button>
            </div>
            <div className="results-heading">
              <h2>{query ? `Results for “${query}”` : "Explore all anime"}</h2>
              <span aria-live="polite" role="status">
                {
                  (page === "Movies"
                    ? filtered.filter((a) => a.title === featured.title)
                    : filtered
                  ).length
                }{" "}
                titles
              </span>
            </div>
            {loading ? (
              <div
                className="results-grid"
                aria-label="Updating anime results"
                aria-busy="true"
              >
                {Array.from({ length: 6 }, (_, i) => (
                  <div className="poster-skeleton" key={i}>
                    <div />
                    <span />
                    <span />
                  </div>
                ))}
              </div>
            ) : (
              <div className={`results-grid ${compact ? "compact" : ""}`}>
                {(page === "Movies"
                  ? filtered.filter((a) => a.title === featured.title)
                  : filtered
                ).map(card)}
              </div>
            )}
            {!loading && !filtered.length && (
              <div className="empty-state">
                <Icon name="search" size={42} />
                <h2>No stories found. Yet.</h2>
                <p>Try a different title or broaden your filters.</p>
                <button
                  className="button purple"
                  onClick={() => {
                    setQuery("")
                    setGenre("All genres")
                    setYear("All years")
                    setSeasonFilter("All seasons")
                  }}
                >
                  Explore all anime
                </button>
              </div>
            )}
          </div>
        )}
        {page === "Details" && (
          <>
            <section
              className="detail-hero"
              style={{
                backgroundImage: `url(${kitsuAnime?.banner || aniListMeta?.bannerImage || selected.banner || selected.image})`,
              }}
            >
              <div className="hero-shade" />
              <div className="detail-content">
                <img
                  className="detail-poster"
                  src={selected.image}
                  alt={selected.title}
                />
                <div>
                  <span className="eyebrow">
                    {selected.genre.toUpperCase()} · ANISCROLL SELECTION
                  </span>
                  <h1>{selected.title}</h1>
                  <p className="muted">{info.alternative}</p>
                  <div className="hero-meta">
                    <span className="score">★ {selected.score}</span>
                    <span>{selected.year}</span>
                    <span className="age">PG-13</span>
                    <span>
                      {isFilm(selected.title)
                        ? "1h 46m · Film"
                        : "24 min / episode · Series"}
                    </span>
                    <span className="quality">HD</span>
                  </div>
                  <p
                    id="anime-synopsis"
                    className={`detail-description ${
                      readMore ? "expanded" : ""
                    }`}
                  >
                    {aniListMeta?.description || selected.synopsis || info.synopsis}
                  </p>
                  <button
                    className="text-link"
                    onClick={() => setReadMore(!readMore)}
                    aria-expanded={readMore}
                    aria-controls="anime-synopsis"
                  >
                    {readMore ? "Read less" : "Read more"}
                  </button>
                  <div className="series-facts">
                    <span>
                      <strong>Studio</strong>
                      {info.studio}
                    </span>
                    <span>
                      <strong>Genre</strong>
                      {selected.genre}
                    </span>
                    <span>
                      <strong>Collection</strong>
                      {isFilm(selected.title)
                        ? "Feature film"
                        : `${info.seasons} preview season${
                            info.seasons > 1 ? "s" : ""
                          }`}
                    </span>
                  </div>
                  <p className="availability">
                    <span /> SUB & DUB AVAILABLE · Japanese, English
                  </p>
                  <div className="hero-actions">
                    <button
                      className="button white"
                      onClick={() => {
                        const previous = history[selected.title]
                        watch(
                          selected,
                          previous?.episode || 1,
                          previous?.season || 1,
                        )
                      }}
                    >
                      <Icon name="play" />{" "}
                      {history[selected.title]
                        ? "Resume Watching"
                        : "Start Watching"}
                    </button>
                    <button
                      className="button glass"
                      aria-pressed={saved.includes(selected.title)}
                      onClick={() => toggle(selected)}
                    >
                      <Icon
                        name={saved.includes(selected.title) ? "check" : "plus"}
                      />
                      {saved.includes(selected.title)
                        ? "In Watchlist"
                        : "Watchlist"}
                    </button>
                    <button
                      className="icon-button"
                      aria-label="Share anime"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(
                            `${location.origin}${animePath(selected.title)}`,
                          )
                          notify("Share link copied")
                        } catch {
                          notify(
                            "Clipboard unavailable. Copy this page’s address to share.",
                          )
                        }
                      }}
                    >
                      <Icon name="globe" />
                    </button>
                  </div>
                </div>
              </div>
            </section>
            <div className="page-container detail-body">
              <div className="tabs">
                {["Episodes", "Overview", "Characters", "Related Anime"].map(
                  (t) => (
                    <button
                      className={tab === t ? "selected" : ""}
                      onClick={() => setTab(t)}
                      key={t}
                    >
                      {t}
                    </button>
                  ),
                )}
              </div>
              {tab === "Episodes" ? (
                <>
                  <div className="section-heading">
                    <h2>
                      {isFilm(selected.title) ? "Watch the film" : "Episodes"}{" "}
                      <span className="heading-note">
                        {episodeCount} available in preview
                      </span>
                    </h2>
                    {!isFilm(selected.title) && (
                      <select
                        aria-label="Season"
                        value={season}
                        onChange={(e) => setSeason(+e.target.value)}
                      >
                        {Array.from({ length: info.seasons }, (_, i) => (
                          <option value={i + 1} key={i}>
                            Season {i + 1}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="episode-list">{episodes}</div>
                  <p className="catalog-note">
                    Catalog data ·{" "}
                    {isFilm(selected.title)
                      ? "One feature-length film"
                      : "Six sample entries per season"}
                    . Episode titles and thumbnails use Kitsu when available; playback is supplied by the selected embedded server.
                  </p>
                  <section className="related-preview">
                    {heading("More worlds to get lost in")}
                    <div className="poster-row">
                      {anime
                        .filter((a) => a.title !== selected.title)
                        .slice(0, 6)
                        .map(card)}
                    </div>
                  </section>
                </>
              ) : tab === "Related Anime" ? (
                <div className="results-grid">
                  {catalog.filter((a) => a.title !== selected.title).map(card)}
                </div>
              ) : tab === "Characters" ? (
                <div className="empty-state">
                  <Icon name="user" size={32} />
                  <h2>The people behind the story</h2>
                  <p>Character profiles are coming soon to this preview.</p>
                </div>
              ) : (
                <div className="overview">
                  <h2>About {selected.title}</h2>
                  <p>{aniListMeta?.description || selected.synopsis || info.synopsis}</p>
                  <p>
                    Released: {selected.year} · Genre: {selected.genre} ·
                    Rating: {selected.score}/10
                  </p>
                </div>
              )}
            </div>
          </>
        )}
        {page === "Player" && (
          <div className="player-page">
            <button className="text-link" onClick={() => detail(selected)}>
              ← Back to {selected.title}
            </button>
            <div
              className={`video-placeholder ${controlsVisible || !playing || playerSettings ? "" : "controls-idle"} ${embedUrl ? "has-stream" : ""}`}
              onPointerMove={() => setControlsVisible(true)}
              onPointerDown={() => setControlsVisible(true)}
              onFocusCapture={() => setControlsVisible(true)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setPlayerSettings(false)
              }}
            >
              {embedUrl ? (
                <iframe key={embedUrl} className="stream-frame" title={selected.title + " episode " + episode}
                  src={embedUrl} loading="eager"
                  sandbox="allow-scripts allow-same-origin allow-presentation"
                  allow="autoplay; fullscreen; picture-in-picture" allowFullScreen
                  referrerPolicy="no-referrer" onLoad={() => setEmbedError(false)} onError={() => setEmbedError(true)} />
              ) : (
                <div className="video-center">
                  <Logo />
                  <button className="big-play" onClick={() => notify(metadataLoading ? "Finding anime metadata…" : "Choose an anime with an AniList ID to load a stream")} aria-label="Loading stream">
                    <Icon name="play" size={32} />
                  </button>
                  <p>{metadataLoading ? "Connecting anime metadata" : "Select a server to start watching"}</p>
                  <small>{aniListId ? "Choose HD-1, HD-2 or HD-3 below" : "AniList ID resolution is required before playback"}</small>
                </div>
              )}
              <button
                className="skip-intro button glass"
                hidden={isFilm(selected.title) || progress > 8}
                onClick={() => {
                  setProgress(8.5)
                  notify("Intro skipped")
                }}
              >
                Skip intro <Icon name="chevron" size={16} />
              </button>
              <div className="player-controls">
                <input
                  aria-label="Seek"
                  type="range"
                  min="0"
                  max="100"
                  value={progress}
                  aria-valuetext={`${formatTime((progress * duration) / 100)} of ${formatTime(duration)}`}
                  onChange={(e) => setProgress(+e.target.value)}
                />
                <div>
                  <button
                    aria-label={playing ? "Pause" : "Play"}
                    onClick={() => setPlaying(!playing)}
                  >
                    <Icon name={playing ? "pause" : "play"} />
                  </button>
                  <button
                    aria-label="Next episode"
                    disabled={episode >= episodeCount}
                    onClick={nextEpisode}
                  >
                    <Icon name="chevron" />
                  </button>
                  <button
                    aria-label={volume ? "Mute" : "Unmute"}
                    onClick={() => setVolume((v) => (v ? 0 : 70))}
                  >
                    <Icon name="volume" />
                  </button>
                  <input
                    className="volume"
                    aria-label="Volume"
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => setVolume(+e.target.value)}
                  />
                  <span>
                    {formatTime((progress * duration) / 100)} /{" "}
                    {formatTime(duration)}
                  </span>
                  <div className="player-spacer" />
                  <button
                    aria-label="Playback settings"
                    aria-expanded={playerSettings}
                    aria-controls="playback-settings"
                    onClick={() => setPlayerSettings(!playerSettings)}
                  >
                    <Icon name="settings" />
                  </button>
                  <button
                    aria-label={
                      fullscreen ? "Exit fullscreen" : "Enter fullscreen"
                    }
                    onClick={toggleFullscreen}
                  >
                    <Icon name="expand" />
                  </button>
                </div>
              </div>
              {playerSettings && (
                <div
                  className="playback-settings"
                  id="playback-settings"
                  role="region"
                  aria-label="Playback settings"
                >
                  <div className="settings-heading">
                    <h3>Playback settings</h3>
                    <button
                      aria-label="Close playback settings"
                      onClick={() => setPlayerSettings(false)}
                    >
                      <Icon name="close" size={18} />
                    </button>
                  </div>
                  <label>
                    Stream audio
                    <select aria-label="Stream audio" value={audioTrack}
                      onChange={(e) => { setAudioTrack(e.target.value as "sub" | "dub"); setEmbedError(false) }}>
                      <option value="sub">Sub</option><option value="dub">Dub</option>
                    </select>
                  </label>
                  <label>
                    Subtitles
                    <select
                      aria-label="Subtitles"
                      value={subtitles}
                      onChange={(e) => setSubtitles(e.target.value)}
                    >
                      <option>English</option>
                      <option>Japanese</option>
                      <option>Off</option>
                    </select>
                  </label>
                  <label>
                    Playback speed
                    <select
                      aria-label="Playback speed"
                      value={speed}
                      onChange={(e) => setSpeed(e.target.value)}
                    >
                      {["0.75", "1", "1.25", "1.5", "2"].map((s) => (
                        <option key={s} value={s}>
                          {s}×{s === "1" ? " · Normal" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Video quality
                    <select
                      aria-label="Video quality"
                      value={quality}
                      onChange={(e) => setQuality(e.target.value)}
                    >
                      <option>1080p</option>
                      <option>720p</option>
                      <option>480p</option>
                    </select>
                  </label>
                  <p>
                    Playback is handled by the selected embedded server. Some controls are provider-managed.
                  </p>
                </div>
              )}
            </div>
            <div className="stream-picker" aria-label="Embedded playback options">
              <div className="stream-picker-group"><span>Server</span>
                {["HD-1", "HD-2", "HD-3"].map((server) => (
                  <button key={server} className={streamServer === server ? "selected" : ""} aria-pressed={streamServer === server} onClick={() => { setStreamServer(server); setEmbedError(false) }}>{server}</button>
                ))}
              </div>
              <div className="stream-picker-group"><span>Audio</span>
                {(["sub", "dub"] as const).map((track) => (
                  <button key={track} className={audioTrack === track ? "selected" : ""} aria-pressed={audioTrack === track} onClick={() => { setAudioTrack(track); setEmbedError(false) }}>{track.toUpperCase()}</button>
                ))}
              </div>
              <p>{embedError ? "This embed may be unavailable. Try another HD server." : "Sandbox restrictions block popups and top-level navigation; ads within a provider frame may still appear."}</p>
            </div>
            <div className="player-info">
              <div>
                <span className="eyebrow">
                  {isFilm(selected.title)
                    ? "FEATURE FILM"
                    : `SEASON ${season} · EPISODE ${episode}`}{" "}
                  · {quality} · {audioTrack.toUpperCase()} ·{" "}
                  {subtitles === "Off" ? "CC OFF" : `${subtitles} CC`}
                </span>
                <h1>{selected.title}</h1>
                <p>
                  {season === 1
                    ? info.episodes[episode - 1]
                    : `Season ${season} · Preview chapter ${episode}`}
                </p>
              </div>
              <button
                className="button purple"
                disabled={episode >= episodeCount}
                onClick={nextEpisode}
              >
                {isFilm(selected.title)
                  ? "Feature film"
                  : episode >= episodeCount
                    ? "Last preview episode"
                    : "Next episode"}{" "}
                <Icon name="chevron" size={17} />
              </button>
            </div>
            <div className="player-options">
              <button
                disabled={episode <= 1}
                onClick={() => {
                  setEpisode((e) => Math.max(1, e - 1))
                  setProgress(0)
                }}
              >
                ← Previous episode
              </button>
              <label>
                <input
                  type="checkbox"
                  checked={autoplay}
                  onChange={(e) => setAutoplay(e.target.checked)}
                />{" "}
                Autoplay next episode
              </label>
              <span>Space: play / pause · ← / →: seek</span>
            </div>
          </div>
        )}
        {page === "Watchlist" && (
          <div className="page-container">
            <span className="eyebrow">YOUR PERSONAL ANIME UNIVERSE</span>
            <h1>
              My library<span className="purple-text">.</span>
            </h1>
            <p className="muted">
              The stories you love. The ones you haven’t met yet.
            </p>
            <div className="session-notice">
              <Icon name="info" size={17} />
              <span>
                Your library is saved in this browser. Supabase watchlists sync when configured.
              </span>
              <button onClick={() => go("Discover")}>
                Find something new <Icon name="chevron" size={14} />
              </button>
            </div>
            <div className="tabs library-tabs">
              {[
                "Watchlist",
                "Currently Watching",
                "Completed",
                "Plan to Watch",
                "On Hold",
                "Dropped",
              ].map((t) => (
                <button
                  className={
                    tab === t || (t === "Watchlist" && tab === "Episodes")
                      ? "selected"
                      : ""
                  }
                  key={t}
                  onClick={() => setTab(t)}
                >
                  {t}
                  {t === "Watchlist" && ` (${saved.length})`}
                </button>
              ))}
            </div>
            <div className="library-toolbar">
              <p>
                {tab === "Watchlist"
                  ? `${saved.length} saved titles`
                  : tab === "Currently Watching"
                    ? "Your in-progress stories"
                    : `${tab} collection`}
              </p>
              <label>
                Sort by
                <select
                  value={librarySort}
                  onChange={(e) => setLibrarySort(e.target.value)}
                >
                  <option>Recently saved</option>
                  <option>Title A–Z</option>
                  <option>Highest rated</option>
                </select>
              </label>
            </div>
            {libraryTitles.length ? (
              <div className="results-grid">{libraryTitles.map(card)}</div>
            ) : (
              <div className="empty-state">
                <Icon name="bookmark" size={45} />
                <h2>
                  {tab === "Watchlist" || tab === "Episodes"
                    ? "Your next obsession belongs here."
                    : `Nothing ${tab.toLowerCase()} yet.`}
                </h2>
                <p>
                  Save a story that catches your eye. Your collection starts
                  with one anime.
                </p>
                <button
                  className="button purple"
                  onClick={() => go("Discover")}
                >
                  Discover anime <Icon name="chevron" size={16} />
                </button>
              </div>
            )}
          </div>
        )}
        {page === "Schedule" && (
          <div className="page-container">
            <span className="eyebrow">MAKE ROOM FOR YOUR FAVORITES</span>
            <h1>Your weekly anime fix.</h1>
            <p className="muted">
              New adventures, right on time. Release times shown in your local
              timezone.
            </p>
            <div className="tabs">
              {scheduleDays.map((day) => (
                <button
                  key={day.key}
                  className={scheduleDate === day.key ? "selected" : ""}
                  onClick={() => setScheduleDate(day.key)}
                  aria-pressed={scheduleDate === day.key}
                >
                  {day.label} <span className="schedule-date-label">{day.dateLabel}</span>
                </button>
              ))}
            </div>
            <h2>{selectedScheduleDay.label}’s releases</h2>
            {scheduleLoading ? (
              <div className="empty-state">
                <Icon name="calendar" size={32} />
                <h2>Loading airing schedule…</h2>
                <p>Checking AniList for upcoming episodes.</p>
              </div>
            ) : scheduleError ? (
              <div className="empty-state" role="status">
                <Icon name="info" size={32} />
                <h2>Schedule unavailable</h2>
                <p>{scheduleError}</p>
                <button className="button purple" onClick={() => setPage("Home")}>Back to home</button>
              </div>
            ) : releasesForSelectedDay.length ? (
              <div className="schedule-page">
                {releasesForSelectedDay.map((release) => {
                  const a = normalizeAniList(release.media)
                  const airingTime = new Date(release.airingAt * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  return (
                    <div className="schedule-item" key={release.id}>
                      <img src={a.image} alt={a.title} loading="lazy" />
                      <div>
                        <h3>{a.title}</h3>
                        <p>
                          Episode {release.episode} · {airingTime} · {a.isAdult ? "18+ adult title" : "AniList airing"}
                        </p>
                      </div>
                      <button
                        className="button glass"
                        onClick={() => {
                          setReminders((items) =>
                            items.includes(a.title)
                              ? items.filter((title) => title !== a.title)
                              : [...items, a.title],
                          )
                          notify("Reminder preference updated")
                        }}
                      >
                        <Icon name={reminders.includes(a.title) ? "check" : "bell"} />
                        {reminders.includes(a.title) ? "Reminder set" : "Remind me"}
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="empty-state">
                <Icon name="calendar" size={32} />
                <h2>No listed releases</h2>
                <p>AniList has no upcoming anime episodes listed for {selectedScheduleDay.label.toLowerCase()}.</p>
              </div>
            )
          </div>
        )}
        {page === "Profile" && (
          <div className="page-container profile-page">
            <div className="profile-heading">
              <div className="avatar large">
                {preferences.name.slice(0, 1).toUpperCase() || "K"}
              </div>
              <div>
                <span className="eyebrow">YOUR ANISCROLL SPACE</span>
                <h1>Hey, {preferences.name}.</h1>
                <p className="muted">
                  Every great adventure starts with one episode.
                </p>
              </div>
            </div>
            <div className="session-notice">
              <Icon name="info" size={18} />
              <span>
                {signedIn
                  ? "Signed-in account session."
                  : "Guest mode · Preferences and history are stored in this browser."}
              </span>
              <button
                onClick={() => {
                  if (signedIn) {
                    if (hasSupabaseConfig && supabase) void supabase.auth.signOut()
                    setSessionUserId(null)
                    setSignedIn(false)
                    notify("Signed out")
                  } else go("Auth")
                }}
              >
                {signedIn ? "Sign out of preview" : "Sign in preview"}
              </button>
            </div>
            <div className="stats">
              {[
                [
                  String(
                    Object.values(history).filter((h) => h.progress >= 100)
                      .length,
                  ),
                  "Preview entries finished",
                ],
                [String(Object.keys(history).length), "Stories in progress"],
                [
                  formatTime(
                    Object.entries(history).reduce(
                      (total, [title, h]) =>
                        total + (h.progress * runtimeFor(title)) / 100,
                      0,
                    ),
                  ),
                  "Preview watch time",
                ],
                [String(saved.length), "Saved for later"],
              ].map(([n, l]) => (
                <div key={l}>
                  <strong>{n}</strong>
                  <span>{l}</span>
                </div>
              ))}
            </div>
            <form
              className="preferences"
              onSubmit={(e) => {
                e.preventDefault()
                const next = {
                  ...draftPreferences,
                  name: draftPreferences.name.trim() || "Kaito",
                }
                setPreferences(next)
                setDraftPreferences(next)
                setAudio(next.audio)
                setSubtitles(next.subtitles)
                setAutoplay(next.autoplay)
                notify("Preferences updated for this preview")
              }}
            >
              <h2>Make yourself at home</h2>
              <p className="muted">
                Personalize your viewing experience. Preferences apply to this
                preview session.
              </p>
              <label>
                Display name
                <input
                  required
                  maxLength={30}
                  value={draftPreferences.name}
                  onChange={(e) =>
                    setDraftPreferences((p) => ({ ...p, name: e.target.value }))
                  }
                  autoComplete="nickname"
                />
              </label>
              <label>
                Preferred audio
                <select
                  aria-label="Preferred audio"
                  value={draftPreferences.audio}
                  onChange={(e) =>
                    setDraftPreferences((p) => ({
                      ...p,
                      audio: e.target.value,
                    }))
                  }
                >
                  <option>Japanese</option>
                  <option>English</option>
                </select>
              </label>
              <label>
                Subtitles
                <select
                  aria-label="Preferred subtitles"
                  value={draftPreferences.subtitles}
                  onChange={(e) =>
                    setDraftPreferences((p) => ({
                      ...p,
                      subtitles: e.target.value,
                    }))
                  }
                >
                  <option>English</option>
                  <option>Off</option>
                </select>
              </label>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={draftPreferences.autoplay}
                  onChange={(e) =>
                    setDraftPreferences((p) => ({
                      ...p,
                      autoplay: e.target.checked,
                    }))
                  }
                />{" "}
                Autoplay next episode
              </label>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={draftPreferences.notifications}
                  onChange={(e) =>
                    setDraftPreferences((p) => ({
                      ...p,
                      notifications: e.target.checked,
                    }))
                  }
                />{" "}
                New episode notifications
              </label>
              <button className="button purple" type="submit">
                Save preferences
              </button>
            </form>
            {isAdmin && (
              <button className="button purple admin-open-button" onClick={() => go("Admin")}>
                Open admin dashboard <Icon name="chevron" size={16} />
              </button>
            )}
            <button className="text-link" onClick={() => go("Auth")}>
              Sign in to your account <Icon name="chevron" size={16} />
            </button>
          </div>
        )}
        {page === "Admin" && (
          <div className="page-container admin-page">
            <span className="eyebrow">ANISCROLL CONTROL ROOM</span>
            <h1>Catalog dashboard</h1>
            <p className="muted">Manage metadata overrides for AniList titles. Source IDs and stream-provider mappings remain unchanged.</p>
            {!isAdmin ? (
              <div className="session-notice">
                <Icon name="info" size={18} />
                <span>Admin access is not enabled. A project owner must promote your profile role to admin in Supabase.</span>
                <button className="text-link" onClick={() => go("Profile")}>Back to profile</button>
              </div>
            ) : (
              <>
                <div className="admin-summary-grid">
                  <div className="admin-summary-card"><span>Catalog entries</span><strong>{catalog.length}</strong></div>
                  <div className="admin-summary-card"><span>Metadata overrides</span><strong>{adminOverrides.length}</strong></div>
                  <div className="admin-summary-card"><span>Featured overrides</span><strong>{adminOverrides.filter((item) => item.featured && !item.hidden).length}</strong></div>
                </div>
                <form className="admin-form" onSubmit={async (e) => {
                  e.preventDefault()
                  const form = e.currentTarget
                  const values = new FormData(form)
                  const anilistId = Number(values.get("anilist_id"))
                  if (!Number.isSafeInteger(anilistId) || anilistId <= 0) {
                    notify("Enter a valid AniList ID.")
                    return
                  }
                  const savedRecord = await saveAdminRecord({
                    anilist_id: anilistId,
                    title_override: String(values.get("title_override") || "").trim() || null,
                    cover_url: String(values.get("cover_url") || "").trim() || null,
                    banner_url: String(values.get("banner_url") || "").trim() || null,
                    synopsis_override: String(values.get("synopsis_override") || "").trim() || null,
                    featured: values.get("featured") === "on",
                    hidden: values.get("hidden") === "on",
                  })
                  if (savedRecord) {
                    form.reset()
                    notify("Catalog override saved")
                  }
                }}>
                  <div className="admin-form-heading">
                    <div><h2>Add or update an anime</h2><p className="muted">Reuse the AniList ID to update an existing record.</p></div>
                  </div>
                  <label>AniList ID <input type="number" name="anilist_id" min="1" step="1" placeholder="e.g. 21" required /></label>
                  <label>Title override <input name="title_override" maxLength={160} placeholder="Leave blank to use AniList title" /></label>
                  <label>Cover image URL <input name="cover_url" type="url" placeholder="Optional poster URL" /></label>
                  <label>Banner image URL <input name="banner_url" type="url" placeholder="Optional wide banner URL" /></label>
                  <label>Synopsis override <textarea name="synopsis_override" rows={3} maxLength={6000} placeholder="Leave blank to use AniList synopsis" /></label>
                  <div className="admin-checks">
                    <label className="check-label"><input type="checkbox" name="featured" /> Mark as featured</label>
                    <label className="check-label"><input type="checkbox" name="hidden" /> Hide from browse pages</label>
                  </div>
                  <button className="button purple" type="submit">Save catalog override</button>
                </form>
                <section className="admin-records">
                  <div className="admin-form-heading"><h2>Existing overrides</h2><span>{adminOverrides.length} records</span></div>
                  {adminOverrides.length ? adminOverrides.map((record) => (
                    <div className="admin-record" key={record.anilist_id}>
                      <div><strong>{record.title_override || ("AniList #" + record.anilist_id)}</strong><span>ID {record.anilist_id} · {record.hidden ? "Hidden" : record.featured ? "Featured" : "Visible"}</span></div>
                      <button className="text-link" onClick={() => void removeAdminRecord(Number(record.anilist_id))}>Delete</button>
                    </div>
                  )) : <p className="muted">No overrides yet. Default AniList metadata remains in use.</p>}
                </section>
              </>
            )}
          </div>
        )}
        {page === "Auth" && (
          <div className="auth-page">
            <form
              className="auth-card"
              onSubmit={async (e) => {
                e.preventDefault()
                const form = e.currentTarget
                const email = (form.querySelector<HTMLInputElement>('input[type="email"]')?.value || "").trim()
                const passwordValue = form.querySelector<HTMLInputElement>('input[type="password"]')?.value || ""
                if (!hasSupabaseConfig || !supabase) {
                  if (auth === "Sign in") { setSignedIn(true); notify("Guest preview started. Configure Supabase for real accounts."); go("Home") }
                  else notify("Configure Supabase environment variables to enable account actions.")
                  return
                }
                if (auth === "Sign in") {
                  const { data, error } = await supabase.auth.signInWithPassword({ email, password: passwordValue })
                  if (error) { notify(error.message); return }
                  setSessionUserId(data.user?.id || null); setSignedIn(Boolean(data.user)); notify("Signed in successfully"); go("Home")
                } else if (auth === "Create account") {
                  const { error } = await supabase.auth.signUp({ email, password: passwordValue, options: { emailRedirectTo: window.location.origin } })
                  if (error) { notify(error.message); return }
                  setAuth("Email verification")
                } else if (auth === "Forgot password") {
                  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
                  if (error) { notify(error.message); return }
                  setAuth("Email verification")
                }
              }}
            >
              <Logo />
              <span className="eyebrow">YOUR NEXT ANIME OBSESSION.</span>
              <h1>
                {auth === "Sign in"
                  ? "Welcome back."
                  : auth === "Create account"
                    ? "Your story starts here."
                    : auth === "Forgot password"
                      ? "Let’s get you back in."
                      : "Check your inbox."}
              </h1>
              <p className="muted">
                {auth === "Email verification"
                  ? "Check the email associated with your configured Supabase project to continue."
                  : auth === "Sign in"
                    ? "A whole world of anime is waiting for you."
                    : "Discover the stories you’ll fall in love with."}
              </p>
              {auth !== "Email verification" && (
                <>
                  <label>
                    Email address
                    <input
                      required
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                    />
                  </label>
                  {auth !== "Forgot password" && (
                    <label>
                      Password
                      <div className="password-field">
                        <input
                          aria-label="Password"
                          required
                          minLength={6}
                          type={password ? "text" : "password"}
                          autoComplete={
                            auth === "Create account"
                              ? "new-password"
                              : "current-password"
                          }
                          placeholder="At least 6 characters"
                        />
                        <button
                          type="button"
                          onClick={() => setPassword(!password)}
                        >
                          {password ? "Hide" : "Show"}
                        </button>
                      </div>
                    </label>
                  )}
                  {auth === "Sign in" && (
                    <button
                      type="button"
                      className="text-link"
                      onClick={() => setAuth("Forgot password")}
                    >
                      Forgot password?
                    </button>
                  )}
                  <button className="button purple" type="submit">
                    {auth === "Forgot password"
                      ? "Reset password"
                      : auth === "Sign in"
                        ? "Sign in"
                        : "Create account"}
                  </button>
                </>
              )}
              {auth === "Email verification" ? (
                <button
                  type="button"
                  className="button purple"
                  onClick={() => go("Home")}
                >
                  Explore Aniscroll
                </button>
              ) : (
                <p className="auth-switch">
                  {auth === "Sign in"
                    ? "New to Aniscroll?"
                    : "Already have an account?"}{" "}
                  <button
                    type="button"
                    onClick={() =>
                      setAuth(auth === "Sign in" ? "Create account" : "Sign in")
                    }
                  >
                    {auth === "Sign in" ? "Create account" : "Sign in"}
                  </button>
                </p>
              )}
              <small>
                UI prototype · No account data is stored or submitted.
              </small>
            </form>
          </div>
        )}
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
  )
}
export default App