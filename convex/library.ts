import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { requireUser } from './requireUser'

export const follow = mutation({
  args: {
    type: v.union(v.literal('movie'), v.literal('tv')),
    tmdbId: v.number(),
  },
  handler: async (context, args) => {
    const userId = await requireUser(context)
    const now = Date.now()

    const existing = await context.db
      .query('follow')
      .withIndex('by_user_type_tmdbId', q => q.eq('userId', userId).eq('type', args.type).eq('tmdbId', args.tmdbId))
      .unique()

    if (!existing) {
      await context.db.insert('follow', {
        userId,
        type: args.type,
        tmdbId: args.tmdbId,
        followedAt: now,
        manuallyStopped: false,
        updatedAt: now,
      })

      if (args.type === 'tv') {
        const existingNextEpisode = await context.db
          .query('nextEpisode')
          .withIndex('by_user_show', q => q.eq('userId', userId).eq('showTmdbId', args.tmdbId))
          .unique()

        if (!existingNextEpisode)
          await context.db.insert('nextEpisode', {
            userId,
            showTmdbId: args.tmdbId,
            lastWatchedAt: null,
            nextSeasonNumber: 1,
            nextEpisodeNumber: 1,
            updatedAt: now,
          })
      }
    }
  },
})

export const unfollow = mutation({
  args: {
    type: v.union(v.literal('movie'), v.literal('tv')),
    tmdbId: v.number(),
  },
  handler: async (context, args) => {
    const userId = await requireUser(context)

    const existing = await context.db
      .query('follow')
      .withIndex('by_user_type_tmdbId', q => q.eq('userId', userId).eq('type', args.type).eq('tmdbId', args.tmdbId))
      .unique()

    if (existing) {
      await context.db.delete(existing._id)
    }

    if (args.type === 'movie') {
      const movie = await context.db
        .query('movie')
        .withIndex('by_user_tmdbId', q => q.eq('userId', userId).eq('tmdbId', args.tmdbId))
        .unique()

      if (movie) await context.db.delete(movie._id)
    } else {
      const nextEp = await context.db
        .query('nextEpisode')
        .withIndex('by_user_show', q => q.eq('userId', userId).eq('showTmdbId', args.tmdbId))
        .unique()
      if (nextEp) await context.db.delete(nextEp._id)

      const episodes = await context.db
        .query('episode')
        .withIndex('by_user_show', q => q.eq('userId', userId).eq('showTmdbId', args.tmdbId))
        .collect()

      for (const ep of episodes) {
        await context.db.delete(ep._id)
      }
    }
  },
})

export const setStopped = mutation({
  args: {
    type: v.union(v.literal('movie'), v.literal('tv')),
    tmdbId: v.number(),
    stopped: v.boolean(),
  },
  handler: async (context, args) => {
    const userId = await requireUser(context)

    const existing = await context.db
      .query('follow')
      .withIndex('by_user_type_tmdbId', q => q.eq('userId', userId).eq('type', args.type).eq('tmdbId', args.tmdbId))
      .unique()

    if (existing) {
      await context.db.patch(existing._id, {
        manuallyStopped: args.stopped,
        updatedAt: Date.now(),
      })
    }
  },
})

export const listFollowed = query({
  args: { type: v.union(v.literal('movie'), v.literal('tv')) },
  handler: async (context, args) => {
    const userId = await requireUser(context)

    const follows = await context.db
      .query('follow')
      .withIndex('by_user_type', q => q.eq('userId', userId).eq('type', args.type))
      .collect()

    return follows.map(f => f.tmdbId)
  },
})
