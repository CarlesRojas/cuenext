import { describe, expect, it } from 'vitest'
import {
  INITIAL_SEASON_BATCH,
  initialSeasonNumbers,
  remainingSeasonChunks,
  seasonAppendParam,
} from './showBundleChunks'

// Measured against TMDB: a season of Breaking Bad's 62 episodes came back as 318 KB of
// JSON, so an episode costs about this much. The point of the chunking is to keep a bundled
// request under Convex's 1 MiB document limit, and this is what that is judged against.
const BYTES_PER_EPISODE = 5_200
const DOCUMENT_LIMIT = 900 * 1024

const seasons = (lengths: number[]) =>
  lengths.map((episode_count, index) => ({ season_number: index + 1, episode_count }))

describe('initialSeasonNumbers', () => {
  it('asks for the opening seasons without knowing how many exist', () => {
    expect(initialSeasonNumbers()).toEqual([1, 2, 3, 4, 5])
  })
})

describe('seasonAppendParam', () => {
  it('builds the value TMDB expects', () => {
    expect(seasonAppendParam([1, 2, 3])).toBe('season/1,season/2,season/3')
  })
})

describe('remainingSeasonChunks', () => {
  it('is empty when the first request already covered everything', () => {
    expect(remainingSeasonChunks(seasons([7, 13, 13, 13, 16]))).toEqual([])
    expect(remainingSeasonChunks(undefined)).toEqual([])
  })

  it('skips the seasons the first request covered', () => {
    const chunks = remainingSeasonChunks(seasons([10, 10, 10, 10, 10, 10, 10]))

    expect(chunks.flat()).toEqual([6, 7])
  })

  it('packs by episode count rather than season count', () => {
    // Twenty seasons of 24 would be one request if it counted seasons, and far too large.
    const chunks = remainingSeasonChunks(seasons(Array(20).fill(24)))

    for (const chunk of chunks) expect(chunk.length).toBeLessThanOrEqual(5)
    expect(chunks.flat()).toEqual([6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20])
  })

  it('gives a season longer than the whole budget its own request', () => {
    const chunks = remainingSeasonChunks(seasons([10, 10, 10, 10, 10, 300, 10]))

    expect(chunks).toContainEqual([6])
  })

  it('keeps every request inside the document limit for a long-running drama', () => {
    // Twenty seasons at 24 episodes: the shape that made the previous ten-season chunk
    // exceed 1 MiB and silently stop being cached.
    const lengths = Array(20).fill(24)
    const byNumber = new Map(seasons(lengths).map(season => [season.season_number, season.episode_count]))

    const firstRequest = initialSeasonNumbers().reduce((sum, number) => sum + (byNumber.get(number) ?? 0), 0)
    expect(firstRequest * BYTES_PER_EPISODE).toBeLessThan(DOCUMENT_LIMIT)

    for (const chunk of remainingSeasonChunks(seasons(lengths))) {
      const episodes = chunk.reduce((sum, number) => sum + (byNumber.get(number) ?? 0), 0)
      expect(episodes * BYTES_PER_EPISODE).toBeLessThan(DOCUMENT_LIMIT)
    }
  })

  it('covers every season exactly once', () => {
    const lengths = [7, 13, 13, 13, 16, 22, 24, 9, 18, 24, 24, 12]
    const all = remainingSeasonChunks(seasons(lengths)).flat()

    expect(new Set(all).size).toBe(all.length)
    expect(all).toEqual(
      Array.from({ length: lengths.length - INITIAL_SEASON_BATCH }, (_, index) => index + INITIAL_SEASON_BATCH + 1),
    )
  })
})
