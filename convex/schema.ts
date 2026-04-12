import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  follow: defineTable({
    userId: v.string(),
    type: v.union(v.literal('movie'), v.literal('tv')),
    tmdbId: v.number(),
    name: v.string(),
    poster: v.union(v.string(), v.null()),
    releaseDate: v.number(),
    backdrop: v.union(v.string(), v.null()),
    followedAt: v.number(),
  })
    .index('by_user_type', ['userId', 'type'])
    .index('by_user_type_tmdbId', ['userId', 'type', 'tmdbId']),

  favorite: defineTable({
    userId: v.string(),
    type: v.union(v.literal('movie'), v.literal('tv')),
    tmdbId: v.number(),
    favoritedAt: v.number(),
  })
    .index('by_user_type', ['userId', 'type'])
    .index('by_user_type_tmdbId', ['userId', 'type', 'tmdbId']),

  stopped: defineTable({
    userId: v.string(),
    tmdbId: v.number(),
    stoppedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_tmdbId', ['userId', 'tmdbId']),

  movie: defineTable({
    userId: v.string(),
    tmdbId: v.number(),
    watchedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_tmdbId', ['userId', 'tmdbId']),

  episode: defineTable({
    userId: v.string(),
    showTmdbId: v.number(),
    seasonNumber: v.number(),
    episodeNumber: v.number(),
    watchedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_show', ['userId', 'showTmdbId'])
    .index('by_user_show_season_episode', ['userId', 'showTmdbId', 'seasonNumber', 'episodeNumber']),

  nextEpisode: defineTable({
    userId: v.string(),
    showTmdbId: v.number(),
    lastWatchedAt: v.union(v.number(), v.null()),
    seasonNumber: v.number(),
    episodeNumber: v.number(),
    numberOfSeasons: v.number(),
    seasonEpisodeCounts: v.array(v.number()),
    seasonFirstEpisodeIndex: v.array(v.number()),
    seasonDataUpdatedAt: v.union(v.number(), v.null()),
    watchedPercentage: v.number(),
    status: v.string(),
  }).index('by_user_show', ['userId', 'showTmdbId']),

  tmdbCache: defineTable({
    endpoint: v.string(),
    data: v.any(),
    createdAt: v.number(),
    expiresAt: v.number(),
  }).index('by_endpoint', ['endpoint']),

  showInfo: defineTable({
    tmdbId: v.number(),
    continuousEpisodeNumbers: v.boolean(),
    updatedAt: v.number(),
  }).index('by_tmdbId', ['tmdbId']),

  episodeInfo: defineTable({
    showTmdbId: v.number(),
    seasonNumber: v.number(),
    episodeNumber: v.number(),
    runtime: v.number(), // in minutes
    updatedAt: v.number(),
  }).index('by_showTmdbId_season_episode', ['showTmdbId', 'seasonNumber', 'episodeNumber']),

  movieInfo: defineTable({
    tmdbId: v.number(),
    runtime: v.number(), // in minutes
    updatedAt: v.number(),
  }).index('by_tmdbId', ['tmdbId']),

  tmdbAccountLink: defineTable({
    userId: v.string(),
    tmdbAccountId: v.number(),
    tmdbUsername: v.string(),
    tmdbAvatarPath: v.union(v.string(), v.null()),
    includeAdult: v.boolean(),
    sessionId: v.string(),
    linkedAt: v.number(),
  }).index('by_user', ['userId']),
})
