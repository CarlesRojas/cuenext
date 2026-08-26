import { v } from 'convex/values'
import { api, internal } from './_generated/api'
import type { ActionCtx } from './_generated/server'
import { action, internalMutation, internalQuery, mutation, query } from './_generated/server'
import { requireUser } from './requireUser'
import { buildUpcomingMovies, buildUpcomingTv } from './upcoming'
import { buildMovieSections, buildTvSections } from './watchlist'

// Everything the Android home-screen widget talks to. The widget is native code, so it
// can't reuse the Clerk session living inside Chrome; the web app mints a long-lived
// token here (an action, because queries and mutations lack Web Crypto) and hands it to
// the app through a cuenext:// deep link. HTTP requests then arrive in http.ts carrying
// the token, get hashed and resolved to a userId here, and reuse the same section logic
// the app itself runs. Widget tokens are strictly read-only: the only thing they unlock
// is the sections payload below.

// A user re-pairing devices shouldn't grow tokens without bound, but replacing the token
// on every pairing would break the previous device. Keep a small pool instead.
const MAX_TOKENS_PER_USER = 5

const bytesToHex = (bytes: Uint8Array) => [...bytes].map(b => b.toString(16).padStart(2, '0')).join('')

export async function hashWidgetToken(token: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return bytesToHex(new Uint8Array(digest))
}

export const mintWidgetToken = action({
  args: {},
  handler: async (context): Promise<{ token: string }> => {
    const userId = await requireUser(context)

    const bytes = new Uint8Array(32)
    crypto.getRandomValues(bytes)
    const token = bytesToHex(bytes)

    await context.runMutation(internal.widget.storeToken, { userId, tokenHash: await hashWidgetToken(token) })

    return { token }
  },
})

export const storeToken = internalMutation({
  args: { userId: v.string(), tokenHash: v.string() },
  handler: async (context, args) => {
    await context.db.insert('widgetToken', {
      userId: args.userId,
      tokenHash: args.tokenHash,
      createdAt: Date.now(),
      lastUsedAt: null,
    })

    const tokens = await context.db
      .query('widgetToken')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .collect()

    const excess = tokens
      .sort((a, b) => a.createdAt - b.createdAt)
      .slice(0, Math.max(0, tokens.length - MAX_TOKENS_PER_USER))
    for (const token of excess) await context.db.delete(token._id)
  },
})

export const revokeWidgetTokens = mutation({
  args: {},
  handler: async context => {
    const userId = await requireUser(context)

    const tokens = await context.db
      .query('widgetToken')
      .withIndex('by_user', q => q.eq('userId', userId))
      .collect()

    for (const token of tokens) await context.db.delete(token._id)
  },
})

export const getWidgetTokenStatus = query({
  args: {},
  handler: async context => {
    const userId = await requireUser(context)

    const tokens = await context.db
      .query('widgetToken')
      .withIndex('by_user', q => q.eq('userId', userId))
      .collect()

    return {
      tokenCount: tokens.length,
      lastUsedAt: tokens.reduce<number | null>(
        (max, t) => (t.lastUsedAt && (!max || t.lastUsedAt > max) ? t.lastUsedAt : max),
        null,
      ),
    }
  },
})

export const getUserByTokenHash = internalQuery({
  args: { tokenHash: v.string() },
  handler: async (context, args) => {
    const token = await context.db
      .query('widgetToken')
      .withIndex('by_tokenHash', q => q.eq('tokenHash', args.tokenHash))
      .unique()

    if (!token) return null

    return { tokenId: token._id, userId: token.userId, lastUsedAt: token.lastUsedAt }
  },
})

export const touchToken = internalMutation({
  args: { tokenId: v.id('widgetToken') },
  handler: async (context, args) => {
    const token = await context.db.get(args.tokenId)
    if (token) await context.db.patch(args.tokenId, { lastUsedAt: Date.now() })
  },
})

// --- Section payload -------------------------------------------------------------------

// The widget renders the app's horizontal lists as read-only poster cards: same section
// titles, same watch-progress bars, and a tap that opens the title in the app. No watch
// or rate buttons, so the payload carries nothing writable.

const SITE_URL = 'https://www.cuenext.app'
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p'
const MAX_WIDGET_SECTION_ITEMS = 12

export interface WidgetItem {
  tmdbId: number
  name: string
  posterUrl: string | null
  appUrl: string
  progress?: number
}

export interface WidgetSection {
  key: string
  title: string
  items: WidgetItem[]
}

const imageUrl = (poster?: string | null, backdrop?: string | null) => {
  const path = poster || backdrop
  return path ? `${TMDB_IMAGE_BASE_URL}/w342${path}` : null
}

const appUrl = (media: 'tv' | 'movie', tmdbId: number) => `${SITE_URL}/media/${media}/${tmdbId}?media=${media}`

