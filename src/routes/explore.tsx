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

  const today = new Date()
  const nextWeek = new Date(today)
  nextWeek.setDate(today.getDate() + 7)

  const minDate = today.toISOString().split('T')[0]
  const maxDate = nextWeek.toISOString().split('T')[0]

  // SHOWS

  const { data: onTheAirShows } = useQuery({
    ...convexAction(api.tmdb.getDiscoverShows, {
      page: 1,
      sort_by: 'popularity.desc',
      air_date_gte: minDate,
      air_date_lte: maxDate,
    }),
    enabled: mediaType === 'tv',
  })

  const { data: top10Shows } = useQuery({
    ...convexAction(api.tmdb.getDiscoverShows, { page: 1, sort_by: 'popularity.desc' }),
    enabled: mediaType === 'tv',
  })

  const { data: topRatedShows } = useQuery({
    ...convexAction(api.tmdb.getDiscoverShows, { page: 1, sort_by: 'vote_average.desc', vote_count_gte: 200 }),
    enabled: mediaType === 'tv',
  })

  // MOVIES

  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const minDateMovie = tomorrow.toISOString().split('T')[0]

  const nextMonth = new Date(today)
  nextMonth.setDate(today.getDate() + 35)
  const maxDateMovie = nextMonth.toISOString().split('T')[0]

  const { data: upcomingMovies } = useQuery({
    ...convexAction(api.tmdb.getDiscoverMovies, {
      page: 1,
      sort_by: 'popularity.desc',
      with_release_type: '2|3',
      release_date_gte: minDateMovie,
      release_date_lte: maxDateMovie,
      include_adult: false,
      include_video: false,
    }),
    enabled: mediaType === 'movie',
  })

  const { data: top10Movies } = useQuery({
    ...convexAction(api.tmdb.getDiscoverMovies, { page: 1, sort_by: 'popularity.desc' }),
    enabled: mediaType === 'movie',
  })

  const { data: topRatedMovies } = useQuery({
    ...convexAction(api.tmdb.getDiscoverMovies, { page: 1, sort_by: 'vote_average.desc', vote_count_gte: 200 }),
    enabled: mediaType === 'movie',
  })

  return (
    <div className="screen-py flex w-full flex-col gap-2">
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
        <>
          <Section title="Dropping This Week" canCollapse={false}>
            {onTheAirShows &&
              onTheAirShows.results.map((tv: TmdbTv) => (
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

          <Section title="Top 10 Shows" canCollapse={false}>
            {top10Shows &&
              top10Shows.results
                .slice(0, 10)
                .map((tv: TmdbTv, index: number) => (
                  <PosterCard
                    mediaType={mediaType}
                    key={tv.id}
                    id={tv.id}
                    title={tv.name}
                    number={index + 1}
                    imageUrl={getTmdbImageUrl(tv.poster_path, 'w342') || undefined}
                    onToggleFollow={() => {}}
                  />
                ))}
          </Section>

          <Section title="Top Rated Shows" canCollapse={false}>
            {topRatedShows &&
              topRatedShows.results.map((tv: TmdbTv) => (
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
        </>
      ) : (
        <>
          <Section title="Upcoming Movies" canCollapse={false}>
            {upcomingMovies &&
              upcomingMovies.results.map((movie: TmdbMovie) => (
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

          <Section title="Top 10 Movies" canCollapse={false}>
            {top10Movies &&
              top10Movies.results
                .slice(0, 10)
                .map((movie: TmdbMovie, index: number) => (
                  <PosterCard
                    mediaType={mediaType}
                    key={movie.id}
                    id={movie.id}
                    title={movie.title}
                    number={index + 1}
                    imageUrl={getTmdbImageUrl(movie.poster_path, 'w342') || undefined}
                    onToggleFollow={() => {}}
                  />
                ))}
          </Section>

          <Section title="Top Rated Movies" canCollapse={false}>
            {topRatedMovies &&
              topRatedMovies.results.map((movie: TmdbMovie) => (
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
        </>
      )}
    </div>
  )
}
