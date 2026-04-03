import { api } from '#/../convex/_generated/api'
import { getTmdbImageUrl } from '#/lib/tmdbImage'
import type { TmdbTv } from '#/type/tmdb'
import { convexAction } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/(auth)/watchlist')({
  component: RouteComponent,
  beforeLoad: async ({ context: { isAuthenticated } }) => {
    if (!isAuthenticated) throw redirect({ to: '/' })
  },
})

function RouteComponent() {
  const { data: popularShows, isLoading, error } = useQuery({ ...convexAction(api.tmdb.getPopularShows, { page: 1 }) })

  return (
    <div className="page-wrap py-8">
      <h1 className="mb-6 text-2xl font-bold">Watchlist (Popular Shows Preview)</h1>

      {isLoading && <p>Loading popular shows...</p>}
      {error && <p className="text-red-500">Error loading shows: {error.message}</p>}

      {popularShows && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {popularShows.results.map((tv: TmdbTv) => (
            <div key={tv.id} className="flex flex-col gap-2">
              {tv.poster_path ? (
                <img
                  src={getTmdbImageUrl(tv.poster_path, 'w342') || ''}
                  alt={tv.name}
                  className="aspect-2/3 w-full rounded-md object-cover shadow-md"
                />
              ) : (
                <div className="flex aspect-2/3 w-full items-center justify-center rounded-md bg-neutral-200 p-4 text-center dark:bg-neutral-800">
                  <span className="text-sm text-neutral-500">{tv.name}</span>
                </div>
              )}
              <div className="line-clamp-1 font-medium" title={tv.name}>
                {tv.name}
              </div>
              <div className="text-sm text-neutral-500">
                {tv.first_air_date ? new Date(tv.first_air_date).getFullYear() : 'Unknown'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
