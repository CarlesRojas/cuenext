import { v } from 'convex/values'
import { z } from 'zod'
import { api } from './_generated/api'
import { action, mutation, query } from './_generated/server'
import { fetchTmdb, getDeploymentUrl, postTmdb } from './lib/tmdbClient'
import { requireUser } from './requireUser'

const RequestTokenResponse = z.object({
  success: z.boolean(),
  expires_at: z.string(),
  request_token: z.string(),
})

const SessionResponse = z.object({
  success: z.boolean(),
  session_id: z.string(),
})

const AccountResponse = z.object({
  avatar: z.object({
    gravatar: z.object({
      hash: z.string(),
    }),
    tmdb: z.object({
      avatar_path: z.string().nullable(),
    }),
  }),
  id: z.number(),
  iso_639_1: z.string(),
  iso_3166_1: z.string(),
  name: z.string(),
  include_adult: z.boolean(),
  username: z.string(),
})

export const createRequestToken = action({
  handler: async context => {
    await requireUser(context)

    const data = await fetchTmdb(RequestTokenResponse, '/authentication/token/new')

    if (!data.success) {
      throw new Error('TMDB API returned unsuccessful response')
    }

    return {
      requestToken: data.request_token,
      expiresAt: data.expires_at,
      authUrl: `https://www.themoviedb.org/authenticate/${data.request_token}?redirect_to=${encodeURIComponent(
        `${getDeploymentUrl()}/tmdb-callback`,
      )}`,
    }
  },
})

export const linkTmdbAccount = action({
  args: {
    requestToken: v.string(),
  },
  handler: async (context, { requestToken }) => {
    await requireUser(context)

    const existingLink = await context.runQuery(api.tmdbAuth.getTmdbAccountLink)

    if (existingLink) throw new Error('Account already linked to TMDB')

    const sessionData = await postTmdb(SessionResponse, '/authentication/session/new', {
      request_token: requestToken,
    })

    if (!sessionData.success) throw new Error('Failed to create TMDB session')

    const accountData = await fetchTmdb(AccountResponse, '/account', { session_id: sessionData.session_id })

    await context.runMutation(api.tmdbAuth.setTmdbLinkedAccount, {
      accountId: accountData.id,
      username: accountData.username,
      sessionId: sessionData.session_id,
    })
  },
})

export const getTmdbAccountLink = query({
  handler: async context => {
    const userId = await requireUser(context)

    const link = await context.db
      .query('tmdbAccountLink')
      .withIndex('by_user', q => q.eq('userId', userId))
      .first()

    return link
      ? {
          tmdbAccountId: link.tmdbAccountId,
          tmdbUsername: link.tmdbUsername,
          linkedAt: link.linkedAt,
        }
      : null
  },
})

export const setTmdbLinkedAccount = mutation({
  args: {
    accountId: v.number(),
    username: v.string(),
    sessionId: v.string(),
  },
  handler: async (context, { accountId, username, sessionId }) => {
    const userId = await requireUser(context)

    await context.db.insert('tmdbAccountLink', {
      userId,
      tmdbAccountId: accountId,
      tmdbUsername: username,
      sessionId: sessionId,
      linkedAt: Date.now(),
    })
  },
})

export const unlinkTmdbAccount = mutation({
  handler: async context => {
    const userId = await requireUser(context)

    const existingLink = await context.db
      .query('tmdbAccountLink')
      .withIndex('by_user', q => q.eq('userId', userId))
      .first()

    if (!existingLink) throw new Error('No TMDB account linked')

    await context.db.delete(existingLink._id)

    return { success: true }
  },
})
