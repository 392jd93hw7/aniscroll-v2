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
    Icon,
  } = useAppPageData() as any

  const hasTrending = Array.isArray(homeTrendingCatalog) && homeTrendingCatalog.length > 0
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
          backgroundImage: `url("${homeHeroBanner || featured.banner || featured.image}")`,
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
            <h1>{featured.title}</h1>
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

      <div className="home-content home-trending-content">
        <section>
          <div className="section-heading">
            <div>
              <h2>Trending anime</h2>
              <span className="heading-note">Live ranking from AniList · refreshed regularly</span>
            </div>
            <span className="text-link">{homeTrendingCatalog.length} titles</span>
          </div>
          {homeTrendingLoading && !hasTrending ? (
            <p className="home-trending-message">Loading trending anime from AniList…</p>
          ) : homeTrendingError && !hasTrending ? (
            <p className="home-trending-message is-error">{homeTrendingError}</p>
          ) : (
            <div className="poster-row" aria-label="AniList trending anime">
              {homeTrendingCatalog.map((item: any, index: number) => card(item, index))}
            </div>
          )}
        </section>
      </div>
    </>
  )
}
