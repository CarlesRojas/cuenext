import { describe, expect, it } from 'vitest'
import { encodeTmdbParam, tmdbQueryString } from './tmdbUrl'

// The bug this guards against: URLSearchParams percent-encodes the separators inside an
// append_to_response value, TMDB silently ignores the append, and the show comes back with
// no seasons and no error.
describe('encodeTmdbParam', () => {
  it('leaves the separators append_to_response is built from alone', () => {
    expect(encodeTmdbParam('season/1,season/2')).toBe('season/1,season/2')
    expect(encodeTmdbParam('credits,videos,watch/providers')).toBe('credits,videos,watch/providers')
  })

  it('still escapes what would break the query string', () => {
    expect(encodeTmdbParam('a&b')).toBe('a%26b')
    expect(encodeTmdbParam('a=b')).toBe('a%3Db')
    expect(encodeTmdbParam('a b')).toBe('a%20b')
    expect(encodeTmdbParam('a#b')).toBe('a%23b')
  })
})

describe('tmdbQueryString', () => {
  it('keeps an appended season list intact', () => {
    expect(tmdbQueryString({ append_to_response: 'season/1,season/2' })).toBe('append_to_response=season/1,season/2')
  })

  it('sorts so the same request always keys the same cache row', () => {
    expect(tmdbQueryString({ page: 2, append_to_response: 'credits' })).toBe(
      tmdbQueryString({ append_to_response: 'credits', page: 2 }),
    )
  })

  it('drops empty values rather than sending them', () => {
    expect(tmdbQueryString({ query: 'dune', language: undefined, region: '' })).toBe('query=dune')
  })

  it('escapes a search term that would otherwise break the query', () => {
    expect(tmdbQueryString({ query: 'tom & jerry' })).toBe('query=tom%20%26%20jerry')
  })
})
