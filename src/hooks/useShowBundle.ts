import { fetchShowBundle } from '#/lib/tmdb'
import { TMDB_STALE_TIME, tmdbQuery } from '#/lib/tmdbQuery'
import type { TmdbSeason } from '#/type/tmdb'
import { useQuery } from '@tanstack/react-query'

// The show page used to issue one request per season, which for a six-season show meant six
// TMDB reads, six cache lookups and six writes. TMDB can append the seasons to the show
// request instead, so all of it arrives together under one cache entry.
export function showBundleQuery(tmdbId: number) {
  return tmdbQuery(
    `/tv/${tmdbId}`,
    { append_to_response: 'seasons' },
    () => fetchShowBundle(tmdbId),
    TMDB_STALE_TIME.SIX_HOURS,
  )
}

// Some shows number their episodes continuously across seasons (episode 45 rather than
// season 3 episode 5), which is only detectable by looking at the episode numbers.
export function computeContinuousEpisodeNumbers(seasons: TmdbSeason[]): boolean {
  const regularSeasons = seasons.filter(season => season.season_number !== 0)

  if (regularSeasons.length === 1) return true

  return regularSeasons.some(season => {
    const episodes = season.episodes
    if (!episodes) return false

    return episodes.some(episode => episode.episode_number > episodes.length)
  })
}

export function useShowBundle(tmdbId: number, enabled = true) {
  const { data, isPending } = useQuery({ ...showBundleQuery(tmdbId), enabled: enabled && !!tmdbId })

  const seasons = data?.seasons ?? []

  return {
    show: data?.show,
    seasons,
    regularSeasons: seasons.filter(season => season.season_number !== 0),
    continuousEpisodeNumbers: data ? computeContinuousEpisodeNumbers(seasons) : false,
    isBundlePending: isPending,
  }
}
