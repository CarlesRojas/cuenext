import { ProgressiveImage } from '#/component/ProgressiveImage'
import { airedEpisodes } from '#/component/ShowSeason'
import { Button } from '#/component/ui/button'
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '#/component/ui/dialog'
import { useWatchEpisode } from '#/hooks/useWatchEpisode'
import { useWatchEpisodes } from '#/hooks/useWatchEpisodes'
import type { TmdbEpisode } from '#/type/tmdb'
import { faCheck, faEye, faSpinner, faTimes, faTv } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState } from 'react'

interface Props {
  showId: number
  episode: TmdbEpisode
  continuousEpisodeNumbers: boolean
  showName: string
  showPoster?: string | null
  showBackdrop?: string | null
  previousUnwatchedEpisodes?: TmdbEpisode[]
}

const ShowEpisode = ({
  showId,
  episode,
  continuousEpisodeNumbers,
  showName,
  showPoster,
  showBackdrop,
  previousUnwatchedEpisodes,
}: Props) => {
  const { id, season_number, runtime, still_path, name, air_date, episode_number } = episode

  const { isWatched, isWatchedLoading, onToggleWatch } = useWatchEpisode({
    showTmdbId: showId,
    seasonNumber: episode.season_number - 1,
    episodeNumber: episode.episode_number - 1,
    name: showName,
    poster: showPoster,
    backdrop: showBackdrop,
  })

  const { isWatchEpisodesLoading, watchMultipleEpisodes } = useWatchEpisodes({
    showId,
    showName,
    showPoster,
    showBackdrop,
  })

  const [hasImage, setHasImage] = useState(true)

  const airDate = air_date ? new Date(air_date) : null
  const hasAired = airDate ? airDate <= new Date() : false
  const daysUntilAir = airDate ? Math.ceil((airDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null

  const episodeNumber = continuousEpisodeNumbers ? `E${episode_number}` : `S${season_number}, E${episode_number}`

  const [isMarkPreviousEpisodesDialogOpen, setIsMarkPreviousEpisodesDialogOpen] = useState(false)

  const toggleEpisodeWatched = async (includePrevious = false) => {
    const previousEpisodesToToggle =
      !isWatched && includePrevious && previousUnwatchedEpisodes ? previousUnwatchedEpisodes : []

    const episodesToToggle = [...previousEpisodesToToggle, episode].filter(airedEpisodes).map(ep => ({
      seasonNumber: ep.season_number - 1,
      episodeNumber: ep.episode_number - 1,
    }))

    if (isWatched) onToggleWatch()
    else watchMultipleEpisodes(episodesToToggle, showName)
  }

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
              if (isWatched || !previousUnwatchedEpisodes || previousUnwatchedEpisodes.length === 0)
                toggleEpisodeWatched(false)
              else setIsMarkPreviousEpisodesDialogOpen(true)
            }}
            data-state={isWatched ? 'on' : 'off'}
            title={isWatched ? 'Mark Unwatched' : 'Mark Watched'}
            disabled={isWatchedLoading}
          >
            {<FontAwesomeIcon icon={isWatchedLoading ? faSpinner : faEye} spin={isWatchedLoading} />}
          </Button>
        )}

        <Dialog
          open={isMarkPreviousEpisodesDialogOpen}
          onOpenChange={open => setIsMarkPreviousEpisodesDialogOpen(open)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{`Do you want to mark all previous episodes as watched?`}</DialogTitle>
            </DialogHeader>

            <DialogFooter>
              <DialogClose asChild>
                <Button onClick={() => toggleEpisodeWatched(true)} disabled={isWatchEpisodesLoading}>
                  <FontAwesomeIcon icon={faCheck} />
                  <span>{'Yes'}</span>
                </Button>
              </DialogClose>

              <DialogClose asChild>
                <Button
                  variant="secondary"
                  onClick={() => toggleEpisodeWatched(false)}
                  disabled={isWatchEpisodesLoading}
                >
                  <FontAwesomeIcon icon={faTimes} />
                  <span>{'No'}</span>
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {!hasAired && daysUntilAir !== null && (
          <div className="flex flex-col items-end justify-center">
            <span className="text-lg leading-tight font-bold whitespace-nowrap text-sky-500">{daysUntilAir}</span>
            <span className="text-xs leading-3 font-medium whitespace-nowrap text-sky-500">
              {daysUntilAir === 1 ? 'day' : 'days'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default ShowEpisode
