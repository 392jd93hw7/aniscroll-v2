import { useAppPageData } from "../context/AppPageContext"

export default function AnimeDetailsPage() {
  const { page, selected, saved, genre, season, setSeason, loading, history, quality, year, tab, setTab, episode, readMore, setReadMore, aniListMeta, aniListDetails, aniListDetailsLoading, kitsuAnime, notify, catalog, detail, toggle, hero, info, duration, episodeCount, aniListCharacterEdges, aniListRelatedAnime, aniListRecommendations, watch, card, heading, episodes, Icon, anime, animePath, isFilm } = useAppPageData()
  return (
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
                        {episodeCount} {episodeCount === 1 ? "episode" : "episodes"} available
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
                  <div className="episode-list">
                    {episodeCount > 0 ? episodes : (
                      <div className="empty-state">
                        <Icon name="calendar" size={28} />
                        <h2>No aired episodes available yet</h2>
                        <p>Episodes will appear here once AniList or Kitsu confirms their release.</p>
                      </div>
                    )}
                  </div>
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
                <div className="anilist-related-sections">
                  {aniListDetailsLoading ? (
                    <div className="empty-state"><Icon name="search" size={30} /><h2>Loading related anime…</h2><p>Fetching franchise connections and recommendations from AniList.</p></div>
                  ) : (
                    <>
                      <section>
                        <div className="section-heading"><h2>Franchise connections</h2><span className="muted">{aniListRelatedAnime.length} titles</span></div>
                        {aniListRelatedAnime.length ? (
                          <div className="results-grid">
                            {aniListRelatedAnime.map((item: any, i: number) => (
                              <div className="anilist-related-item" key={item.id || item.title}>
                                <span className="relation-label">{String(item.relationType).replace(/_/g, " ")}</span>
                                {card(item, i)}
                              </div>
                            ))}
                          </div>
                        ) : <p className="muted">AniList has no related anime listed for this title.</p>}
                      </section>
                      <section className="anilist-recommendations">
                        <div className="section-heading"><h2>Recommended for you</h2><span className="muted">Based on AniList recommendations</span></div>
                        {aniListRecommendations.length ? (
                          <div className="results-grid">
                            {aniListRecommendations.map((item: any, i: number) => card(item, i))}
                          </div>
                        ) : <p className="muted">No AniList recommendations are available yet.</p>}
                      </section>
                    </>
                  )}
                </div>
              ) : tab === "Characters" ? (
                <section className="anilist-characters-section">
                  <div className="section-heading">
                    <h2>Characters in {selected.title}</h2>
                    <span className="muted">{aniListCharacterEdges.length} profiles from AniList</span>
                  </div>
                  {aniListDetailsLoading ? (
                    <div className="empty-state"><Icon name="user" size={30} /><h2>Loading characters…</h2><p>Fetching character profiles and voice actors from AniList.</p></div>
                  ) : aniListCharacterEdges.length ? (
                    <div className="character-grid">
                      {aniListCharacterEdges.map((edge: any) => {
                        const character = edge.node
                        const description = String(character.description || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
                        const voiceActors = Array.isArray(edge.voiceActors) ? edge.voiceActors : []
                        const characterUrl = character.siteUrl || "https://anilist.co/character/" + character.id
                        return (
                          <article className="character-card" key={character.id}>
                            <a className="character-header" href={characterUrl} target="_blank" rel="noreferrer">
                              <img src={character.image?.large || "https://placehold.co/140x180/17131f/e8dcff?text=Character"} alt={character.name?.full || "Anime character"} loading="lazy" />
                              <div className="character-heading">
                                <span className="character-role">{String(edge.role || "CHARACTER").replace(/_/g, " ")}</span>
                                <h3>{character.name?.full || character.name?.native || "Unknown character"}</h3>
                                {(character.gender || character.age) && <p className="character-facts">{[character.gender, character.age].filter(Boolean).join(" · ")}</p>}
                                <span className="character-anilist-link">View on AniList ↗</span>
                              </div>
                            </a>
                            {description && <p className="character-description">{description}</p>}
                            {voiceActors.length > 0 && (
                              <div className="character-voice-actors">
                                <span>Japanese voice</span>
                                <p>{voiceActors.map((actor: any) => actor.name?.full).filter(Boolean).join(", ")}</p>
                              </div>
                            )}
                          </article>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <Icon name="user" size={32} />
                      <h2>Character data unavailable</h2>
                      <p>AniList has not returned character profiles for this anime yet.</p>
                    </div>
                  )}
                </section>
              ) : (
                <div className="overview">
                  <h2>About {aniListDetails?.title?.english || aniListDetails?.title?.romaji || selected.title}</h2>
                  <p>{aniListDetails?.description || aniListMeta?.description || selected.synopsis || info.synopsis}</p>
                  <div className="anilist-facts-grid">
                    <div><span>Format</span><strong>{String(aniListDetails?.format || aniListMeta?.format || "—").replace(/_/g, " ")}</strong></div>
                    <div><span>Status</span><strong>{String(aniListDetails?.status || aniListMeta?.status || "—").replace(/_/g, " ")}</strong></div>
                    <div><span>Release</span><strong>{aniListDetails?.startDate?.year || aniListDetails?.seasonYear || selected.year || "—"}</strong></div>
                    <div><span>Episodes</span><strong>{episodeCount || aniListDetails?.episodes || "Not listed"}</strong></div>
                    <div><span>Duration</span><strong>{aniListDetails?.duration ? aniListDetails.duration + " min" : "—"}</strong></div>
                    <div><span>Score</span><strong>{aniListDetails?.averageScore ? (aniListDetails.averageScore / 10).toFixed(1) + "/10" : selected.score + "/10"}</strong></div>
                    <div><span>Source</span><strong>{String(aniListDetails?.source || "—").replace(/_/g, " ")}</strong></div>
                    <div><span>Studios</span><strong>{(aniListDetails?.studios?.nodes || []).map((studio: any) => studio.name).filter(Boolean).join(", ") || info.studio || "—"}</strong></div>
                  </div>
                  {(aniListDetails?.genres || []).length > 0 && <div className="anilist-tags">{aniListDetails.genres.map((genre: string) => <span key={genre}>{genre}</span>)}</div>}
                  {(aniListDetails?.tags || []).filter((tag: any) => tag.rank >= 60 && !tag.isMediaSpoiler && !tag.isGeneralSpoiler).slice(0, 12).length > 0 && (
                    <div className="anilist-tags">{aniListDetails.tags.filter((tag: any) => tag.rank >= 60 && !tag.isMediaSpoiler && !tag.isGeneralSpoiler).slice(0, 12).map((tag: any) => <span key={tag.name}>{tag.name}</span>)}</div>
                  )}
                  {aniListDetails?.siteUrl && <a className="anilist-source-link" href={aniListDetails.siteUrl} target="_blank" rel="noreferrer">Open this title on AniList ↗</a>}
                </div>
              )}
            </div>
          </>
  )
}
