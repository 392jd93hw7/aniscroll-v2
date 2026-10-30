import { useMemo, useState } from "react"
import { useAppPageData } from "../context/AppPageContext"

export default function WatchPage() {
  const {
    selected, season, setSeason, episode, playing, setPlaying, progress, setProgress,
    volume, setVolume, autoplay, setAutoplay, controlsVisible, setControlsVisible,
    playerSettings, setPlayerSettings, fullscreen, toggleFullscreen, subtitles, setSubtitles,
    speed, setSpeed, quality, setQuality, audioTrack, setAudioTrack, streamServer,
    setStreamServer, mikazaProvider, setMikazaProvider, audioAvailability, audioAvailabilityLoading, audioAvailabilityError, embedError, setEmbedError, metadataLoading, notify, detail,
    info, duration, episodeCount, episodeTitles, kitsuEpisodes, history, saved, toggle,
    embedUrl, nextEpisode, watch, go, aniListMeta, aniListDetails, anime, isFilm,
    formatTime, Icon, Logo, watchPath
  } = useAppPageData() as any

  const [episodeSearch, setEpisodeSearch] = useState("")
  const [episodeView, setEpisodeView] = useState<"list" | "grid">("list")
  const [theaterMode, setTheaterMode] = useState(false)
  const [autoplayStart, setAutoplayStart] = useState(true)
  const [autoSkip, setAutoSkip] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [readMore, setReadMore] = useState(false)

  const currentHistory = history?.[selected.title]?.season === season && history?.[selected.title]?.episode === episode ? history[selected.title] : null
  const seasons = Math.max(1, Number(info?.seasons || 1))
  const filteredEpisodeNumbers = useMemo(
    () => (episodeTitles || []).map((title: string, index: number) => ({ title, number: index + 1 }))
      .filter((item: { title: string; number: number }) =>
        !episodeSearch.trim() ||
        String(item.number).includes(episodeSearch.trim()) ||
        item.title.toLowerCase().includes(episodeSearch.toLowerCase()),
      ),
    [episodeTitles, episodeSearch],
  )
  const relatedAnime = (anime || []).filter((item: any) => item.title !== selected.title).slice(0, 6)
  const synopsis = aniListDetails?.description || aniListMeta?.description || selected.synopsis || info?.synopsis || "Explore the story and world of this anime."
  const studioNames = (aniListDetails?.studios?.nodes || []).map((studio: any) => studio.name).filter(Boolean)
  const genres = aniListDetails?.genres || selected.genres || [selected.genre].filter(Boolean)
  const poster = selected.image || selected.banner || ""
  const heroArtwork = selected.banner || selected.image || ""
  const availableSubServers: string[] = audioAvailability?.languageAvailability?.sub === true && Array.isArray(audioAvailability?.available?.sub) ? audioAvailability.available.sub : []
  const availableDubServers: string[] = audioAvailability?.languageAvailability?.dub === true && Array.isArray(audioAvailability?.available?.dub) ? audioAvailability.available.dub : []
  const availableMikazaIds: string[] = Array.isArray(audioAvailability?.providers?.["HD-3"]?.[audioTrack]) ? audioAvailability.providers["HD-3"][audioTrack] : []
  const mikazaProviderDirectory = [
    { id: "haiku", label: "Primary source" },
    { id: "kira", label: "Backup source 1" },
    { id: "naoka", label: "Backup source 2" },
  ]
  const mikazaProviders = mikazaProviderDirectory
    .filter((provider) => availableMikazaIds.includes(provider.id))
    .map((provider) => ({ ...provider, kind: provider.id === "haiku" ? "Primary" : "Fallback" }))
  const selectServer = (server: string, language: "sub" | "dub") => {
    const providerOptions = audioAvailability?.providers?.[server]?.[language] || []
    if (server === "HD-3" && providerOptions.length) setMikazaProvider(providerOptions[0])
    setStreamServer(server)
    setAudioTrack(language)
    setEmbedError(false)
  }
  const tryNextMikazaProvider = () => {
    const currentIndex = mikazaProviders.findIndex((provider) => provider.id === mikazaProvider)
    const nextProvider = mikazaProviders[currentIndex + 1]
    if (!nextProvider) {
      setEmbedError(true)
      notify("No more HD-3 fallback sources are available.")
      return
    }
    setEmbedError(false)
    setMikazaProvider(nextProvider.id)
    notify("Switched to HD-3 " + nextProvider.label.toLowerCase() + ".")
  }
  const handleEmbedError = () => {
    if (streamServer === "HD-3") {
      const currentIndex = mikazaProviders.findIndex((provider) => provider.id === mikazaProvider)
      const nextProvider = mikazaProviders[currentIndex + 1]
      if (nextProvider) {
        tryNextMikazaProvider()
        return
      }
    }
    setEmbedError(true)
  }
  const goToEpisode = (episodeNumber: number) => {
    if (typeof watch === "function") watch(selected, episodeNumber, season)
  }

  return (
    <div className="watch-page-shell">
      <nav className="watch-breadcrumbs" aria-label="Breadcrumb">
        <button onClick={() => go("Home")} className="watch-crumb-home">Home</button>
        <span>/</span>
        <button onClick={() => detail(selected)}>{selected.title}</button>
        <span>/</span>
        <strong>{isFilm(selected.title) ? "Feature film" : "Episode " + episode}</strong>
      </nav>

      <div className={`watch-main-grid ${theaterMode ? "watch-theater-mode" : ""}`}>
        <section className="watch-main-column" aria-label="Anime player">
          <div
            className={`watch-player-frame video-placeholder ${controlsVisible || !playing || playerSettings ? "" : "controls-idle"} ${embedUrl ? "has-stream" : ""}`}
            style={!embedUrl && heroArtwork ? { backgroundImage: `linear-gradient(180deg,rgba(5,5,8,.50),rgba(5,5,8,.34) 45%,rgba(5,5,8,.88)),url("${heroArtwork}")` } : undefined}
            onPointerMove={() => setControlsVisible(true)}
            onPointerDown={() => setControlsVisible(true)}
            onFocusCapture={() => setControlsVisible(true)}
            onKeyDown={(event) => { if (event.key === "Escape") setPlayerSettings(false) }}
          >
            <div className="watch-player-brand">
              <span>ANISCROLL</span>
            </div>
            <div className="watch-player-status">{quality} · {audioTrack.toUpperCase()}</div>
            {embedUrl ? (
              <iframe
                key={embedUrl}
                className="stream-frame"
                title={selected.title + " episode " + episode}
                src={embedUrl}
                loading="eager"
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media; clipboard-write"
                allowFullScreen
                referrerPolicy="origin"
                onLoad={() => setEmbedError(false)}
                onError={handleEmbedError}
              />
            ) : (
              <div className="watch-player-ready">
                <button className="watch-ready-play" onClick={() => notify(metadataLoading ? "Finding anime metadata…" : "Choose an available server below to start watching")} aria-label="Player ready">
                  <Icon name="play" size={30} />
                </button>
                <h2>{metadataLoading ? "Preparing your episode" : "Ready when you are."}</h2>
                <p>{metadataLoading ? "Connecting to anime metadata." : "Select a server below to begin playback."}</p>
                <small>{aniListMeta?.title?.english || selected.title} · Episode {episode}</small>
              </div>
            )}
            {playerSettings && (
              <div className="playback-settings" id="playback-settings" role="region" aria-label="Playback settings">
                <div className="settings-heading">
                  <h3>Playback settings</h3>
                  <button aria-label="Close playback settings" onClick={() => setPlayerSettings(false)}><Icon name="close" size={18} /></button>
                </div>
                <label>Stream audio
                  <select value={audioTrack} disabled={audioAvailabilityLoading || (!availableSubServers.length && !availableDubServers.length)} onChange={(event) => { const next = event.target.value as "sub" | "dub"; const servers = next === "sub" ? availableSubServers : availableDubServers; if (servers.length) selectServer(servers.includes(streamServer) ? streamServer : servers[0], next) }}>
                    {availableSubServers.length > 0 && <option value="sub">Sub</option>}
                    {availableDubServers.length > 0 && <option value="dub">Dub</option>}
                  </select>
                </label>
                <label>Subtitles
                  <select value={subtitles} onChange={(event) => setSubtitles(event.target.value)}>
                    <option>English</option><option>Japanese</option><option>Off</option>
                  </select>
                </label>
                <label>Playback speed
                  <select value={speed} onChange={(event) => setSpeed(event.target.value)}>
                    {["0.75", "1", "1.25", "1.5", "2"].map((value) => <option key={value}>{value}</option>)}
                  </select>
                </label>
                <label>Video quality
                  <select value={quality} onChange={(event) => setQuality(event.target.value)}>
                    <option>1080p</option><option>720p</option><option>480p</option>
                  </select>
                </label>
                <p>Some playback options are controlled by the selected embedded server.</p>
              </div>
            )}
            <div className="watch-player-controls player-controls">
              <input
                aria-label="Seek"
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={(event) => setProgress(+event.target.value)}
              />
              <div>
                <button aria-label={playing ? "Pause" : "Play"} onClick={() => setPlaying(!playing)}><Icon name={playing ? "pause" : "play"} /></button>
                <button aria-label="Previous episode" disabled={episode <= 1} onClick={() => goToEpisode(Math.max(1, episode - 1))}><Icon name="chevron" /></button>
                <button aria-label="Next episode" disabled={episode >= episodeCount} onClick={nextEpisode}><Icon name="chevron" /></button>
                <button aria-label={volume ? "Mute" : "Unmute"} onClick={() => setVolume((value: number) => value ? 0 : 70)}><Icon name="volume" /></button>
                <input className="volume" aria-label="Volume" type="range" min="0" max="100" value={volume} onChange={(event) => setVolume(+event.target.value)} />
                <span>{formatTime((progress * duration) / 100)} / {formatTime(duration)}</span>
                <div className="player-spacer" />
                <button aria-label="Playback settings" aria-expanded={playerSettings} onClick={() => setPlayerSettings(!playerSettings)}><Icon name="settings" /></button>
                <button aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"} onClick={toggleFullscreen}><Icon name="expand" /></button>
              </div>
            </div>
          </div>

          <div className="watch-player-toolbar">
            <div className="watch-toolbar-left">
              <button className={theaterMode ? "is-on" : ""} onClick={() => setTheaterMode(!theaterMode)}><Icon name="expand" size={14} /> Theater</button>
              <div className="watch-shortcuts-wrap">
                <button className={shortcutsOpen ? "is-on" : ""} onClick={() => setShortcutsOpen(!shortcutsOpen)}><Icon name="keyboard" size={14} /> Shortcuts</button>
                {shortcutsOpen && <div className="watch-shortcuts-popover"><strong>Keyboard shortcuts</strong><span><kbd>Space</kbd> Play / pause</span><span><kbd>←</kbd> Back 5 seconds</span><span><kbd>→</kbd> Forward 5 seconds</span><span><kbd>F</kbd> Fullscreen</span></div>}
              </div>
              <label className="watch-toggle"><input type="checkbox" checked={autoplayStart} onChange={(event) => { setAutoplayStart(event.target.checked); setPlaying(event.target.checked) }} /><span /> Autoplay</label>
              <label className="watch-toggle"><input type="checkbox" checked={autoplay} onChange={(event) => setAutoplay(event.target.checked)} /><span /> Auto next</label>
              <label className="watch-toggle"><input type="checkbox" checked={autoSkip} onChange={(event) => setAutoSkip(event.target.checked)} /><span /> Auto skip</label>
            </div>
            <div className="watch-toolbar-right">
              <button onClick={() => toggle(selected)}><Icon name="bookmark" size={14} /> {saved?.includes(selected.title) ? "In watchlist" : "Watchlist"}</button>
              <button onClick={() => notify("Report submitted for review.")}><Icon name="info" size={14} /> Report</button>
            </div>
          </div>

          <section className="watch-server-card">
            <div className="watch-server-heading">
              <div><h3>Choose your server</h3><p>If playback fails, try another server.</p></div>
              <span>PLAYER SOURCES</span>
            </div>
            <div className="watch-server-rows">
              {audioAvailabilityLoading ? (
                <p className="watch-availability-message">Checking SUB and DUB availability for episode {episode}…</p>
              ) : audioAvailabilityError ? (
                <p className="watch-availability-message is-error">{audioAvailabilityError}</p>
              ) : (
                <>
                  {availableSubServers.length > 0 && (
                    <div className="watch-server-group"><strong>SUB</strong>{availableSubServers.map((server: string) => <button key={"sub-" + server} className={streamServer === server && audioTrack === "sub" ? "active" : ""} aria-pressed={streamServer === server && audioTrack === "sub"} onClick={() => selectServer(server, "sub")}>{server}</button>)}</div>
                  )}
                  {availableDubServers.length > 0 && (
                    <div className="watch-server-group"><strong>DUB</strong>{availableDubServers.map((server: string) => <button key={"dub-" + server} className={streamServer === server && audioTrack === "dub" ? "active" : ""} aria-pressed={streamServer === server && audioTrack === "dub"} onClick={() => selectServer(server, "dub")}>{server}</button>)}</div>
                  )}
                  {!availableSubServers.length && !availableDubServers.length && <p className="watch-availability-message">No SUB or DUB streams were confirmed for this episode.</p>}
                </>
              )}
            </div>
            {streamServer === "HD-3" && mikazaProviders.length > 1 && (
              <div className="watch-mikaza-fallbacks">
                <strong>HD-3 PROVIDER</strong>
                <div>
                  {mikazaProviders.map((provider) => (
                    <button key={provider.id} className={mikazaProvider === provider.id ? "active" : ""} aria-pressed={mikazaProvider === provider.id} onClick={() => { setMikazaProvider(provider.id); setEmbedError(false) }}>
                      {provider.label}<small>{provider.kind}</small>
                    </button>
                  ))}
                </div>
                <span>Only sources that responded for this audio language are listed.</span>
                <button className="watch-mikaza-next" onClick={tryNextMikazaProvider} disabled={mikazaProviders.findIndex((provider) => provider.id === mikazaProvider) >= mikazaProviders.length - 1}>Try next fallback ↗</button>
              </div>
            )}
            {embedError && (
              <p className="watch-mikaza-error" role="alert">The selected stream did not load. Choose another available provider or server.</p>
            )}
            <div className="watch-server-footer">
              <p className={embedError ? "watch-server-note is-error" : "watch-server-note"}>{embedError ? "This source may be unavailable. Try another server." : "Choose a source to load the selected audio track. Availability depends on the provider."}</p>
              {embedUrl && <a className="watch-open-provider" href={embedUrl} target="_blank" rel="noopener noreferrer">Open provider directly ↗</a>}
            </div>
          </section>

          <section className="watch-current-episode">
            <div>
              <p className="watch-kicker">SEASON {season} · EPISODE {String(episode).padStart(2, "0")} · {quality} · {audioTrack.toUpperCase()} · {subtitles === "Off" ? "CC OFF" : subtitles + " CC"}</p>
              <h1>{selected.title}</h1>
              <p className="watch-current-title">{episodeTitles?.[episode - 1] || "Episode " + episode}</p>
            </div>
            <button className="watch-next-button" onClick={nextEpisode} disabled={episode >= episodeCount}>
              {episode >= episodeCount ? "Last available episode" : "Next episode"} <Icon name="chevron" size={16} />
            </button>
          </section>
        </section>

        <aside className="watch-episode-sidebar">
          <div className="watch-sidebar-heading">
            <div><h2>Episodes <span>{episodeCount}</span></h2></div>
            <div className="watch-view-switch">
              <button aria-label="Grid view" aria-pressed={episodeView === "grid"} className={episodeView === "grid" ? "active" : ""} onClick={() => setEpisodeView("grid")}><Icon name="grid" size={17} /></button>
              <button aria-label="List view" aria-pressed={episodeView === "list"} className={episodeView === "list" ? "active" : ""} onClick={() => setEpisodeView("list")}><Icon name="list" size={17} /></button>
            </div>
          </div>
          <div className="watch-sidebar-filters">
            <label>Season
              <select value={season} onChange={(event) => { if (typeof watch === "function") watch(selected, 1, Number(event.target.value)); }}>
                {Array.from({ length: seasons }, (_, index) => <option key={index + 1} value={index + 1}>Season {index + 1}</option>)}
              </select>
            </label>
            <div className="watch-episode-search"><Icon name="search" size={16} /><input value={episodeSearch} onChange={(event) => setEpisodeSearch(event.target.value)} placeholder="Search episode number or title" aria-label="Search episodes" /></div>
            <div className="watch-episode-summary"><span>Episodes 1–{episodeCount}</span><span>Available episodes</span></div>
          </div>
          <div className={`watch-episode-scroll ${episodeView === "grid" ? "is-grid" : ""}`}>
            {filteredEpisodeNumbers.map((item: { title: string; number: number }) => {
              const number = item.number
              const watched = history?.[selected.title]?.season === season && history?.[selected.title]?.episode === number
              const isCurrent = number === episode
              const thumbnail = kitsuEpisodes?.[number - 1]?.thumbnail || poster
              return (
                <a
                  key={number}
                  href={watchPath(selected.title, season, number)}
                  className={`watch-episode-card ${isCurrent ? "is-current" : ""} ${watched ? "is-watched" : ""}`}
                  onClick={(event) => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return; event.preventDefault(); goToEpisode(number) }}
                >
                  <div className="watch-episode-image"><img src={thumbnail} alt="" loading="lazy" /><span><Icon name="play" size={15} /></span></div>
                  <div className="watch-episode-meta"><span className="watch-episode-eyebrow">EP {String(number).padStart(2, "0")}</span><h3>{item.title}</h3></div>
                  <small>{formatTime(duration)}</small>
                  {watched && <span className="watch-episode-progress">{Math.round(history[selected.title].progress)}% watched</span>}
                </a>
              )
            })}
            {!filteredEpisodeNumbers.length && <div className="watch-empty-episodes"><Icon name="search" size={24} /><p>No matching episodes.</p></div>}
          </div>
          <div className="watch-sidebar-legend"><span><i className="playing" /> Playing</span><span><i className="progress" /> In progress</span><span>✓ Watched</span></div>
          <div className="watch-now-selected">
            <span className="watch-kicker">NOW SELECTED</span>
            <h3>S{season} · Episode {String(episode).padStart(2, "0")}</h3>
            <p>{episodeTitles?.[episode - 1] || "Episode " + episode}</p>
            <div className="watch-selected-progress"><span style={{ width: (currentHistory?.progress || 0) + "%" }} /></div>
            <small>{Math.round(currentHistory?.progress || 0)}% viewed in this session</small>
            <p className="watch-preview-note">Episode availability follows the current AniList/Kitsu airing data.</p>
          </div>
        </aside>
      </div>

      <section className="watch-about-section">
        <div className="watch-about-main">
          <div className="watch-section-heading"><h2>About the anime</h2><span>THE STORY BEYOND THE SCREEN</span></div>
          <div className="watch-about-card">
            <img className="watch-about-poster" src={poster} alt={selected.title} loading="lazy" />
            <div className="watch-about-copy">
              <div className="watch-about-titleline"><h2>{aniListDetails?.title?.english || selected.title}</h2><span>{String(aniListDetails?.format || aniListMeta?.format || "TV").replace(/_/g, " ")}</span></div>
              <p className="watch-alternative-title">{info?.alternative || selected.altTitle || selected.title}</p>
              <div className="watch-about-facts">
                <span>{aniListDetails?.startDate?.year || aniListMeta?.seasonYear || selected.year}</span>
                <span>{aniListDetails?.season || aniListMeta?.season || info?.season || "Season info pending"}</span>
                <span>{episodeCount} available episodes</span>
                <span>{studioNames.join(", ") || info?.studio || "Studio information pending"}</span>
              </div>
              <div className="watch-about-genres">{genres.slice(0, 6).map((genre: string) => <span key={genre}>{genre}</span>)}</div>
              <p className={`watch-about-synopsis ${readMore ? "expanded" : ""}`}>{String(synopsis).replace(/<[^>]*>/g, " ")}</p>
              <button className="watch-read-more" onClick={() => setReadMore(!readMore)}>{readMore ? "Read less −" : "Read more +"}</button>
              <div className="watch-about-actions"><button className="watch-details-button" onClick={() => detail(selected)}>View anime details ↗</button><button className="watch-save-button" onClick={() => toggle(selected)}>{saved?.includes(selected.title) ? "✓ In watchlist" : "+ Add to watchlist"}</button></div>
            </div>
          </div>
        </div>
        <aside className="watch-editorial-card">
          <span>CURATED FOR YOUR NEXT WATCH</span>
          <h2>A little escape.<br />A bigger story.</h2>
          <p>Explore the series, find your next episode, and pick up where you left off.</p>
          <small>Personal library · Episode progress</small>
        </aside>
      </section>

      <section className="watch-more-section">
        <div className="watch-more-heading"><div><span className="watch-kicker">KEEP THE STORY GOING</span><h2>More like this</h2></div><button onClick={() => notify("Explore recommendations from the anime details page.")}>Explore more <Icon name="chevron" size={15} /></button></div>
        <div className="watch-related-grid">
          {relatedAnime.map((item: any) => (
            <button className="watch-related-card" key={item.title} onClick={() => detail(item)}>
              <span className="watch-related-image"><img src={item.image} alt={item.title} loading="lazy" /><i>{isFilm(item.title) ? "MOVIE" : "SERIES"}</i></span>
              <strong>{item.title}</strong><small>{item.year} · {item.genre}</small>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
