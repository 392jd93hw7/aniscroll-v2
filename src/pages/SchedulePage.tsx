import { useAppPageData } from "../context/AppPageContext"

export default function SchedulePage() {
  const { page, setPage, selected, loading, tab, episode, reminders, setReminders, scheduleLoading, scheduleError, scheduleDate, setScheduleDate, notify, normalizeAniList, info, scheduleDays, selectedScheduleDay, releasesForSelectedDay, episodes, Icon, anime } = useAppPageData()
  return (
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
                  className={"schedule-day-tab " + (scheduleDate === day.key ? "selected" : "")}
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
            )}
          </div>
  )
}
