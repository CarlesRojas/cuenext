import { api } from '#/../convex/_generated/api'
import { PosterCard } from '#/component/PosterCard'
import { Section } from '#/component/Section'
import { useMediaType } from '#/hooks/useMediaType'
import { useUndoToast } from '#/hooks/useUndoToast'
import { getTmdbImageUrl } from '#/lib/tmdbImage'
import type { TmdbMovie, TmdbTv } from '#/type/tmdb'
import { useClerk } from '@clerk/tanstack-react-start'
import { convexAction, convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation } from 'convex/react'

export const Route = createFileRoute('/explore')({
  component: RouteComponent,
})

function RouteComponent() {
  const clerk = useClerk()
  const { showUndoToast } = useUndoToast()

  const [mediaType] = useMediaType()

  const today = new Date()
  const nextWeek = new Date(today)
  nextWeek.setDate(today.getDate() + 7)

  const minDate = today.toISOString().split('T')[0]
  const maxDate = nextWeek.toISOString().split('T')[0]

  // SHOWS

  const { data: onTheAirShows, isPending: onTheAirShowsLoading } = useQuery({
    ...convexAction(api.tmdb.getDiscoverShows, {
      page: 1,
      sort_by: 'popularity.desc',
      air_date_gte: minDate,
      air_date_lte: maxDate,
    }),
    enabled: mediaType === 'tv',
  })

  const { data: top10Shows, isPending: top10ShowsLoading } = useQuery({
    ...convexAction(api.tmdb.getDiscoverShows, { page: 1, sort_by: 'popularity.desc' }),
    enabled: mediaType === 'tv',
  })

  const { data: topRatedShows, isPending: topRatedShowsLoading } = useQuery({
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

  const { data: upcomingMovies, isPending: upcomingMoviesLoading } = useQuery({
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

  const { data: top10Movies, isPending: top10MoviesLoading } = useQuery({
    ...convexAction(api.tmdb.getDiscoverMovies, { page: 1, sort_by: 'popularity.desc' }),
    enabled: mediaType === 'movie',
  })

  const { data: topRatedMovies, isPending: topRatedMoviesLoading } = useQuery({
    ...convexAction(api.tmdb.getDiscoverMovies, { page: 1, sort_by: 'vote_average.desc', vote_count_gte: 200 }),
    enabled: mediaType === 'movie',
  })

  // FOLLOWED

  const { data: followedMedia } = useQuery({
    ...convexQuery(api.library.listFollowed, { type: mediaType }),
  })

  const follow = useMutation(api.library.follow)
  const unfollow = useMutation(api.library.unfollow)

  const toggleFollow = (id: number, title: string) => {
    if (!clerk.isSignedIn) return clerk.openSignIn({ forceRedirectUrl: window.location.href })

    const isFollowing = Array.isArray(followedMedia) && followedMedia.includes(id)
    const mediaKey = `${mediaType}-${id}`

    if (isFollowing) {
      unfollow({ type: mediaType, tmdbId: id })
      showUndoToast(title, 'unfollow', mediaKey, () => follow({ type: mediaType, tmdbId: id }))
    } else {
      follow({ type: mediaType, tmdbId: id })
      showUndoToast(title, 'follow', mediaKey, () => unfollow({ type: mediaType, tmdbId: id }))
    }
  }

  return (
    <div className="screen-py flex w-full flex-col gap-2">
      <header className="screen-px mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">Explore</h1>
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
                  showFollow
                  isFollowed={Array.isArray(followedMedia) && followedMedia.includes(tv.id)}
                  onToggleFollow={() => toggleFollow(tv.id, tv.name)}
                />
              ))}

            {!onTheAirShows &&
              onTheAirShowsLoading &&
              Array.from({ length: 10 }).map((_, i) => <PosterCard key={i} isLoading />)}
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
                    showFollow
                    isFollowed={Array.isArray(followedMedia) && followedMedia.includes(tv.id)}
                    onToggleFollow={() => toggleFollow(tv.id, tv.name)}
                  />
                ))}

            {!top10Shows &&
              top10ShowsLoading &&
              Array.from({ length: 10 }).map((_, i) => <PosterCard key={i} isLoading />)}
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
                  showFollow
                  isFollowed={Array.isArray(followedMedia) && followedMedia.includes(tv.id)}
                  onToggleFollow={() => toggleFollow(tv.id, tv.name)}
                />
              ))}

            {!topRatedShows &&
              topRatedShowsLoading &&
              Array.from({ length: 10 }).map((_, i) => <PosterCard key={i} isLoading />)}
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
                  showFollow
                  isFollowed={Array.isArray(followedMedia) && followedMedia.includes(movie.id)}
                  onToggleFollow={() => toggleFollow(movie.id, movie.title)}
                />
              ))}

            {!upcomingMovies &&
              upcomingMoviesLoading &&
              Array.from({ length: 10 }).map((_, i) => <PosterCard key={i} isLoading />)}
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
                    showFollow
                    isFollowed={Array.isArray(followedMedia) && followedMedia.includes(movie.id)}
                    onToggleFollow={() => toggleFollow(movie.id, movie.title)}
                  />
                ))}

            {!top10Movies &&
              top10MoviesLoading &&
              Array.from({ length: 10 }).map((_, i) => <PosterCard key={i} isLoading />)}
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
                  showFollow
                  isFollowed={Array.isArray(followedMedia) && followedMedia.includes(movie.id)}
                  onToggleFollow={() => toggleFollow(movie.id, movie.title)}
                />
              ))}

            {!topRatedMovies &&
              topRatedMoviesLoading &&
              Array.from({ length: 10 }).map((_, i) => <PosterCard key={i} isLoading />)}
          </Section>
        </>
      )}
    </div>
  )
}
