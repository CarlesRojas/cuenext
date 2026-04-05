import { getTmdbImageUrl } from '#/lib/tmdbImage'
import type { TmdbTv } from '#/type/tmdb'
import RowCard from './RowCard'

interface UpcomingEpisodeItem {
  tmdbId: number
  name: string
  poster: string | null
  backdrop: string | null
  type: 'tv'
  episode: TmdbTv
  airDate: string
}

export default function UpcomingEpisode(props: UpcomingEpisodeItem) {
  const { tmdbId, name, episode, airDate } = props

  const posterUrl =
    getTmdbImageUrl(episode.poster_path, 'w342') || getTmdbImageUrl(episode.poster_path, 'original') || undefined

  const backdropUrl =
    getTmdbImageUrl(episode.backdrop_path, 'w780') || getTmdbImageUrl(episode.backdrop_path, 'original') || posterUrl

  const formattedAirDate = new Date(airDate).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  let tag = ''
  const nextEpisode = episode.next_episode_to_air
  if (nextEpisode) {
    const { season_number, episode_number, name: episodeName } = nextEpisode
    tag = `S${season_number}, E${episode_number}`
    if (episodeName) tag += ` • ${episodeName}`
  } else tag = 'New Episode'

  return (
    <RowCard
      mediaType="tv"
      key={tmdbId}
      id={tmdbId}
      title={name}
      posterUrl={posterUrl}
      backdropUrl={backdropUrl}
      subtitle={[formattedAirDate, tag].filter(Boolean).join(' • ')}
      overview={episode.next_episode_to_air?.overview || episode.overview}
    />
  )
}
