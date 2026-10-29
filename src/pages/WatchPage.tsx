import { useAppPageData } from "../context/AppPageContext"

export default function WatchPage() {
  const { page, selected, season, loading, audio, subtitles, setSubtitles, speed, setSpeed, quality, setQuality, volume, setVolume, autoplay, setAutoplay, controlsVisible, setControlsVisible, playerSettings, setPlayerSettings, fullscreen, episode, setEpisode, playing, setPlaying, progress, setProgress, aniListId, streamServer, setStreamServer, audioTrack, setAudioTrack, embedError, setEmbedError, metadataLoading, notify, detail, info, duration, episodeCount, embedUrl, nextEpisode, toggleFullscreen, heading, episodes, Icon, Logo, anime, isFilm, formatTime } = useAppPageData()
  return (
          <div className="player-page">
            <button className="text-link" onClick={() => detail(selected)}>
              ← Back to {selected.title}
            </button>
            <div
              className={`video-placeholder ${controlsVisible || !playing || playerSettings ? "" : "controls-idle"} ${embedUrl ? "has-stream" : ""}`}
              onPointerMove={() => setControlsVisible(true)}
              onPointerDown={() => setControlsVisible(true)}
              onFocusCapture={() => setControlsVisible(true)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setPlayerSettings(false)
              }}
            >
              {embedUrl ? (
                <iframe key={embedUrl} className="stream-frame" title={selected.title + " episode " + episode}
                  src={embedUrl} loading="eager"
                  sandbox="allow-scripts allow-same-origin allow-presentation"
                  allow="autoplay; fullscreen; picture-in-picture" allowFullScreen
                  referrerPolicy="no-referrer" onLoad={() => setEmbedError(false)} onError={() => setEmbedError(true)} />
              ) : (
                <div className="video-center">
                  <Logo />
                  <button className="big-play" onClick={() => notify(metadataLoading ? "Finding anime metadata…" : "Choose an anime with an AniList ID to load a stream")} aria-label="Loading stream">
                    <Icon name="play" size={32} />
                  </button>
                  <p>{metadataLoading ? "Connecting anime metadata" : "Select a server to start watching"}</p>
                  <small>{aniListId ? "Choose HD-1, HD-2 or HD-3 below" : "AniList ID resolution is required before playback"}</small>
                </div>
              )}
              <button
                className="skip-intro button glass"
                hidden={isFilm(selected.title) || progress > 8}
                onClick={() => {
                  setProgress(8.5)
                  notify("Intro skipped")
                }}
              >
                Skip intro <Icon name="chevron" size={16} />
              </button>
              <div className="player-controls">
                <input
                  aria-label="Seek"
                  type="range"
                  min="0"
                  max="100"
                  value={progress}
                  aria-valuetext={`${formatTime((progress * duration) / 100)} of ${formatTime(duration)}`}
                  onChange={(e) => setProgress(+e.target.value)}
                />
                <div>
                  <button
                    aria-label={playing ? "Pause" : "Play"}
                    onClick={() => setPlaying(!playing)}
                  >
                    <Icon name={playing ? "pause" : "play"} />
                  </button>
                  <button
                    aria-label="Next episode"
                    disabled={episode >= episodeCount}
                    onClick={nextEpisode}
                  >
                    <Icon name="chevron" />
                  </button>
                  <button
                    aria-label={volume ? "Mute" : "Unmute"}
                    onClick={() => setVolume((v) => (v ? 0 : 70))}
                  >
                    <Icon name="volume" />
                  </button>
                  <input
                    className="volume"
                    aria-label="Volume"
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => setVolume(+e.target.value)}
                  />
                  <span>
                    {formatTime((progress * duration) / 100)} /{" "}
                    {formatTime(duration)}
                  </span>
                  <div className="player-spacer" />
                  <button
                    aria-label="Playback settings"
                    aria-expanded={playerSettings}
                    aria-controls="playback-settings"
                    onClick={() => setPlayerSettings(!playerSettings)}
                  >
                    <Icon name="settings" />
                  </button>
                  <button
                    aria-label={
                      fullscreen ? "Exit fullscreen" : "Enter fullscreen"
                    }
                    onClick={toggleFullscreen}
                  >
                    <Icon name="expand" />
                  </button>
                </div>
              </div>
              {playerSettings && (
                <div
                  className="playback-settings"
                  id="playback-settings"
                  role="region"
                  aria-label="Playback settings"
                >
                  <div className="settings-heading">
                    <h3>Playback settings</h3>
                    <button
                      aria-label="Close playback settings"
                      onClick={() => setPlayerSettings(false)}
                    >
                      <Icon name="close" size={18} />
                    </button>
                  </div>
                  <label>
                    Stream audio
                    <select aria-label="Stream audio" value={audioTrack}
                      onChange={(e) => { setAudioTrack(e.target.value as "sub" | "dub"); setEmbedError(false) }}>
                      <option value="sub">Sub</option><option value="dub">Dub</option>
                    </select>
                  </label>
                  <label>
                    Subtitles
                    <select
                      aria-label="Subtitles"
                      value={subtitles}
                      onChange={(e) => setSubtitles(e.target.value)}
                    >
                      <option>English</option>
                      <option>Japanese</option>
                      <option>Off</option>
                    </select>
                  </label>
                  <label>
                    Playback speed
                    <select
                      aria-label="Playback speed"
                      value={speed}
                      onChange={(e) => setSpeed(e.target.value)}
                    >
                      {["0.75", "1", "1.25", "1.5", "2"].map((s) => (
                        <option key={s} value={s}>
                          {s}×{s === "1" ? " · Normal" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Video quality
                    <select
                      aria-label="Video quality"
                      value={quality}
                      onChange={(e) => setQuality(e.target.value)}
                    >
                      <option>1080p</option>
                      <option>720p</option>
                      <option>480p</option>
                    </select>
                  </label>
                  <p>
                    Playback is handled by the selected embedded server. Some controls are provider-managed.
                  </p>
                </div>
              )}
            </div>
            <div className="stream-picker" aria-label="Embedded playback options">
              <div className="stream-picker-group"><span>Server</span>
                {["HD-1", "HD-2", "HD-3"].map((server) => (
                  <button key={server} className={streamServer === server ? "selected" : ""} aria-pressed={streamServer === server} onClick={() => { setStreamServer(server); setEmbedError(false) }}>{server}</button>
                ))}
              </div>
              <div className="stream-picker-group"><span>Audio</span>
                {(["sub", "dub"] as const).map((track) => (
                  <button key={track} className={audioTrack === track ? "selected" : ""} aria-pressed={audioTrack === track} onClick={() => { setAudioTrack(track); setEmbedError(false) }}>{track.toUpperCase()}</button>
                ))}
              </div>
              <p>{embedError ? "This embed may be unavailable. Try another HD server." : "Sandbox restrictions block popups and top-level navigation; ads within a provider frame may still appear."}</p>
            </div>
            <div className="player-info">
              <div>
                <span className="eyebrow">
                  {isFilm(selected.title)
                    ? "FEATURE FILM"
                    : `SEASON ${season} · EPISODE ${episode}`}{" "}
                  · {quality} · {audioTrack.toUpperCase()} ·{" "}
                  {subtitles === "Off" ? "CC OFF" : `${subtitles} CC`}
                </span>
                <h1>{selected.title}</h1>
                <p>
                  {season === 1
                    ? info.episodes[episode - 1]
                    : `Season ${season} · Preview chapter ${episode}`}
                </p>
              </div>
              <button
                className="button purple"
                disabled={episode >= episodeCount}
                onClick={nextEpisode}
              >
                {isFilm(selected.title)
                  ? "Feature film"
                  : episode >= episodeCount
                    ? "Last preview episode"
                    : "Next episode"}{" "}
                <Icon name="chevron" size={17} />
              </button>
            </div>
            <div className="player-options">
              <button
                disabled={episode <= 1}
                onClick={() => {
                  setEpisode((e) => Math.max(1, e - 1))
                  setProgress(0)
                }}
              >
                ← Previous episode
              </button>
              <label>
                <input
                  type="checkbox"
                  checked={autoplay}
                  onChange={(e) => setAutoplay(e.target.checked)}
                />{" "}
                Autoplay next episode
              </label>
              <span>Space: play / pause · ← / →: seek</span>
            </div>
          </div>
  )
}
