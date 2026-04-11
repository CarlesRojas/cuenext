import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const getMovieInfo = query({
  args: { tmdbIds: v.array(v.number()) },
  handler: async (context, args) => {
    const movieInfos = await Promise.all(
      args.tmdbIds.map(tmdbId =>
        context.db
          .query('movieInfo')
          .withIndex('by_tmdbId', q => q.eq('tmdbId', tmdbId))
          .unique(),
      ),
    )

    return movieInfos.filter(info => info !== null)
  },
})

export const saveMovieInfo = mutation({
  args: {
    movies: v.array(
      v.object({
        tmdbId: v.number(),
        runtime: v.number(),
      }),
    ),
  },
  handler: async (context, args) => {
    const now = Date.now()

    for (const movie of args.movies) {
      const existing = await context.db
        .query('movieInfo')
        .withIndex('by_tmdbId', q => q.eq('tmdbId', movie.tmdbId))
        .unique()

      if (!existing)
        await context.db.insert('movieInfo', {
          tmdbId: movie.tmdbId,
          runtime: movie.runtime,
          updatedAt: now,
        })
    }
  },
})
