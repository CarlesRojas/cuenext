import FollowEpisode from '#/component/FollowEpisode'
import FollowMovie from '#/component/FollowMovie'
import { Section } from '#/component/Section'
import { useMediaExtras } from '#/hooks/useMediaExtras'
import type { MediaType } from '#/type/media'

interface RecommendationsProps {
  tmdbId: number
  media: MediaType
}

export function Recommendations({ tmdbId, media }: RecommendationsProps) {
  const { movie, show } = useMediaExtras(media, tmdbId)

  const movieRecommendations = movie.data?.recommendations
  const showRecommendations = show.data?.recommendations

  return (
    <Section sectionKey="recommendations" title={media === 'movie' ? 'Similar Movies' : 'Similar Shows'}>
      {media === 'tv' &&
        showRecommendations &&
        showRecommendations.results.length &&
        showRecommendations.results
          .slice(0, 20)
          .map(item => <FollowEpisode key={item.id} episode={item} variant="poster" />)}

      {media === 'movie' &&
        movieRecommendations &&
        movieRecommendations.results.length &&
        movieRecommendations.results
          .slice(0, 20)
          .map(item => <FollowMovie key={item.id} movie={item} variant="poster" />)}
    </Section>
  )
}
