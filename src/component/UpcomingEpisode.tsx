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

  const daysUntilAir = Math.ceil((new Date(airDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

  return (
    <RowCard
      media="tv"
      key={tmdbId}
      id={tmdbId}
      title={name}
      posterPath={episode.poster_path}
      backdropPath={episode.backdrop_path}
      subtitle={[formattedAirDate, tag].filter(Boolean).join(' • ')}
      overview={episode.next_episode_to_air?.overview || episode.overview}
      rightContent={
        daysUntilAir > 0 && (
          <div className="flex flex-col items-end justify-center">
            <span className="text-lg leading-tight font-semibold whitespace-nowrap text-sky-500">{daysUntilAir}</span>
            <span className="text-xs leading-tight whitespace-nowrap text-sky-500">
              {daysUntilAir === 1 ? 'day' : 'days'}
            </span>
          </div>
        )
      }
    />
  )
}
