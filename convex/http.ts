import { httpRouter } from 'convex/server'
import { internal } from './_generated/api'
import type { ActionCtx } from './_generated/server'
import { httpAction } from './_generated/server'
import { updateNextEpisodeForUser } from './nextEpisode'
import { hashWidgetToken } from './widget'

// HTTP endpoints for the Android home-screen widget, served on the deployment's
// .convex.site domain. Authentication is a widget token minted by widget.mintWidgetToken
// and sent as a Bearer header; see convex/widget.ts for why the widget can't use Clerk.

// lastUsedAt only feeds the "in use" hint on the profile page, so refresh it at most
// hourly instead of writing on every widget poll.
const TOUCH_INTERVAL_MS = 60 * 60 * 1000

async function authenticateWidget(context: ActionCtx, request: Request) {
  const header = request.headers.get('Authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : ''

  if (!token) return null

  const found = await context.runQuery(internal.widget.getUserByTokenHash, {
    tokenHash: await hashWidgetToken(token),
  })

  if (!found) return null

  if (!found.lastUsedAt || Date.now() - found.lastUsedAt > TOUCH_INTERVAL_MS)
    await context.runMutation(internal.widget.touchToken, { tokenId: found.tokenId })

  return found.userId
}

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const unauthorized = () => jsonResponse(401, { error: 'Invalid or revoked widget token' })

const parseMedia = (value: string | null): 'tv' | 'movie' => (value === 'movie' ? 'movie' : 'tv')

const getSections = httpAction(async (context, request) => {
  const userId = await authenticateWidget(context, request)
  if (!userId) return unauthorized()

  const media = parseMedia(new URL(request.url).searchParams.get('media'))
  const sections = await context.runQuery(internal.widget.getWidgetSections, { userId, media })

  return jsonResponse(200, sections)
})

const postWatch = httpAction(async (context, request) => {
  const userId = await authenticateWidget(context, request)
  if (!userId) return unauthorized()

  let body: any
  try {
    body = await request.json()
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' })
  }

  try {
    if (body.media === 'tv') {
      const result = await context.runMutation(internal.widget.widgetMarkEpisodeWatched, {
        userId,
        showTmdbId: Number(body.showTmdbId),
        seasonNumber: Number(body.seasonNumber),
        episodeNumber: Number(body.episodeNumber),
        name: String(body.name ?? ''),
        poster: body.poster ?? null,
        backdrop: body.backdrop ?? null,
      })

      // Same follow-up the app performs: when the cached season layout was stale the
      // mutation couldn't recompute the next episode, so refresh it from TMDB now.
      if (!result.nextEpisodeRecomputed)
        await updateNextEpisodeForUser(context, userId, { tmdbId: Number(body.showTmdbId) })
    } else if (body.media === 'movie') {
      await context.runMutation(internal.widget.widgetMarkMovieWatched, {
        userId,
        tmdbId: Number(body.tmdbId),
        name: String(body.name ?? ''),
        poster: body.poster ?? null,
        backdrop: body.backdrop ?? null,
        releaseDate: Number(body.releaseDate ?? 0),
      })
    } else {
      return jsonResponse(400, { error: 'media must be "tv" or "movie"' })
    }
  } catch (error) {
    console.error('widget watch failed', error)
    return jsonResponse(500, { error: 'Failed to mark watched' })
  }

  // Hand back the refreshed sections so the widget repaints without a second request.
  const sections = await context.runQuery(internal.widget.getWidgetSections, {
    userId,
    media: parseMedia(String(body.media)),
  })

  return jsonResponse(200, sections)
})

const http = httpRouter()

http.route({ path: '/widget/sections', method: 'GET', handler: getSections })
http.route({ path: '/widget/watch', method: 'POST', handler: postWatch })

export default http
