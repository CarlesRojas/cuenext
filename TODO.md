# Convex call-reduction rollout

Steps to ship the branch that moves TMDB off the websocket, shares season layouts
between users, and stops subscribing to data only the browser itself writes.

## Test on dev first

Nothing here needs a new environment variable, so the dev deployment works as-is.

- [ ] **`npx convex dev`** — pushes the schema and functions to dev, regenerates
      `convex/_generated` properly (replacing the hand-edit), and registers the `/tmdb`
      route and the cron there. The schema change is additive only — one new table,
      three new indexes, no existing field touched — so there is no migration prompt
      and no backfill.
- [ ] **`npx convex env list`** — confirm `TMDB_READ_ACCESS_TOKEN` and
      `CLERK_FRONTEND_API_URL` are set on dev. Both already exist if you have been
      developing against it; `http.ts` reads the same TMDB token the old actions did.
- [ ] **Smoke-test the proxy against dev** — `curl "https://<dev>.convex.site/tmdb?path=/tv/1396"`.
      That origin is the dev `VITE_CONVEX_URL` with `.convex.cloud` swapped for
      `.convex.site`, which is exactly what the client derives, so a working curl means
      a working app.
- [ ] **`pnpm dev`** and walk the Verify list below.
- [ ] **Trigger the cron by hand** rather than waiting six hours: run
      `internal.nextEpisode.refreshStaleShowSeasons` from the dashboard function
      runner. Open a show page or follow something first, otherwise `showSeasons` is
      empty and it correctly does nothing.

Two things dev cannot tell you. It has its own data, so it will not exercise the
migration path — existing `nextEpisode` rows falling back to their own season copy for
up to a week before the shared table takes over. That is the lowest-risk part of the
change (it is today's behaviour, unchanged) but it stays untested until deploy. And
stale-client breakage is prod-only by nature.

## Deploy

- [ ] **Deploy Convex** — `npx convex deploy`.

  This regenerates `convex/_generated` (the module map there was hand-edited so
  typecheck would pass; Convex will rewrite it), creates the `showSeasons` table and
  the three new indexes (`nextEpisode.by_show`, `showSeasons.by_updatedAt`,
  `reviewVote.by_user`), registers the `/tmdb` HTTP route, and registers the cron.

- [ ] **Confirm `TMDB_READ_ACCESS_TOKEN` is set on the deployment.** Same variable as
      before — `convex/http.ts` and the two remaining actions both read it — but if it
      is missing the proxy fails as a 502 rather than anything obvious.

- [ ] **Smoke-test the proxy before shipping the frontend:**

      curl "https://<deployment>.convex.site/tmdb?path=/tv/1396"

      A 404 means the HTTP-actions origin is not the websocket URL with `.convex.cloud`
      swapped for `.convex.site`, and `VITE_CONVEX_SITE_URL` needs to be set.

- [ ] **Deploy the frontend.**

## Verify

- [ ] **A show page** — seasons render, episode numbering is right, watch toggles
      update immediately.
- [ ] **`/discover`, `/see-all/*`, `/search`** — these now pass TMDB's own parameter
      names (`vote_count.gte` rather than `vote_count_gte`). Most likely place for a
      mistake.
- [ ] **`/upcoming`** — still Convex actions, but `InfiniteMediaList` receives them
      differently now.
- [ ] **Reviews** — scroll to the section (it loads on approach rather than on page
      load), rate something, upvote, delete.
- [ ] **Import flows** — the external-id lookups moved from actions to plain calls.

## After

- [ ] **Give it 24h, then re-read the function-call breakdown.** `tmdbCache.*`,
      `tmdb.getShowSeasonDetails` and `episodeInfo.saveEpisodeInfo` should be at or
      near zero; the rest should drop hard.
- [ ] **Expect old clients to error briefly.** A cached PWA still calling
      `api.tmdb.getDiscoverShows` will fail until it reloads, since those actions are
      gone.

## The cron needs no setup

Convex registers crons from `convex/crons.ts` on deploy, the same way it registers
functions. After deploying, `refresh show seasons` appears under **Schedules → Cron
Jobs** in the dashboard and fires every six hours on its own.

### What an empty `showSeasons` table means in practice

`showSeasons` holds one row per show — the season layout everybody watching it shares.
It starts empty, and the cron only refreshes shows that already have a row, so the
first firing may well report nothing done. That is the intended behaviour, not a
failure, and it does not mean anyone's data is stale in the meantime:

- **Existing users keep working off their own copy.** Every `nextEpisode` row already
  carries its own season layout and a `seasonDataUpdatedAt`. Nothing is recomputed
  from the shared table until there is one; until then the per-user copy is used for
  up to a week after it was last refreshed, exactly as before this change.

- **Rows appear as people use the app.** Three paths write one: following a show,
  marking an episode watched on a show whose own copy has aged past a week, and the
  once-an-hour check on app open. That last one is the important one — it looks for
  shows the user has caught up on and has no fresh shared layout for, and a _missing_
  row counts as not fresh. So the shows that actually need new-episode detection get
  registered the first time each user opens the app after the deploy.

- **Only the first user of a show pays.** Once a row exists, everybody else watching
  that show reads it, and the cron keeps it current for all of them.

- **Expect a one-off bump, then a drop.** Over roughly the first week, per-user copies
  age out and each show pays for one TMDB fetch as it enters the shared table. After
  that the steady state is one refresh per show per day, shared, rather than one per
  show per device per hour.

- **A show nobody touches is never refreshed** — and never needs to be, because nobody
  is looking at it.

The check to run after the first day is simply that `showSeasons` is no longer empty
and that its row count is in the region of the number of distinct shows your users
follow, not the number of users times that.

## Known loose end

`showSeasons.nextEpisodeAirDate` is written but not yet read. The freshness check
treats every ongoing show as stale once a day regardless of whether its next episode
is anywhere near due, so the cron refreshes more than it needs to — roughly
`3 x (ongoing shows tracked)` calls a day. Gating the refresh on that air date having
passed would remove most of it.
