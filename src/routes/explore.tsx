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

  const { data: popularShows } = useQuery({
    ...convexAction(api.tmdb.getPopularShows, { page: 1 }),
    enabled: mediaType === 'tv',
  })

  const { data: popularMovies } = useQuery({
    ...convexAction(api.tmdb.getPopularMovies, { page: 1 }),
    enabled: mediaType === 'movie',
  })

  return (
    <div className="screen-py flex w-full flex-col gap-8">
      <header className="screen-px">
        <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-5xl">Explore</h1>

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
        <Section title="Popular Shows" canCollapse={false}>
          {popularShows &&
            popularShows.results.map((tv: TmdbTv) => (
              <PosterCard
                mediaType={mediaType}
                key={tv.id}
                id={tv.id}
                title={tv.name}
                imageUrl={getTmdbImageUrl(tv.poster_path, 'w342') || undefined}
                onToggleFollow={() => {}}
              />
            ))}
        </Section>
      ) : (
        <Section title="Popular Movies" canCollapse={false}>
          {popularMovies &&
            popularMovies.results.map((movie: TmdbMovie) => (
              <PosterCard
                mediaType={mediaType}
                key={movie.id}
                id={movie.id}
                title={movie.title}
                imageUrl={getTmdbImageUrl(movie.poster_path, 'w342') || undefined}
                onToggleFollow={() => {}}
              />
            ))}
        </Section>
      )}
    </div>
  )
}
