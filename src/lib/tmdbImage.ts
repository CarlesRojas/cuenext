export const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p'

export type ImageSize = 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original'

export function getTmdbImageUrl(path?: string | null, size: ImageSize = 'w500') {
  if (!path) return undefined
  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`
}

export function getTmdbImageUrls(
  path?: string | null,
  sizes: ImageSize[] = ['w92', 'w154', 'w185', 'w342', 'w500', 'w780', 'original'],
) {
  if (!path) return []
  return sizes.map(size => `${TMDB_IMAGE_BASE_URL}/${size}${path}`)
}
