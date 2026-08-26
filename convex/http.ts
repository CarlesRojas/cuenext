import { httpRouter } from 'convex/server'
import { internal } from './_generated/api'
import type { ActionCtx } from './_generated/server'
import { httpAction } from './_generated/server'
import { hashWidgetToken } from './widget'

// HTTP endpoints for the Android home-screen widget, served on the deployment's
// .convex.site domain. Authentication is a widget token minted by widget.mintWidgetToken
// and sent as a Bearer header; see convex/widget.ts for why the widget can't use Clerk.
// The surface is deliberately read-only: one GET, no writes a leaked token could do.

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

const getSections = httpAction(async (context, request) => {
  const userId = await authenticateWidget(context, request)
  if (!userId) return jsonResponse(401, { error: 'Invalid or revoked widget token' })

  const media = new URL(request.url).searchParams.get('media') === 'movie' ? ('movie' as const) : ('tv' as const)
  const sections = await context.runQuery(internal.widget.getWidgetSections, { userId, media })

  return jsonResponse(200, sections)
})

const http = httpRouter()

http.route({ path: '/widget/sections', method: 'GET', handler: getSections })

export default http
