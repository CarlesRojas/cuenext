import { api } from '#/../convex/_generated/api'
import BackButton from '#/component/BackButton'
import FollowEpisode from '#/component/FollowEpisode'
import FollowMovie from '#/component/FollowMovie'
import { InfiniteMediaList } from '#/component/InfiniteMediaList'
import RowCard from '#/component/RowCard'
import { useMediaType } from '#/hooks/useMediaType'
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
  return <FollowEpisode episode={props} variant="row" followButtonText="Follow" />
}

function MovieWrapper(props: TmdbMovieMinimal) {
  return <FollowMovie movie={props} variant="row" followButtonText="Follow" />
}

function RouteComponent() {
  const searchParams = useSearchParams()

  const { width = 0 } = useWindowSize()
  const isMobile = width < 768

  const [mediaType] = useMediaType()

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
            {searchParams.query ? `Results for '${searchParams.query ?? ''}'` : 'Search'}
          </h1>
        </div>
      </header>

      <div className="screen-px relative w-full">
        <div className="page-width relative w-full">
          {searchParams.query && mediaType === 'tv' && (
            <InfiniteMediaList
              action={api.tmdb.searchTv}
              actionKey={'searchTv'}
              params={{ query: searchParams.query }}
              Component={EpisodeWrapper}
              LoadingComponent={<RowCard isLoading />}
            />
          )}

          {searchParams.query && mediaType === 'movie' && (
            <InfiniteMediaList
              action={api.tmdb.searchMovies}
              actionKey={'searchMovies'}
              params={{ query: searchParams.query }}
              Component={MovieWrapper}
              LoadingComponent={<RowCard isLoading />}
            />
          )}

          {!searchParams.query && (
            <p className="pointer-events-none mb-4 font-semibold tracking-wide text-neutral-500">
              Enter a search term to find movies and TV shows
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
