import { api } from '#/../convex/_generated/api'
import BackButton from '#/component/BackButton'
import FollowEpisode from '#/component/FollowEpisode'
import FollowMovie from '#/component/FollowMovie'
import { InfiniteMediaList } from '#/component/InfiniteMediaList'
import RowCard from '#/component/RowCard'
import { useMediaType } from '#/hooks/useMediaType'
import { cn } from '#/lib/cn'
import type { TmdbMovieMinimal, TmdbTvMinimal } from '#/type/tmdb'
import { UrlParamsSchema } from '#/type/url'
import { createFileRoute } from '@tanstack/react-router'
import { useWindowSize } from 'usehooks-ts'

export const Route = createFileRoute('/see-all/$list')({
  component: RouteComponent,
  validateSearch: UrlParamsSchema,
})

export enum SeeAllList {
  UPCOMING = 'upcoming',
  TOP = 'top',
}

function EpisodeWrapper(props: TmdbTvMinimal) {
  return <FollowEpisode episode={props} variant="row" followButtonText="Follow" />
}

function MovieWrapper(props: TmdbMovieMinimal) {
  return <FollowMovie movie={props} variant="row" followButtonText="Follow" />
}

function RouteComponent() {
  const { list } = Route.useParams()

  const { width = 0 } = useWindowSize()
  const isMobile = width < 768

  const [mediaType] = useMediaType()

  const today = new Date()
  const nextWeek = new Date(today)
  nextWeek.setDate(today.getDate() + 7)

  const minDate = today.toISOString().split('T')[0]
  const maxDate = nextWeek.toISOString().split('T')[0]

  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const minDateMovie = tomorrow.toISOString().split('T')[0]

  const nextMonth = new Date(today)
  nextMonth.setDate(today.getDate() + 35)
  const maxDateMovie = nextMonth.toISOString().split('T')[0]

  const getTitle = () => {
    if (list === SeeAllList.UPCOMING) return mediaType === 'tv' ? 'Dropping This Week' : 'Upcoming Movies'
    else return mediaType === 'tv' ? 'Top Rated Shows' : 'Top Rated Movies'
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

          <h1 className="line-clamp-2 text-3xl leading-8 font-extrabold tracking-tight text-white md:text-4xl">
            {getTitle()}
          </h1>
        </div>
      </header>

      <div className="screen-px relative w-full">
        <div className="page-width relative w-full">
          {mediaType === 'tv' && list === SeeAllList.UPCOMING && (
            <InfiniteMediaList
              action={api.tmdb.getDiscoverShows}
              actionKey={`tv-${list}`}
              params={{
                sort_by: 'popularity.desc',
                air_date_gte: minDate,
                air_date_lte: maxDate,
              }}
              Component={EpisodeWrapper}
              LoadingComponent={<RowCard isLoading />}
            />
          )}

          {mediaType === 'tv' && list === SeeAllList.TOP && (
            <InfiniteMediaList
              action={api.tmdb.getDiscoverShows}
              actionKey={`tv-${list}`}
              params={{
                sort_by: 'vote_average.desc',
                vote_count_gte: 200,
              }}
              Component={EpisodeWrapper}
              LoadingComponent={<RowCard isLoading />}
            />
          )}

          {mediaType === 'movie' && list === SeeAllList.UPCOMING && (
            <InfiniteMediaList
              action={api.tmdb.getDiscoverMovies}
              actionKey={`movie-${list}`}
              params={{
                sort_by: 'popularity.desc',
                with_release_type: '2|3',
                release_date_gte: minDateMovie,
                release_date_lte: maxDateMovie,
                include_adult: false,
                include_video: false,
              }}
              Component={MovieWrapper}
              LoadingComponent={<RowCard isLoading />}
            />
          )}

          {mediaType === 'movie' && list === SeeAllList.TOP && (
            <InfiniteMediaList
              action={api.tmdb.getDiscoverMovies}
              actionKey={`movie-${list}`}
              params={{
                sort_by: 'vote_average.desc',
                vote_count_gte: 200,
              }}
              Component={MovieWrapper}
              LoadingComponent={<RowCard isLoading />}
            />
          )}
        </div>
      </div>
    </div>
  )
}
