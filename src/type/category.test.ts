import { getCategoriesForMedia, getCategory } from '#/type/category'
import { UrlParamsSchema } from '#/type/url'
import { describe, expect, it } from 'vitest'

describe('getCategory', () => {
  it('resolves a category that both media types share', () => {
    expect(getCategory('comedy', 'tv')?.label).toBe('Comedy')
    expect(getCategory('comedy', 'movie')?.label).toBe('Comedy')
  })

  it('maps a category to the genre ids of the media type asked for', () => {
    expect(getCategory('action', 'tv')?.genres.tv).toBe('10759')
    expect(getCategory('action', 'movie')?.genres.movie).toBe('28|12')
  })

  it('falls back to no category when the media type has no such genre', () => {
    expect(getCategory('horror', 'movie')?.label).toBe('Horror')
    expect(getCategory('horror', 'tv')).toBeUndefined()
    expect(getCategory('reality', 'movie')).toBeUndefined()
  })

  it('ignores an unknown or missing slug', () => {
    expect(getCategory('not-a-category', 'tv')).toBeUndefined()
    expect(getCategory(undefined, 'tv')).toBeUndefined()
  })
})

describe('getCategoriesForMedia', () => {
  it('only lists categories the media type can be filtered by', () => {
    const shows = getCategoriesForMedia('tv').map(category => category.slug)
    const movies = getCategoriesForMedia('movie').map(category => category.slug)

    expect(shows).toContain('reality')
    expect(shows).not.toContain('horror')
    expect(movies).toContain('horror')
    expect(movies).not.toContain('reality')
  })
})

describe('UrlParamsSchema', () => {
  it('keeps a known category and drops an unknown one', () => {
    expect(UrlParamsSchema.parse({ category: 'comedy' }).category).toBe('comedy')
    expect(UrlParamsSchema.parse({ category: 'nope' }).category).toBeUndefined()
  })
})
