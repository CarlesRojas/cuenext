import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { requireUser } from './requireUser'

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

export const listStopped = query({
  args: {},
  handler: async context => {
    const userId = await requireUser(context)

    // TODO: Consider pagination if users have many stopped shows
    const stoppedItems = await context.db
      .query('stopped')
      .withIndex('by_user', q => q.eq('userId', userId))
      .collect()

    return stoppedItems.map(f => f.tmdbId)
  },
})
