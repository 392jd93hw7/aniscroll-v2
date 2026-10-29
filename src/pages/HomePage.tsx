import { useAppPageData } from "../context/AppPageContext"

export default function HomePage() {
  const { selected, saved, genre, setGenre, setSeasonFilter, season, loading, history, quality, year, slide, setSlide, setTab, episode, progress, reminders, setReminders, kitsuAnime, airingSchedule, scheduleLoading, notify, normalizeAniList, catalog, go, detail, toggle, hero, info, watch, card, heading, episodes, Icon, anime, localDateKey, FEATURED_GENRES, storyFor, runtimeFor } = useAppPageData()
  return (
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
                  {FEATURED_GENRES.map((g, i) => (
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
                  {airingSchedule.slice(0, 3).map((release) => {
                    const a = normalizeAniList(release.media)
                    const date = new Date(release.airingAt * 1000)
                    const dayLabel = localDateKey(date) === localDateKey(new Date())
                      ? "Today"
                      : date.toLocaleDateString(undefined, { weekday: "short" })
                    const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    return (
                      <div className="schedule-item" key={release.id}>
                        <img src={a.image} alt={a.title} loading="lazy" />
                        <div>
                          <h3>{a.title}</h3>
                          <p>Episode {release.episode} <span>•</span> {dayLabel}, {time}{a.isAdult ? " · 18+" : ""}</p>
                        </div>
                        <button
                          className={reminders.includes(a.title) ? "active" : ""}
                          aria-label={"Remind me about " + a.title}
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
                        </button>
                      </div>
                    )
                  })}
                  {!airingSchedule.length && (
                    <p className="muted">{scheduleLoading ? "Loading upcoming releases from AniList…" : "No upcoming AniList releases are available right now."}</p>
                  )}
                </div>
              </section>
            </div>
          </>
  )
}
