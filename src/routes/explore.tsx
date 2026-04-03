import { api } from '#/../convex/_generated/api'
import { PosterCard } from '#/component/PosterCard'
import { Section } from '#/component/Section'
import { useMediaType } from '#/hooks/useMediaType'
import { getTmdbImageUrl } from '#/lib/tmdbImage'
import type { TmdbMovie, TmdbTv } from '#/type/tmdb'
import { convexAction } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/explore')({
  component: RouteComponent,
})

function RouteComponent() {
  const [mediaType] = useMediaType()
  const [searchQuery, setSearchQuery] = useState('')

  const {
    data: popularShows,
    isLoading: showsLoading,
    error: showsError,
  } = useQuery({ ...convexAction(api.tmdb.getPopularShows, { page: 1 }) })
  const {
    data: popularMovies,
    isLoading: moviesLoading,
    error: moviesError,
  } = useQuery({ ...convexAction(api.tmdb.getPopularMovies, { page: 1 }) })

  return (
    <main className="flex w-full flex-col gap-8 p-4 md:p-8">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-5xl">Explore</h1>
        <p className="mt-2 text-neutral-400">Discover new {mediaType === 'tv' ? 'shows' : 'movies'} to watch.</p>

        <div className="relative mt-6 w-full max-w-md">
          <input
            type="text"
            placeholder={`Search for ${mediaType === 'tv' ? 'TV shows' : 'movies'}...`}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-full border border-neutral-700/50 bg-neutral-800/40 px-6 py-3 text-white placeholder-neutral-500 backdrop-blur-md transition-colors focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
          />
        </div>
      </header>

      {mediaType === 'tv' ? (
        <div className="flex flex-col gap-6">
          <Section title="Popular Shows" canCollapse={false}>
            {showsLoading && <p className="p-4 text-neutral-500">Loading popular shows...</p>}
            {showsError && <p className="p-4 text-red-500">Error loading shows: {showsError.message}</p>}

            {popularShows &&
              popularShows.results.map((tv: TmdbTv) => (
                <PosterCard
                  key={tv.id}
                  id={tv.id}
                  title={tv.name}
                  imageUrl={getTmdbImageUrl(tv.poster_path, 'w342') || undefined}
                  onToggleFollow={() => {}}
                />
              ))}
          </Section>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <Section title="Popular Movies" canCollapse={false}>
            {moviesLoading && <p className="p-4 text-neutral-500">Loading popular movies...</p>}
            {moviesError && <p className="p-4 text-red-500">Error loading movies: {moviesError.message}</p>}

            {popularMovies &&
              popularMovies.results.map((movie: TmdbMovie) => (
                <PosterCard
                  key={movie.id}
                  id={movie.id}
                  title={movie.title}
                  imageUrl={getTmdbImageUrl(movie.poster_path, 'w342') || undefined}
                  onToggleFollow={() => {}}
                />
              ))}
          </Section>
        </div>
      )}
    </main>
  )
}
