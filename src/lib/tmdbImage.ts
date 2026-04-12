export const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p'

export type ImageSize = 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original'

export function getTmdbImageUrl(path?: string | null, size: ImageSize = 'w500', customBaseUrl?: string) {
  if (!path) return undefined
  const baseUrl = customBaseUrl || TMDB_IMAGE_BASE_URL
  return `${baseUrl}/${size}${path}`
}

export function getTmdbImageUrls(
  path?: string | null,
  sizes: ImageSize[] = ['w92', 'w154', 'w185', 'w342', 'w500', 'w780', 'original'],
  customBaseUrl?: string,
) {
  if (!path) return []
  const baseUrl = customBaseUrl || TMDB_IMAGE_BASE_URL
  return sizes.map(size => `${baseUrl}/${size}${path}`)
}
