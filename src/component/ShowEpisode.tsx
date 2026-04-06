import { ProgressiveImage } from '#/component/ProgressiveImage'
import { Button } from '#/component/ui/button'
import { useWatchEpisode } from '#/hooks/useWatchEpisode'
import type { TmdbEpisode } from '#/type/tmdb'
import { faEye, faSpinner, faTv } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState } from 'react'

interface Props {
  showId: number
  episode: TmdbEpisode
  episodeNumbersResetWithSeason: boolean
}

const ShowEpisode = ({ showId, episode, episodeNumbersResetWithSeason }: Props) => {
  const { id, season_number, runtime, still_path, name, air_date, episode_number } = episode

  const { isWatched, isWatchedLoading, onToggleWatch } = useWatchEpisode({
    tmdbId: showId,
    name: episode.name,
    seasonNumber: episode.season_number,
    episodeNumber: episode.episode_number,
  })
  if (isWatchedLoading) console.log(episode.name, isWatched)

  // if (!isWatchedLoading)
  //   console.log({
  //     isWatched,
  //     isWatchedLoading,
  //     tmdbId: showId,
  //     name: episode.name,
  //     seasonNumber: episode.season_number - 1,
  //     episodeNumber: episode.episode_number - 1,
  //   })

  const [hasImage, setHasImage] = useState(true)

  const airDate = air_date ? new Date(air_date) : null
  const hasAired = airDate ? airDate <= new Date() : false
  const daysUntilAir = airDate ? Math.ceil((airDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null

  const episodeNumber = episodeNumbersResetWithSeason ? `S${season_number}, E${episode_number}` : `E${episode_number}`

  return (
    <div
      key={id}
      className="grid h-20 max-h-20 min-h-20 w-full grid-cols-[auto_1fr] grid-rows-1 overflow-hidden rounded-[15px] border border-neutral-500/40 bg-neutral-950/80"
    >
      {still_path && hasImage ? (
        <div className="relative aspect-square h-full rounded-[15px] bg-neutral-900">
          <ProgressiveImage
            paths={[still_path]}
            alt={name}
            className="absolute inset-y-0 left-0 aspect-square h-full scale-200 rounded-[15px] object-cover object-center opacity-30 blur-2xl"
            minSize="w154"
            maxSize="w154"
            loading="lazy"
          />

          <ProgressiveImage
            paths={[still_path]}
            alt={name}
            className="aspect-square h-full rounded-[15px] object-cover object-center"
            onNoImage={() => setHasImage(false)}
            minSize="w154"
            maxSize="w154"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="flex aspect-square h-full items-center justify-center rounded-[15px] bg-neutral-700/70">
          <FontAwesomeIcon icon={faTv} size="6x" className="max-w-10 opacity-40" />
        </div>
      )}

      <div className="flex items-center justify-between gap-3 p-3 lg:p-4">
        <div className="flex flex-col">
          <h3 className="line-clamp-2 text-sm leading-tight font-semibold">{name}</h3>

          <p className="line-clamp-1 text-xs text-neutral-400">
            {[episodeNumber, runtime ? `${runtime} min` : null].filter(Boolean).join(' • ')}
          </p>
        </div>

        {hasAired && (
          <Button
            variant="watch"
            size="icon"
            className="disabled:opacity-100"
            onClick={e => {
              e.preventDefault()
              onToggleWatch()
            }}
            data-state={isWatched ? 'on' : 'off'}
            title={isWatched ? 'Mark Unwatched' : 'Mark Watched'}
            disabled={isWatchedLoading}
          >
            {<FontAwesomeIcon icon={isWatchedLoading ? faSpinner : faEye} spin={isWatchedLoading} />}
          </Button>
        )}

        {!hasAired && daysUntilAir !== null && (
          <div className="flex flex-col items-end justify-center">
            <span className="text-lg leading-tight font-semibold text-sky-500">{daysUntilAir}</span>
            <span className="text-xs leading-tight text-sky-500">{daysUntilAir === 1 ? 'day' : 'days'}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default ShowEpisode
