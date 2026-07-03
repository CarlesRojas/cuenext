import { v } from 'convex/values'
import { query } from './_generated/server'
import { requireUser } from './requireUser'

// The detail page needs several one-row flags for the same title (favorite, stopped,
// watched). Serving them from one query means one subscription per page view instead of
// one per flag; the reads are the same indexed point lookups the individual check
// queries performed.
export const getMediaUserState = query({
  args: {
    type: v.union(v.literal('movie'), v.literal('tv')),
    tmdbId: v.number(),
  },
  handler: async (context, args) => {
    const userId = await requireUser(context)

    const favorite = await context.db
      .query('favorite')
      .withIndex('by_user_type_tmdbId', q => q.eq('userId', userId).eq('type', args.type).eq('tmdbId', args.tmdbId))
      .unique()

    const stopped =
      args.type === 'tv'
        ? await context.db
            .query('stopped')
            .withIndex('by_user_tmdbId', q => q.eq('userId', userId).eq('tmdbId', args.tmdbId))
            .unique()
        : null

    const watchedMovie =
      args.type === 'movie'
        ? await context.db
            .query('movie')
            .withIndex('by_user_tmdbId', q => q.eq('userId', userId).eq('tmdbId', args.tmdbId))
            .unique()
        : null

    return {
      isFavorite: !!favorite,
      isStopped: !!stopped,
      isWatched: !!watchedMovie,
    }
  },
})
