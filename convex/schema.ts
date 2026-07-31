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
  })
    .index('by_endpoint', ['endpoint'])
    .index('by_expiresAt', ['expiresAt']),

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

  // Materialized watch statistics per user, updated incrementally by the watch mutations
  // and rebuilt from scratch by stats.recomputeStats. Follow counts are cheap enough to
  // read live, so they are not stored here.
  userStats: defineTable({
    userId: v.string(),
    episodesWatchedCount: v.number(),
    showTimeMinutes: v.number(),
    moviesWatchedCount: v.number(),
    movieTimeMinutes: v.number(),
    recomputedAt: v.number(),
  }).index('by_user', ['userId']),

  // CueNext-owned reviews. One row per user per title holding that user's rating (1-10)
  // and/or written review, so nobody reviews the same title twice. Rows with an empty
  // content are rating-only and never show up in the review list, they only feed the
  // community average. Nothing here is sent to TMDB.
  review: defineTable({
    userId: v.string(),
    type: v.union(v.literal('movie'), v.literal('tv')),
    tmdbId: v.number(),
    rating: v.union(v.number(), v.null()),
    content: v.string(),
    authorName: v.string(),
    authorImage: v.union(v.string(), v.null()),
    createdAt: v.number(),
    updatedAt: v.number(),
    upvoteCount: v.number(),
  })
    .index('by_user_type_tmdbId', ['userId', 'type', 'tmdbId'])
    .index('by_user', ['userId'])
    // Reviews are listed most upvoted first, which is exactly this index read in reverse.
    .index('by_type_tmdbId_upvotes', ['type', 'tmdbId', 'upvoteCount']),

  // Upvote only, no downvotes. Authors start with a vote on their own review.
  reviewVote: defineTable({
    userId: v.string(),
    reviewId: v.id('review'),
    createdAt: v.number(),
  })
    .index('by_user_review', ['userId', 'reviewId'])
    .index('by_review', ['reviewId']),

  // Materialized community rating per title, updated by the review mutations so the detail
  // page never has to scan every review of a title to show an average.
  reviewSummary: defineTable({
    type: v.union(v.literal('movie'), v.literal('tv')),
    tmdbId: v.number(),
    ratingCount: v.number(),
    ratingSum: v.number(),
    updatedAt: v.number(),
  }).index('by_type_tmdbId', ['type', 'tmdbId']),

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
