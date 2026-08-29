import { getListTitle, SeeAllList } from '#/type/discover'
import { describe, expect, it } from 'vitest'

describe('getListTitle', () => {
  it('names each list per media type when no category is picked', () => {
    expect(getListTitle(SeeAllList.UPCOMING, 'tv')).toBe('Dropping This Week')
    expect(getListTitle(SeeAllList.UPCOMING, 'movie')).toBe('Upcoming Movies')
    expect(getListTitle(SeeAllList.TRENDING, 'tv')).toBe('Trending Shows')
    expect(getListTitle(SeeAllList.TRENDING, 'movie')).toBe('Trending Movies')
    expect(getListTitle(SeeAllList.TOP, 'tv')).toBe('Top Rated Shows')
    expect(getListTitle(SeeAllList.TOP, 'movie')).toBe('Top Rated Movies')
  })

  it('works the category into the title', () => {
    expect(getListTitle(SeeAllList.UPCOMING, 'tv', 'Comedy')).toBe('Comedy Dropping This Week')
    expect(getListTitle(SeeAllList.UPCOMING, 'movie', 'Comedy')).toBe('Upcoming Comedy Movies')
    expect(getListTitle(SeeAllList.TRENDING, 'tv', 'Sci-Fi & Fantasy')).toBe('Trending Sci-Fi & Fantasy Shows')
    expect(getListTitle(SeeAllList.TOP, 'movie', 'Horror')).toBe('Top Rated Horror Movies')
  })
})
