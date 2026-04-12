import type { z } from 'zod'

export const TMDB_API_URL = 'https://api.themoviedb.org/3'

export async function fetchTmdb<T extends z.ZodTypeAny>(
  schema: T,
  path: string,
  params: Record<string, string> = {},
): Promise<z.infer<T>> {
  const url = new URL(`${TMDB_API_URL}${path}`)

  for (const [key, value] of Object.entries(params)) url.searchParams.append(key, value)

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) throw new Error(`TMDB API error: ${response.status} ${response.statusText}`)

  return schema.parse(await response.json())
}

export async function postTmdb<T extends z.ZodTypeAny>(
  schema: T,
  path: string,
  body?: Record<string, any>,
): Promise<z.infer<T>> {
  const response = await fetch(`${TMDB_API_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) throw new Error(`TMDB API error: ${response.status} ${response.statusText}`)

  return schema.parse(await response.json())
}

export const getDeploymentUrl = () => {
  return process.env.VITE_DEPLOYMENT_URL || 'http://localhost:3000'
}
