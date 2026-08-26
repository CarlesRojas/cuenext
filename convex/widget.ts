import { v } from 'convex/values'
import { internal } from './_generated/api'
import type { QueryCtx } from './_generated/server'
import { action, internalMutation, internalQuery, mutation, query } from './_generated/server'
import { markEpisodeWatchedForUser, markMovieWatchedForUser } from './lib/watchWrite'
import { requireUser } from './requireUser'
import { buildMovieSections, buildTvSections } from './watchlist'

// Everything the Android home-screen widget talks to. The widget is native code, so it
// can't reuse the Clerk session living inside Chrome; the web app mints a long-lived
// token here (an action, because queries and mutations lack Web Crypto) and hands it to
// the app through a cuenext:// deep link. HTTP requests then arrive in http.ts carrying
// the token, get hashed and resolved to a userId here, and reuse the same section and
// watch logic the app itself runs.

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

// The widget renders exactly what the app's horizontal lists render, so the payload is
// computed here in the app's terms: same section titles, same corner-button rules (watch
// with the E5 / S2, E5 label, rate with the user's rating, or none) and same progress
// bars. The Android side stays a dumb renderer and echoes `watch` back verbatim when the
// corner button is tapped.

const SITE_URL = 'https://www.cuenext.app'
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p'
const MAX_WIDGET_SECTION_ITEMS = 12

