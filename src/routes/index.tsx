import { PosterCard } from '#/component/PosterCard'
import { Section } from '#/component/Section'
import { useMediaType } from '#/hooks/useMediaType'
import { useUndoToast } from '#/hooks/useUndoToast'
import { getTmdbImageUrl } from '#/lib/tmdbImage'
import { convexAction, convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { api } from 'convex/_generated/api'
import { useMutation } from 'convex/react'

export const Route = createFileRoute('/')({
  component: App,
})

function WatchlistTvItem({ item }: { item: { tmdbId: number; nextSeasonNumber: number; nextEpisodeNumber: number } }) {
  const { showUndoToast } = useUndoToast()
  const { data: show, isPending } = useQuery(convexAction(api.tmdb.getShowDetails, { tmdbId: item.tmdbId }))
  const { data: season } = useQuery({
    ...convexAction(api.tmdb.getShowSeasonDetails, { tmdbId: item.tmdbId, seasonNumber: item.nextSeasonNumber }),
    enabled: !!show,
  })

  const { data: isWatched } = useQuery({
    ...convexQuery(api.progress.checkEpisodeWatched, {
      showTmdbId: item.tmdbId,
      seasonNumber: item.nextSeasonNumber,
      episodeNumber: item.nextEpisodeNumber,
    }),
  })

  const markEpisodeWatched = useMutation(api.progress.markEpisodeWatched)
  const unmarkEpisodeWatched = useMutation(api.progress.unmarkEpisodeWatched)

  if (isPending) return <PosterCard isLoading />
  if (!show) return null

  const handleToggleWatch = () => {
    let nextS = item.nextSeasonNumber
    let nextE = item.nextEpisodeNumber + 1

    if (season && season.episodes) {
      if (item.nextEpisodeNumber >= season.episodes.length) {
        nextS += 1
        nextE = 1
      }
    }

    if (isWatched) {
      unmarkEpisodeWatched({
        showTmdbId: show.id,
        seasonNumber: item.nextSeasonNumber,
        episodeNumber: item.nextEpisodeNumber,
      })

      showUndoToast(`Episode ${item.nextEpisodeNumber}`, 'unwatch', `unwatch-tv-${show.id}`, () => {
        markEpisodeWatched({
          showTmdbId: show.id,
          seasonNumber: item.nextSeasonNumber,
          episodeNumber: item.nextEpisodeNumber,
          nextSeasonNumber: nextS,
          nextEpisodeNumber: nextE,
        })
      })
    } else {
      markEpisodeWatched({
        showTmdbId: show.id,
        seasonNumber: item.nextSeasonNumber,
        episodeNumber: item.nextEpisodeNumber,
        nextSeasonNumber: nextS,
        nextEpisodeNumber: nextE,
      })

      showUndoToast(`Episode ${item.nextEpisodeNumber}`, 'watch', `watch-tv-${show.id}`, () => {
        unmarkEpisodeWatched({
          showTmdbId: show.id,
          seasonNumber: item.nextSeasonNumber,
          episodeNumber: item.nextEpisodeNumber,
        })
      })
    }
  }

  return (
    <PosterCard
      id={show.id}
      title={show.name}
      mediaType="tv"
      imageUrl={getTmdbImageUrl(show.poster_path, 'w342') || undefined}
      showWatch
      isWatched={isWatched}
      onToggleWatch={handleToggleWatch}
      watchButtonText={`S${item.nextSeasonNumber}, E${item.nextEpisodeNumber}`}
    />
  )
}

function WatchlistMovieItem({ tmdbId }: { tmdbId: number }) {
  const { showUndoToast } = useUndoToast()
  const { data: movie, isPending } = useQuery(convexAction(api.tmdb.getMovieDetails, { tmdbId }))
  const { data: isWatched } = useQuery(convexQuery(api.progress.checkMovieWatched, { tmdbId }))
  const markMovieWatched = useMutation(api.progress.markMovieWatched)
  const unmarkMovieWatched = useMutation(api.progress.unmarkMovieWatched)

  if (isPending) return <PosterCard isLoading />
  if (!movie) return null

  const handleToggleWatch = () => {
    if (isWatched) {
      unmarkMovieWatched({ tmdbId: movie.id })
      showUndoToast(movie.title, 'unwatch', `unwatch-movie-${movie.id}`, () => {
        markMovieWatched({ tmdbId: movie.id })
      })
    } else {
      markMovieWatched({ tmdbId: movie.id })
      showUndoToast(movie.title, 'watch', `watch-movie-${movie.id}`, () => {
        unmarkMovieWatched({ tmdbId: movie.id })
      })
    }
  }

  return (
    <PosterCard
      id={movie.id}
      title={movie.title}
      mediaType="movie"
      imageUrl={getTmdbImageUrl(movie.poster_path, 'w342') || undefined}
      showWatch
      isWatched={isWatched}
      onToggleWatch={handleToggleWatch}
    />
  )
}

function App() {
  const [mediaType] = useMediaType()

  const { data: tvSections, isPending: tvSectionsLoading } = useQuery({
    ...convexQuery(api.watchlist.getTvSections, {}),
    enabled: mediaType === 'tv',
  })

  const { data: movieSections, isPending: movieSectionsLoading } = useQuery({
    ...convexQuery(api.watchlist.getMovieSections, {}),
    enabled: mediaType === 'movie',
  })

  return (
    <div className="screen-py flex w-full flex-col gap-2">
      <header className="screen-px mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">Watchlist</h1>
      </header>

      {mediaType === 'tv' ? (
        <div className="flex flex-col gap-6">
          {(tvSectionsLoading || (tvSections && tvSections.watchNext.length > 0)) && (
            <Section title="Watch next">
              {tvSections && tvSections.watchNext.map(item => <WatchlistTvItem key={item.tmdbId} item={item} />)}

              {tvSectionsLoading && Array.from({ length: 10 }).map((_, i) => <PosterCard key={i} isLoading />)}
            </Section>
          )}

          {(tvSectionsLoading || (tvSections && tvSections.haventStarted.length > 0)) && (
            <Section title="Haven't started">
              {tvSections && tvSections.haventStarted.map(item => <WatchlistTvItem key={item.tmdbId} item={item} />)}

              {tvSectionsLoading && Array.from({ length: 10 }).map((_, i) => <PosterCard key={i} isLoading />)}
            </Section>
          )}

          {(tvSectionsLoading || (tvSections && tvSections.stoppedWatching.length > 0)) && (
            <Section title="Stopped watching" defaultCollapsed>
              {tvSections && tvSections.stoppedWatching.map(item => <WatchlistTvItem key={item.tmdbId} item={item} />)}

              {tvSectionsLoading && Array.from({ length: 10 }).map((_, i) => <PosterCard key={i} isLoading />)}
            </Section>
          )}

          {(tvSectionsLoading || (tvSections && tvSections.finished.length > 0)) && (
            <Section title="Finished" defaultCollapsed>
              {tvSections && tvSections.finished.map(item => <WatchlistTvItem key={item.tmdbId} item={item} />)}

              {tvSectionsLoading && Array.from({ length: 10 }).map((_, i) => <PosterCard key={i} isLoading />)}
            </Section>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {(movieSectionsLoading || (movieSections && movieSections.watchNext.length > 0)) && (
            <Section title="Watch next">
              {movieSections &&
                movieSections.watchNext.map(item => <WatchlistMovieItem key={item.tmdbId} tmdbId={item.tmdbId} />)}

              {movieSectionsLoading && Array.from({ length: 10 }).map((_, i) => <PosterCard key={i} isLoading />)}
            </Section>
          )}

          {(movieSectionsLoading || (movieSections && movieSections.finished.length > 0)) && (
            <Section title="Finished" defaultCollapsed>
              {movieSections &&
                movieSections.finished.map(item => <WatchlistMovieItem key={item.tmdbId} tmdbId={item.tmdbId} />)}

              {movieSectionsLoading && Array.from({ length: 10 }).map((_, i) => <PosterCard key={i} isLoading />)}
            </Section>
          )}
        </div>
      )}
    </div>
  )
}
