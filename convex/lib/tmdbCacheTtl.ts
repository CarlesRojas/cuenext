// How long a TMDB response stays cached, decided per endpoint from the response itself.
//
// Every entry used to expire at the next midnight, which meant the whole catalogue was
// refetched daily - including seasons that finished airing years ago and can no longer
// change. That single default was responsible for roughly a third of all cache reads
// missing, and each miss costs a TMDB round trip plus the writes that follow it.

export const CACHE_DURATIONS = {
  FIVE_MINUTES: 5 * 60 * 1000,
  FIFTEEN_MINUTES: 15 * 60 * 1000,
  THIRTY_MINUTES: 30 * 60 * 1000,
  ONE_HOUR: 60 * 60 * 1000,
  SIX_HOURS: 6 * 60 * 60 * 1000,
  TWELVE_HOURS: 12 * 60 * 60 * 1000,
  ONE_DAY: 24 * 60 * 60 * 1000,
  THREE_DAYS: 3 * 24 * 60 * 60 * 1000,
  ONE_WEEK: 7 * 24 * 60 * 60 * 1000,
  ONE_MONTH: 30 * 24 * 60 * 60 * 1000,
  MIDNIGHT: 'MIDNIGHT' as const, // Special value that expires at start of next day
} as const

export function getTimeUntilNextDay(now: number = Date.now()): number {
  const nextDay = new Date(now)
  nextDay.setDate(nextDay.getDate() + 1)
  nextDay.setHours(0, 0, 0, 0) // Set to start of day (midnight)

  return nextDay.getTime() - now
}

function daysSince(dateString: string | null | undefined, now: number): number | null {
  if (!dateString) return null

  const time = new Date(dateString).getTime()
  if (Number.isNaN(time)) return null

  return (now - time) / CACHE_DURATIONS.ONE_DAY
}

const ENDED_STATUSES = ['ended', 'canceled', 'cancelled']

// A season is frozen once its last episode is comfortably in the past: TMDB still corrects
// metadata for a while after an episode airs, so a finale from last week is not treated the
// same as one from last year.
function seasonTtl(data: any, now: number): number {
  const episodes: Array<{ air_date?: string | null }> = Array.isArray(data?.episodes) ? data.episodes : []
  if (episodes.length === 0) return CACHE_DURATIONS.ONE_DAY

  let newestAirDateAge: number | null = null
  for (const episode of episodes) {
    const age = daysSince(episode.air_date, now)
    // An episode with no air date is unscheduled, which is exactly the case where the
    // season is still moving.
    if (age === null) return CACHE_DURATIONS.TWELVE_HOURS
    if (age < 0) return CACHE_DURATIONS.TWELVE_HOURS // Still has episodes to come
    if (newestAirDateAge === null || age < newestAirDateAge) newestAirDateAge = age
  }

  if (newestAirDateAge === null) return CACHE_DURATIONS.TWELVE_HOURS
  if (newestAirDateAge > 30) return CACHE_DURATIONS.ONE_MONTH
  if (newestAirDateAge > 7) return CACHE_DURATIONS.ONE_WEEK

  return CACHE_DURATIONS.ONE_DAY
}

function showTtl(data: any, now: number): number {
  const status = typeof data?.status === 'string' ? data.status.toLowerCase() : ''

  // A finished show still gets a bounded TTL rather than a permanent one, because revivals
  // and metadata corrections happen; it just does not need checking every day.
  if (ENDED_STATUSES.includes(status)) return CACHE_DURATIONS.ONE_WEEK

  const nextAirDate = data?.next_episode_to_air?.air_date
  if (nextAirDate) {
    const age = daysSince(nextAirDate, now)
    // Refresh shortly after the next episode was due, so a new next_episode_to_air is
    // picked up promptly instead of sitting behind a day-long TTL.
    if (age !== null && age < 0) {
      const untilAir = -age * CACHE_DURATIONS.ONE_DAY
      return Math.min(untilAir + CACHE_DURATIONS.SIX_HOURS, CACHE_DURATIONS.ONE_DAY)
    }

    return CACHE_DURATIONS.SIX_HOURS
  }

  return CACHE_DURATIONS.ONE_DAY
}

function movieTtl(data: any, now: number): number {
  const age = daysSince(data?.release_date, now)

  if (age === null) return CACHE_DURATIONS.ONE_DAY
  if (age > 180) return CACHE_DURATIONS.ONE_MONTH
  if (age > 30) return CACHE_DURATIONS.ONE_WEEK
  if (age > 0) return CACHE_DURATIONS.ONE_DAY

  return CACHE_DURATIONS.TWELVE_HOURS // Unreleased: release dates move
}

// `path` is the TMDB path without query string, e.g. `/tv/1396/season/5`.
export function cacheTtlFor(path: string, data: any, now: number = Date.now()): number {
  if (/^\/tv\/\d+\/season\/\d+$/.test(path)) return seasonTtl(data, now)
  if (/\/reviews$/.test(path)) return CACHE_DURATIONS.ONE_DAY
  if (path.startsWith('/find/')) return CACHE_DURATIONS.ONE_MONTH
  if (path.startsWith('/search/')) return CACHE_DURATIONS.SIX_HOURS
  if (path.startsWith('/discover/') || path.startsWith('/trending/')) return getTimeUntilNextDay(now)
  if (/^\/tv\/\d+$/.test(path)) return showTtl(data, now)
  if (/^\/movie\/\d+$/.test(path)) return movieTtl(data, now)

  return getTimeUntilNextDay(now)
}

export function resolveCacheDuration(
  path: string,
  data: any,
  override: number | typeof CACHE_DURATIONS.MIDNIGHT | undefined,
  now: number = Date.now(),
): number {
  if (override === CACHE_DURATIONS.MIDNIGHT) return getTimeUntilNextDay(now)
  if (typeof override === 'number') return override

  return cacheTtlFor(path, data, now)
}