export interface WidgetItem {
  tmdbId: number
  name: string
  posterUrl: string | null
  appUrl: string
  progress?: number
  button: { kind: 'watch' | 'rate' | 'none'; text?: string; rating?: number | null }
  watch?: Record<string, unknown>
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

async function getRatingsByTmdbId(context: QueryCtx, userId: string, media: 'tv' | 'movie') {
  const reviews = await context.db
    .query('review')
    .withIndex('by_user', q => q.eq('userId', userId))
    .collect()

  return new Map(reviews.filter(r => r.type === media && r.rating !== null).map(r => [r.tmdbId, r.rating]))
}

// Mirrors WatchEpisode: continuous numbering collapses the label to just the episode.
async function episodeButtonText(
  context: QueryCtx,
  item: { showTmdbId: number; seasonNumber: number; episodeNumber: number; numberOfSeasons: number },
) {
  const showInfo = await context.db
    .query('showInfo')
    .withIndex('by_tmdbId', q => q.eq('tmdbId', item.showTmdbId))
    .unique()

  const continuousEpisodeNumbers = showInfo?.continuousEpisodeNumbers || item.numberOfSeasons === 1

  return continuousEpisodeNumbers
    ? `E${item.episodeNumber + 1}`
    : `S${item.seasonNumber + 1}, E${item.episodeNumber + 1}`
}

export const getWidgetSections = internalQuery({
  args: { userId: v.string(), media: v.union(v.literal('tv'), v.literal('movie')) },
  handler: async (context, { userId, media }): Promise<{ media: string; sections: WidgetSection[] }> => {
    if (media === 'tv') {
      const sections = await buildTvSections(context, userId)
      const ratings = await getRatingsByTmdbId(context, userId, 'tv')

      const watchableItem = async (item: (typeof sections.watchNext)[number]): Promise<WidgetItem> => ({
        tmdbId: item.showTmdbId,
        name: item.name,
        posterUrl: imageUrl(item.poster, item.backdrop),
        appUrl: appUrl('tv', item.showTmdbId),
        progress: item.watchedPercentage,
        button: { kind: 'watch', text: await episodeButtonText(context, item) },
        watch: {
          media: 'tv',
          showTmdbId: item.showTmdbId,
          seasonNumber: item.seasonNumber,
          episodeNumber: item.episodeNumber,
          name: item.name,
          poster: item.poster ?? null,
          backdrop: item.backdrop ?? null,
        },
      })

      const plainItem = (item: (typeof sections.watchNext)[number], extras: Partial<WidgetItem> = {}): WidgetItem => ({
        tmdbId: item.showTmdbId,
        name: item.name,
        posterUrl: imageUrl(item.poster, item.backdrop),
        appUrl: appUrl('tv', item.showTmdbId),
        button: { kind: 'none' },
        ...extras,
      })

      return {
        media,
        sections: [
          {
            key: 'next',
            title: 'Watch next',
            items: await Promise.all(sections.watchNext.slice(0, MAX_WIDGET_SECTION_ITEMS).map(watchableItem)),
          },
          {
            key: 'unstarted',
            title: "Haven't started",
            items: await Promise.all(sections.haventStarted.slice(0, MAX_WIDGET_SECTION_ITEMS).map(watchableItem)),
          },
          {
            key: 'waiting',
            title: 'Waiting for episodes',
            items: sections.waitingForEpisodes.slice(0, MAX_WIDGET_SECTION_ITEMS).map(item => plainItem(item)),
          },
          {
            key: 'stopped',
            title: 'Stopped watching',
            items: await Promise.all(
              sections.stoppedWatching.slice(0, MAX_WIDGET_SECTION_ITEMS).map(async item => {
                const hasEpisodesToWatch = item.episodeNumber >= 0 && item.seasonNumber >= 0
                if (hasEpisodesToWatch) return await watchableItem(item)
                return plainItem(item, { progress: item.watchedPercentage })
              }),
            ),
          },
          {
            key: 'finished',
            title: 'Finished',
            items: sections.finished
              .slice(0, MAX_WIDGET_SECTION_ITEMS)
              .map(item => plainItem(item, { button: { kind: 'rate', rating: ratings.get(item.showTmdbId) ?? null } })),
          },
        ],
      }
    }

    const sections = await buildMovieSections(context, userId)
    const ratings = await getRatingsByTmdbId(context, userId, 'movie')

    const movieItem = (item: (typeof sections.watchNext)[number], button: WidgetItem['button']): WidgetItem => ({
      tmdbId: item.tmdbId,
      name: item.name,
      posterUrl: imageUrl(item.poster, item.backdrop),
      appUrl: appUrl('movie', item.tmdbId),
      button,
    })

    return {
      media,
      sections: [
        {
          key: 'next',
          title: 'Watch next',
          items: sections.watchNext.slice(0, MAX_WIDGET_SECTION_ITEMS).map(item => ({
            ...movieItem(item, { kind: 'watch' }),
            watch: {
              media: 'movie',
              tmdbId: item.tmdbId,
              name: item.name,
              poster: item.poster ?? null,
              backdrop: item.backdrop ?? null,
              releaseDate: item.releaseDate,
            },
          })),
        },
        {
          key: 'waiting',
          title: 'Not released yet',
          items: sections.unreleased.slice(0, MAX_WIDGET_SECTION_ITEMS).map(item => movieItem(item, { kind: 'none' })),
        },
        {
          key: 'finished',
          title: 'Finished',
          items: sections.finished
            .slice(0, MAX_WIDGET_SECTION_ITEMS)
            .map(item => movieItem(item, { kind: 'rate', rating: ratings.get(item.tmdbId) ?? null })),
        },
      ],
    }
  },
})

// --- Widget-initiated writes -----------------------------------------------------------

export const widgetMarkEpisodeWatched = internalMutation({
  args: {
    userId: v.string(),
    showTmdbId: v.number(),
    seasonNumber: v.number(),
    episodeNumber: v.number(),
    name: v.string(),
    poster: v.union(v.string(), v.null()),
    backdrop: v.union(v.string(), v.null()),
  },
  handler: async (context, { userId, name, poster, backdrop, ...args }) => {
    // The app's watch button sends releaseDate: 0 for episode watches too.
    return await markEpisodeWatchedForUser(context, userId, {
      ...args,
      showName: name,
      showPoster: poster,
      showBackdrop: backdrop,
      releaseDate: 0,
    })
  },
})

export const widgetMarkMovieWatched = internalMutation({
  args: {
    userId: v.string(),
    tmdbId: v.number(),
    name: v.string(),
    poster: v.union(v.string(), v.null()),
    backdrop: v.union(v.string(), v.null()),
    releaseDate: v.number(),
  },
  handler: async (context, { userId, ...args }) => {
    return await markMovieWatchedForUser(context, userId, args)
  },
})
