# CueNext Movie/TV Tracker — Multiphase Plan

## Summary

- Build a responsive web/PWA movie+TV tracker using TMDB for metadata, Clerk for auth, and Convex for the library/progress database.

- Implement in phases, starting with Convex auth + database + API (followed items, watched movies, watched episodes, progress + stats), then routes/pages, then UI components, then hooks/polish.

## Current State Analysis (Repo Grounding)

- App shell + routing: TanStack Router file-based routes exist at [src/routes](file:///Users/carles.rojas/Documents/Repos/cuenext/src/routes), with root layout in [\_\_root.tsx](file:///Users/carles.rojas/Documents/Repos/cuenext/src/routes/__root.tsx).

- Auth (Clerk): client-only provider in [ClerkProvider.tsx](file:///Users/carles.rojas/Documents/Repos/cuenext/src/integration/ClerkProvider.tsx) and sign-in UI in [Header.tsx](file:///Users/carles.rojas/Documents/Repos/cuenext/src/component/Header.tsx). No protected-route pattern yet.

- DB (Convex): demo `todos/products` schema in [convex/schema.ts](file:///Users/carles.rojas/Documents/Repos/cuenext/convex/schema.ts) and demo functions in [convex/todos.ts](file:///Users/carles.rojas/Documents/Repos/cuenext/convex/todos.ts). No Convex auth integration yet.

- Environment: server env expects `TMDB_API_KEY` and `TMDB_READ_ACCESS_TOKEN` in [env.ts](file:///Users/carles.rojas/Documents/Repos/cuenext/src/env.ts). TMDB not yet used in code.

- UI stack: Tailwind + shadcn-style primitives under [src/component/ui](file:///Users/carles.rojas/Documents/Repos/cuenext/src/component/ui).

## Product Decisions (Locked)

- Platforms: responsive web + PWA shell.

- TMDB locale: fixed `en-US`.

- Lists caching behavior: persist list responses in browser storage and keep showing last good data until fresh data arrives.

- Watchlist logic (TV):
  - **Haven’t started**: followed show with zero watched episodes.

  - **Watch next**: followed show with episodes remaining, not manually “stopped”, and last watched activity within 30 days.

  - **Stopped watching** (collapsed by default): followed show that is manually stopped OR last watched activity older than 30 days.

- Movies: “Watch next” only for unwatched followed movies; watched movies appear in Profile > Finished.

- Mark-as-watched (poster button):
  - Movies: mark watched → moves to Finished (derived).

  - TV: mark next episode watched.

- TV details page: full seasons dropdown; episode list supports toggling any episode. If user tries to mark an episode while earlier episodes are unwatched, show a popup offering to mark all previous episodes as watched.

- Library privacy: private to the signed-in user only.

- Stats accuracy: rough estimate (movie runtime + TV average runtime).

## Data Model (Convex)

### Core entities (Singular table names)

- `follow` (one per user per TMDB title)
  - `userId: string` (Clerk user id)

  - `type: 'movie' | 'show'`

  - `tmdbId: number`

  - `followedAt: number`

  - `manuallyStopped: boolean`

  - `updatedAt: number`

  - **Indexes**
    - `by_user_mediaType` (for lists)

    - `by_user_mediaType_tmdbId` (uniqueness and lookups)

- `movie` (movie progress; watched movies appear in Profile > Finished)
  - `userId: string`

  - `tmdbId: number`

  - `watchedAt: number | null`

  - Index: `by_user_tmdbId`

- `episode` (one row per watched episode; delete row to “unwatch”)
  - `userId: string`

  - `showTmdbId: number`

  - `seasonNumber: number` (exclude season 0 in UI)

  - `episodeNumber: number`

  - `watchedAt: number`

  - **Indexes**
    - `by_user_show` (get watched set for details page)

    - `by_user_show_season_episode` (uniqueness + toggles)

- `nextEpisode` (denormalized summary to power watchlist cards + “mark next episode”)
  - `userId: string`

  - `showTmdbId: number`

  - `lastWatchedAt: number | null`

  - `nextSeasonNumber: number` (defaults to 1)

  - `nextEpisodeNumber: number` (defaults to 1)

  - `updatedAt: number`

  - Index: `by_user_show`

### Why this shape

- Per-episode rows allow arbitrary episode toggles and enable the “mark all previous” action without complex exception tracking.

- `nextEpisode` avoids scanning episode rows when rendering watchlist or when the poster button marks “next episode watched”.

- TMDB metadata is not stored in Convex by default; UI fetches it from TMDB and relies on client-side persistence for “last good data”.

## API Design (Convex Functions)

### Auth boundary

- All queries/mutations that read/write user data require a signed-in identity; use the Clerk identity from Convex auth and enforce `userId` scoping inside every handler.

### Library

- `library.follow({ type, tmdbId })`: upsert `follow` for the user; initialize `nextEpisode` for TV titles if missing.

- `library.unfollow({ type, tmdbId })`: remove from `follow`; optionally cascade delete progress rows (`movie` / `episode` / `nextEpisode`).

- `library.setStopped({ type, tmdbId, stopped })`: toggle `manuallyStopped` (primarily used for TV, but can be allowed for movies too).

- `library.listFollowed({ type })`: list followed TMDB ids for the user (base for watchlist/upcoming).

### Progress (Movies)

- `progress.markMovieWatched({ tmdbId })`: set watchedAt=now.

- `progress.unmarkMovieWatched({ tmdbId })`: watchedAt=null.

### Progress (TV episodes)

- `progress.toggleEpisodeWatched({ showTmdbId, seasonNumber, episodeNumber })`
  - If watched row exists → delete it (unwatch)

  - Else → insert it with watchedAt=now

  - Update `nextEpisode.lastWatchedAt`

  - Recompute `nextEpisode.nextSeasonNumber/nextEpisodeNumber` by scanning forward from current cursor using TMDB season data (see “TMDB access” below)

- `progress.markPreviousEpisodesWatched({ showTmdbId, upTo: {seasonNumber, episodeNumber} })`
  - Called when user confirms the popup.

  - Uses TMDB season data to compute the episode list to insert (excluding season 0) OR accepts an explicit episode list from the client (preferred to reduce TMDB calls).

- `progress.markNextEpisodeWatched({ showTmdbId })`
  - Uses `nextEpisode.next*` cursor; marks that episode watched; advances cursor to the next unwatched episode.

### Watchlist sections (server-side classification)

- `watchlist.getTvSections()`: returns 3 arrays (watchNext, haventStarted, stoppedWatching) with only Convex-owned data:
  - `tmdbId`, `lastWatchedAt`, `manuallyStopped`, `nextSeasonNumber`, `nextEpisodeNumber`

  - The UI enriches each item with TMDB metadata (title/poster/next episode air date) using client-side cached TMDB fetches.

- `watchlist.getMovieWatchNext()`: returns unwatched followed movie ids.

### Stats

- `stats.getProfileSummary()`: counts from Convex data:
  - movies watched count

  - episodes watched count

  - followed movies/shows counts

  - last activity timestamp

  - “time spent” computed client-side after enriching with TMDB runtime fields (rough estimate).

## TMDB Access Strategy (Secrets + Client Persistence)

### Where TMDB calls happen

- Use Convex **actions** for TMDB fetches.
- Keep secrets server-side (Convex env already has `TMDB_READ_ACCESS_TOKEN`).
- React Query still caches + persists the returned JSON in localStorage on the client.

### Required TMDB capabilities

- Fetch popular lists for Explore (movies + TV).

- Search (multi or separate movie/tv) for “add to watchlist”.

- Movie details (runtime, release date, poster, etc.).

- TV details (name, poster, episode_run_time, next_episode_to_air, number_of_seasons, etc.).

- TV season details (episode list with episode numbers, names, stills).

### Client-side persistence requirement

- Add a React Query persistence layer so list/detail queries keep showing last successful data until fresh data arrives.

- Persist only “safe” data (no secrets), keyed by TMDB endpoint + params; invalidate via `staleTime` + background refetch.

## Multiphase Implementation Plan

### Phase 1 — Auth + Convex DB + Core API (First milestone)

**Goal:** signed-in, private per-user library/progress stored in Convex; no UI pages beyond a minimal test screen.

- Add Clerk ↔ Convex authentication wiring
  - Update [src/integration/ConvexProvider.tsx](file:///Users/carles.rojas/Documents/Repos/cuenext/src/integration/ConvexProvider.tsx) to set Convex auth using Clerk’s session token getter.

  - Add Convex auth configuration files required for JWT verification (repo + Convex dashboard/CLI steps).

  - Update Convex functions to reject unauthenticated access.

- Replace demo schema with tracker schema
  - Update [convex/schema.ts](file:///Users/carles.rojas/Documents/Repos/cuenext/convex/schema.ts) with tables/indexes listed above.

  - Remove/retire demo `todos/products` code or isolate it so it doesn’t break builds.

- Implement Convex functions
  - Add new modules:
    - `convex/library.ts`

    - `convex/progress.ts`

    - `convex/watchlist.ts`

    - `convex/stats.ts`

- Add a minimal internal route for manual verification
  - Create a temporary route (e.g. `/debug/library`) to follow/unfollow a TMDB id and toggle watched; remove later if desired.

### Phase 2 — TMDB integration layer + persisted fetching

**Goal:** reliable TMDB fetchers (server-only) plus client hooks that persist last good responses in local storage.

- Create TMDB fetch module (server-only)
  - `convex/tmdb.ts` actions (and helper `convex/lib/tmdbClient.ts`)

- Add React Query persistence
  - Extend [src/integration/QueryProvider.tsx](file:///Users/carles.rojas/Documents/Repos/cuenext/src/integration/QueryProvider.tsx) to persist query cache to localStorage and restore on boot.

- Add shared TMDB helpers
  - `src/lib/tmdbImage.ts` for building poster URLs.

  - `src/lib/tmdbTypes.ts` for minimal typed response shapes used by UI.

### Phase 3 — Routes + Navigation Shell (Mobile bottom / Desktop top)

**Goal:** working app navigation and page skeletons.

- Add routes:
  - `/watchlist`

  - `/upcoming`

  - `/explore`

  - `/profile`

  - `/tv/$tmdbId` and `/movie/$tmdbId` (details)

- Implement responsive navbar
  - Replace or refactor [Header.tsx](file:///Users/carles.rojas/Documents/Repos/cuenext/src/component/Header.tsx) into an app shell that renders:
    - Desktop: top navbar

    - Mobile: bottom navbar

### Phase 4 — Page Features (Watchlist, Upcoming, Explore, Profile)

**Goal:** feature-complete pages using Convex data + TMDB enrichment.

- Watchlist (TV + Movies toggle)
  - TV: 3 sections (Watch next, Haven’t started, Stopped watching collapsed by default)

  - Movies: Watch next only (unwatched followed movies)

- Upcoming
  - For followed TV: show rows keyed by `next_episode_to_air` (from TV details), sorted by date.

  - For followed Movies: show rows keyed by release date (from movie details), sorted by date.

- Explore
  - Popular list (movies or TV)

  - Search (movies/TV); results can be followed/unfollowed.

- Profile
  - Logout

  - Finished movies and finished shows (derived from progress + TMDB total episode counts/status)

  - Stats (episodes watched, movies watched, rough time spent)

### Phase 5 — Components + Hooks + Polish

**Goal:** reusable building blocks, clean state flow, and UX polish.

- Components
  - `PosterCard` (poster + watched button + follow state)

  - `Section` (title + collapse toggle)

  - `UpcomingRow`

  - `MediaTypeToggle`

  - `SeasonDropdown` + `EpisodeRow` + “mark previous episodes?” dialog

- Hooks
  - `useLibrary()` (follow/unfollow)

  - `useMovieProgress()` / `useTvProgress()`

  - `useTmdbPopular()` / `useTmdbSearch()` / `useTmdbDetails()`

## Assumptions & Constraints

- Clerk is the only auth provider; each Convex record is scoped to a single Clerk user id.

- Season 0 (“Specials”) are excluded from the UI and from “mark previous episodes” behavior.

- “Finished” is derived only (no manual finish toggle): movies watched; shows complete when watched episode count reaches TMDB-reported total (excluding specials) and/or show status supports it.

- TMDB rate limits exist; client persistence reduces repeat calls but does not eliminate them.

## Verification (Acceptance Checklist)

- Auth
  - Signed-out user cannot read or mutate library/progress functions.

  - Signed-in user sees only their own records.

- Library + Progress
  - Follow/unfollow works for movies and TV.

  - Movie poster “mark watched” moves it to Profile > Finished and removes from Watch next.

  - TV poster “mark next episode watched” marks the correct episode and advances `nextEpisode.next*`.

  - TV details: toggling episodes works; unwatch works; “mark previous episodes” dialog fills earlier episodes correctly.

- TMDB persistence
  - After a successful load, refreshing the page still shows last fetched lists/details immediately, then updates when fresh data arrives.
