import type { MutationCtx, QueryCtx } from '../_generated/server'
import { CACHE_DURATIONS } from './tmdbCacheTtl'

// The season layout of a show belongs to the show, not to a viewer. Keeping it in one row
// means the hundredth person to follow something reuses what the first person's refresh
// already paid for, instead of running the same TMDB fan-out again.

export interface ShowSeasonsLayout {
  seasonEpisodeCounts: number[]
  seasonFirstEpisodeIndex: number[]
  numberOfSeasons: number
  status: string
  nextEpisodeAirDate: number | null
}

const ENDED_STATUSES = ['ended', 'canceled', 'cancelled']

// `seasonEpisodeCounts` counts *aired* episodes, so it goes out of date with the calendar
// and not only with TMDB. A finished show cannot gain episodes, so its layout is held for a
// month; anything still running is rechecked daily.
export function showSeasonsTtl(status: string): number {
  return ENDED_STATUSES.includes(status.toLowerCase()) ? CACHE_DURATIONS.ONE_MONTH : CACHE_DURATIONS.ONE_DAY
}

// The shortest TTL any status can produce. Nothing updated more recently than this can be
// stale, whatever its status, which is what bounds the refresh scan.
export function shortestShowSeasonsTtl(): number {
  return CACHE_DURATIONS.ONE_DAY
}

export function isShowSeasonsFresh(row: { status: string; updatedAt: number } | null, now: number): boolean {
  if (!row) return false

  return row.updatedAt >= now - showSeasonsTtl(row.status)
}

export async function readShowSeasons(context: QueryCtx | MutationCtx, tmdbId: number) {
  return await context.db
    .query('showSeasons')
    .withIndex('by_tmdbId', q => q.eq('tmdbId', tmdbId))
    .unique()
}

export async function writeShowSeasons(context: MutationCtx, tmdbId: number, layout: ShowSeasonsLayout) {
  const existing = await readShowSeasons(context, tmdbId)
  const row = { tmdbId, ...layout, updatedAt: Date.now() }

  if (existing) await context.db.patch(existing._id, row)
  else await context.db.insert('showSeasons', row)

  return row
}
