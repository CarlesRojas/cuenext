import BackButton from '#/component/BackButton'
import { InfiniteMediaList } from '#/component/InfiniteMediaList'
import RowCard from '#/component/RowCard'
import useSearchParams from '#/hooks/useSearchParams'
import useShowInfo from '#/hooks/useShowInfo'
import { useWatchEpisode } from '#/hooks/useWatchEpisode'
import { useWatchMovie } from '#/hooks/useWatchMovie'
import { cn } from '#/lib/cn'
import type { MovieSectionItem, TvSectionItem } from '#/type/section'
import { UrlParamsSchema } from '#/type/url'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useWindowSize } from 'usehooks-ts'
import { api } from '../../../convex/_generated/api'

export enum List {
  WATCH_NEXT = 'next',
  WAITING = 'waiting',
  FINISHED = 'finished',

  // TV specific
  STOPPED_WATCHING = 'stopped',
  HAVENT_STARTED = 'unstarted',
}

const ListWithWatch = [List.WATCH_NEXT, List.HAVENT_STARTED, List.STOPPED_WATCHING]

export const Route = createFileRoute('/list/$list')({
  component: RouteComponent,
  validateSearch: UrlParamsSchema,
  beforeLoad: async ({ params, search }) => {
    const tvSpecificLists = [List.STOPPED_WATCHING, List.HAVENT_STARTED]

    if (search.media === 'movie' && tvSpecificLists.includes(params.list as List))
      throw redirect({ to: '/', search: { media: 'movie' } })
  },
})

function EpisodeWrapper({ episode, showWatch }: { episode: TvSectionItem; showWatch: boolean }) {
  const { isWatched, isWatchedLoading, onToggleWatch } = useWatchEpisode(episode)

  const { name, poster, backdrop, numberOfSeasons, watchedPercentage, lastWatchedAt } = episode
  const seasonsText = numberOfSeasons ? `${numberOfSeasons} Season${numberOfSeasons > 1 ? 's' : ''}` : null

  const lastWatchedAtDate = lastWatchedAt ? new Date(lastWatchedAt) : null
  const formattedLastWatchedAtDate = lastWatchedAtDate
    ? lastWatchedAtDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : undefined
  const lastWatchedText = formattedLastWatchedAtDate ? `Last watched: ${formattedLastWatchedAtDate}` : seasonsText

  const showInfo = useShowInfo({ showId: episode.showTmdbId })
  const continuousEpisodeNumbers = showInfo.data?.continuousEpisodeNumbers || episode.numberOfSeasons === 1

  return (
    <RowCard
      media="tv"
      key={episode.showTmdbId}
      id={episode.showTmdbId}
      title={name}
      posterPath={poster}
      backdropPath={backdrop}
      subtitle={[lastWatchedText, seasonsText].filter(Boolean).join(' • ')}
      overview={''}
      showWatch={showWatch}
      isWatched={isWatched}
      onToggleWatch={onToggleWatch}
      isWatchLoading={isWatchedLoading}
      watchButtonText={
        continuousEpisodeNumbers
          ? `E${episode.episodeNumber + 1}`
          : `S${episode.seasonNumber + 1}, E${episode.episodeNumber + 1}`
      }
    />
  )
}

function WatchEpisodeWrapper(episode: TvSectionItem) {
  return EpisodeWrapper({ episode, showWatch: true })
}

function EmptyEpisodeWrapper(episode: TvSectionItem) {
  return EpisodeWrapper({ episode, showWatch: false })
}

function MovieWrapper({ movie, showWatch }: { movie: MovieSectionItem; showWatch: boolean }) {
  const { isWatched, isWatchedLoading, onToggleWatch } = useWatchMovie(movie)

  const { name, poster, backdrop } = movie

  const releaseDate = movie.releaseDate ? new Date(movie.releaseDate) : null
  const formattedReleaseDate = releaseDate
    ? releaseDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : undefined

  return (
    <RowCard
      media="movie"
      key={movie.tmdbId}
      id={movie.tmdbId}
      title={name}
      posterPath={poster}
      backdropPath={backdrop}
      subtitle={formattedReleaseDate}
      overview={''}
      showWatch={showWatch}
      isWatched={isWatched}
      onToggleWatch={onToggleWatch}
      isWatchLoading={isWatchedLoading}
      watchButtonText="Watch"
    />
  )
}

function WatchMovieWrapper(movie: MovieSectionItem) {
  return MovieWrapper({ movie, showWatch: true })
}

function EmptyMovieWrapper(movie: MovieSectionItem) {
  return MovieWrapper({ movie, showWatch: false })
}

function RouteComponent() {
  const { list } = Route.useParams()
  const { media } = useSearchParams()

  const { width = 0 } = useWindowSize()
  const isMobile = width < 768

  const getTitle = () => {
    if (list === List.WATCH_NEXT) return media === 'tv' ? 'Shows to watch next' : 'Movies to watch next'
    else if (list === List.HAVENT_STARTED) return "Haven't started"
    else if (list === List.WAITING) return media === 'tv' ? 'Waiting for episodes' : 'Not released yet'
    else if (list === List.STOPPED_WATCHING) return 'Stopped watching'
    else if (list === List.FINISHED) return media === 'tv' ? 'Finished shows' : 'Finished movies'

    return ''
  }

  return (
    <div className="screen-py relative flex w-full flex-col pt-0!">
      <header
        className={cn('screen-px screen-py sticky top-0 z-20 w-full pb-8 backdrop-blur-md', isMobile && '-top-14')}
        style={{
          maskImage: isMobile
            ? 'linear-gradient(to bottom, black 80%, transparent)'
            : 'linear-gradient(to bottom, black 70%, transparent)',
        }}
      >
        <div className="page-width relative flex w-full items-baseline gap-4">
          <BackButton />

          <h1 className="line-clamp-2 text-3xl leading-8 font-extrabold tracking-tight text-white md:text-4xl md:leading-10">
            {getTitle()}
          </h1>
        </div>
      </header>

      <div className="screen-px relative w-full">
        <div className="page-width relative w-full">
          {media === 'tv' && (
            <InfiniteMediaList
              action={api.watchlist.getTvSectionPaginated}
              actionKey={`tv-${list}`}
              params={{ section: list, pageSize: 10 }}
              Component={ListWithWatch.includes(list as List) ? WatchEpisodeWrapper : EmptyEpisodeWrapper}
              LoadingComponent={<RowCard isLoading />}
            />
          )}

          {media === 'movie' && (
            <InfiniteMediaList
              action={api.watchlist.getMovieSectionPaginated}
              actionKey={`movie-${list}`}
              params={{ section: list, pageSize: 10 }}
              Component={ListWithWatch.includes(list as List) ? WatchMovieWrapper : EmptyMovieWrapper}
              LoadingComponent={<RowCard isLoading />}
            />
          )}
        </div>
      </div>
    </div>
  )
}
