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
  groupBy?: (item: TItem) => Date
  showTotalResults?: boolean
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
  groupBy,
  showTotalResults = true,
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

  const categorizeDate = (date: Date): string => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

    if (itemDate.getTime() === today.getTime()) return 'today'

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    if (itemDate.getTime() === tomorrow.getTime()) return 'tomorrow'

    const nextMonday = new Date(today)
    const daysUntilMonday = (8 - nextMonday.getDay()) % 7 || 7
    nextMonday.setDate(nextMonday.getDate() + daysUntilMonday)
    if (itemDate < nextMonday) {
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      return dayNames[itemDate.getDay()]
    }

    if (itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear()) return 'this-month'

    if (date.getFullYear() === now.getFullYear()) {
      const monthNames = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ]
      return monthNames[date.getMonth()]
    }

    return 'later'
  }

  const getGroupDisplayName = (groupKey: string): string => {
    switch (groupKey) {
      case 'today':
        return 'Today'
      case 'tomorrow':
        return 'Tomorrow'
      case 'monday':
        return 'Monday'
      case 'tuesday':
        return 'Tuesday'
      case 'wednesday':
        return 'Wednesday'
      case 'thursday':
        return 'Thursday'
      case 'friday':
        return 'Friday'
      case 'saturday':
        return 'Saturday'
      case 'sunday':
        return 'Sunday'
      case 'this-month':
        return 'This Month'
      case 'later':
        return 'Later'
      default:
        return groupKey
    }
  }

  const getGroupOrder = (groupKey: string): number => {
    switch (groupKey) {
      case 'today':
        return 0
      case 'tomorrow':
        return 1
      case 'monday':
        return 2
      case 'tuesday':
        return 3
      case 'wednesday':
        return 4
      case 'thursday':
        return 5
      case 'friday':
        return 6
      case 'saturday':
        return 7
      case 'sunday':
        return 8
      case 'this-month':
        return 9
      case 'January':
        return 10
      case 'February':
        return 11
      case 'March':
        return 12
      case 'April':
        return 13
      case 'May':
        return 14
      case 'June':
        return 15
      case 'July':
        return 16
      case 'August':
        return 17
      case 'September':
        return 18
      case 'October':
        return 19
      case 'November':
        return 20
      case 'December':
        return 21
      case 'later':
      default:
        return 999
    }
  }

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
