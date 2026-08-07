import { computeContinuousEpisodeNumbers } from '#/hooks/useShowBundle'
import { fetchShowBundle } from '#/lib/tmdb'
import { useQuery } from '@tanstack/react-query'
import { useConvex, useMutation as useDbMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'

interface Props {
  showId: number
}

// Whether a show numbers its episodes continuously, for the watchlist cards that show a
// single episode and have no season data of their own. The show page does not use this: it
// already holds every season and derives the flag locally.
//
// The answer never changes for a given show, so it is stored once and read from our own
// table afterwards. Only the first ever look at a show pays for TMDB, and it pays for one
// bundled request rather than the show plus one request per season.
const useShowInfo = ({ showId }: Props) => {
  const convex = useConvex()
  const saveShowInfo = useDbMutation(api.showInfo.saveShowInfo)

  const result = useQuery({
    queryKey: ['showInformation', showId],
    // Never refetch: every watchlist card mounts this hook and would otherwise re-run the
    // query on each mount.
    staleTime: Infinity,
    refetchOnMount: true,
    queryFn: async () => {
      const currentShowInfo = await convex.query(api.showInfo.getShowInfo, { tmdbId: showId })
      if (currentShowInfo) return { continuousEpisodeNumbers: currentShowInfo.continuousEpisodeNumbers }

      const { seasons } = await fetchShowBundle(showId)
      if (seasons.length === 0) return { continuousEpisodeNumbers: false }

      const continuousEpisodeNumbers = computeContinuousEpisodeNumbers(seasons)

      await saveShowInfo({ continuousEpisodeNumbers, tmdbId: showId })

      return { continuousEpisodeNumbers }
    },
    enabled: !!showId,
  })

  return result
}

export default useShowInfo
