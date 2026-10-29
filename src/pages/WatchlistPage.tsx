import { useAppPageData } from "../context/AppPageContext"

export default function WatchlistPage() {
  const { page, selected, saved, librarySort, setLibrarySort, tab, setTab, progress, go, info, libraryTitles, card, Icon, anime } = useAppPageData()
  return (
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
  )
}
