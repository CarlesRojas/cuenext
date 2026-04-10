import { ProgressiveImage } from '#/component/ProgressiveImage'
import ShowEpisode from '#/component/ShowEpisode'
import { Button } from '#/component/ui/button'
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '#/component/ui/dialog'
import { useWatchEpisodes } from '#/hooks/useWatchEpisodes'
import type { TmdbEpisode, TmdbSeason } from '#/type/tmdb'
import { faCheck, faEye, faSpinner, faTimes, faTv } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'

interface Episode {
  seasonNumber: number
  episodeNumber: number
}

interface Props {
  showId: number
  season: TmdbSeason
  isSpecials?: boolean
  continuousEpisodeNumbers: boolean
  showName: string
  showPoster?: string | null
  showBackdrop?: string | null
  seasonWatchedEpisodes?: Episode[]
  previousUnwatchedEpisodes?: TmdbEpisode[]
}

export const airedEpisodes = (episode: TmdbEpisode) => {
  if (!episode.air_date) return false
  const airDate = new Date(episode.air_date)
  const today = new Date()
  return airDate <= today
}

export function ShowSeason({
  showId,
  season,
  continuousEpisodeNumbers,
  showName,
  showPoster,
  showBackdrop,
  seasonWatchedEpisodes,
  previousUnwatchedEpisodes,
}: Props) {
  const { id, name, air_date, poster_path, episodes } = season

  const numberOfWatchedEpisodes = seasonWatchedEpisodes?.length || null
  const numberOfAiredEpisodes = episodes ? episodes.filter(airedEpisodes).length : null
  const areAllEpisodesWatched =
    episodes && !!numberOfAiredEpisodes ? numberOfWatchedEpisodes === numberOfAiredEpisodes : false
  const progressPercentage =
    numberOfWatchedEpisodes !== null && numberOfAiredEpisodes !== null && numberOfAiredEpisodes > 0
      ? (numberOfWatchedEpisodes / numberOfAiredEpisodes) * 100
      : 0

  const { isWatchEpisodesLoading, watchMultipleEpisodes, unwatchMultipleEpisodes } = useWatchEpisodes({
    showId,
    showName,
    showPoster,
    showBackdrop,
  })

  const [hasImage, setHasImage] = useState(true)
  const [isUnwatchDialogOpen, setIsUnwatchDialogOpen] = useState(false)
  const [isMarkPreviousEpisodesDialogOpen, setIsMarkPreviousEpisodesDialogOpen] = useState(false)

  const formatedAirDate = air_date
    ? new Date(air_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : undefined

  const [isCollapsed, setIsCollapsed] = useState(true)

  if (!season.episodes || season.episodes.length === 0) return null

  const toggleEpisodesWatched = async (includePrevious = false) => {
    if (!season.episodes) return

    const previousEpisodesToToggle =
      !areAllEpisodesWatched && includePrevious && previousUnwatchedEpisodes ? previousUnwatchedEpisodes : []

    const episodesToToggle = [...previousEpisodesToToggle, ...season.episodes].filter(airedEpisodes).map(ep => ({
      seasonNumber: ep.season_number - 1,
      episodeNumber: ep.episode_number - 1,
    }))

    const title = previousEpisodesToToggle.length > 0 ? showName : `${season.name || `Season ${season.season_number}`}`

    if (areAllEpisodesWatched) unwatchMultipleEpisodes(episodesToToggle, title)
    else watchMultipleEpisodes(episodesToToggle, title)
  }

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
          <div className="relative aspect-square h-full rounded-[22px] bg-neutral-900 lg:aspect-video">
            <ProgressiveImage
              paths={[poster_path]}
              alt={name}
              className="absolute inset-y-0 left-0 size-full scale-200 rounded-[22px] object-cover object-top opacity-30 blur-2xl lg:aspect-video lg:object-center"
              minSize="w185"
              maxSize="w185"
              loading="lazy"
            />

            <ProgressiveImage
              paths={[poster_path]}
              alt={name}
              className="size-full rounded-[22px] object-cover object-top lg:aspect-video lg:object-center"
              onNoImage={() => setHasImage(false)}
              minSize="w185"
              maxSize="w185"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="flex aspect-square h-full items-center justify-center rounded-[22px] bg-neutral-900 lg:aspect-video">
            <FontAwesomeIcon icon={faTv} size="6x" className="max-w-10 opacity-40" />
          </div>
        )}

        <div className="flex items-center justify-between p-1 md:p-2 lg:p-4">
          <div className="flex flex-col items-start pr-24">
            <h2 className="line-clamp-2 text-left text-lg leading-6 font-semibold text-wrap">{name}</h2>
            {formatedAirDate && <p className="line-clamp-1 text-left text-sm text-neutral-400">{formatedAirDate}</p>}

            <div className="mt-3 h-1.5 w-full min-w-36 rounded-full bg-white/30">
              <div
                className="duration-slow h-full rounded-full bg-white transition-[width]"
                style={{ width: `${progressPercentage}%` }}
                role="progressbar"
                aria-valuenow={progressPercentage}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
        </div>
      </Button>

      {episodes && numberOfWatchedEpisodes !== null && (
        <div className="pointer-events-none absolute top-1 right-12 z-10 flex h-11 items-center pr-2">
          <span className="pointer-events-none line-clamp-1 w-fit text-right text-sm text-neutral-400">
            {numberOfWatchedEpisodes} / {episodes.length}
          </span>
        </div>
      )}

      <div className="absolute top-1 right-1 z-10">
        <Button
          variant="watch"
          size="icon"
          disabled={!numberOfAiredEpisodes || isWatchEpisodesLoading || !episodes || episodes.length === 0}
          data-state={areAllEpisodesWatched ? 'on' : 'off'}
          onClick={() => {
            if (areAllEpisodesWatched) setIsUnwatchDialogOpen(true)
            else if (previousUnwatchedEpisodes && previousUnwatchedEpisodes.length > 0)
              setIsMarkPreviousEpisodesDialogOpen(true)
            else toggleEpisodesWatched(false)
          }}
        >
          <FontAwesomeIcon icon={isWatchEpisodesLoading ? faSpinner : faEye} spin={isWatchEpisodesLoading} />
        </Button>

        <Dialog open={isUnwatchDialogOpen} onOpenChange={open => setIsUnwatchDialogOpen(open)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{`Do you want to mark all ${name} episodes as unwatched?`}</DialogTitle>
            </DialogHeader>

            <DialogFooter>
              <DialogClose asChild>
                <Button
                  variant="negative"
                  onClick={() => toggleEpisodesWatched(false)}
                  disabled={isWatchEpisodesLoading}
                >
                  <FontAwesomeIcon icon={faEye} />
                  <span>{'Mark all as Unwatched'}</span>
                </Button>
              </DialogClose>

              <DialogClose asChild>
                <Button variant="secondary">Cancel</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isMarkPreviousEpisodesDialogOpen}
          onOpenChange={open => setIsMarkPreviousEpisodesDialogOpen(open)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{`Do you want to mark all previous seasons as watched?`}</DialogTitle>
            </DialogHeader>

            <DialogFooter>
              <DialogClose asChild>
                <Button onClick={() => toggleEpisodesWatched(true)} disabled={isWatchEpisodesLoading}>
                  <FontAwesomeIcon icon={faCheck} />
                  <span>{'Yes'}</span>
                </Button>
              </DialogClose>

              <DialogClose asChild>
                <Button
                  variant="secondary"
                  onClick={() => toggleEpisodesWatched(false)}
                  disabled={isWatchEpisodesLoading}
                >
                  <FontAwesomeIcon icon={faTimes} />
                  <span>{'No'}</span>
                </Button>
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
              {episodes?.map((episode, index) => (
                <ShowEpisode
                  key={episode.id}
                  showId={showId}
                  episode={episode}
                  continuousEpisodeNumbers={continuousEpisodeNumbers}
                  showName={showName}
                  showPoster={showPoster}
                  showBackdrop={showBackdrop}
                  previousUnwatchedEpisodes={[
                    ...(previousUnwatchedEpisodes || []),
                    ...episodes
                      .slice(0, index)
                      .filter(
                        ep =>
                          !seasonWatchedEpisodes?.some(
                            we =>
                              we.seasonNumber === ep.season_number - 1 && we.episodeNumber === ep.episode_number - 1,
                          ),
                      ),
                  ]}
                />
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
