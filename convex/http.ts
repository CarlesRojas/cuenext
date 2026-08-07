import { httpRouter } from 'convex/server'
import { internal } from './_generated/api'
import { httpAction } from './_generated/server'
import { tmdbRequestUrl } from './lib/tmdbClient'
import { cacheTtlFor } from './lib/tmdbCacheTtl'
import { cacheKeyFor } from './tmdbCache'

// TMDB responses are public and identical for every visitor, so serving them as plain
// cacheable HTTP lets the browser keep them instead of re-asking. A Convex action could not:
// it is reached over the websocket, so every read - even one the browser answered a second
// ago - is a billed function call, and each of those pays a second call to look the payload
// up in the cache table.
//
// The cache table stays as the shared layer, so a browser with a cold HTTP cache still
// avoids a TMDB round trip and TMDB's rate limit is paid once for all users. What changes is
// that a warm browser never reaches Convex at all. The `Cache-Control` here is also what a
// CDN would key off if these were ever fronted by a custom domain.

// The path allowlist is the security boundary: without it this route is an open proxy that
// spends our TMDB quota on whatever anyone asks for.
const ALLOWED_PATHS = [
  /^\/tv\/\d+$/,
  /^\/tv\/\d+\/season\/\d+$/,
  /^\/movie\/\d+$/,
  /^\/discover\/(movie|tv)$/,
  /^\/search\/(movie|tv)$/,
  /^\/trending\/(movie|tv)\/(day|week)$/,
  /^\/(tv|movie)\/\d+\/reviews$/,
  /^\/find\/[A-Za-z0-9_-]+$/,
]

// Convex's per-document limit is 1 MiB; leave room for the row's other fields and for the
// difference between the JSON text length and its stored encoding.
const MAX_CACHED_BYTES = 900 * 1024

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

function jsonResponse(body: unknown, maxAgeSeconds: number) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
      // s-maxage is for any shared cache in front of this; stale-while-revalidate lets a
      // browser paint from a just-expired entry while it refreshes in the background.
      'Cache-Control': `public, max-age=${maxAgeSeconds}, s-maxage=${maxAgeSeconds}, stale-while-revalidate=86400`,
    },
  })
}

function errorResponse(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

const tmdbProxy = httpAction(async (context, request) => {
  const requestUrl = new URL(request.url)
  const path = requestUrl.searchParams.get('path')

  if (!path) return errorResponse(400, 'Missing path')
  if (!ALLOWED_PATHS.some(allowed => allowed.test(path))) return errorResponse(400, `Unsupported path: ${path}`)

  const params: Record<string, string> = {}
  for (const [key, value] of requestUrl.searchParams) {
    if (key === 'path') continue
    params[key] = value
  }

  const cacheKey = cacheKeyFor(path, params)
  const now = Date.now()

  const cached = await context.runQuery(internal.tmdbCache.readCache, { endpoint: cacheKey })
  if (cached && cached.expiresAt > now)
    return jsonResponse(cached.data, Math.max(0, Math.floor((cached.expiresAt - now) / 1000)))

  const response = await fetch(tmdbRequestUrl(path, params), {
    headers: {
      Authorization: `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    // A stale entry beats an error page: the request already failed upstream, and TMDB data
    // going a few hours out of date is not worth a broken screen.
    if (cached) return jsonResponse(cached.data, 60)

    return errorResponse(response.status === 404 ? 404 : 502, `TMDB API error: ${response.status}`)
  }

  const body = await response.text()
  // Responses are not validated here. The caller knows which schema it asked for and parses
  // there, which keeps one proxy serving every endpoint and moves the parsing cost off
  // Convex entirely.
  const data = JSON.parse(body)
  const ttl = cacheTtlFor(path, data, now)

  // Convex documents are capped at 1 MiB. A bundled request for a long-running show can
  // approach that, and failing the write would fail the whole request for data we already
  // have, so an oversized payload is served straight through and simply not cached.
  if (body.length <= MAX_CACHED_BYTES)
    await context.runMutation(internal.tmdbCache.writeCache, {
      path,
      endpoint: cacheKey,
      data,
      createdAt: now,
      expiresAt: now + ttl,
    })
  // Uncached responses go back to TMDB on every request, so this must not pass unnoticed:
  // it means a request is being built too large and its chunking needs revisiting.
  else console.warn(`Not caching ${cacheKey}: ${body.length} bytes exceeds ${MAX_CACHED_BYTES}`)

  return jsonResponse(data, Math.floor(ttl / 1000))
})

const http = httpRouter()

http.route({ path: '/tmdb', method: 'GET', handler: tmdbProxy })

http.route({
  path: '/tmdb',
  method: 'OPTIONS',
  handler: httpAction(async () => new Response(null, { status: 204, headers: CORS_HEADERS })),
})

export default http
