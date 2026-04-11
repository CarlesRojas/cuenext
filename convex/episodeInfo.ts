import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const getEpisodeInfo = query({
  args: {
    episodes: v.array(
      v.object({
        showTmdbId: v.number(),
        seasonNumber: v.number(),
        episodeNumber: v.number(),
      }),
    ),
  },
  handler: async (context, args) => {
    const episodeInfos = await Promise.all(
      args.episodes.map(episode =>
        context.db
          .query('episodeInfo')
          .withIndex('by_showTmdbId_season_episode', q =>
            q
              .eq('showTmdbId', episode.showTmdbId)
              .eq('seasonNumber', episode.seasonNumber)
              .eq('episodeNumber', episode.episodeNumber),
          )
          .unique(),
      ),
    )

    return episodeInfos.filter(info => info !== null)
  },
})

export const saveEpisodeInfo = mutation({
  args: {
    episodes: v.array(
      v.object({
        showTmdbId: v.number(),
        seasonNumber: v.number(),
        episodeNumber: v.number(),
        runtime: v.number(),
      }),
    ),
  },
  handler: async (context, args) => {
    const now = Date.now()

    for (const episode of args.episodes) {
      const existing = await context.db
        .query('episodeInfo')
        .withIndex('by_showTmdbId_season_episode', q =>
          q
            .eq('showTmdbId', episode.showTmdbId)
            .eq('seasonNumber', episode.seasonNumber)
            .eq('episodeNumber', episode.episodeNumber),
        )
        .unique()

      if (!existing)
        await context.db.insert('episodeInfo', {
          showTmdbId: episode.showTmdbId,
          seasonNumber: episode.seasonNumber,
          episodeNumber: episode.episodeNumber,
          runtime: episode.runtime,
          updatedAt: now,
        })
    }
  },
})
