import BackButton from '#/component/BackButton'
import FollowEpisode from '#/component/FollowEpisode'
import FollowMovie from '#/component/FollowMovie'
import { InfiniteMediaList } from '#/component/InfiniteMediaList'
import { fetchSearchMovies, fetchSearchShows } from '#/lib/tmdb'
import RowCard from '#/component/RowCard'
import useSearchParams from '#/hooks/useSearchParams'
import { cn } from '#/lib/cn'
import type { TmdbMovieMinimal, TmdbTvMinimal } from '#/type/tmdb'
import { UrlParamsSchema } from '#/type/url'
import { createFileRoute } from '@tanstack/react-router'
import { useWindowSize } from 'usehooks-ts'

export const Route = createFileRoute('/search')({
  component: RouteComponent,
  validateSearch: UrlParamsSchema,
})

function EpisodeWrapper(props: TmdbTvMinimal) {
  return <FollowEpisode episode={props} variant="row" followButtonText="Track" />
}

function MovieWrapper(props: TmdbMovieMinimal) {
  return <FollowMovie movie={props} variant="row" followButtonText="Track" />
}

function RouteComponent() {
  const { media, query } = useSearchParams()

  const { width = 0 } = useWindowSize()
  const isMobile = width < 768

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
            {query ? `Results for '${query}'` : 'Search'}
          </h1>
        </div>
      </header>

      <div className="screen-px relative w-full">
        <div className="page-width relative w-full">
          {query && media === 'tv' && (
            <InfiniteMediaList
              queryKey={['tmdb-search', 'tv', query]}
              fetchPage={page => fetchSearchShows({ page, query })}
              Component={EpisodeWrapper}
              LoadingComponent={<RowCard isLoading />}
            />
          )}

          {query && media === 'movie' && (
            <InfiniteMediaList
              queryKey={['tmdb-search', 'movie', query]}
              fetchPage={page => fetchSearchMovies({ page, query })}
              Component={MovieWrapper}
              LoadingComponent={<RowCard isLoading />}
            />
          )}

          {!query && (
            <p className="pointer-events-none mb-4 font-semibold tracking-wide text-neutral-500">
              {`Enter a search term to find ${media === 'tv' ? 'TV shows' : 'movies'}`}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
