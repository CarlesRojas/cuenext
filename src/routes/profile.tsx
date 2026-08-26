import { AndroidWidgetSetup } from '#/component/AndroidWidgetSetup'
import { PosterCard } from '#/component/PosterCard'
import { ProfileReviewCard } from '#/component/ProfileReviewCard'
import { Section } from '#/component/Section'
import { NativeSelect, NativeSelectOption } from '#/component/ui/native-select'
import { Button } from '#/component/ui/button'
import useSearchParams from '#/hooks/useSearchParams'
import { cn } from '#/lib/cn'
import { UrlParamsSchema } from '#/type/url'
import { SignInButton, useUser } from '@clerk/tanstack-react-start'
import { convexQuery } from '@convex-dev/react-query'
import { faSignIn, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useAction } from 'convex/react'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { api } from '../../convex/_generated/api'

// Rebuild the materialized stats row when it doesn't exist yet or hasn't been fully
// recomputed in a month (the incremental deltas keep it current in between; the periodic
// rebuild self-heals any drift).
const STATS_RECOMPUTE_AFTER_MS = 30 * 24 * 60 * 60 * 1000

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
      className={cn(
        'flex flex-col gap-1 rounded-[22px] border border-neutral-500/40 bg-neutral-800 p-4 lg:gap-2 lg:p-5',
        className,
      )}
    >
      {/* A watch time like "1y 2m 3d 4h" has to fit a narrow card, so the value wraps
          inside the card instead of widening it. */}
      <div className="relative isolate h-fit w-fit max-w-full">
        <span
          className={cn(
            'absolute inset-0 text-xl font-bold break-words opacity-90 blur-lg sm:text-2xl lg:text-3xl',
            colorClassName,
          )}
        >
          {value}
        </span>
        <span className={cn('relative z-10 text-xl font-bold break-words sm:text-2xl lg:text-3xl', colorClassName)}>
          {value}
        </span>
      </div>

      <span className="text-xs leading-4 font-medium text-neutral-400 lg:text-sm">{name}</span>
    </div>
  )
}

// 'all' and 'unrated' aside, a filter value is the exact score a title was given.
type RatingFilter = 'all' | 'unrated' | number

const RATING_OPTIONS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]

