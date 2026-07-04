import { v } from 'convex/values'
import { mutation } from './_generated/server'
import { requireUser } from './requireUser'

// TODO optimistic update
export const setStopped = mutation({
  args: {
    tmdbId: v.number(),
  },
  handler: async (context, args) => {
    const userId = await requireUser(context)

    const existingStopped = await context.db
      .query('stopped')
      .withIndex('by_user_tmdbId', q => q.eq('userId', userId).eq('tmdbId', args.tmdbId))
      .unique()

    if (!existingStopped) await context.db.insert('stopped', { userId, tmdbId: args.tmdbId, stoppedAt: Date.now() })
  },
})

// TODO optimistic update
export const setUnstopped = mutation({
  args: {
    tmdbId: v.number(),
  },
  handler: async (context, args) => {
    const userId = await requireUser(context)

    const existingStopped = await context.db
      .query('stopped')
      .withIndex('by_user_tmdbId', q => q.eq('userId', userId).eq('tmdbId', args.tmdbId))
      .unique()

    if (existingStopped) await context.db.delete(existingStopped._id)
  },
})
