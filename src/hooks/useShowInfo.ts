import { processBatched } from '#/utils/processBatched'
import { useQuery } from '@tanstack/react-query'
import { useAction, useConvex, useMutation as useDbMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'

interface Props {
  showId: number
}

const useShowInfo = ({ showId }: Props) => {
  const convex = useConvex()

  const getShowDetails = useAction(api.tmdb.getShowDetails)
  const getShowSeasonDetails = useAction(api.tmdb.getShowSeasonDetails)
  const saveShowInfo = useDbMutation(api.showInfo.saveShowInfo)

  const result = useQuery({
    queryKey: ['showInformation', showId],
    // Whether a show uses continuous episode numbering never changes, so never refetch:
    // every watchlist card mounts this hook and would otherwise re-run the query (and, on
    // a cold cache, the whole show + per-season action cascade) on each mount.
    staleTime: Infinity,
    refetchOnMount: true,
    queryFn: async () => {
      const currentShowInfo = await convex.query(api.showInfo.getShowInfo, { tmdbId: showId })
      if (currentShowInfo) return { continuousEpisodeNumbers: currentShowInfo.continuousEpisodeNumbers }

      const showDetails = await getShowDetails({ tmdbId: showId })
      if (!showDetails.seasons || showDetails.seasons.length === 0) return { continuousEpisodeNumbers: false }

      const seasons = await processBatched(showDetails.seasons, season =>
        getShowSeasonDetails({ tmdbId: showId, seasonNumber: season.season_number }),
      )

      const regularSeasons = seasons.filter(season => season.season_number !== 0)

      const continuousEpisodeNumbers = regularSeasons.some(season => {
        const episodes = season.episodes
        if (!episodes) return false
        return episodes.some(episode => episode.episode_number > episodes.length)
      })

      await saveShowInfo({ continuousEpisodeNumbers, tmdbId: showId })

      return { continuousEpisodeNumbers }
    },
  })

  return result
}

export default useShowInfo