export const getWidgetSections = internalQuery({
  args: { userId: v.string(), media: v.union(v.literal('tv'), v.literal('movie')) },
  handler: async (context, { userId, media }): Promise<{ media: string; sections: WidgetSection[] }> => {
    if (media === 'tv') {
      const sections = await buildTvSections(context, userId)

      const tvItem = (item: (typeof sections.watchNext)[number], withProgress: boolean): WidgetItem => ({
        tmdbId: item.showTmdbId,
        name: item.name,
        posterUrl: imageUrl(item.poster, item.backdrop),
        appUrl: appUrl('tv', item.showTmdbId),
        ...(withProgress ? { progress: item.watchedPercentage } : {}),
      })

      return {
        media,
        sections: [
          {
            key: 'next',
            title: 'Watch next',
            items: sections.watchNext.slice(0, MAX_WIDGET_SECTION_ITEMS).map(item => tvItem(item, true)),
          },
          {
            key: 'unstarted',
            title: "Haven't started",
            items: sections.haventStarted.slice(0, MAX_WIDGET_SECTION_ITEMS).map(item => tvItem(item, true)),
          },
          {
            key: 'waiting',
            title: 'Waiting for episodes',
            items: sections.waitingForEpisodes.slice(0, MAX_WIDGET_SECTION_ITEMS).map(item => tvItem(item, false)),
          },
          {
            key: 'stopped',
            title: 'Stopped watching',
            items: sections.stoppedWatching.slice(0, MAX_WIDGET_SECTION_ITEMS).map(item => tvItem(item, true)),
          },
          {
            key: 'finished',
            title: 'Finished',
            items: sections.finished.slice(0, MAX_WIDGET_SECTION_ITEMS).map(item => tvItem(item, false)),
          },
          {
            key: 'upcoming',
            title: 'Upcoming',
            items: (await buildUpcomingTv(context, userId)).slice(0, MAX_WIDGET_SECTION_ITEMS).map(item => ({
              tmdbId: item.tmdbId,
              name: item.name,
              posterUrl: imageUrl(item.poster, item.backdrop),
              appUrl: appUrl('tv', item.tmdbId),
            })),
          },
        ],
      }
    }

    const sections = await buildMovieSections(context, userId)

    const movieItem = (item: (typeof sections.watchNext)[number]): WidgetItem => ({
      tmdbId: item.tmdbId,
      name: item.name,
      posterUrl: imageUrl(item.poster, item.backdrop),
      appUrl: appUrl('movie', item.tmdbId),
    })

    return {
      media,
      sections: [
        {
          key: 'next',
          title: 'Watch next',
          items: sections.watchNext.slice(0, MAX_WIDGET_SECTION_ITEMS).map(movieItem),
        },
        {
          key: 'waiting',
          title: 'Not released yet',
          items: sections.unreleased.slice(0, MAX_WIDGET_SECTION_ITEMS).map(movieItem),
        },
        {
          key: 'finished',
          title: 'Finished',
          items: sections.finished.slice(0, MAX_WIDGET_SECTION_ITEMS).map(movieItem),
        },
        {
          key: 'upcoming',
          title: 'Upcoming',
          items: (await buildUpcomingMovies(context, userId)).slice(0, MAX_WIDGET_SECTION_ITEMS).map(item => ({
            tmdbId: item.tmdbId,
            name: item.name,
            posterUrl: imageUrl(item.poster, item.backdrop),
            appUrl: appUrl('movie', item.tmdbId),
          })),
        },
      ],
    }
  },
})

// --- Discover sections -----------------------------------------------------------------

// The Discover tab's lists, with the exact requests discover.tsx makes. TMDB is only
// reachable from actions, so this runs in the HTTP endpoint (http.ts) and its result is
// appended to the query-built payload above. fetchTmdbCached keeps the underlying
// requests shared and cached across users.

const isoDate = (daysFromNow: number) => {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  return date.toISOString().split('T')[0]
}

interface TmdbListEntry {
  id: number
  name?: string
  title?: string
  poster_path?: string | null
  backdrop_path?: string | null
}

export async function buildDiscoverSections(context: ActionCtx, media: 'tv' | 'movie'): Promise<WidgetSection[]> {
  const toItems = (results: TmdbListEntry[]): WidgetItem[] =>
    results.slice(0, MAX_WIDGET_SECTION_ITEMS).map(entry => ({
      tmdbId: entry.id,
      name: entry.name ?? entry.title ?? '',
      posterUrl: imageUrl(entry.poster_path, entry.backdrop_path),
      appUrl: appUrl(media, entry.id),
    }))

  if (media === 'tv') {
    const [onTheAir, trending, topRated] = await Promise.all([
      context.runAction(api.tmdb.getDiscoverShows, {
        page: 1,
        sort_by: 'popularity.desc',
        air_date_gte: isoDate(0),
        air_date_lte: isoDate(7),
      }),
      context.runAction(api.tmdb.getTrendingTv, { page: 1, time_window: 'week' }),
      context.runAction(api.tmdb.getDiscoverShows, { page: 1, sort_by: 'vote_average.desc', vote_count_gte: 200 }),
    ])

    return [
      { key: 'discover-upcoming', title: 'Dropping This Week', items: toItems(onTheAir.results) },
      { key: 'trending', title: 'Trending Shows', items: toItems(trending.results) },
      { key: 'top', title: 'Top Rated Shows', items: toItems(topRated.results) },
    ]
  }

  const [upcomingMovies, trending, topRated] = await Promise.all([
    context.runAction(api.tmdb.getDiscoverMovies, {
      page: 1,
      sort_by: 'popularity.desc',
      with_release_type: '2|3',
      release_date_gte: isoDate(1),
      release_date_lte: isoDate(35),
      include_adult: false,
      include_video: false,
    }),
    context.runAction(api.tmdb.getTrendingMovies, { page: 1, time_window: 'week' }),
    context.runAction(api.tmdb.getDiscoverMovies, { page: 1, sort_by: 'vote_average.desc', vote_count_gte: 200 }),
  ])

  return [
    { key: 'discover-upcoming', title: 'Upcoming Movies', items: toItems(upcomingMovies.results) },
    { key: 'trending', title: 'Trending Movies', items: toItems(trending.results) },
    { key: 'top', title: 'Top Rated Movies', items: toItems(topRated.results) },
  ]
}
