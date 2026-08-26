import { v } from 'convex/values'
import type { MovieSectionItem, TvSectionItem } from '../src/type/section'
import type { QueryCtx } from './_generated/server'
import { query } from './_generated/server'
import { requireUser } from './requireUser'

// Plain helpers shared by the full-sections queries, the paginated ones and the widget
// endpoint, so none of them pays a nested runQuery (which bills as a second function call).
export async function buildTvSections(context: QueryCtx, userId: string) {
  const tvFollows = await context.db
    .query('follow')
    .withIndex('by_user_type', q => q.eq('userId', userId).eq('type', 'tv'))
    .collect()

  const stoppedShows = await context.db
    .query('stopped')
    .withIndex('by_user', q => q.eq('userId', userId))
    .collect()

  const stoppedShowIds = new Set(stoppedShows.map(s => s.tmdbId))

  const watchNext: TvSectionItem[] = []
  const haventStarted: TvSectionItem[] = []
  const stoppedWatching: TvSectionItem[] = []
  const finished: TvSectionItem[] = []
  const waitingForEpisodes: TvSectionItem[] = []

  for (const follow of tvFollows) {
    const nextEp = await context.db
      .query('nextEpisode')
      .withIndex('by_user_show', q => q.eq('userId', userId).eq('showTmdbId', follow.tmdbId))
      .unique()

    if (!nextEp) continue

    const isStopped = stoppedShowIds.has(follow.tmdbId)

    const item: TvSectionItem = {
      id: `${follow.tmdbId}-${nextEp.seasonNumber}-${nextEp.episodeNumber}`,
      showTmdbId: follow.tmdbId,
      lastWatchedAt: nextEp.lastWatchedAt,
      manuallyStopped: isStopped,
      seasonNumber: nextEp.seasonNumber,
      episodeNumber: nextEp.episodeNumber,
      followedAt: follow.followedAt,
      watchedPercentage: nextEp.watchedPercentage,
      status: nextEp.status,
      name: follow.name,
      poster: follow.poster,
      backdrop: follow.backdrop,
      numberOfSeasons: nextEp.numberOfSeasons,
    }

    const noMoreEpisodes = nextEp.seasonNumber === -1 && nextEp.episodeNumber === -1

    if (noMoreEpisodes && ['ended', 'canceled'].includes(nextEp.status)) finished.push(item)
    else if (isStopped) stoppedWatching.push(item)
    else if (noMoreEpisodes) waitingForEpisodes.push(item)
    else if (nextEp.seasonNumber === 0 && nextEp.episodeNumber === 0) haventStarted.push(item)
    else watchNext.push(item)
  }

  watchNext.sort((a, b) => (b.followedAt || 0) - (a.followedAt || 0))
  haventStarted.sort((a, b) => (b.followedAt || 0) - (a.followedAt || 0))
  stoppedWatching.sort((a, b) => (b.followedAt || 0) - (a.followedAt || 0))
  finished.sort((a, b) => (b.lastWatchedAt || 0) - (a.lastWatchedAt || 0))
  waitingForEpisodes.sort((a, b) => (b.lastWatchedAt || 0) - (a.lastWatchedAt || 0))

  return { watchNext, haventStarted, stoppedWatching, finished, waitingForEpisodes }
}

export async function buildMovieSections(context: QueryCtx, userId: string) {
  const movieFollows = await context.db
    .query('follow')
    .withIndex('by_user_type', q => q.eq('userId', userId).eq('type', 'movie'))
    .collect()

  const movies = await context.db
    .query('movie')
    .withIndex('by_user_tmdbId', q => q.eq('userId', userId))
    .collect()

  const watchedMap = new Map(movies.map(m => [m.tmdbId, m.watchedAt]))

  const watchNext: MovieSectionItem[] = []
  const unreleased: MovieSectionItem[] = []
  const finished: MovieSectionItem[] = []

  for (const follow of movieFollows) {
    const item: MovieSectionItem = {
      tmdbId: follow.tmdbId,
      watchedAt: watchedMap.get(follow.tmdbId) || null,
      followedAt: follow.followedAt,
      name: follow.name,
      poster: follow.poster,
      backdrop: follow.backdrop,
      releaseDate: follow.releaseDate,
    }

    if (item.watchedAt) finished.push(item)
    else if (item.releaseDate > Date.now()) unreleased.push(item)
    else watchNext.push(item)
  }

  watchNext.sort((a, b) => (b.followedAt || 0) - (a.followedAt || 0))
  unreleased.sort((a, b) => (b.followedAt || 0) - (a.followedAt || 0))
  finished.sort((a, b) => (b.watchedAt || 0) - (a.watchedAt || 0))

  return { watchNext, unreleased, finished }
}

export const getTvSections = query({
  args: {},
  handler: async context => {
    const userId = await requireUser(context)

    return await buildTvSections(context, userId)
  },
})

export const getMovieSections = query({
  args: {},
  handler: async context => {
    const userId = await requireUser(context)

    return await buildMovieSections(context, userId)
  },
})

export const getTvSectionPaginated = query({
  args: {
    section: v.union(
      v.literal('next'),
      v.literal('unstarted'),
      v.literal('stopped'),
      v.literal('finished'),
      v.literal('waiting'),
    ),
    paginationOpts: v.object({
      numItems: v.number(),
      cursor: v.union(v.string(), v.null()),
      id: v.number(),
    }),
  },
  handler: async (context, { section, paginationOpts }) => {
    const userId = await requireUser(context)

    const sections = await buildTvSections(context, userId)

    let sectionItems: TvSectionItem[]
    switch (section) {
      case 'next':
        sectionItems = sections.watchNext
        break
      case 'unstarted':
        sectionItems = sections.haventStarted
        break
      case 'stopped':
        sectionItems = sections.stoppedWatching
        break
      case 'finished':
        sectionItems = sections.finished
        break
      case 'waiting':
        sectionItems = sections.waitingForEpisodes
        break
      default:
        sectionItems = []
    }

    // Convert to paginated format for convex
    const startIndex = paginationOpts.cursor ? parseInt(paginationOpts.cursor) : 0
    const endIndex = startIndex + paginationOpts.numItems
    const results = sectionItems.slice(startIndex, endIndex)

    return {
      page: results,
      isDone: endIndex >= sectionItems.length,
      continueCursor: endIndex >= sectionItems.length ? sectionItems.length.toString() : endIndex.toString(),
    }
  },
})

export const getMovieSectionPaginated = query({
  args: {
    section: v.union(v.literal('next'), v.literal('waiting'), v.literal('finished')),
    paginationOpts: v.object({
      numItems: v.number(),
      cursor: v.union(v.string(), v.null()),
      id: v.number(),
    }),
  },
  handler: async (context, { section, paginationOpts }) => {
    const userId = await requireUser(context)

    const sections = await buildMovieSections(context, userId)

    let sectionItems: MovieSectionItem[]
    switch (section) {
      case 'next':
        sectionItems = sections.watchNext
        break
      case 'waiting':
        sectionItems = sections.unreleased
        break
      case 'finished':
        sectionItems = sections.finished
        break
      default:
        sectionItems = []
    }

    // Convert to paginated format for convex
    const startIndex = paginationOpts.cursor ? parseInt(paginationOpts.cursor) : 0
    const endIndex = startIndex + paginationOpts.numItems
    const results = sectionItems.slice(startIndex, endIndex)

    return {
      page: results,
      isDone: endIndex >= sectionItems.length,
      continueCursor: endIndex >= sectionItems.length ? sectionItems.length.toString() : endIndex.toString(),
    }
  },
})
