import { cronJobs } from 'convex/server'
import { api } from './_generated/api'

const crons = cronJobs()

crons.weekly(
  'payment reminder',
  { dayOfWeek: 'sunday', hourUTC: 0, minuteUTC: 0 }, // Every week on Sunday at  0:00am PST
  api.tmdbCache.cleanupExpiredCache,
  {},
)

export default crons
