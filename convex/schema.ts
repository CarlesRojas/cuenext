import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  follow: defineTable({
    userId: v.string(),
    type: v.union(v.literal('movie'), v.literal('tv')),
    tmdbId: v.number(),
    name: v.string(),
    poster: v.union(v.string(), v.null()),
    backdrop: v.union(v.string(), v.null()),
    followedAt: v.number(),
    manuallyStopped: v.boolean(),
  })
    .index('by_user_type', ['userId', 'type'])
    .index('by_user_type_manually_stopped', ['userId', 'type', 'manuallyStopped'])
    .index('by_user_type_tmdbId', ['userId', 'type', 'tmdbId']),

  movie: defineTable({
    userId: v.string(),
    tmdbId: v.number(),
    watchedAt: v.number(),
  }).index('by_user_tmdbId', ['userId', 'tmdbId']),

  episode: defineTable({
    userId: v.string(),
    showTmdbId: v.number(),
    seasonNumber: v.number(),
    episodeNumber: v.number(),
    watchedAt: v.number(),
  })
    .index('by_user_show', ['userId', 'showTmdbId'])
    .index('by_user_show_season_episode', ['userId', 'showTmdbId', 'seasonNumber', 'episodeNumber']),

  nextEpisode: defineTable({
    userId: v.string(),
    showTmdbId: v.number(),
    lastWatchedAt: v.union(v.number(), v.null()),
    seasonNumber: v.number(),
    episodeNumber: v.number(),
    seasonEpisodeCounts: v.array(v.number()),
    seasonDataUpdatedAt: v.union(v.number(), v.null()),
    watchedPercentage: v.number(),
    status: v.union(v.literal('ended'), v.literal('ongoing')),
  }).index('by_user_show', ['userId', 'showTmdbId']),
})
