// Runtime rows the app keeps out of the cache blob so watch statistics can be summed
// without parsing whole TMDB payloads.
//
// These used to be written by a separate mutation the caller invoked after every cache
// miss (episodeInfo.saveEpisodeInfo / movieInfo.saveMovieInfo), which is a second billed
// function call for data the cache write already has in hand. Deriving them here lets the
// cache write persist them in its own transaction.
//
// Season and episode numbers are stored zero-based, matching the `episode` table.

export interface EpisodeRuntime {
  showTmdbId: number
  seasonNumber: number
  episodeNumber: number
  runtime: number
}

export interface MovieRuntime {
  tmdbId: number
  runtime: number
}

export interface DerivedRuntimes {
  episodes: EpisodeRuntime[]
  movies: MovieRuntime[]
}

const EMPTY: DerivedRuntimes = { episodes: [], movies: [] }

function seasonEpisodeRuntimes(showTmdbId: number, seasonNumber: number, season: any): EpisodeRuntime[] {
  // Specials (season 0) are never counted towards a show's progress or watch time.
  if (seasonNumber < 1 || !Array.isArray(season?.episodes)) return []

  const runtimes: EpisodeRuntime[] = []

  for (const episode of season.episodes) {
    const runtime = episode?.runtime
    if (typeof runtime !== 'number' || runtime <= 0) continue
    if (typeof episode.episode_number !== 'number') continue

    runtimes.push({
      showTmdbId,
      seasonNumber: seasonNumber - 1,
      episodeNumber: episode.episode_number - 1,
      runtime,
    })
  }

  return runtimes
}

function movieRuntimes(data: any): MovieRuntime[] {
  const runtime = data?.runtime
  if (typeof data?.id !== 'number' || typeof runtime !== 'number' || runtime <= 0) return []

  return [{ tmdbId: data.id, runtime }]
}

function listMovieRuntimes(data: any): MovieRuntime[] {
  if (!Array.isArray(data?.results)) return []

  return data.results.flatMap((movie: any) => movieRuntimes(movie))
}

export function deriveRuntimes(path: string, data: any): DerivedRuntimes {
  if (!data || typeof data !== 'object') return EMPTY

  const seasonMatch = path.match(/^\/tv\/(\d+)\/season\/(\d+)$/)
  if (seasonMatch)
    return { episodes: seasonEpisodeRuntimes(Number(seasonMatch[1]), Number(seasonMatch[2]), data), movies: [] }

  const showMatch = path.match(/^\/tv\/(\d+)$/)
  if (showMatch) {
    // A bundled show request appends its seasons as `season/1`, `season/2`, ... keys.
    const showTmdbId = Number(showMatch[1])
    const episodes: EpisodeRuntime[] = []

    for (const [key, value] of Object.entries(data)) {
      const appended = key.match(/^season\/(\d+)$/)
      if (!appended) continue

      episodes.push(...seasonEpisodeRuntimes(showTmdbId, Number(appended[1]), value))
    }

    return { episodes, movies: [] }
  }

  if (/^\/movie\/\d+$/.test(path)) return { episodes: [], movies: movieRuntimes(data) }

  if (path === '/discover/movie' || /^\/trending\/movie\//.test(path))
    return { episodes: [], movies: listMovieRuntimes(data) }

  return EMPTY
}
