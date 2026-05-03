import { PosterCard } from '#/component/PosterCard'
import { Section } from '#/component/Section'
import { Button } from '#/component/ui/button'
import useSearchParams from '#/hooks/useSearchParams'
import { cn } from '#/lib/cn'
import { UrlParamsSchema } from '#/type/url'
import { SignInButton, useClerk, useUser } from '@clerk/tanstack-react-start'
import { convexAction, convexQuery } from '@convex-dev/react-query'
import { faSignIn, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { api } from '../../convex/_generated/api'

function formatWatchTime(minutes: number): string {
  if (minutes === 0) return '0h'

  const totalHours = Math.floor(minutes / 60)

  const years = Math.floor(totalHours / (24 * 365))
  const remainingHoursAfterYears = totalHours % (24 * 365)

  const months = Math.floor(remainingHoursAfterYears / (24 * 30))
  const remainingHoursAfterMonths = remainingHoursAfterYears % (24 * 30)

  const days = Math.floor(remainingHoursAfterMonths / 24)
  const hours = remainingHoursAfterMonths % 24

  return `${years > 0 ? `${years}y ` : ''}${months > 0 ? `${months}m ` : ''}${days > 0 ? `${days}d ` : ''}${hours > 0 ? `${hours}h` : ''}`.trim()
}

function formatNumber(num?: number): string {
  return (
    num?.toLocaleString('en-US', {
      notation: 'standard',
      maximumFractionDigits: 1,
    }) ?? '-'
  )
}

function StatCard({
  value,
  name,
  className,
  colorClassName,
}: {
  value: ReactNode
  name: ReactNode
  className?: string
  colorClassName?: string
}) {
  return (
    <div
      className={cn('flex flex-col gap-2 rounded-[22px] border border-neutral-500/40 bg-neutral-800 p-6', className)}
    >
      <div className="relative isolate h-fit w-fit">
        <span className={cn('absolute inset-0 text-4xl font-bold opacity-90 blur-lg', colorClassName)}>{value}</span>
        <span className={cn('relative z-10 text-4xl font-bold', colorClassName)}>{value}</span>
      </div>

      <span className="text-sm font-medium text-neutral-400">{name}</span>
    </div>
  )
}

export const Route = createFileRoute('/profile')({
  component: ProfilePage,
  validateSearch: UrlParamsSchema,
})

function ProfilePage() {
  const { media } = useSearchParams()
  const clerk = useClerk()
  const { user } = useUser()

  const { data: showStats } = useQuery({
    ...convexAction(api.stats.getShowStats),
    enabled: !!user && media === 'tv',
  })

  const { data: movieStats } = useQuery({
    ...convexAction(api.stats.getMovieStats),
    enabled: !!user && media === 'movie',
  })

  const { data: tvSections, isPending: tvSectionsLoading } = useQuery({
    ...convexQuery(api.watchlist.getTvSections),
    enabled: media === 'tv' && clerk.isSignedIn,
  })

  const { data: movieSections, isPending: movieSectionsLoading } = useQuery({
    ...convexQuery(api.watchlist.getMovieSections),
    enabled: media === 'movie' && clerk.isSignedIn,
  })

  const { data: favoriteShows, isPending: favoriteShowsLoading } = useQuery({
    ...convexQuery(api.favorites.getFavoriteShows),
    enabled: media === 'tv' && clerk.isSignedIn,
  })

  const { data: favoriteMovies, isPending: favoriteMoviesLoading } = useQuery({
    ...convexQuery(api.favorites.getFavoriteMovies),
    enabled: media === 'movie' && clerk.isSignedIn,
  })

  const isLoadingShows = tvSectionsLoading || favoriteShowsLoading
  const isLoadingMovies = movieSectionsLoading || favoriteMoviesLoading

  return (
    <div className="screen-py flex w-full flex-col gap-8">
      <header className="screen-px flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">Profile</h1>

          <p className="mt-2 text-neutral-400">
            {user
              ? `Signed in as ${user.fullName || user.username || user.primaryEmailAddress?.emailAddress}`
              : 'Sign in to view your stats'}
          </p>
        </div>

        {!user && (
          <SignInButton mode="modal">
            <Button>
              <FontAwesomeIcon icon={faSignIn} size="lg" />
              <span>Sign in</span>
            </Button>
          </SignInButton>
        )}
      </header>

      <section className="screen-px">
        <div className="page-width text- grid grid-cols-2 gap-4 lg:grid-cols-4">
          {user && media === 'tv' && (
            <>
              <StatCard
                className="col-span-2"
                colorClassName="text-sky-500"
                value={
                  showStats ? formatWatchTime(showStats.showTimeMinutes) : <FontAwesomeIcon icon={faSpinner} spin />
                }
                name="Show Time"
              />
              <StatCard
                colorClassName="text-lime-500"
                value={
                  showStats ? formatNumber(showStats.episodesWatchedCount) : <FontAwesomeIcon icon={faSpinner} spin />
                }
                name="Episodes Watched"
              />
              <StatCard
                colorClassName="text-amber-500"
                value={
                  showStats ? formatNumber(showStats.followedShowsCount) : <FontAwesomeIcon icon={faSpinner} spin />
                }
                name="Followed Shows"
              />
            </>
          )}

          {user && media === 'movie' && (
            <>
              <StatCard
                className="col-span-2"
                colorClassName="text-sky-500"
                value={
                  movieStats ? formatWatchTime(movieStats.movieTimeMinutes) : <FontAwesomeIcon icon={faSpinner} spin />
                }
                name="Movie Time"
              />
              <StatCard
                colorClassName="text-lime-500"
                value={
                  movieStats ? formatNumber(movieStats.moviesWatchedCount) : <FontAwesomeIcon icon={faSpinner} spin />
                }
                name="Movies Watched"
              />
              <StatCard
                colorClassName="text-amber-500"
                value={
                  movieStats ? formatNumber(movieStats.followedMoviesCount) : <FontAwesomeIcon icon={faSpinner} spin />
                }
                name="Followed Movies"
              />
            </>
          )}

          {!user && (
            <>
              <StatCard
                colorClassName="text-sky-500"
                className="col-span-2"
                value="-"
                name={media === 'tv' ? 'Show Time' : 'Movie Time'}
              />
              <StatCard
                colorClassName="text-lime-500"
                value="-"
                name={media === 'tv' ? 'Episodes Watched' : 'Movies Watched'}
              />
              <StatCard
                colorClassName="text-amber-500"
                value="-"
                name={media === 'tv' ? 'Followed Shows' : 'Followed Movies'}
              />
            </>
          )}
        </div>
      </section>

      <div className="flex flex-col gap-6">
        {media === 'tv' && (
          <>
            {isLoadingShows &&
              ['Finished Shows', 'Favorite Shows'].map((title, i) => (
                <Section title={title} key={i}>
                  {Array.from({ length: 10 }).map((_, episodeIndex) => (
                    <PosterCard key={episodeIndex} isLoading />
                  ))}
                </Section>
              ))}

            <Section title="Finished Shows">
              {tvSections?.finished.map(item => (
                <PosterCard
                  key={item.id}
                  id={item.showTmdbId}
                  title={item.name}
                  media="tv"
                  imagePaths={[item.poster, item.backdrop]}
                />
              ))}

              {tvSections && tvSections.finished.length === 0 && (
                <p className="pointer-events-none mt-2 font-semibold tracking-wide text-neutral-500">
                  Your finished shows will appear here.
                </p>
              )}
            </Section>

            <Section title="Favorite Shows">
              {favoriteShows?.map(item => (
                <PosterCard
                  key={item.id}
                  id={item.showTmdbId}
                  title={item.name}
                  media="tv"
                  imagePaths={[item.poster, item.backdrop]}
                />
              ))}

              {favoriteShows && favoriteShows.length === 0 && (
                <p className="pointer-events-none mt-2 font-semibold tracking-wide text-neutral-500">
                  Your favorite shows will appear here.
                </p>
              )}
            </Section>
          </>
        )}

        {media === 'movie' && (
          <>
            {isLoadingMovies &&
              ['Finished Movies', 'Favorite Movies'].map((title, i) => (
                <Section title={title} key={i}>
                  {Array.from({ length: 10 }).map((_, episodeIndex) => (
                    <PosterCard key={episodeIndex} isLoading />
                  ))}
                </Section>
              ))}

            <Section title="Finished Movies">
              {movieSections?.finished.map(item => (
                <PosterCard
                  key={item.tmdbId}
                  id={item.tmdbId}
                  title={item.name}
                  media="movie"
                  imagePaths={[item.poster, item.backdrop]}
                />
              ))}

              {movieSections && movieSections.finished.length === 0 && (
                <p className="pointer-events-none mt-2 font-semibold tracking-wide text-neutral-500">
                  Your finished movies will appear here.
                </p>
              )}
            </Section>

            <Section title="Favorite Movies">
              {favoriteMovies?.map(item => (
                <PosterCard
                  key={item.tmdbId}
                  id={item.tmdbId}
                  title={item.name}
                  media="movie"
                  imagePaths={[item.poster, item.backdrop]}
                />
              ))}

              {favoriteMovies && favoriteMovies.length === 0 && (
                <p className="pointer-events-none mt-2 font-semibold tracking-wide text-neutral-500">
                  Your favorite movies will appear here.
                </p>
              )}
            </Section>
          </>
        )}
      </div>

      {/* TODO remove after review */}
      {/* TODO fix tmdb and then uncomment */}
      {/* {!isIOS && <LinkWithTmdb />} */}
    </div>
  )
}
