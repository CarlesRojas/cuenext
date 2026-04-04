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

    if (existing) return

    await context.db.insert('follow', {
      userId,
      type: args.type,
      tmdbId: args.tmdbId,
      followedAt: now,
      manuallyStopped: false,
    })
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

    if (existing) await context.db.delete(existing._id)
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

    if (!existing) return

    await context.db.patch(existing._id, { manuallyStopped: args.stopped })
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
