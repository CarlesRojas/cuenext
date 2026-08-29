import type { MediaType } from '#/type/media'

export enum SeeAllList {
  UPCOMING = 'upcoming',
  TOP = 'top',
  TRENDING = 'trending',
}

// Shared by the discover carousels and the see all pages they link to, so a list keeps the
// same name in both places. The category label goes in front of the noun it describes.
export function getListTitle(list: string, media: MediaType, categoryLabel?: string): string {
  const category = categoryLabel ? `${categoryLabel} ` : ''

  if (list === SeeAllList.UPCOMING)
    return media === 'tv' ? `${category}Dropping This Week` : `Upcoming ${category}Movies`

  if (list === SeeAllList.TRENDING) return media === 'tv' ? `Trending ${category}Shows` : `Trending ${category}Movies`

  return media === 'tv' ? `Top Rated ${category}Shows` : `Top Rated ${category}Movies`
}
