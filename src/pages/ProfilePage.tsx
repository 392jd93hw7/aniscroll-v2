import { useAppPageData } from "../context/AppPageContext"

export default function ProfilePage() {
  const { page, saved, history, preferences, setPreferences, draftPreferences, setDraftPreferences, signedIn, setSignedIn, audio, setAudio, subtitles, setSubtitles, autoplay, setAutoplay, episode, progress, auth, setSessionUserId, isAdmin, notify, go, info, watch, heading, Icon, runtimeFor, formatTime, hasSupabaseConfig, supabase } = useAppPageData()
  return (
          <div className="page-container profile-page">
            <div className="profile-heading">
              <div className="avatar large">
                {preferences.name.slice(0, 1).toUpperCase() || "K"}
              </div>
              <div>
                <span className="eyebrow">YOUR ANISCROLL SPACE</span>
                <h1>Hey, {preferences.name}.</h1>
                <p className="muted">
                  Every great adventure starts with one episode.
                </p>
              </div>
            </div>
            <div className="session-notice">
              <Icon name="info" size={18} />
              <span>
                {signedIn
                  ? "Signed-in account session."
                  : "Guest mode · Preferences and history are stored in this browser."}
              </span>
              <button
                onClick={() => {
                  if (signedIn) {
                    if (hasSupabaseConfig && supabase) void supabase.auth.signOut()
                    setSessionUserId(null)
                    setSignedIn(false)
                    notify("Signed out")
                  } else go("Auth")
                }}
              >
                {signedIn ? "Sign out of preview" : "Sign in preview"}
              </button>
            </div>
            <div className="stats">
              {[
                [
                  String(
                    Object.values(history as Record<string, { progress: number }>).filter((h) => h.progress >= 100)
                      .length,
                  ),
                  "Preview entries finished",
                ],
                [String(Object.keys(history).length), "Stories in progress"],
                [
                  formatTime(
                    Object.entries(history as Record<string, { progress: number }>).reduce(
                      (total, [title, h]) =>
                        total + (h.progress * runtimeFor(title)) / 100,
                      0,
                    ),
                  ),
                  "Preview watch time",
                ],
                [String(saved.length), "Saved for later"],
              ].map(([n, l]) => (
                <div key={l}>
                  <strong>{n}</strong>
                  <span>{l}</span>
                </div>
              ))}
            </div>
            <form
              className="preferences"
              onSubmit={(e) => {
                e.preventDefault()
                const next = {
                  ...draftPreferences,
                  name: draftPreferences.name.trim() || "Kaito",
                }
                setPreferences(next)
                setDraftPreferences(next)
                setAudio(next.audio)
                setSubtitles(next.subtitles)
                setAutoplay(next.autoplay)
                notify("Preferences updated for this preview")
              }}
            >
              <h2>Make yourself at home</h2>
              <p className="muted">
                Personalize your viewing experience. Preferences apply to this
                preview session.
              </p>
              <label>
                Display name
                <input
                  required
                  maxLength={30}
                  value={draftPreferences.name}
                  onChange={(e) =>
                    setDraftPreferences((p) => ({ ...p, name: e.target.value }))
                  }
                  autoComplete="nickname"
                />
              </label>
              <label>
                Preferred audio
                <select
                  aria-label="Preferred audio"
                  value={draftPreferences.audio}
                  onChange={(e) =>
                    setDraftPreferences((p) => ({
                      ...p,
                      audio: e.target.value,
                    }))
                  }
                >
                  <option>Japanese</option>
                  <option>English</option>
                </select>
              </label>
              <label>
                Subtitles
                <select
                  aria-label="Preferred subtitles"
                  value={draftPreferences.subtitles}
                  onChange={(e) =>
                    setDraftPreferences((p) => ({
                      ...p,
                      subtitles: e.target.value,
                    }))
                  }
                >
                  <option>English</option>
                  <option>Off</option>
                </select>
              </label>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={draftPreferences.autoplay}
                  onChange={(e) =>
                    setDraftPreferences((p) => ({
                      ...p,
                      autoplay: e.target.checked,
                    }))
                  }
                />{" "}
                Autoplay next episode
              </label>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={draftPreferences.notifications}
                  onChange={(e) =>
                    setDraftPreferences((p) => ({
                      ...p,
                      notifications: e.target.checked,
                    }))
                  }
                />{" "}
                New episode notifications
              </label>
              <button className="button purple" type="submit">
                Save preferences
              </button>
            </form>
            {isAdmin && (
              <button className="button purple admin-open-button" onClick={() => go("Admin")}>
                Open admin dashboard <Icon name="chevron" size={16} />
              </button>
            )}
            <button className="text-link" onClick={() => go("Auth")}>
              Sign in to your account <Icon name="chevron" size={16} />
            </button>
          </div>
  )
}
