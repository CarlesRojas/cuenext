import type { FunctionArgs, FunctionReference, FunctionReturnType } from 'convex/server'
import { getFunctionName } from 'convex/server'
import { useConvex } from 'convex/react'

// A Convex query read once instead of subscribed to.
//
// `convexQuery` opens a live subscription, and Convex re-runs a subscribed query - and bills
// for it - every time anything it read changes. For data owned by a single user that is a
// bad trade: the only writer is the browser holding the subscription, so it already knows
// what changed. Marking ten episodes watched one at a time re-ran the show's watch state ten
// times to tell the client something it had just asked for.
//
// These queries are read once and then kept current by hand: the mutations return their new
// state and the caller writes it into the cache. Live subscriptions stay where they earn
// their keep - data other people can change.
export const USER_DATA_STALE_TIME = 5 * 60 * 1000

export function convexOnceKey<TQuery extends FunctionReference<'query'>>(funcRef: TQuery, args: FunctionArgs<TQuery>) {
  return ['convexOnce', getFunctionName(funcRef), args] as const
}

export function useConvexOnce<TQuery extends FunctionReference<'query'>>(
  funcRef: TQuery,
  args: FunctionArgs<TQuery>,
  staleTime: number = USER_DATA_STALE_TIME,
) {
  const convex = useConvex()

  return {
    queryKey: convexOnceKey(funcRef, args),
    queryFn: (): Promise<FunctionReturnType<TQuery>> => convex.query(funcRef, args),
    staleTime,
    refetchOnMount: true as const,
  }
}
