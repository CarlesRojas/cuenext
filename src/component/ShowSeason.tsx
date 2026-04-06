import { ProgressiveImage } from '#/component/ProgressiveImage'
import ShowEpisode from '#/component/ShowEpisode'
import { Button } from '#/component/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/component/ui/dialog'
import { useWatchEpisodes } from '#/hooks/useWatchEpisodes'
import type { TmdbSeason } from '#/type/tmdb'
import { useClerk } from '@clerk/tanstack-react-start'
import { convexQuery } from '@convex-dev/react-query'
import { faEye, faSpinner, faTv } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { api } from '../../convex/_generated/api'

interface Props {
  showId: number
  season: TmdbSeason
  isSpecials?: boolean
  episodeNumbersResetWithSeason: boolean
}

export function ShowSeason({ showId, season, episodeNumbersResetWithSeason }: Props) {
  const clerk = useClerk()
  const { id, name, air_date, poster_path, episodes, season_number } = season

  const watchedEpisodes = useQuery({
    ...convexQuery(api.watch.getWatchedEpisodesForShow, { showTmdbId: showId }),
    enabled: clerk.isSignedIn,
  })

  const numberOfWatchedEpisodes = watchedEpisodes.data
    ? watchedEpisodes.data.filter(we => we.seasonNumber === season_number - 1).length
    : null
  const areAllEpisodesWatched = episodes ? numberOfWatchedEpisodes === episodes.length : false

  const { isWatchEpisodesLoading, watchMultipleEpisodes, unwatchMultipleEpisodes } = useWatchEpisodes({
    showId,
  })

  const [hasImage, setHasImage] = useState(true)

  const formatedAirDate = air_date
    ? new Date(air_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : undefined

  const [isCollapsed, setIsCollapsed] = useState(true)

  return (
    <section
      key={id}
      className="relative flex h-fit w-full flex-col overflow-hidden rounded-[22px] border border-neutral-500/40 bg-neutral-800 shadow-xl"
    >
      <Button
        variant="ghost"
        size="link"
        className="grid h-24 max-h-24 min-h-24 w-full grid-cols-[auto_1fr] grid-rows-1 overflow-visible rounded-[22px] p-0 transition-colors hover:bg-neutral-700/40 focus-visible:bg-neutral-700/40"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {poster_path && hasImage ? (
          <div className="relative aspect-4/3 h-full rounded-[22px] bg-neutral-900 lg:aspect-video">
            <ProgressiveImage
              paths={[poster_path]}
              alt={name}
              className="absolute inset-y-0 left-0 size-full scale-200 rounded-[22px] object-cover object-center opacity-30 blur-2xl lg:aspect-video"
              minSize="w185"
              maxSize="w185"
              loading="lazy"
            />

            <ProgressiveImage
              paths={[poster_path]}
              alt={name}
              className="size-full rounded-[22px] object-cover object-center lg:aspect-video"
              onNoImage={() => setHasImage(false)}
              minSize="w185"
              maxSize="w185"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="flex aspect-4/3 h-full items-center justify-center rounded-[22px] bg-neutral-900 lg:aspect-video">
            <FontAwesomeIcon icon={faTv} size="6x" className="max-w-10 opacity-40" />
          </div>
        )}

        <div className="flex items-center justify-between p-3 lg:p-4">
          <div className="flex flex-col items-start pr-24">
            <h2 className="line-clamp-2 text-left text-lg leading-6 font-semibold text-wrap">{name}</h2>
            {formatedAirDate && <p className="line-clamp-1 text-left text-sm text-neutral-400">{formatedAirDate}</p>}
          </div>
        </div>
      </Button>

      <div className="absolute top-1 right-1 z-10 flex items-center gap-3">
        {episodes && numberOfWatchedEpisodes !== null && (
          <span className="line-clamp-1 text-sm text-neutral-400">
            {numberOfWatchedEpisodes} / {episodes.length}
          </span>
        )}

        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="watch"
              size="icon"
              className="disabled:opacity-100"
              disabled={isWatchEpisodesLoading || !episodes || episodes.length === 0}
              data-state={areAllEpisodesWatched ? 'on' : 'off'}
            >
              <FontAwesomeIcon icon={isWatchEpisodesLoading ? faSpinner : faEye} spin={isWatchEpisodesLoading} />
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {areAllEpisodesWatched
                  ? `Do you want to mark all ${name} episodes as unwatched?`
                  : `Do you want to mark all ${name} episodes as watched?`}
              </DialogTitle>
            </DialogHeader>

            <DialogFooter className="flex-row-reverse">
              <DialogClose asChild>
                <Button
                  variant={areAllEpisodesWatched ? 'negative' : 'default'}
                  onClick={async () => {
                    if (!season.episodes) return

                    const episodesToToggle = season.episodes.map(ep => ({
                      seasonNumber: season.season_number - 1,
                      episodeNumber: ep.episode_number - 1,
                    }))

                    const seasonTitle = `${season.name || `Season ${season.season_number}`}`

                    if (areAllEpisodesWatched) unwatchMultipleEpisodes(episodesToToggle, seasonTitle)
                    else watchMultipleEpisodes(episodesToToggle, seasonTitle)
                  }}
                  disabled={isWatchEpisodesLoading}
                >
                  <FontAwesomeIcon icon={faEye} />
                  {areAllEpisodesWatched ? 'Mark all as Unwatched' : 'Mark all as Watched'}
                </Button>
              </DialogClose>

              <DialogClose asChild>
                <Button variant="secondary">Cancel</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative overflow-hidden"
          >
            <ul className="mt-4 flex w-full flex-col gap-2 p-2">
              {episodes?.map(episode => (
                <ShowEpisode
                  key={episode.id}
                  showId={showId}
                  episode={episode}
                  episodeNumbersResetWithSeason={episodeNumbersResetWithSeason}
                />
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
