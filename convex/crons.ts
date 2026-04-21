import { cronJobs } from 'convex/server'
import { api } from './_generated/api'

const crons = cronJobs()

crons.daily(
  'cleanup expired cache',
  { hourUTC: 2, minuteUTC: 0 }, // Every day at 2:00 AM UTC
  api.tmdbCache.cleanupExpiredCache,
  {},
)

export default crons
