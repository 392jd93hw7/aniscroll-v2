import { useAppPageData } from "../context/AppPageContext"

export default function AuthPage() {
  const { page, setSignedIn, auth, setAuth, password, setPassword, setSessionUserId, notify, go, card, Logo, anime, hasSupabaseConfig, supabase } = useAppPageData()
  return (
          <div className="auth-page">
            <form
              className="auth-card"
              onSubmit={async (e) => {
                e.preventDefault()
                const form = e.currentTarget
                const email = (form.querySelector<HTMLInputElement>('input[type="email"]')?.value || "").trim()
                const passwordValue = form.querySelector<HTMLInputElement>('input[type="password"]')?.value || ""
                if (!hasSupabaseConfig || !supabase) {
                  if (auth === "Sign in") { setSignedIn(true); notify("Guest preview started. Configure Supabase for real accounts."); go("Home") }
                  else notify("Configure Supabase environment variables to enable account actions.")
                  return
                }
                if (auth === "Sign in") {
                  const { data, error } = await supabase.auth.signInWithPassword({ email, password: passwordValue })
                  if (error) { notify(error.message); return }
                  setSessionUserId(data.user?.id || null); setSignedIn(Boolean(data.user)); notify("Signed in successfully"); go("Home")
                } else if (auth === "Create account") {
                  const { error } = await supabase.auth.signUp({ email, password: passwordValue, options: { emailRedirectTo: window.location.origin } })
                  if (error) { notify(error.message); return }
                  setAuth("Email verification")
                } else if (auth === "Forgot password") {
                  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
                  if (error) { notify(error.message); return }
                  setAuth("Email verification")
                }
              }}
            >
              <Logo />
              <span className="eyebrow">YOUR NEXT ANIME OBSESSION.</span>
              <h1>
                {auth === "Sign in"
                  ? "Welcome back."
                  : auth === "Create account"
                    ? "Your story starts here."
                    : auth === "Forgot password"
                      ? "Let’s get you back in."
                      : "Check your inbox."}
              </h1>
              <p className="muted">
                {auth === "Email verification"
                  ? "Check the email associated with your configured Supabase project to continue."
                  : auth === "Sign in"
                    ? "A whole world of anime is waiting for you."
                    : "Discover the stories you’ll fall in love with."}
              </p>
              {auth !== "Email verification" && (
                <>
                  <label>
                    Email address
                    <input
                      required
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                    />
                  </label>
                  {auth !== "Forgot password" && (
                    <label>
                      Password
                      <div className="password-field">
                        <input
                          aria-label="Password"
                          required
                          minLength={6}
                          type={password ? "text" : "password"}
                          autoComplete={
                            auth === "Create account"
                              ? "new-password"
                              : "current-password"
                          }
                          placeholder="At least 6 characters"
                        />
                        <button
                          type="button"
                          onClick={() => setPassword(!password)}
                        >
                          {password ? "Hide" : "Show"}
                        </button>
                      </div>
                    </label>
                  )}
                  {auth === "Sign in" && (
                    <button
                      type="button"
                      className="text-link"
                      onClick={() => setAuth("Forgot password")}
                    >
                      Forgot password?
                    </button>
                  )}
                  <button className="button purple" type="submit">
                    {auth === "Forgot password"
                      ? "Reset password"
                      : auth === "Sign in"
                        ? "Sign in"
                        : "Create account"}
                  </button>
                </>
              )}
              {auth === "Email verification" ? (
                <button
                  type="button"
                  className="button purple"
                  onClick={() => go("Home")}
                >
                  Explore Aniscroll
                </button>
              ) : (
                <p className="auth-switch">
                  {auth === "Sign in"
                    ? "New to Aniscroll?"
                    : "Already have an account?"}{" "}
                  <button
                    type="button"
                    onClick={() =>
                      setAuth(auth === "Sign in" ? "Create account" : "Sign in")
                    }
                  >
                    {auth === "Sign in" ? "Create account" : "Sign in"}
                  </button>
                </p>
              )}
              <small>
                UI prototype · No account data is stored or submitted.
              </small>
            </form>
          </div>
  )
}
