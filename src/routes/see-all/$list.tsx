import BackButton from '#/component/BackButton'
import FollowEpisode from '#/component/FollowEpisode'
import FollowMovie from '#/component/FollowMovie'
import { InfiniteMediaList } from '#/component/InfiniteMediaList'
import { fetchDiscoverMovies, fetchDiscoverShows, fetchTrendingMovies, fetchTrendingShows } from '#/lib/tmdb'
import RowCard from '#/component/RowCard'
import useSearchParams from '#/hooks/useSearchParams'
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
  TRENDING = 'trending',
}

function EpisodeWrapper(props: TmdbTvMinimal) {
  return <FollowEpisode episode={props} variant="row" followButtonText="Track" />
}

function MovieWrapper(props: TmdbMovieMinimal) {
  return <FollowMovie movie={props} variant="row" followButtonText="Track" />
}

function RouteComponent() {
  const { list } = Route.useParams()
  const { media } = useSearchParams()

  const { width = 0 } = useWindowSize()
  const isMobile = width < 768

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
    if (list === SeeAllList.UPCOMING) return media === 'tv' ? 'Dropping This Week' : 'Upcoming Movies'
    else if (list === SeeAllList.TRENDING) return media === 'tv' ? 'Trending Shows' : 'Trending Movies'
    else return media === 'tv' ? 'Top Rated Shows' : 'Top Rated Movies'
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
          {media === 'tv' && list === SeeAllList.UPCOMING && (
            <InfiniteMediaList
              queryKey={['tmdb-list', 'tv', list]}
              fetchPage={page =>
                fetchDiscoverShows({
                  page,
                  sort_by: 'popularity.desc',
                  'air_date.gte': minDate,
                  'air_date.lte': maxDate,
                })
              }
              Component={EpisodeWrapper}
              LoadingComponent={<RowCard isLoading />}
            />
          )}

          {media === 'tv' && list === SeeAllList.TRENDING && (
            <InfiniteMediaList
              queryKey={['tmdb-list', 'tv', list]}
              fetchPage={page => fetchTrendingShows({ page, time_window: 'week' })}
              Component={EpisodeWrapper}
              LoadingComponent={<RowCard isLoading />}
            />
          )}

          {media === 'tv' && list === SeeAllList.TOP && (
            <InfiniteMediaList
              queryKey={['tmdb-list', 'tv', list]}
              fetchPage={page => fetchDiscoverShows({ page, sort_by: 'vote_average.desc', 'vote_count.gte': 200 })}
              Component={EpisodeWrapper}
              LoadingComponent={<RowCard isLoading />}
            />
          )}

          {media === 'movie' && list === SeeAllList.UPCOMING && (
            <InfiniteMediaList
              queryKey={['tmdb-list', 'movie', list]}
              fetchPage={page =>
                fetchDiscoverMovies({
                  page,
                  sort_by: 'popularity.desc',
                  with_release_type: '2|3',
                  'release_date.gte': minDateMovie,
                  'release_date.lte': maxDateMovie,
                  include_adult: false,
                  include_video: false,
                })
              }
              Component={MovieWrapper}
              LoadingComponent={<RowCard isLoading />}
            />
          )}

          {media === 'movie' && list === SeeAllList.TRENDING && (
            <InfiniteMediaList
              queryKey={['tmdb-list', 'movie', list]}
              fetchPage={page => fetchTrendingMovies({ page, time_window: 'week' })}
              Component={MovieWrapper}
              LoadingComponent={<RowCard isLoading />}
            />
          )}

          {media === 'movie' && list === SeeAllList.TOP && (
            <InfiniteMediaList
              queryKey={['tmdb-list', 'movie', list]}
              fetchPage={page => fetchDiscoverMovies({ page, sort_by: 'vote_average.desc', 'vote_count.gte': 200 })}
              Component={MovieWrapper}
              LoadingComponent={<RowCard isLoading />}
            />
          )}
        </div>
      </div>
    </div>
  )
}
