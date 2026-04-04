import { PosterCard } from '#/component/PosterCard'
import type { MediaType } from '#/hooks/useMediaType'
import { cn } from '#/lib/cn'
import { getTmdbImageUrl } from '#/lib/tmdbImage'
import type { TmdbMovieMinimal, TmdbTvMinimal } from '#/type/tmdb'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useAction } from 'convex/react'
import type { FunctionReference } from 'convex/server'
import { useIntersectionObserver } from 'usehooks-ts'

type PaginatedResult<T> = {
  page: number
  results: T[]
  total_pages: number
  total_results: number
}

type ActionParams = Record<string, string | number | boolean> & { page?: number }

type PaginatedMediaAction = FunctionReference<
  'action',
  'public',
  ActionParams,
  PaginatedResult<TmdbMovieMinimal | TmdbTvMinimal>
>

interface InfiniteMediaListProps {
  action: PaginatedMediaAction
  actionKey: string
  params: Omit<ActionParams, 'page'>
  mediaType?: MediaType
  className?: string
  showWatch?: boolean
  showFollow?: boolean
  onToggleWatch?: (id: number, mediaType: MediaType) => void
  onToggleFollow?: (id: number, mediaType: MediaType) => void
  watchStates?: Record<string, boolean>
  followStates?: Record<string, boolean>
  loadingStates?: Record<string, boolean>
}

type MediaItem = TmdbMovieMinimal | TmdbTvMinimal

export function InfiniteMediaList({ action, actionKey, params, mediaType, className }: InfiniteMediaListProps) {
  const convexAction = useAction(action)

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error } = useInfiniteQuery({
    queryKey: [actionKey, ...Object.entries(params).map(param => `${param[0]}=${param[1]}`)],
    queryFn: async ({ pageParam = 1 }) => await convexAction({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: lastPage => {
      if (lastPage.page < lastPage.total_pages) return lastPage.page + 1
      return undefined
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  })

  const { ref } = useIntersectionObserver({
    threshold: 0,
    rootMargin: '200px',
    onChange: isIntersecting => {
      if (isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage()
    },
  })

  const allItems = data?.pages.flatMap(page => page.results) || []
  const totalResults = data?.pages[0]?.total_results || 0

  if (isLoading) {
    return (
      <>
        <p className="pointer-events-none mb-4 font-semibold tracking-wide text-neutral-500 opacity-0">Loading...</p>

        <div className={cn('grid w-full grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5', className)}>
          {Array.from({ length: 20 }).map((_, index) => (
            <PosterCard key={index} isLoading={true} />
          ))}
        </div>
      </>
    )
  }

  if (error) {
    return (
      <div className="flex w-full flex-col items-center justify-center py-12 text-center">
        <p className="font-semibold tracking-wide text-red-800">Something went wrong. Ttry again later</p>
      </div>
    )
  }

  if (allItems.length === 0) {
    return (
      <div className="flex w-full flex-col items-center justify-center py-12 text-center">
        <p className="font-semibold tracking-wide text-neutral-500">No results</p>
      </div>
    )
  }

  const getMediaTypeFromItem = (item: MediaItem): MediaType => {
    if ('title' in item) return 'movie'
    if ('name' in item) return 'tv'
    return mediaType || 'movie'
  }

  const getTitleFromItem = (item: MediaItem): string => {
    if ('title' in item) return item.title
    if ('name' in item) return item.name
    return ''
  }

  return (
    <>
      <p className="pointer-events-none mb-4 font-semibold tracking-wide text-neutral-500">{`Showing ${totalResults} results`}</p>

      <div className={cn('grid w-full grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5', className)}>
        {allItems.map(item => {
          const itemMediaType = getMediaTypeFromItem(item)

          return (
            <PosterCard
              key={`${itemMediaType}-${item.id}`}
              id={item.id}
              title={getTitleFromItem(item)}
              mediaType={itemMediaType}
              imageUrl={item.poster_path ? getTmdbImageUrl(item.poster_path, 'w342') || undefined : undefined}
            />
          )
        })}

        <div ref={ref} className="col-span-full flex justify-center py-4">
          {isFetchingNextPage && (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 10 }).map((_, index) => (
                <PosterCard key={`loading-${index}`} isLoading={true} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
