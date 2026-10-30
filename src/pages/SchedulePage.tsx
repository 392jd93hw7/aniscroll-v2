import { useMemo, useState } from "react"
import { useAppPageData } from "../context/AppPageContext"

const TIME_ZONES = [
  "Asia/Kolkata",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Los_Angeles",
  "UTC",
]

function parseLocalDate(key: string) {
  const [year, month, day] = String(key).split("-").map(Number)
  return new Date(year, month - 1, day, 12, 0, 0)
}

function formatInTimeZone(date: Date, timeZone: string, options: Intl.DateTimeFormatOptions) {
  try {
    return new Intl.DateTimeFormat(undefined, { ...options, timeZone }).format(date)
  } catch {
    return new Intl.DateTimeFormat(undefined, options).format(date)
  }
}

export default function SchedulePage() {
  const {
    reminders = [],
    setReminders,
    scheduleLoading,
    scheduleError,
    scheduleDate,
    setScheduleDate,
    scheduleWeekOffset,
    setScheduleWeekOffset,
    notify,
    normalizeAniList,
    scheduleDays = [],
    selectedScheduleDay,
    releasesForSelectedDay = [],
    Icon,
    detail,
  } = useAppPageData()

  const [search, setSearch] = useState("")
  const [genre, setGenre] = useState("All genres")
  const [timeZone, setTimeZone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata"
    } catch {
      return "Asia/Kolkata"
    }
  })
  const [showReminders, setShowReminders] = useState(false)

  const browserTimeZone = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "Local"
    } catch {
      return "Local"
    }
  })()

  const dateFormatter = (key: string, options: Intl.DateTimeFormatOptions) =>
    formatInTimeZone(parseLocalDate(key), timeZone, options)

  const sameMonth = dateFormatter(scheduleDays[0]?.key || "", { month: "short" }) === dateFormatter(scheduleDays[6]?.key || "", { month: "short" })
  const weekRangeLabel = sameMonth
    ? `${dateFormatter(scheduleDays[0]?.key || "", { month: "short" })} ${dateFormatter(scheduleDays[0]?.key || "", { day: "numeric" })} – ${dateFormatter(scheduleDays[6]?.key || "", { day: "numeric" })}, ${dateFormatter(scheduleDays[6]?.key || "", { year: "numeric" })}`
    : `${dateFormatter(scheduleDays[0]?.key || "", { month: "short", day: "numeric" })} – ${dateFormatter(scheduleDays[6]?.key || "", { month: "short", day: "numeric", year: "numeric" })}`

  const genreOptions = useMemo(() => {
    const values = new Set<string>()
    releasesForSelectedDay.forEach((release: any) => {
      ;(release.media?.genres || []).forEach((value: string) => values.add(value))
    })
    return ["All genres", ...Array.from(values).sort((a, b) => a.localeCompare(b))]
  }, [releasesForSelectedDay])

  const releaseRows = useMemo(() => {
    return releasesForSelectedDay
      .map((release: any) => ({ release, anime: normalizeAniList(release.media) }))
      .filter(({ release, anime }: any) => {
        const title = String(anime.title || "").toLowerCase()
        const query = search.trim().toLowerCase()
        const matchesSearch = !query ||
          title.includes(query) ||
          String(release.episode).includes(query) ||
          String(release.media?.title?.romaji || "").toLowerCase().includes(query)
        const genres: string[] = release.media?.genres || anime.genres || []
        const matchesGenre = genre === "All genres" || genres.includes(genre)
        return matchesSearch && matchesGenre
      })
      .sort((a: any, b: any) => a.release.airingAt - b.release.airingAt)
  }, [releasesForSelectedDay, normalizeAniList, search, genre])

  const nextUpId = releaseRows.find(({ release }: any) => release.airingAt * 1000 >= Date.now())?.release.id
  const selectedDateTitle = selectedScheduleDay?.key
    ? dateFormatter(selectedScheduleDay.key, { weekday: "long", month: "long", day: "numeric" })
    : "This week"
  const todayKey = (() => {
    const date = new Date()
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
  })()

  const changeWeek = (amount: number) => {
    const nextOffset = scheduleWeekOffset + amount
    setScheduleWeekOffset(nextOffset)
    const currentStart = scheduleDays[0]?.key ? parseLocalDate(scheduleDays[0].key) : new Date()
    currentStart.setDate(currentStart.getDate() + amount * 7)
    const nextSelected = new Date(currentStart)
    nextSelected.setHours(12, 0, 0, 0)
    setScheduleDate(`${nextSelected.getFullYear()}-${String(nextSelected.getMonth() + 1).padStart(2, "0")}-${String(nextSelected.getDate()).padStart(2, "0")}`)
  }

  const goToToday = () => {
    setScheduleWeekOffset(0)
    setScheduleDate(todayKey)
  }

  const toggleReminder = (title: string) => {
    setReminders((items: string[]) =>
      items.includes(title)
        ? items.filter((item) => item !== title)
        : [...items, title],
    )
    notify(reminders.includes(title) ? "Reminder removed" : "Reminder preference saved")
  }

  const uniqueTimeZones = Array.from(new Set([timeZone, browserTimeZone, ...TIME_ZONES]))
  const remindableTitles = reminders.slice()

  return (
    <main className="schedule-shell">
      <header className="schedule-intro">
        <div>
          <span className="schedule-eyebrow">MAKE ROOM FOR YOUR FAVORITES</span>
          <h1>Your weekly anime fix<span>.</span></h1>
          <p>Find your next episode. Make a little room for adventure.</p>
        </div>
        <div className="schedule-live-label">
          <Icon name="calendar" size={15} />
          <span>LIVE ANILIST SCHEDULE</span>
        </div>
      </header>

      <section className="schedule-week-controls" aria-label="Schedule week controls">
        <div className="schedule-week-nav">
          <button className="schedule-square-button previous" onClick={() => changeWeek(-1)} aria-label="Previous week">
            <Icon name="chevron" size={18} />
          </button>
          <strong>{weekRangeLabel}</strong>
          <button className="schedule-square-button next" onClick={() => changeWeek(1)} aria-label="Next week">
            <Icon name="chevron" size={18} />
          </button>
          <button className="schedule-today-button" onClick={goToToday}>Today</button>
        </div>
        <label className="schedule-timezone">
          <span><Icon name="globe" size={14} /> Times in</span>
          <select value={timeZone} onChange={(event) => setTimeZone(event.target.value)} aria-label="Display times in timezone">
            {uniqueTimeZones.map((zone) => (
              <option value={zone} key={zone}>{zone === browserTimeZone ? `Local · ${zone}` : zone.replace(/_/g, " ")}</option>
            ))}
          </select>
        </label>
      </section>

      <section className="schedule-week-grid" aria-label="Choose a day">
        {scheduleDays.map((day: any) => {
          const selected = scheduleDate === day.key
          const isToday = day.key === todayKey
          return (
            <button
              key={day.key}
              className={`schedule-date-card ${selected ? "selected" : ""} ${isToday ? "today" : ""}`}
              onClick={() => setScheduleDate(day.key)}
              aria-pressed={selected}
            >
              <span className="schedule-date-weekday">{dateFormatter(day.key, { weekday: "short" })}</span>
              <strong>{dateFormatter(day.key, { day: "numeric" })}</strong>
              <span className="schedule-date-month">{isToday ? "TODAY" : dateFormatter(day.key, { month: "short" }).toUpperCase()}</span>
            </button>
          )
        })}
      </section>

      <section className="schedule-filters" aria-label="Filter releases">
        <label className="schedule-search">
          <Icon name="search" size={17} />
          <input
            type="search"
            placeholder="Search the lineup..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search the schedule"
          />
        </label>
        <label className="schedule-genre-filter">
          <span className="sr-only">Filter by genre</span>
          <select value={genre} onChange={(event) => setGenre(event.target.value)}>
            {genreOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
        <div className="schedule-reminders-wrap">
          <button className="schedule-reminders-button" onClick={() => setShowReminders(!showReminders)} aria-expanded={showReminders}>
            <Icon name="bell" size={15} />
            <span>My reminders</span>
            <strong>{reminders.length}</strong>
          </button>
          {showReminders && (
            <div className="schedule-reminders-popover">
              <strong>Saved reminders</strong>
              {remindableTitles.length ? remindableTitles.map((title: string) => (
                <div key={title}>
                  <span>{title}</span>
                  <button onClick={() => toggleReminder(title)} aria-label={`Remove reminder for ${title}`}><Icon name="close" size={13} /></button>
                </div>
              )) : <p>You have no reminders yet.</p>}
            </div>
          )}
        </div>
      </section>

      <section className="schedule-releases-section">
        <div className="schedule-releases-heading">
          <div>
            <span className="schedule-eyebrow">ON YOUR RADAR TODAY</span>
            <h2>{selectedDateTitle}</h2>
          </div>
          <span>{releaseRows.length} {releaseRows.length === 1 ? "release" : "releases"}</span>
        </div>

        {scheduleLoading ? (
          <div className="schedule-empty-state">
            <Icon name="calendar" size={28} />
            <strong>Loading this week's releases…</strong>
            <p>Fetching airing times from AniList.</p>
          </div>
        ) : scheduleError ? (
          <div className="schedule-empty-state error">
            <Icon name="info" size={28} />
            <strong>Schedule unavailable</strong>
            <p>{scheduleError}</p>
          </div>
        ) : releaseRows.length ? (
          <div className="schedule-release-list">
            {releaseRows.map(({ release, anime }: any) => {
              const isNextUp = release.id === nextUpId
              const isAired = release.airingAt * 1000 < Date.now()
              const titleGenres: string[] = release.media?.genres || anime.genres || []
              const airingTime = formatInTimeZone(
                new Date(release.airingAt * 1000),
                timeZone,
                { hour: "2-digit", minute: "2-digit", hourCycle: "h23" },
              )
              return (
                <article className={`schedule-release-card ${isNextUp ? "is-next-up" : ""}`} key={release.id}>
                  <div className="schedule-release-time">
                    <strong>{airingTime}</strong>
                    <span>{dateFormatter(scheduleDate, { weekday: "short" })}</span>
                    <small>{isNextUp ? "NEXT UP" : isAired ? "AIRED" : "UPCOMING"}</small>
                  </div>
                  <button className="schedule-release-poster" onClick={() => detail(anime)} aria-label={`View ${anime.title}`}>
                    <img src={anime.image} alt={anime.title} loading="lazy" />
                  </button>
                  <div className="schedule-release-info">
                    <div className="schedule-release-tags">
                      <span>{titleGenres.slice(0, 2).join(" · ") || "Anime"}</span>
                      <i>•</i>
                      <span>{anime.isAdult ? "18+ title" : "ANIList AIRING"}</span>
                    </div>
                    <h3>{anime.title}</h3>
                    <p>Episode {String(release.episode).padStart(2, "0")} <i>·</i> New episode</p>
                  </div>
                  <div className="schedule-release-actions">
                    <button className={`schedule-remind-button ${reminders.includes(anime.title) ? "active" : ""}`} onClick={() => toggleReminder(anime.title)}>
                      <Icon name={reminders.includes(anime.title) ? "check" : "bell"} size={14} />
                      {reminders.includes(anime.title) ? "Reminder set" : "Remind me"}
                    </button>
                    <button className="schedule-view-anime" onClick={() => detail(anime)}>
                      View anime <Icon name="chevron" size={14} />
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="schedule-empty-state">
            <Icon name="calendar" size={28} />
            <strong>{search || genre !== "All genres" ? "No matching releases" : "No releases scheduled"}</strong>
            <p>{search || genre !== "All genres" ? "Try a different title or genre filter." : `AniList has no airing episodes listed for ${selectedDateTitle}.`}</p>
          </div>
        )}

        <p className="schedule-data-note">
          <Icon name="info" size={14} />
          <span>Release times are provided by AniList and displayed in {timeZone.replace(/_/g, " ")}. Reminder selections are saved in this session and do not send notifications.</span>
        </p>
      </section>
    </main>
  )
}
