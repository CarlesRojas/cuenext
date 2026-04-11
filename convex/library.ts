import type { PaginationResult } from 'convex/server'
import { paginationOptsValidator } from 'convex/server'
import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { requireUser } from './requireUser'

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

export const listFollowedPaginated = query({
  args: {
    type: v.union(v.literal('movie'), v.literal('tv')),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (context, args) => {
    const userId = await requireUser(context)

    const result = await context.db
      .query('follow')
      .withIndex('by_user_type', q => q.eq('userId', userId).eq('type', args.type))
      .paginate(args.paginationOpts)

    return {
      ...result,
      page: result.page.map(f => f.tmdbId),
    } as PaginationResult<number>
  },
})
