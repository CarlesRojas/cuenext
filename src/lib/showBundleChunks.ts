// How a show's seasons are split across bundled TMDB requests.
//
// Shared by the browser and by Convex so both build the same `append_to_response` value:
// the cache is keyed on the request, so a mismatch would silently store the same data
// twice and halve the hit rate.
//
// The limit that matters is not TMDB's (twenty appended requests) but Convex's: the joined
// response is cached as a single document, and those are capped at 1 MiB. Measured against
// TMDB, an episode costs roughly 5 KB of JSON, so the budget is expressed in episodes.

// The first request cannot know how many seasons a show has, let alone how long they are,
// so it asks blindly. Five covers most shows in one request while keeping the worst
// realistic case (a network drama at ~24 episodes a season) around 600 KB.
export const INITIAL_SEASON_BATCH = 5

// Later chunks know each season's length, so they are packed to an episode budget instead
// of a season count. 100 episodes is ~500 KB, comfortably inside the document limit.
const EPISODE_BUDGET = 100

export interface SeasonSummary {
  season_number: number
  episode_count: number
}

export function initialSeasonNumbers(): number[] {
  return Array.from({ length: INITIAL_SEASON_BATCH }, (_, index) => index + 1)
}

// TMDB omits appended sections for seasons that do not exist, so asking for more than a
// show has costs nothing.
export function seasonAppendParam(seasonNumbers: number[]): string {
  return seasonNumbers.map(seasonNumber => `season/${seasonNumber}`).join(',')
}

// The seasons the first request did not cover, grouped so no single request carries more
// than the episode budget. A season longer than the budget on its own gets a request to
// itself rather than being dropped.
export function remainingSeasonChunks(seasons: SeasonSummary[] | undefined): number[][] {
  const remaining = (seasons ?? [])
    .filter(season => season.season_number > INITIAL_SEASON_BATCH)
    .sort((a, b) => a.season_number - b.season_number)

  const chunks: number[][] = []
  let current: number[] = []
  let episodes = 0

  for (const season of remaining) {
    const count = season.episode_count || 0

    if (current.length > 0 && episodes + count > EPISODE_BUDGET) {
      chunks.push(current)
      current = []
      episodes = 0
    }

    current.push(season.season_number)
    episodes += count
  }

  if (current.length > 0) chunks.push(current)

  return chunks
}
