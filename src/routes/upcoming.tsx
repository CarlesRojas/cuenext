import { api } from '#/../convex/_generated/api'
import { InfiniteMediaList } from '#/component/InfiniteMediaList'
import RowCard from '#/component/RowCard'
import UpcomingEpisode from '#/component/UpcomingEpisode'
import UpcomingMovie from '#/component/UpcomingMovie'
import { useMediaType } from '#/hooks/useMediaType'
import { UrlParams } from '#/type/url'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/upcoming')({
  component: UpcomingPage,
  validateSearch: UrlParams,
})

function UpcomingPage() {
  const [mediaType] = useMediaType()

  return (
    <div className="screen-py flex w-full flex-col gap-2">
      <header className="screen-px mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">Upcoming</h1>
      </header>

      <div className="screen-px">
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
            />
          )}
        </div>
      </div>
    </div>
  )
}