function RatingFilterSelect({ value, onChange }: { value: RatingFilter; onChange: (value: RatingFilter) => void }) {
  return (
    <NativeSelect
      size="sm"
      aria-label="Filter by rating"
      value={typeof value === 'number' ? String(value) : value}
      onChange={event => {
        const next = event.target.value
        onChange(next === 'all' || next === 'unrated' ? next : Number(next))
      }}
    >
      <NativeSelectOption value="all">{'All'}</NativeSelectOption>
      <NativeSelectOption value="unrated">{'Unrated'}</NativeSelectOption>

      {RATING_OPTIONS.map(rating => (
        <NativeSelectOption key={rating} value={String(rating)}>
          {`${rating} ★`}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  )
}

export const Route = createFileRoute('/profile')({
  component: ProfilePage,
  validateSearch: UrlParamsSchema,
})

function ProfilePage() {
  const { media } = useSearchParams()
  const { isLoaded, isSignedIn, user } = useUser()

  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all')

  const { data: stats } = useQuery({
    ...convexQuery(api.stats.getStats),
    enabled: !!user,
  })

  const recomputeStats = useAction(api.stats.recomputeStats)
  const isRecomputingRef = useRef(false)

  useEffect(() => {
    const needsRecompute = stats === null || (stats && stats.recomputedAt < Date.now() - STATS_RECOMPUTE_AFTER_MS)
    if (!user || !needsRecompute || isRecomputingRef.current) return

    isRecomputingRef.current = true
    recomputeStats().catch(() => {
      isRecomputingRef.current = false
    })
  }, [user, stats, recomputeStats])

  const showStats = stats?.showStats
  const movieStats = stats?.movieStats

  const { data: tvSections, isPending: tvSectionsLoading } = useQuery({
    ...convexQuery(api.watchlist.getTvSections),
    enabled: media === 'tv' && !!isSignedIn,
  })

  const { data: movieSections, isPending: movieSectionsLoading } = useQuery({
    ...convexQuery(api.watchlist.getMovieSections),
    enabled: media === 'movie' && !!isSignedIn,
  })

  // Both rating sections read the same list: the rated grid takes the rows with a rating,
  // the reviews list takes the ones that were written. Already sorted best rated first.
  const { data: myReviews, isPending: myReviewsLoading } = useQuery({
    ...convexQuery(api.reviews.getMyReviews, { type: media ?? 'tv' }),
    enabled: !!isSignedIn,
  })

  const writtenReviews = (myReviews ?? []).filter(review => review.content !== '')

  // Finished titles and rated ones are one library here: a title you rated but never
  // finished belongs in the same place as one you finished but never rated, so the two
  // lists are merged by tmdbId and the selector narrows them down.
  const finishedItems =
    media === 'tv'
      ? (tvSections?.finished ?? []).map(item => ({
          tmdbId: item.showTmdbId,
          name: item.name,
          poster: item.poster ?? null,
          backdrop: item.backdrop ?? null,
        }))
      : (movieSections?.finished ?? []).map(item => ({
          tmdbId: item.tmdbId,
          name: item.name,
          poster: item.poster ?? null,
          backdrop: item.backdrop ?? null,
        }))

  const ratedByTmdbId = new Map((myReviews ?? []).filter(review => review.rating !== null).map(r => [r.tmdbId, r]))

  const libraryByTmdbId = new Map<
    number,
    { tmdbId: number; name: string; poster: string | null; backdrop: string | null; rating: number | null }
  >()

  for (const item of finishedItems)
    libraryByTmdbId.set(item.tmdbId, { ...item, rating: ratedByTmdbId.get(item.tmdbId)?.rating ?? null })

  // Rated titles the finished list does not carry (rated while watching, or never tracked).
  for (const review of ratedByTmdbId.values())
    if (!libraryByTmdbId.has(review.tmdbId))
      libraryByTmdbId.set(review.tmdbId, {
        tmdbId: review.tmdbId,
        name: review.name,
        poster: review.poster,
        backdrop: review.backdrop,
        rating: review.rating,
      })

  const libraryItems = [...libraryByTmdbId.values()].sort(
    (a, b) => (b.rating ?? -1) - (a.rating ?? -1) || a.name.localeCompare(b.name),
  )

  const filteredLibrary = libraryItems.filter(item =>
    ratingFilter === 'all' ? true : ratingFilter === 'unrated' ? item.rating === null : item.rating === ratingFilter,
  )

  // Disabled queries stay pending forever, so a signed-out visitor is never "loading".
  const isLoadingLibrary =
    !!isSignedIn && ((media === 'tv' ? tvSectionsLoading : movieSectionsLoading) || myReviewsLoading)

  return (
    <div className="screen-py flex w-full flex-col gap-8">
      <header className="screen-px flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">Profile</h1>

          <p className="mt-2 text-neutral-400">
            {user
              ? `Signed in as ${user.fullName || user.username || user.primaryEmailAddress?.emailAddress}`
              : isLoaded
                ? 'Sign in to view your stats'
                : '\u00A0'}
          </p>
        </div>

        {isLoaded && !user && (
          <SignInButton mode="modal">
            <Button>
              <FontAwesomeIcon icon={faSignIn} size="lg" />
              <span>Sign in</span>
            </Button>
          </SignInButton>
        )}
      </header>

      <section className="screen-px">
        <div className="grid w-full max-w-6xl grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4 xl:grid-cols-6">
          {user && media === 'tv' && (
            <>
              <StatCard
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
              <StatCard
                colorClassName="text-sky-500"
                value={
                  showStats ? (
                    showStats.averageShowRating !== null ? (
                      formatNumber(Math.round(showStats.averageShowRating * 10) / 10)
                    ) : (
                      '-'
                    )
                  ) : (
                    <FontAwesomeIcon icon={faSpinner} spin />
                  )
                }
                name="Average Rating"
              />
              <StatCard
                colorClassName="text-lime-500"
                value={showStats ? formatNumber(showStats.ratedShowsCount) : <FontAwesomeIcon icon={faSpinner} spin />}
                name="Rated Shows"
              />
              <StatCard
                colorClassName="text-amber-500"
                value={
                  showStats ? formatNumber(showStats.showUpvotesReceived) : <FontAwesomeIcon icon={faSpinner} spin />
                }
                name="Review Upvotes"
              />
            </>
          )}

          {user && media === 'movie' && (
            <>
              <StatCard
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
              <StatCard
                colorClassName="text-sky-500"
                value={
                  movieStats ? (
                    movieStats.averageMovieRating !== null ? (
                      formatNumber(Math.round(movieStats.averageMovieRating * 10) / 10)
                    ) : (
                      '-'
                    )
                  ) : (
                    <FontAwesomeIcon icon={faSpinner} spin />
                  )
                }
                name="Average Rating"
              />
              <StatCard
                colorClassName="text-lime-500"
                value={
                  movieStats ? formatNumber(movieStats.ratedMoviesCount) : <FontAwesomeIcon icon={faSpinner} spin />
                }
                name="Rated Movies"
              />
              <StatCard
                colorClassName="text-amber-500"
                value={
                  movieStats ? formatNumber(movieStats.movieUpvotesReceived) : <FontAwesomeIcon icon={faSpinner} spin />
                }
                name="Review Upvotes"
              />
            </>
          )}

          {!user && (
            <>
              <StatCard colorClassName="text-sky-500" value="-" name={media === 'tv' ? 'Show Time' : 'Movie Time'} />
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
              <StatCard colorClassName="text-sky-500" value="-" name="Average Rating" />
              <StatCard
                colorClassName="text-lime-500"
                value="-"
                name={media === 'tv' ? 'Rated Shows' : 'Rated Movies'}
              />
              <StatCard colorClassName="text-amber-500" value="-" name="Review Upvotes" />
            </>
          )}
        </div>
      </section>

      <div className="flex flex-col gap-6">
        {isLoadingLibrary &&
          [media === 'tv' ? 'Finished Shows' : 'Finished Movies', 'Your Reviews'].map((title, i) => (
            <Section sectionKey={`profile-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`} title={title} key={i}>
              {Array.from({ length: 10 }).map((_, index) => (
                <PosterCard key={index} isLoading />
              ))}
            </Section>
          ))}

        {!isLoadingLibrary && (
          <>
            <Section
              sectionKey={media === 'tv' ? 'profile-shows' : 'profile-movies'}
              title={media === 'tv' ? 'Finished Shows' : 'Finished Movies'}
              besidesTitle={<RatingFilterSelect value={ratingFilter} onChange={setRatingFilter} />}
            >
              {filteredLibrary.map(item => (
                <PosterCard
                  key={item.tmdbId}
                  id={item.tmdbId}
                  title={item.name}
                  media={media === 'tv' ? 'tv' : 'movie'}
                  imagePaths={[item.poster, item.backdrop]}
                  showRate
                />
              ))}

              {filteredLibrary.length === 0 && (
                <p className="pointer-events-none mt-2 font-semibold tracking-wide text-neutral-500">
                  {libraryItems.length === 0
                    ? media === 'tv'
                      ? 'Shows you finish or rate will appear here.'
                      : 'Movies you finish or rate will appear here.'
                    : ratingFilter === 'unrated'
                      ? 'Everything here is rated.'
                      : `Nothing rated ${ratingFilter} ★ yet.`}
                </p>
              )}
            </Section>

            <Section
              sectionKey={media === 'tv' ? 'profile-show-reviews' : 'profile-movie-reviews'}
              title={media === 'tv' ? 'Your Show Reviews' : 'Your Movie Reviews'}
            >
              {writtenReviews.map(review => (
                <ProfileReviewCard
                  key={review.id}
                  type={media === 'tv' ? 'tv' : 'movie'}
                  tmdbId={review.tmdbId}
                  title={review.name}
                  rating={review.rating}
                  content={review.content}
                  poster={review.poster}
                  backdrop={review.backdrop}
                  upvoteCount={review.upvoteCount}
                />
              ))}

              {writtenReviews.length === 0 && (
                <p className="pointer-events-none mt-2 font-semibold tracking-wide text-neutral-500">
                  Reviews you write will appear here.
                </p>
              )}
            </Section>
          </>
        )}
      </div>

      <AndroidWidgetSetup />
    </div>
  )
}
