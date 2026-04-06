import { ProgressiveImage } from '#/component/ProgressiveImage'
import type { TmdbEpisode } from '#/type/tmdb'
import { faTv } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState } from 'react'

interface Props {
  episode: TmdbEpisode
}

const ShowEpisode = ({ episode }: Props) => {
  //   const { isWatched, isWatchedLoading, onToggleWatch } = useWatchEpisode({
  //     ...episode,
  //     tmdbId: episode.id,
  //     lastWatchedAt: null,
  //     manuallyStopped: false,
  //     seasonNumber: 0,
  //     episodeNumber: 0,
  //     watchedPercentage: 0,
  //     status: 'ended',
  //   })

  const {
    id,
    overview,
    season_number,
    production_code,
    runtime,
    show_id,
    still_path,
    vote_average,
    vote_count,
    name,
    air_date,
    episode_number,
  } = episode

  const [hasImage, setHasImage] = useState(true)

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
            minSize="w342"
            maxSize="w342"
            loading="lazy"
          />

          <ProgressiveImage
            paths={[still_path]}
            alt={name}
            className="aspect-square h-full rounded-[15px] object-cover object-center"
            onNoImage={() => setHasImage(false)}
            minSize="w342"
            maxSize="w342"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="flex aspect-square h-full items-center justify-center rounded-[15px] bg-neutral-900">
          <FontAwesomeIcon icon={faTv} size="6x" className="max-w-10 opacity-40" />
        </div>
      )}

      <div className="flex items-center justify-between p-3 lg:p-4">
        <h3 className="line-clamp-1 text-sm font-semibold">{name}</h3>
        {air_date && (
          <p className="line-clamp-1 text-xs text-neutral-400">
            {new Date(air_date).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </p>
        )}
      </div>

      {/* <Button
        variant="frost"
        size={watchButtonText ? 'small' : 'iconSmall'}
        className="absolute top-1 right-1 z-10 gap-2 px-2 disabled:opacity-100"
        onClick={e => {
          e.preventDefault()
          onToggleWatch()
        }}
        data-checked={!isWatchLoading && isWatched}
        title={isWatched ? 'Mark Unwatched' : 'Mark Watched'}
        disabled={isWatchLoading}
      >
        {watchButtonText && <span className="text-sm">{watchButtonText}</span>}
        {<FontAwesomeIcon icon={isWatchLoading ? faSpinner : faEye} spin={isWatchLoading} />}
      </Button> */}
    </div>
  )
}

export default ShowEpisode
