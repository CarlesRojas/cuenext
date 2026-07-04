import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { requireUser } from './requireUser'

// TODO optimistic update
export const follow = mutation({
  args: {
    type: v.union(v.literal('movie'), v.literal('tv')),
    tmdbId: v.number(),
    name: v.string(),
    poster: v.union(v.string(), v.null()),
    backdrop: v.union(v.string(), v.null()),
    releaseDate: v.number(),
    followedAt: v.optional(v.number()),
  },
  handler: async (context, args) => {
    const userId = await requireUser(context)
    const followedAt = args.followedAt ?? Date.now()

    const existing = await context.db
      .query('follow')
      .withIndex('by_user_type_tmdbId', q => q.eq('userId', userId).eq('type', args.type).eq('tmdbId', args.tmdbId))
      .unique()

    if (existing) return

    await context.db.insert('follow', {
      userId,
      type: args.type,
      tmdbId: args.tmdbId,
      name: args.name,
      poster: args.poster,
      backdrop: args.backdrop,
      followedAt,
      releaseDate: args.releaseDate,
    })
  },
})

// TODO optimistic update
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

// Returns every followed tmdbId for the given type in a single query. Cards check
// membership locally instead of each issuing its own checkIsFollowed lookup, which
// collapses the per-card N+1 into one shared, deduplicated subscription.
export const listFollowedIds = query({
  args: { type: v.union(v.literal('movie'), v.literal('tv')) },
  handler: async (context, args) => {
    const userId = await requireUser(context)

    const followed = await context.db
      .query('follow')
      .withIndex('by_user_type', q => q.eq('userId', userId).eq('type', args.type))
      .collect()

    return followed.map(f => f.tmdbId)
  },
})
