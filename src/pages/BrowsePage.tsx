import { useAppPageData } from "../context/AppPageContext"

export default function BrowsePage() {
  const { page, query, setQuery, genre, setGenre, seasonFilter, setSeasonFilter, season, loading, year, setYear, sort, setSort, compact, setCompact, movieResults, moviesPage, setMoviesPage, moviesHasNextPage, moviesLoading, moviesError, setMoviesReloadNonce, info, filtered, card, heading, Icon, anime, GENRE_OPTIONS } = useAppPageData()
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
                onChange={(e) => { setQuery(e.target.value); setMoviesPage(1) }}
              />
              {query && (
                <button aria-label="Clear search" onClick={() => { setQuery(""); setMoviesPage(1) }}>
                  <Icon name="close" />
                </button>
              )}
            </div>
            <div className="trending-search">
              <span>Trending searches</span>
              {["Solo Leveling", "Frieren", "Jujutsu Kaisen"].map((t) => (
                <button onClick={() => { setQuery(t); setMoviesPage(1) }} key={t}>
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
                  onChange={(e) => { setGenre(e.target.value); setMoviesPage(1) }}
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
                  onChange={(e) => { setYear(e.target.value); setMoviesPage(1) }}
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
                  onChange={(e) => { setSeasonFilter(e.target.value); setMoviesPage(1) }}
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
                  onChange={(e) => { setSort(e.target.value); setMoviesPage(1) }}
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
                  setMoviesPage(1)
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
{filtered.length}{" "}{page === "Movies" ? `titles · page ${moviesPage} · 30 per page` : "titles"}
              </span>
            </div>
            {(loading || (page === "Movies" && moviesLoading)) ? (
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
            {page === "Movies" && !moviesLoading && !moviesError && (
              <div className="movies-pagination" aria-label="Movie pages">
                <button className="button glass" disabled={moviesPage <= 1} onClick={() => setMoviesPage((current) => Math.max(1, current - 1))}>Previous</button>
                <span>Page {moviesPage} <small>· 30 movies per page</small></span>
                <button className="button glass" disabled={!moviesHasNextPage} onClick={() => setMoviesPage((current) => current + 1)}>Next</button>
              </div>
            )}
            {!loading && page === "Movies" && moviesError && !movieResults.length && (
              <div className="empty-state" role="status">
                <Icon name="info" size={38} />
                <h2>Movies unavailable</h2>
                <p>{moviesError}</p>
                <button className="button purple" onClick={() => setMoviesReloadNonce((value) => value + 1)}>Try again</button>
              </div>
            )}
            {!loading && !filtered.length && !(page === "Movies" && (moviesLoading || moviesError)) && (
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
                    setMoviesPage(1)
                  }}
                >
                  Explore all anime
                </button>
              </div>
            )}
          </div>
  )
}
