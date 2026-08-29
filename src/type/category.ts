import type { MediaType } from '#/type/media'

export type CategorySlug =
  | 'action'
  | 'comedy'
  | 'drama'
  | 'sci-fi'
  | 'horror'
  | 'thriller'
  | 'crime'
  | 'mystery'
  | 'romance'
  | 'animation'
  | 'family'
  | 'kids'
  | 'documentary'
  | 'reality'
  | 'history'
  | 'war'
  | 'music'
  | 'western'

export type DiscoverCategory = {
  slug: CategorySlug
  label: string
  // TMDB keeps a separate genre list for movies and for shows, so the same category maps to
  // different ids on each and a few only exist on one of them. Pipe separated ids are an OR.
  genres: Partial<Record<MediaType, string>>
}

export const DISCOVER_CATEGORIES: readonly DiscoverCategory[] = [
  { slug: 'action', label: 'Action & Adventure', genres: { movie: '28|12', tv: '10759' } },
  { slug: 'comedy', label: 'Comedy', genres: { movie: '35', tv: '35' } },
  { slug: 'drama', label: 'Drama', genres: { movie: '18', tv: '18' } },
  { slug: 'sci-fi', label: 'Sci-Fi & Fantasy', genres: { movie: '878|14', tv: '10765' } },
  { slug: 'horror', label: 'Horror', genres: { movie: '27' } },
  { slug: 'thriller', label: 'Thriller', genres: { movie: '53' } },
  { slug: 'crime', label: 'Crime', genres: { movie: '80', tv: '80' } },
  { slug: 'mystery', label: 'Mystery', genres: { movie: '9648', tv: '9648' } },
  { slug: 'romance', label: 'Romance', genres: { movie: '10749' } },
  { slug: 'animation', label: 'Animation', genres: { movie: '16', tv: '16' } },
  { slug: 'family', label: 'Family', genres: { movie: '10751', tv: '10751' } },
  { slug: 'kids', label: 'Kids', genres: { tv: '10762' } },
  { slug: 'documentary', label: 'Documentary', genres: { movie: '99', tv: '99' } },
  { slug: 'reality', label: 'Reality', genres: { tv: '10764' } },
  { slug: 'history', label: 'History', genres: { movie: '36' } },
  { slug: 'war', label: 'War & Politics', genres: { movie: '10752', tv: '10768' } },
  { slug: 'music', label: 'Music', genres: { movie: '10402' } },
  { slug: 'western', label: 'Western', genres: { movie: '37', tv: '37' } },
]

export const CATEGORY_SLUGS = DISCOVER_CATEGORIES.map(category => category.slug) as [CategorySlug, ...CategorySlug[]]

// A category from the url only counts when TMDB has it for the media type on screen, so
// switching between shows and movies falls back to no filter instead of an empty page.
export function getCategory(slug: string | undefined, media: MediaType): DiscoverCategory | undefined {
  if (!slug) return undefined
  const category = DISCOVER_CATEGORIES.find(entry => entry.slug === slug)
  return category?.genres[media] ? category : undefined
}

export function getCategoriesForMedia(media: MediaType): DiscoverCategory[] {
  return DISCOVER_CATEGORIES.filter(category => !!category.genres[media])
}
