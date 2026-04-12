import type { PaginationOptions, PaginationResult } from 'convex/server'

/**
 * Generic function to get all pages from a paginated Convex query
 *
 * @param queryFn - The query function to call
 * @param argsWithoutPagination - Query arguments without the paginationOpts
 * @param pageSize - Number of items per page (default: 1000)
 * @returns Array of all results from all pages
 */
export const getAllPages = async <T, TArgs extends Record<string, unknown>>(
  queryFn: (args: TArgs & { paginationOpts: PaginationOptions }) => Promise<PaginationResult<T>>,
  argsWithoutPagination: TArgs,
  pageSize: number = 1000,
): Promise<T[]> => {
  const allResults: T[] = []
  let continueCursor: string | null = null
  let isDone = false

  while (!isDone) {
    const result = await queryFn({
      ...argsWithoutPagination,
      paginationOpts: { numItems: pageSize, cursor: continueCursor },
    })

    continueCursor = result.continueCursor
    isDone = result.isDone
    allResults.push(...result.page)
  }

  return allResults
}
