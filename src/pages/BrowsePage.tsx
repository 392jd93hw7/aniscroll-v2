import { useAppPageData } from "../context/AppPageContext"

export default function BrowsePage() {
  const {
    page, query, setQuery, genre, setGenre, seasonFilter, setSeasonFilter,
    loading, year, setYear, sort, setSort, compact, setCompact,
    movieResults, moviesPage, setMoviesPage, moviesHasNextPage, moviesLoading,
    moviesError, setMoviesReloadNonce,
    animePage, setAnimePage, animeHasNextPage, animeLoading, animeError,
    animeTotal, setAnimeReloadNonce,
    info, filtered, card, heading, Icon, anime, GENRE_OPTIONS,
  } = useAppPageData() as any

  const isAnimePage = page === "Anime"
  const isMoviesPage = page === "Movies"
  const currentPage = isAnimePage ? animePage : moviesPage
  const currentLoading = loading || (isAnimePage && animeLoading) || (isMoviesPage && moviesLoading)
  const currentError = isAnimePage ? animeError : isMoviesPage ? moviesError : ""
  const hasNextPage = isAnimePage ? animeHasNextPage : moviesHasNextPage
  const totalTitles = isAnimePage ? animeTotal : filtered.length
  const resetPagination = () => {
    if (isAnimePage) setAnimePage(1)
    else resetPagination()
  }
  const changePage = (delta: number) => {
    if (isAnimePage) setAnimePage((current: number) => Math.max(1, current + delta))
    else setMoviesPage((current: number) => Math.max(1, current + delta))
  }
  const retryPage = () => {
    if (isAnimePage) setAnimeReloadNonce((value: number) => value + 1)
    else setMoviesReloadNonce((value: number) => value + 1)
  }
  return (
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
                onChange={(e) => { setQuery(e.target.value); resetPagination() }}
              />
              {query && (
                <button aria-label="Clear search" onClick={() => { setQuery(""); resetPagination() }}>
                  <Icon name="close" />
                </button>
              )}
            </div>
            <div className="trending-search">
              <span>Trending searches</span>
              {["Solo Leveling", "Frieren", "Jujutsu Kaisen"].map((t) => (
                <button onClick={() => { setQuery(t); resetPagination() }} key={t}>
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
                  onChange={(e) => { setGenre(e.target.value); resetPagination() }}
                >
                  {["All genres", ...GENRE_OPTIONS].map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </label>
              <label>
                Year
                <select
                  aria-label="Year"
                  value={year}
                  onChange={(e) => { setYear(e.target.value); resetPagination() }}
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
                  onChange={(e) => { setSeasonFilter(e.target.value); resetPagination() }}
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
                  onChange={(e) => { setSort(e.target.value); resetPagination() }}
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
                  resetPagination()
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
              <h2>{query ? `Results for “${query}”` : page === "Movies" ? "Explore anime movies" : "Explore all anime"}</h2>
              <span aria-live="polite" role="status">
{page === "Anime" ? `${totalTitles.toLocaleString()} titles · page ${currentPage} · 30 per page` : page === "Movies" ? `${filtered.length} titles · page ${currentPage} · 30 per page` : `${filtered.length} titles`}
              </span>
            </div>
            {currentLoading ? (
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
                {filtered.map(card)}
              </div>
            )}
            {(page === "Anime" || page === "Movies") && !currentLoading && !currentError && (
              <div className="movies-pagination" aria-label={page === "Anime" ? "Anime pages" : "Movie pages"}>
                <button className="button glass" disabled={currentPage <= 1} onClick={() => changePage(-1)}>Previous</button>
                <span>Page {currentPage} <small>· 30 {page === "Anime" ? "anime" : "movies"} per page</small></span>
                <button className="button glass" disabled={!hasNextPage} onClick={() => changePage(1)}>Next</button>
              </div>
            )}
            {!currentLoading && currentError && (
              <div className="empty-state" role="status">
                <Icon name="info" size={38} />
                <h2>{page === "Anime" ? "Anime unavailable" : "Movies unavailable"}</h2>
                <p>{currentError}</p>
                <button className="button purple" onClick={retryPage}>Try again</button>
              </div>
            )}

            {!currentLoading && !filtered.length && !currentError && (
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
                    resetPagination()
                  }}
                >
                  Explore all anime
                </button>
              </div>
            )}
          </div>
  )
}
