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

## Per-episode SUB/DUB availability

The watch page requests `/api/playback/availability/:anilistId/:episode` and reads explicit per-episode `sub` and `dub` booleans from Aniweeb's `/episodes/:anilistId` response. It does not make server-side HTTP requests to the iframe providers to determine language or server availability, because providers may block backend probes while still accepting browser embeds. A confirmed audio track exposes the configured server options. Results are cached for five minutes under a versioned key.

Availability is determined by an HTTP response from each embed page plus basic unavailable-page markers. This is a provider reachability check, not a guarantee that the video will finish playing; a provider may still fail later inside its iframe. If an upstream anti-bot rule blocks server-side requests or the provider always returns a generic player page for missing tracks, the probe can be inconclusive and should be adjusted to the provider's documented availability API.
## HD-3 Mikaza embed provider

HD-3 uses Mikaza's AniList iframe route. The selected provider is `haiku` by default, with `kira` as the first fallback and `naoka` as the second fallback. URLs are formed as `https://mikaza.buzz/embed/{provider}/ani/{anilist_id}/{episode}/{lang}`, where `provider` is `kira`, `haiku`, or `naoka`, and `lang` is `sub` or `dub`. The watch page exposes all three provider choices while HD-3 is selected and advances to the next fallback when the iframe reports an error. HD-1 now uses the former HD-3 AniPlayer integration. HD-2 retains AniEmbed.
## Anime directory pagination

The `/anime` directory is AniList-backed and requests 30 anime per page from `/api/catalog/anime`. The API returns AniList `pageInfo` so Previous/Next are enabled from the actual `hasNextPage` value and the total result count is displayed. Title search, genre/tag selection, year, season, and sort are passed to the API; changing any filter resets the Anime directory to page 1. Standard AniList genres use `genre_in`, while categories represented as AniList tags (for example Isekai, Reincarnation, Seinen, and Time Travel) use `tag_in`. Discover and Movies retain their own listing behavior and pagination state.
## Home genre artwork

The Home genre tiles load from `/api/anilist/genre-banners`. The backend queries AniList for a trending anime title in each displayed category using `genre_in`; the Isekai tile uses AniList's `tag_in` filter because Isekai is represented as a tag rather than a standard genre. Each chosen AniList ID is resolved through Kitsu's AniList mapping and the matching Kitsu `coverImage` is used as the tile background. A title-checked AniList banner/cover fallback is used only when Kitsu has no matching cover banner. The genre tile click still selects that genre and navigates to Discover. Results are cached for 12 hours.

## Home page data sources

The Home page retains its original sections (Continue Watching, AniList Trending, Popular this Season, watchlist recommendations, genre collections, and upcoming releases). The upper hero banner remains the AniList-trending carousel: the first four trending titles drive the slides, and each slide uses the matching Kitsu `anime.banner` artwork when available, with AniList `bannerImage` and cover art as fallbacks. The Home page also loads the regular catalog and AniList airing schedule to populate the restored lower sections.
## Frontend page structure

Page-specific JSX lives in `src/pages/`, with each route in its own file:

- `HomePage.tsx` — home and featured sections.
- `DiscoverPage.tsx` — discover browse entry point.
- `AnimePage.tsx` — anime catalog browse entry point.
- `MoviesPage.tsx` — movie catalog and pagination entry point.
- `BrowsePage.tsx` — shared browse layout used by Discover, Anime, and Movies.
- `AnimeDetailsPage.tsx` — anime overview, characters, relations, and recommendations.
- `WatchPage.tsx` — player, episode controls, and server selection.
- `WatchlistPage.tsx` — saved titles and library views.
- `SchedulePage.tsx` — upcoming airing schedule.
- `ProfilePage.tsx` — profile and preferences.
- `AdminPage.tsx` — catalog metadata administration.
- `AuthPage.tsx` — sign-in, sign-up, and password recovery.

`src/context/AppPageContext.tsx` passes the existing app state and actions to page components. `src/App.tsx` remains the shared app controller and shell for navigation, metadata loading, URL routing, and the site header/footer; page markup is kept in the page modules.
## SEO-friendly routes

Anime detail pages use `/anime/{anime-title-slug}` and episode pages use `/watch/{anime-title-slug}/season-{season}/episode-{episode}`. Browse navigation uses clean paths such as `/discover`, `/movies`, and `/schedule`; direct links and browser back/forward navigation are supported. The app updates the page title, description, canonical URL, Open Graph/Twitter metadata, and Anime structured data. In production, Express also emits route-specific metadata in the initial HTML and serves `/robots.txt` and `/sitemap.xml`.

Set `PUBLIC_SITE_URL` in the production environment to your real public origin (for example, `https://your-domain.com`, without a trailing slash) so sitemap and canonical URLs use the public domain. For production SEO, deploy the built app with `npm run build` followed by `npm start`; the Vite development server is for development and serves a generic HTML shell before React runs.

## Movies catalog

The Movies page uses a dedicated AniList query filtered to `format: MOVIE`, returning up to 30 movie titles per page with Previous/Next pagination. Adult and non-adult titles are fetched separately and merged, and the search box queries the movie catalog rather than the general anime list.

## Schedule and adult catalog

The Schedule page calls AniList's `Page.airingSchedules` query for the next seven local calendar days, paginates releases, and renders each airing date and time in the visitor's local timezone. The homepage's “Coming up next” section uses the same live data. Empty dates are shown as empty rather than reusing placeholder titles or times.

Search, trending, URL resolution, sitemap generation, and server-rendered anime metadata query both `isAdult: false` and `isAdult: true` and merge the entries by AniList ID. AniList records marked for 18+ audiences remain discoverable and display an **18+** badge. This is a catalog filter setting, not an age-verification system; add appropriate age gating and follow the laws and provider terms applicable to your deployment.

## AniList-powered anime detail pages

Anime detail pages fetch character profiles (including character images, roles, biographies, and Japanese voice-actor names), franchise relations, ranked recommendations, and expanded title metadata from AniList. These are loaded through `/api/anilist/:id/details` and appear in the Characters, Related Anime, and Overview tabs. Character and recommendation connections are limited to a page of results so the page stays responsive.

## Data and playback

- **AniList** supplies canonical anime IDs and anime-level metadata through GraphQL.
- **Kitsu** supplies anime banner art and episode titles/thumbnails/details when data is available. Since AniList and Kitsu IDs differ, the backend maps through Kitsu's mapping endpoint, using title search only as a fallback.
- Streaming choices are labelled **HD-1**, **HD-2**, and **HD-3**; audio options are **Sub** and **Dub**:
  - HD-1: `https://aniplayer.xyz/embeds/{aniListId}/{episode}/{sub|dub}`
  - HD-2: `https://aniembed.se/e/{aniListId}/{episode}?lang={sub|dub}`
  - HD-3: `https://mikaza.buzz/embed/{provider}/ani/{aniListId}/{episode}/{sub|dub}`
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
