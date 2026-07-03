import { api } from '#/../convex/_generated/api'
import FollowEpisode from '#/component/FollowEpisode'
import FollowMovie from '#/component/FollowMovie'
import { PosterCard } from '#/component/PosterCard'
import { Section } from '#/component/Section'
import { Button } from '#/component/ui/button'
import useSearchParams from '#/hooks/useSearchParams'
import { SeeAllList } from '#/routes/see-all/$list'
import type { TmdbMovie, TmdbTv } from '#/type/tmdb'
import { TMDB_STALE_TIME, tmdbStale } from '#/lib/tmdbQuery'
import { UrlParamsSchema } from '#/type/url'
import { SignInButton, useClerk } from '@clerk/tanstack-react-start'
import { convexAction } from '@convex-dev/react-query'
import { faForward, faSignIn } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/discover')({
  component: RouteComponent,
  validateSearch: UrlParamsSchema,
})

function RouteComponent() {
  const clerk = useClerk()
  const { media } = useSearchParams()

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
    ...tmdbStale(TMDB_STALE_TIME.SIX_HOURS),
    enabled: media === 'tv',
  })

  const { data: trendingShows, isPending: trendingShowsLoading } = useQuery({
    ...convexAction(api.tmdb.getTrendingTv, { page: 1, time_window: 'week' }),
    ...tmdbStale(TMDB_STALE_TIME.SIX_HOURS),
    enabled: media === 'tv',
  })

  const { data: topRatedShows, isPending: topRatedShowsLoading } = useQuery({
    ...convexAction(api.tmdb.getDiscoverShows, { page: 1, sort_by: 'vote_average.desc', vote_count_gte: 200 }),
    ...tmdbStale(TMDB_STALE_TIME.SIX_HOURS),
    enabled: media === 'tv',
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
    ...tmdbStale(TMDB_STALE_TIME.SIX_HOURS),
    enabled: media === 'movie',
  })

  const { data: trendingMovies, isPending: trendingMoviesLoading } = useQuery({
    ...convexAction(api.tmdb.getTrendingMovies, { page: 1, time_window: 'week' }),
    ...tmdbStale(TMDB_STALE_TIME.SIX_HOURS),
    enabled: media === 'movie',
  })

  const { data: topRatedMovies, isPending: topRatedMoviesLoading } = useQuery({
    ...convexAction(api.tmdb.getDiscoverMovies, { page: 1, sort_by: 'vote_average.desc', vote_count_gte: 200 }),
    ...tmdbStale(TMDB_STALE_TIME.SIX_HOURS),
    enabled: media === 'movie',
  })

  return (
    <div className="screen-py flex w-full flex-col gap-2">
      <header className="screen-px mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">Discover</h1>
      </header>

      {!clerk.isSignedIn && (
        <div className="screen-px mb-8 flex flex-col gap-4">
          <span className="font-semibold tracking-wide text-neutral-500">
            Sign in to view upcoming movies and TV episodes
          </span>

          <SignInButton mode="modal">
            <Button>
              <FontAwesomeIcon icon={faSignIn} size="lg" />
              <span>Sign in</span>
            </Button>
          </SignInButton>
        </div>
      )}

      {media === 'tv' && (
        <>
          <Section sectionKey="dropping-this-week" title="Dropping This Week" key="dropping-this-week">
            {onTheAirShows &&
              onTheAirShows.results.map((tv: TmdbTv) => <FollowEpisode key={tv.id} episode={tv} variant="poster" />)}

            {onTheAirShows && (
              <div className="flex h-full w-fit items-center justify-center">
                <Button asChild>
                  <Link to="/see-all/$list" params={{ list: SeeAllList.UPCOMING }} search={{ media: 'tv' }}>
                    <FontAwesomeIcon icon={faForward} className="size-4" />
                    <span>See all</span>
                  </Link>
                </Button>
              </div>
            )}

            {!onTheAirShows &&
              onTheAirShowsLoading &&
              Array.from({ length: 10 }).map((_, i) => <PosterCard key={i} isLoading />)}
          </Section>

          <Section sectionKey="trending-shows" title="Trending Shows" key="trending-shows">
            {trendingShows &&
              trendingShows.results.map((tv: TmdbTv, index: number) => (
                <FollowEpisode key={tv.id} episode={tv} number={index + 1} variant="poster" />
              ))}

            {trendingShows && (
              <div className="flex h-full w-fit items-center justify-center">
                <Button asChild>
                  <Link to="/see-all/$list" params={{ list: SeeAllList.TRENDING }} search={{ media: 'tv' }}>
                    <FontAwesomeIcon icon={faForward} className="size-4" />
                    <span>See all</span>
                  </Link>
                </Button>
              </div>
            )}

            {!trendingShows &&
              trendingShowsLoading &&
              Array.from({ length: 20 }).map((_, i) => <PosterCard key={i} isLoading />)}
          </Section>

          <Section sectionKey="top-rated-shows" title="Top Rated Shows" key="top-rated-shows">
            {topRatedShows &&
              topRatedShows.results.map((tv: TmdbTv) => <FollowEpisode key={tv.id} episode={tv} variant="poster" />)}

            {topRatedShows && (
              <div className="flex h-full w-fit items-center justify-center">
                <Button asChild>
                  <Link to="/see-all/$list" params={{ list: SeeAllList.TOP }} search={{ media: 'tv' }}>
                    <FontAwesomeIcon icon={faForward} className="size-4" />
                    <span>See all</span>
                  </Link>
                </Button>
              </div>
            )}

            {!topRatedShows &&
              topRatedShowsLoading &&
              Array.from({ length: 10 }).map((_, i) => <PosterCard key={i} isLoading />)}
          </Section>
        </>
      )}

      {media === 'movie' && (
        <>
          <Section sectionKey="upcoming-movies" title="Upcoming Movies" key="upcoming-movies">
            {upcomingMovies &&
              upcomingMovies.results.map((movie: TmdbMovie) => (
                <FollowMovie key={movie.id} movie={movie} variant="poster" />
              ))}

            {upcomingMovies && (
              <div className="flex h-full w-fit items-center justify-center">
                <Button asChild>
                  <Link to="/see-all/$list" params={{ list: SeeAllList.UPCOMING }} search={{ media: 'movie' }}>
                    <FontAwesomeIcon icon={faForward} className="size-4" />
                    <span>See all</span>
                  </Link>
                </Button>
              </div>
            )}

            {!upcomingMovies &&
              upcomingMoviesLoading &&
              Array.from({ length: 10 }).map((_, i) => <PosterCard key={i} isLoading />)}
          </Section>

          <Section sectionKey="trending-movies" title="Trending Movies" key="trending-movies">
            {trendingMovies &&
              trendingMovies.results.map((movie: TmdbMovie, index: number) => (
                <FollowMovie key={movie.id} movie={movie} number={index + 1} variant="poster" />
              ))}

            {trendingMovies && (
              <div className="flex h-full w-fit items-center justify-center">
                <Button asChild>
                  <Link to="/see-all/$list" params={{ list: SeeAllList.TRENDING }} search={{ media: 'movie' }}>
                    <FontAwesomeIcon icon={faForward} className="size-4" />
                    <span>See all</span>
                  </Link>
                </Button>
              </div>
            )}

            {!trendingMovies &&
              trendingMoviesLoading &&
              Array.from({ length: 10 }).map((_, i) => <PosterCard key={i} isLoading />)}
          </Section>

          <Section sectionKey="top-rated-movies" title="Top Rated Movies" key="top-rated-movies">
            {topRatedMovies &&
              topRatedMovies.results.map((movie: TmdbMovie) => (
                <FollowMovie key={movie.id} movie={movie} variant="poster" />
              ))}

            {topRatedMovies && (
              <div className="flex h-full w-fit items-center justify-center">
                <Button asChild>
                  <Link to="/see-all/$list" params={{ list: SeeAllList.TOP }} search={{ media: 'movie' }}>
                    <FontAwesomeIcon icon={faForward} className="size-4" />
                    <span>See all</span>
                  </Link>
                </Button>
              </div>
            )}

            {!topRatedMovies &&
              topRatedMoviesLoading &&
              Array.from({ length: 10 }).map((_, i) => <PosterCard key={i} isLoading />)}
          </Section>
        </>
      )}
    </div>
  )
}
