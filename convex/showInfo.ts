import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const getShowInfo = query({
  args: { tmdbId: v.number() },
  handler: async (context, args) => {
    const showInfo = await context.db
      .query('showInfo')
      .withIndex('by_tmdbId', q => q.eq('tmdbId', args.tmdbId))
      .unique()

    return showInfo
  },
})

export const saveShowInfo = mutation({
  args: {
    tmdbId: v.number(),
    episodeNumbersResetWithSeason: v.boolean(),
  },
  handler: async (context, args) => {
    const now = Date.now()

    const existing = await context.db
      .query('showInfo')
      .withIndex('by_tmdbId', q => q.eq('tmdbId', args.tmdbId))
      .unique()

    if (existing)
      await context.db.patch(existing._id, {
        episodeNumbersResetWithSeason: args.episodeNumbersResetWithSeason,
        updatedAt: now,
      })
    else
      await context.db.insert('showInfo', {
        tmdbId: args.tmdbId,
        episodeNumbersResetWithSeason: args.episodeNumbersResetWithSeason,
        updatedAt: now,
      })
  },
})
