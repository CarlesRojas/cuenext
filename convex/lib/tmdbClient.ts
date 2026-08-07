import type { z } from 'zod'
import { tmdbQueryString } from '../../src/lib/tmdbUrl'

export const TMDB_API_URL = 'https://api.themoviedb.org/3'

// Built by hand rather than with URLSearchParams, which would percent-encode the slashes in
// an `append_to_response` value and make TMDB quietly ignore it.
export function tmdbRequestUrl(path: string, params: Record<string, string> = {}): string {
  const query = tmdbQueryString(params)

  return `${TMDB_API_URL}${path}${query ? `?${query}` : ''}`
}

export async function fetchTmdb<T extends z.ZodTypeAny>(
  schema: T,
  path: string,
  params: Record<string, string> = {},
): Promise<z.infer<T>> {
  const response = await fetch(tmdbRequestUrl(path, params), {
    headers: {
      Authorization: `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) throw new Error(`TMDB API error: ${response.status} ${response.statusText}`)

  return schema.parse(await response.json())
}
