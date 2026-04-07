import { api } from '#/../convex/_generated/api'
import { convexAction, convexQuery } from '@convex-dev/react-query'
import { useQueries, useQuery } from '@tanstack/react-query'
import { useMutation as useDbMutation } from 'convex/react'
import { useEffect, useState } from 'react'

export function useShowInfo(showId: number) {
  const { data: existingShowInfo, isFetching: showInfoLoading } = useQuery(
    convexQuery(api.showInfo.getShowInfo, { tmdbId: showId }),
  )

  const showInfoMissing = !showInfoLoading && !existingShowInfo

  const { data: show, isPending: showLoading } = useQuery({
    ...convexAction(api.tmdb.getShowDetails, { tmdbId: showId }),
    enabled: showInfoMissing,
  })

  const seasonQueries = useQueries({
    queries: (show?.seasons || []).map(season => ({
      ...convexAction(api.tmdb.getShowSeasonDetails, {
        tmdbId: showId,
        seasonNumber: season.season_number,
      }),
      enabled: showInfoMissing && !!show?.seasons?.length,
    })),
  })

  const saveShowInfo = useDbMutation(api.showInfo.saveShowInfo)

  const [showInfo, setShowInfo] = useState<{
    continuousEpisodeNumbers?: boolean
  }>({})

  const isLoading =
    showInfoLoading || showLoading || (!existingShowInfo && seasonQueries.some(query => query.isPending))

  useEffect(() => {
    if (!showInfoMissing && existingShowInfo) {
      setShowInfo(existingShowInfo)
      return
    }

    if (isLoading) return

    const calculateResetWithSeason = async () => {
      const seasons = seasonQueries
        .map(query => query.data)
        .filter((season): season is NonNullable<typeof season> => season != null)

      const regularSeasons = seasons.filter(season => season.season_number !== 0)

      const continuousEpisodeNumbers = regularSeasons.some(season => {
        const episodes = season.episodes
        if (!episodes) return false
        return episodes.some(episode => episode.episode_number > episodes.length)
      })

      await saveShowInfo({ tmdbId: showId, continuousEpisodeNumbers })
      setShowInfo({ continuousEpisodeNumbers })
    }

    calculateResetWithSeason()
  }, [showInfoMissing, existingShowInfo, isLoading])

  return isLoading ? undefined : showInfo
}
