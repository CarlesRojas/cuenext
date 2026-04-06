import { api } from '#/../convex/_generated/api'
import { InfiniteMediaList } from '#/component/InfiniteMediaList'
import RowCard from '#/component/RowCard'
import { Button } from '#/component/ui/button'
import UpcomingEpisode from '#/component/UpcomingEpisode'
import UpcomingMovie from '#/component/UpcomingMovie'
import { useMediaType } from '#/hooks/useMediaType'
import { UrlParamsSchema } from '#/type/url'
import { SignInButton, useClerk } from '@clerk/tanstack-react-start'
import { faSignIn } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/upcoming')({
  component: UpcomingPage,
  validateSearch: UrlParamsSchema,
})

function UpcomingPage() {
  const [mediaType] = useMediaType()
  const clerk = useClerk()

  return (
    <div className="screen-py flex w-full flex-col gap-2">
      <header className="screen-px mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">Upcoming</h1>
      </header>

      {!clerk.isSignedIn && (
        <div className="screen-px mb-8 flex flex-col gap-4">
          <span className="font-semibold tracking-wide text-neutral-500">
            Sign in to view upcoming movies and TV episodes
          </span>

          <SignInButton mode="modal">
            <Button>
              <FontAwesomeIcon icon={faSignIn} className="mr-2" />
              <span>Sign in</span>
            </Button>
          </SignInButton>
        </div>
      )}

      <div className="screen-px">
        {clerk.isSignedIn && (
          <div className="page-width mx-[unset]">
            {mediaType === 'movie' && (
              <InfiniteMediaList
                action={api.tmdb.getUpcomingMovies}
                actionKey="upcoming-movies"
                params={{}}
                Component={UpcomingMovie}
                LoadingComponent={<RowCard isLoading />}
                emptyMessage="No upcoming movies found in your watchlist"
                errorMessage="Failed to load upcoming movies."
                groupBy={movie => new Date(movie.airDate)}
                showTotalResults={false}
              />
            )}

            {mediaType === 'tv' && (
              <InfiniteMediaList
                action={api.tmdb.getUpcomingTv}
                actionKey="upcoming-tv"
                params={{}}
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
