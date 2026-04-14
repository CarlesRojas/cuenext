import { cn } from '#/lib/cn'
import type { PaginatedQueryReference } from 'convex/react'
import { usePaginatedQuery } from 'convex/react'
import type { ComponentType, ReactNode } from 'react'
import { useIntersectionObserver } from 'usehooks-ts'

type QueryParams = Record<string, string | number | boolean>

interface InfiniteListProps<TItem> {
  query: PaginatedQueryReference
  args: QueryParams
  Component: ComponentType<TItem>
  LoadingComponent: ReactNode
  className?: string
  emptyMessage?: string
  errorMessage?: string
  showTotalResults?: boolean
  getKey: (item: TItem, index: number) => string
}

export function InfiniteList<TItem>({
  query,
  args,
  Component,
  LoadingComponent,
  className,
  emptyMessage = 'No results',
  showTotalResults = true,
  getKey,
}: InfiniteListProps<TItem>) {
  const { results, status, isLoading, loadMore } = usePaginatedQuery(query, args, { initialNumItems: 10 })

  const canLoadMore = status === 'CanLoadMore'

  const { ref } = useIntersectionObserver({
    threshold: 0,
    rootMargin: '200px',
    onChange: isIntersecting => {
      if (isIntersecting && canLoadMore) loadMore(10)
    },
  })

  if (isLoading && results.length === 0)
    return <div className={cn('flex flex-col gap-4', className)}>{LoadingComponent}</div>

  if (!isLoading && results.length === 0)
    return <p className="pointer-events-none mb-4 font-semibold tracking-wide text-neutral-500">{emptyMessage}</p>

  return (
    <>
      {showTotalResults && (
        <p className="pointer-events-none mb-4 font-semibold tracking-wide text-neutral-500">
          {`Showing ${results.length.toLocaleString()} results`}
        </p>
      )}

      <div className={cn('flex flex-col gap-4', className)}>
        {results.map((item, index) => (
          <Component key={getKey(item, index)} {...item} />
        ))}

        <div ref={ref} className="flex justify-center">
          {canLoadMore && LoadingComponent}
        </div>
      </div>
    </>
  )
}
