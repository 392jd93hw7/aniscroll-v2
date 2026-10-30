import { useAppPageData } from "../context/AppPageContext"

export default function HomePage() {
  const {
    saved,
    slide,
    setSlide,
    homeTrendingCatalog,
    homeTrendingLoading,
    homeTrendingError,
    homeHeroItems,
    homeHeroBanner,
    hero,
    watch,
    detail,
    toggle,
    card,
    history,
    anime,
    catalog,
    heading,
    setTab,
    setSeasonFilter,
    setGenre,
    go,
    reminders,
    setReminders,
    airingSchedule,
    scheduleLoading,
    scheduleError,
    notify,
    normalizeAniList,
    localDateKey,
    FEATURED_GENRES,
    homeGenreBanners,
    homeGenreLoading,
    homeGenreError,
    storyFor,
    runtimeFor,
    Icon,
  } = useAppPageData() as any

  const hasTrending = Array.isArray(homeTrendingCatalog) && homeTrendingCatalog.length > 0
  const genreBannerMap = new Map<string, any>(
    (Array.isArray(homeGenreBanners) ? homeGenreBanners : []).map((item: any) => [String(item.genre), item] as [string, any]),
  )
  const heroIndex = Math.min(slide, Math.max(0, homeHeroItems.length - 1))
  const featured = homeHeroItems[heroIndex] || hero
  const genres = Array.isArray(featured?.genres) && featured.genres.length
    ? featured.genres.slice(0, 3)
    : [featured?.genre || "Anime"]

  return (
    <>
      <section
        className={`hero home-trending-hero ${hasTrending ? "" : "is-empty"}`}
        style={hasTrending ? {
          // Prefer the Kitsu banner prepared in App.tsx; contain keeps the entire
          // landscape artwork visible instead of cropping it to fill the hero.
          backgroundImage: `url("${homeHeroBanner || featured.banner || featured.image}")`,
          backgroundSize: "contain",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
          backgroundColor: "#09090b",
        } : undefined}
      >
        <div className="hero-shade" />
        {hasTrending ? (
          <div className="hero-content">
            <div className="feature-label">
              <span /> TRENDING ON ANILIST
            </div>
            <div className="film-kicker">
              ANILIST TRENDING · #{String(heroIndex + 1).padStart(2, "0")}
            </div>
            <h1 className={String(featured.title || "").length > 34 ? "hero-title-extra-long" : String(featured.title || "").length > 22 ? "hero-title-long" : ""}>{featured.title}</h1>
            {featured.altTitle && featured.altTitle !== featured.title && (
              <div className="hero-alt">{featured.altTitle}</div>
            )}
            <div className="hero-meta">
              {featured.score !== "—" && <span className="score">★ {featured.score}</span>}
              <span>{featured.year}</span>
              {featured.label && <span className="age">TRENDING</span>}
              <span className="quality">ANILIST</span>
            </div>
            <p className="hero-description">
              {featured.synopsis || "Discover one of the anime trending with the AniList community right now."}
            </p>
            <div className="genres-line">
              {genres.join("  •  ")}
            </div>
            <div className="hero-actions">
              <button className="button white" onClick={() => watch(featured)}>
                <Icon name="play" size={19} /> Watch Now
              </button>
              <button className="button glass" onClick={() => toggle(featured)}>
                <Icon name={saved.includes(featured.title) ? "check" : "plus"} />
                {saved.includes(featured.title) ? "In My List" : "My List"}
              </button>
              <button className="more-info" onClick={() => detail(featured)}>
                <Icon name="info" size={19} /> More Info
              </button>
            </div>
          </div>
        ) : (
          <div className="home-trending-empty">
            <div className="feature-label"><span /> TRENDING ON ANILIST</div>
            <h1>{homeTrendingLoading ? "Finding what's trending…" : "Trending anime"}</h1>
            <p>{homeTrendingLoading ? "Loading current anime trends from AniList." : homeTrendingError || "Trending anime could not be loaded."}</p>
          </div>
        )}
        {homeHeroItems.length > 1 && (
          <div className="hero-bottom">
            <div className="slide-dots">
              {homeHeroItems.map((item: any, index: number) => (
                <button
                  aria-label={`Trending anime ${index + 1}: ${item.title}`}
                  aria-pressed={heroIndex === index}
                  className={heroIndex === index ? "selected" : ""}
                  key={item.id || item.title}
                  onClick={() => setSlide(index)}
                />
              ))}
            </div>
            <span className="hero-caption">YOUR NEXT ANIME OBSESSION.</span>
            <div className="carousel-controls">
              <span>
                {String(heroIndex + 1).padStart(2, "0")}
                <small> / {String(homeHeroItems.length).padStart(2, "0")}</small>
              </span>
              <button
                aria-label="Previous trending anime"
                onClick={() => setSlide((heroIndex + homeHeroItems.length - 1) % homeHeroItems.length)}
              >
                <span className="reverse"><Icon name="chevron" size={18} /></span>
              </button>
              <button
                aria-label="Next trending anime"
                onClick={() => setSlide((heroIndex + 1) % homeHeroItems.length)}
              >
                <Icon name="chevron" size={18} />
              </button>
            </div>
          </div>
        )}
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
            {anime
              .filter((item: any) => history?.[item.title])
              .slice(0, 4)
              .map((a: any) => (
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
                      <span style={{ width: `${history[a.title].progress}%` }} />
                    </span>
                  </button>
                  <button className="continue-title" onClick={() => detail(a)}>
                    {a.title}
                  </button>
                  <p>
                    {storyFor(a.title).episodes[history[a.title].episode - 1]}
                  </p>
                </article>
              ))}
          </div>
        </section>

        <section>
          {heading("Trending now", "The anime everyone’s talking about")}
          {homeTrendingLoading && !hasTrending ? (
            <p className="home-trending-message">Loading trending anime from AniList…</p>
          ) : homeTrendingError && !hasTrending ? (
            <p className="home-trending-message is-error">{homeTrendingError}</p>
          ) : (
            <div className="poster-row" aria-label="AniList trending anime">
              {homeTrendingCatalog.slice(0, 6).map((item: any, index: number) => card(item, index))}
            </div>
          )}
        </section>

        <section>
          {heading("Popular this season", "Fresh stories. New obsessions.")}
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
              {[catalog[3 % catalog.length], catalog[2 % catalog.length], catalog[7 % catalog.length]].map((a: any) => (
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
            {[...catalog.slice(2, 6), anime[7], anime[6]].map((item: any, index: number) => card(item, index))}
          </div>
        </section>

        <section>
          {heading("Find your kind of adventure")}
          <div className="genre-grid" aria-busy={homeGenreLoading}>
            {FEATURED_GENRES.map((genre: string) => {
              const animeForGenre = genreBannerMap.get(genre)
              const banner = animeForGenre?.banner || animeForGenre?.image || null
              return (
                <button
                  key={genre}
                  onClick={() => {
                    setGenre(genre)
                    go("Discover")
                  }}
                  title={animeForGenre?.title
                    ? `${genre} anime: ${animeForGenre.title} · ${animeForGenre.imageSource || "AniList artwork"}`
                    : `Explore ${genre} anime`}
                  aria-label={`Explore ${genre} anime`}
                  style={{
                    backgroundImage: banner
                      ? `linear-gradient(90deg,rgba(20,12,35,.82),rgba(20,12,35,.28)),url("${banner}")`
                      : "linear-gradient(135deg,#302342,#17151f 70%)",
                    backgroundPosition: "center",
                    backgroundSize: "cover",
                  }}
                >
                  <span>{genre}</span>
                  <Icon name="chevron" size={18} />
                </button>
              )
            })}
          </div>
          {homeGenreError && <p className="muted genre-feed-error">{homeGenreError}</p>}
        </section>

        <section>
          {heading("Coming up next", "Never miss a moment", () => go("Schedule"))}
          <div className="schedule-list">
            {airingSchedule.slice(0, 3).map((release: any) => {
              const animeItem = normalizeAniList(release.media)
              const date = new Date(release.airingAt * 1000)
              const dayLabel = localDateKey(date) === localDateKey(new Date())
                ? "Today"
                : date.toLocaleDateString(undefined, { weekday: "short" })
              const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              return (
                <div className="schedule-item" key={release.id}>
                  <img src={animeItem.image} alt={animeItem.title} loading="lazy" />
                  <div>
                    <h3>{animeItem.title}</h3>
                    <p>
                      Episode {release.episode} <span>•</span> {dayLabel}, {time}
                      {animeItem.isAdult ? " · 18+" : ""}
                    </p>
                  </div>
                  <button
                    aria-label={"Remind me about " + animeItem.title}
                    className={reminders.includes(animeItem.title) ? "active" : ""}
                    onClick={() => {
                      setReminders((items: string[]) => items.includes(animeItem.title)
                        ? items.filter((title) => title !== animeItem.title)
                        : [...items, animeItem.title])
                      notify("Reminder preference updated")
                    }}
                  >
                    <Icon name={reminders.includes(animeItem.title) ? "check" : "bell"} />
                  </button>
                </div>
              )
            })}
            {!airingSchedule.length && (
              <p className="muted">
                {scheduleLoading
                  ? "Loading upcoming releases from AniList…"
                  : scheduleError || "No upcoming AniList releases are available right now."}
              </p>
            )}
          </div>
        </section>
      </div>
    </>
  )
}