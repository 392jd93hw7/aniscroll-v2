# Aniscroll

A responsive anime discovery and viewing frontend built from the supplied Figma Make reference. It keeps the dark charcoal/violet visual direction with discovery, filters, anime details, episodes, schedule, profile, watchlist, and a dedicated watch page.

## Run locally

Requirements: Node.js 20+.

```bash
npm install
cp .env.example .env
npm run dev
```

Vite runs at http://localhost:5173 and proxies `/api` requests to Express on port 3001. Build with `npm run build`; `npm start` serves the built app and API on `PORT` (default 3001).

## Data and playback

- **AniList** supplies canonical anime IDs and anime-level metadata through GraphQL.
- **Kitsu** supplies anime banner art and episode titles/thumbnails/details when data is available. Since AniList and Kitsu IDs differ, the backend maps through Kitsu's mapping endpoint, using title search only as a fallback.
- Streaming choices are labelled **HD-1**, **HD-2**, and **HD-3**; audio options are **Sub** and **Dub**:
  - HD-1: `https://anixo.buzz/embed/ani/{aniListId}/{episode}?track={sub|dub}`
  - HD-2: `https://aniembed.se/e/{aniListId}/{episode}?lang={sub|dub}`
  - HD-3: `https://aniplayer.xyz/embeds/{aniListId}/{episode}/{sub|dub}`
- Embedded players use a restrictive sandbox without popup or top-level-navigation permissions. It cannot guarantee ads inside the provider's frame will disappear or that every provider supports the sandbox restrictions.

## Accounts and storage

Watchlists, viewing progress, and preferences persist in browser storage. For real email/password authentication and cloud watchlists, create a Supabase project, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`, and run `supabase/schema.sql` in the SQL editor. Guest browsing remains available without Supabase. Never expose a service-role key via frontend variables.

## Operational notes

External APIs and providers can be unavailable or impose rate limits. This app does not host or proxy video; embed only content you are authorized to distribute. Verify image rights, provider terms, privacy requirements, and security settings before public production.


## Admin dashboard

Configure Supabase and apply `supabase/schema.sql`. After the first user registers, promote the intended account using the Supabase SQL editor:

```sql
update public.profiles
set role = 'admin'
where id = '<auth-user-uuid>';
```

The Profile page then exposes the role-protected Catalog Dashboard, where admins can override a title, cover URL, banner URL, synopsis, featured state, and browse visibility by AniList ID. Row-level security protects override writes and prevents users from changing their own role. Keep admin promotion limited to trusted project owners.
