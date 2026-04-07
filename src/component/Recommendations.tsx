import { api } from '#/../convex/_generated/api'
import FollowEpisode from '#/component/FollowEpisode'
import FollowMovie from '#/component/FollowMovie'
import { Section } from '#/component/Section'
import type { MediaType } from '#/type/media'
import { convexAction } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'

interface RecommendationsProps {
  tmdbId: number
  media: MediaType
}

export function Recommendations({ tmdbId, media }: RecommendationsProps) {
  const movieRecommendations = useQuery({
    ...convexAction(api.tmdb.getMovieRecommendations, { tmdbId }),
    enabled: media === 'movie',
  })

  const showRecommendations = useQuery({
    ...convexAction(api.tmdb.getTvRecommendations, { tmdbId }),
    enabled: media === 'tv',
  })

  return (
    <Section title={media === 'movie' ? 'Similar Movies' : 'Similar Shows'}>
      {media === 'tv' &&
        showRecommendations.data &&
        showRecommendations.data.results.length &&
        showRecommendations.data.results
          .slice(0, 20)
          .map(item => <FollowEpisode key={item.id} episode={item} variant="poster" />)}

      {media === 'movie' &&
        movieRecommendations.data &&
        movieRecommendations.data.results.length &&
        movieRecommendations.data.results
          .slice(0, 20)
          .map(item => <FollowMovie key={item.id} movie={item} variant="poster" />)}
    </Section>
  )
}
