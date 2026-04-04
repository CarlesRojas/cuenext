import { cn } from '#/lib/cn'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useAction } from 'convex/react'
import type { FunctionReference } from 'convex/server'
import type { ComponentType, ReactNode } from 'react'
import { useIntersectionObserver } from 'usehooks-ts'

type PaginatedResult<T> = {
  page: number
  results: T[]
  total_pages: number
  total_results: number
}

type ActionParams = Record<string, string | number | boolean> & { page?: number }

type PaginatedAction<T> = FunctionReference<'action', 'public', ActionParams, PaginatedResult<T>>

interface InfiniteMediaListProps<TItem> {
  action: PaginatedAction<TItem>
  actionKey: string
  params: Omit<ActionParams, 'page'>
  Component: ComponentType<TItem>
  LoadingComponent: ReactNode
  className?: string
  emptyMessage?: string
  errorMessage?: string
}

export function InfiniteMediaList<TItem>({
  action,
  actionKey,
  params,
  Component,
  LoadingComponent,
  className,
  emptyMessage = 'No results',
  errorMessage = 'Something went wrong. Try again later',
}: InfiniteMediaListProps<TItem>) {
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

  if (isLoading) return <div className={cn('flex flex-col gap-4', className)}>{LoadingComponent}</div>

  if (error) {
    return (
      <div className="flex w-full flex-col items-center justify-center py-12 text-center">
        <p className="font-semibold tracking-wide text-red-800">{errorMessage}</p>
      </div>
    )
  }

  if (allItems.length === 0) {
    return (
      <div className="flex w-full flex-col items-center justify-center py-12 text-center">
        <p className="font-semibold tracking-wide text-neutral-500">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <>
      <p className="pointer-events-none mb-4 font-semibold tracking-wide text-neutral-500">{`Showing ${totalResults} results`}</p>

      <div className={cn('flex flex-col gap-4', className)}>
        {allItems.map((item, index) => (
          <Component key={index} {...item} />
        ))}

        <div ref={ref} className="col-span-full flex justify-center py-4">
          {LoadingComponent}
        </div>
      </div>
    </>
  )
}
