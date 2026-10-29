import { useAppPageData } from "../context/AppPageContext"

export default function AdminPage() {
  const { page, saved, isAdmin, adminOverrides, notify, catalog, go, saveAdminRecord, removeAdminRecord, info, card, heading, Icon, anime, featured } = useAppPageData()
  return (
          <div className="page-container admin-page">
            <span className="eyebrow">ANISCROLL CONTROL ROOM</span>
            <h1>Catalog dashboard</h1>
            <p className="muted">Manage metadata overrides for AniList titles. Source IDs and stream-provider mappings remain unchanged.</p>
            {!isAdmin ? (
              <div className="session-notice">
                <Icon name="info" size={18} />
                <span>Admin access is not enabled. A project owner must promote your profile role to admin in Supabase.</span>
                <button className="text-link" onClick={() => go("Profile")}>Back to profile</button>
              </div>
            ) : (
              <>
                <div className="admin-summary-grid">
                  <div className="admin-summary-card"><span>Catalog entries</span><strong>{catalog.length}</strong></div>
                  <div className="admin-summary-card"><span>Metadata overrides</span><strong>{adminOverrides.length}</strong></div>
                  <div className="admin-summary-card"><span>Featured overrides</span><strong>{adminOverrides.filter((item) => item.featured && !item.hidden).length}</strong></div>
                </div>
                <form className="admin-form" onSubmit={async (e) => {
                  e.preventDefault()
                  const form = e.currentTarget
                  const values = new FormData(form)
                  const anilistId = Number(values.get("anilist_id"))
                  if (!Number.isSafeInteger(anilistId) || anilistId <= 0) {
                    notify("Enter a valid AniList ID.")
                    return
                  }
                  const savedRecord = await saveAdminRecord({
                    anilist_id: anilistId,
                    title_override: String(values.get("title_override") || "").trim() || null,
                    cover_url: String(values.get("cover_url") || "").trim() || null,
                    banner_url: String(values.get("banner_url") || "").trim() || null,
                    synopsis_override: String(values.get("synopsis_override") || "").trim() || null,
                    featured: values.get("featured") === "on",
                    hidden: values.get("hidden") === "on",
                  })
                  if (savedRecord) {
                    form.reset()
                    notify("Catalog override saved")
                  }
                }}>
                  <div className="admin-form-heading">
                    <div><h2>Add or update an anime</h2><p className="muted">Reuse the AniList ID to update an existing record.</p></div>
                  </div>
                  <label>AniList ID <input type="number" name="anilist_id" min="1" step="1" placeholder="e.g. 21" required /></label>
                  <label>Title override <input name="title_override" maxLength={160} placeholder="Leave blank to use AniList title" /></label>
                  <label>Cover image URL <input name="cover_url" type="url" placeholder="Optional poster URL" /></label>
                  <label>Banner image URL <input name="banner_url" type="url" placeholder="Optional wide banner URL" /></label>
                  <label>Synopsis override <textarea name="synopsis_override" rows={3} maxLength={6000} placeholder="Leave blank to use AniList synopsis" /></label>
                  <div className="admin-checks">
                    <label className="check-label"><input type="checkbox" name="featured" /> Mark as featured</label>
                    <label className="check-label"><input type="checkbox" name="hidden" /> Hide from browse pages</label>
                  </div>
                  <button className="button purple" type="submit">Save catalog override</button>
                </form>
                <section className="admin-records">
                  <div className="admin-form-heading"><h2>Existing overrides</h2><span>{adminOverrides.length} records</span></div>
                  {adminOverrides.length ? adminOverrides.map((record) => (
                    <div className="admin-record" key={record.anilist_id}>
                      <div><strong>{record.title_override || ("AniList #" + record.anilist_id)}</strong><span>ID {record.anilist_id} · {record.hidden ? "Hidden" : record.featured ? "Featured" : "Visible"}</span></div>
                      <button className="text-link" onClick={() => void removeAdminRecord(Number(record.anilist_id))}>Delete</button>
                    </div>
                  )) : <p className="muted">No overrides yet. Default AniList metadata remains in use.</p>}
                </section>
              </>
            )}
          </div>
  )
}
