import { cronJobs } from 'convex/server'
import { api, internal } from './_generated/api'

const crons = cronJobs()

crons.daily(
  'cleanup expired cache',
  { hourUTC: 2, minuteUTC: 0 }, // Every day at 2:00 AM UTC
  api.tmdbCache.cleanupExpiredCache,
  {},
)

// Keeps every tracked show's season layout current for all of its viewers at once. This
// used to be done by each browser, hourly, one show at a time, so the same show was
// refetched once per device that cared about it.
crons.interval('refresh show seasons', { hours: 6 }, internal.nextEpisode.refreshStaleShowSeasons, {})

export default crons
