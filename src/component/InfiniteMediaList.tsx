import { cn } from '#/lib/cn'
import { categorizeDate, getGroupDisplayName, getGroupOrder } from '#/utils/dateCategory'
import { tmdbStale } from '#/lib/tmdbQuery'
import { useInfiniteQuery } from '@tanstack/react-query'
import type { ComponentType, ReactNode } from 'react'
import { useIntersectionObserver } from 'usehooks-ts'

type PaginatedResult<T> = {
  page: number
  results: T[]
  total_pages: number
  total_results: number
}

// Pages are fetched by a plain function rather than a Convex action reference: most of
// these lists are public TMDB reads served over cacheable HTTP now, and the two that are not
// (the user's own upcoming lists) just pass their action in wrapped.
interface InfiniteMediaListProps<TItem> {
  fetchPage: (page: number) => Promise<PaginatedResult<TItem>>
  queryKey: ReadonlyArray<unknown>
  Component: ComponentType<TItem>
  LoadingComponent: ReactNode
  className?: string
  emptyMessage?: string
  errorMessage?: string
  groupBy?: (item: TItem) => Date
  showTotalResults?: boolean
}

export function InfiniteMediaList<TItem>({
  fetchPage,
  queryKey,
  Component,
  LoadingComponent,
  className,
  emptyMessage = 'No results',
  errorMessage = 'Something went wrong. Try again later',
  groupBy,
  showTotalResults = true,
}: InfiniteMediaListProps<TItem>) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error } = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = 1 }) => await fetchPage(pageParam),
    initialPageParam: 1,
    getNextPageParam: lastPage => {
      if (lastPage.page < lastPage.total_pages) return lastPage.page + 1
      return undefined
    },
    ...tmdbStale(),
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

  const groupedItems = groupBy
    ? allItems.reduce(
        (groups, item) => {
          const itemDate = groupBy(item)
          const today = new Date()
          const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
          const itemDateStart = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate())

          if (itemDateStart < todayStart) return groups

          const category = categorizeDate(itemDate)
          if (!(category in groups)) groups[category] = []
          groups[category].push(item)
          return groups
        },
        {} as Record<string, TItem[]>,
      )
    : null

  const sortedGroups = groupedItems
    ? Object.entries(groupedItems).sort(([a], [b]) => getGroupOrder(a) - getGroupOrder(b))
    : null

  if (isLoading) return <div className={cn('flex flex-col gap-4', className)}>{LoadingComponent}</div>

  if (error) {
    return <p className="pointer-events-none mb-4 font-medium tracking-wider text-red-400">{errorMessage}</p>
  }

  if (allItems.length === 0) {
    return <p className="pointer-events-none mb-4 font-semibold tracking-wide text-neutral-500">{emptyMessage}</p>
  }

  return (
    <>
      {showTotalResults && (
        <p className="pointer-events-none mb-4 font-semibold tracking-wide text-neutral-500">{`Showing ${totalResults.toLocaleString()} results`}</p>
      )}

      <div className={cn('flex flex-col gap-4', className)}>
        {groupBy && sortedGroups
          ? sortedGroups.map(([groupKey, groupItems]) => (
              <div key={groupKey} className="mb-6 flex flex-col gap-4">
                <h3 className="text-sm font-semibold tracking-wider text-neutral-400 uppercase">
                  {getGroupDisplayName(groupKey)}
                </h3>

                {groupItems.map((item, index) => (
                  <Component key={`${groupKey}-${index}`} {...item} />
                ))}
              </div>
            ))
          : allItems.map((item, index) => <Component key={index} {...item} />)}

        <div ref={ref} className="col-span-full flex justify-center">
          {hasNextPage && LoadingComponent}
        </div>
      </div>
    </>
  )
}
