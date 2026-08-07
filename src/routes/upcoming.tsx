import { api } from '#/../convex/_generated/api'
import { InfiniteMediaList } from '#/component/InfiniteMediaList'
import RowCard from '#/component/RowCard'
import { Button } from '#/component/ui/button'
import UpcomingEpisode from '#/component/UpcomingEpisode'
import UpcomingMovie from '#/component/UpcomingMovie'
import useSearchParams from '#/hooks/useSearchParams'
import { UrlParamsSchema } from '#/type/url'
import { SignInButton, useAuth } from '@clerk/tanstack-react-start'
import { faSignIn } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { createFileRoute } from '@tanstack/react-router'
import { useAction } from 'convex/react'

export const Route = createFileRoute('/upcoming')({
  component: UpcomingPage,
  validateSearch: UrlParamsSchema,
})

function UpcomingPage() {
  const { media } = useSearchParams()
  const { isLoaded, isSignedIn } = useAuth()

  // These two stay Convex actions: they start from the signed-in user's watchlist, so unlike
  // the rest of the TMDB reads they cannot be served from a shared public cache.
  const getUpcomingMovies = useAction(api.tmdb.getUpcomingMovies)
  const getUpcomingTv = useAction(api.tmdb.getUpcomingTv)

  return (
    <div className="screen-py flex w-full flex-col gap-2">
      <header className="screen-px mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">Upcoming</h1>
      </header>

      {isLoaded && !isSignedIn && (
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

      <div className="screen-px">
        {isSignedIn && (
          <div className="page-width">
            {media === 'movie' && (
              <InfiniteMediaList
                queryKey={['upcoming', 'movie']}
                fetchPage={page => getUpcomingMovies({ page })}
                Component={UpcomingMovie}
                LoadingComponent={<RowCard isLoading />}
                emptyMessage="No upcoming movies found in your watchlist"
                errorMessage="Failed to load upcoming movies."
                groupBy={movie => new Date(movie.airDate)}
                showTotalResults={false}
              />
            )}

            {media === 'tv' && (
              <InfiniteMediaList
                queryKey={['upcoming', 'tv']}
                fetchPage={page => getUpcomingTv({ page })}
                Component={UpcomingEpisode}
                LoadingComponent={<RowCard isLoading />}
                emptyMessage="No upcoming TV episodes found in your watchlist"
                errorMessage="Failed to load upcoming TV episodes."
                groupBy={episode => new Date(episode.airDate)}
                showTotalResults={false}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
