import { api } from '#/../convex/_generated/api'
import { PosterCard } from '#/component/PosterCard'
import { Section } from '#/component/Section'
import { Button } from '#/component/ui/button'
import WatchEpisode from '#/component/WatchEpisode'
import WatchMovie from '#/component/WatchMovie'
import useCheckForNewEpisodes from '#/hooks/useCheckForNewEpisodes'
import useSearchParams from '#/hooks/useSearchParams'
import { UrlParamsSchema } from '#/type/url'
import { SignInButton, useClerk } from '@clerk/tanstack-react-start'
import { convexQuery } from '@convex-dev/react-query'
import { faCalendarDays, faCompass, faSignIn } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: App,
  validateSearch: UrlParamsSchema,
})

function App() {
  const clerk = useClerk()
  const { media } = useSearchParams()

  const { data: tvSections, isPending: tvSectionsLoading } = useQuery({
    ...convexQuery(api.watchlist.getTvSections, {}),
    enabled: media === 'tv' && clerk.isSignedIn,
  })

  const { data: movieSections, isPending: movieSectionsLoading } = useQuery({
    ...convexQuery(api.watchlist.getMovieSections, {}),
    enabled: media === 'movie' && clerk.isSignedIn,
  })

  useCheckForNewEpisodes({ waitingForEpisodes: tvSections?.waitingForEpisodes })

  return (
    <div className="screen-py flex w-full flex-col gap-2">
      <header className="screen-px mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">Watchlist</h1>
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

      {media === 'tv' ? (
        <div className="flex flex-col gap-6">
          {tvSectionsLoading &&
            ['Watch next', "Haven't started", 'Waiting for episodes', 'Stopped watching', 'Finished'].map(
              (title, i) => (
                <Section title={title} key={i} defaultCollapsed={!['Watch next', "Haven't started"].includes(title)}>
                  {Array.from({ length: 10 }).map((_, epispdeIndex) => (
                    <PosterCard key={epispdeIndex} isLoading />
                  ))}
                </Section>
              ),
            )}

          {tvSections && Object.values(tvSections).every(section => section.length === 0) && (
            <div className="screen-px mb-8 flex flex-col gap-4">
              <span className="font-semibold tracking-wide text-neutral-500">
                Your tracked TV shows will appear here. Start by finding them here:
              </span>

              <SignInButton mode="modal">
                <Button asChild>
                  <Link to="/discover" search={{ media: 'tv' }}>
                    <FontAwesomeIcon icon={faCompass} size="lg" />
                    <span>Find TV Shows</span>
                  </Link>
                </Button>
              </SignInButton>
            </div>
          )}

          {tvSections && tvSections.watchNext.length > 0 && (
            <Section title="Watch next">
              {tvSections.watchNext.map(item => (
                <WatchEpisode key={item.id} episode={item} />
              ))}
            </Section>
          )}

          {tvSections && tvSections.haventStarted.length > 0 && (
            <Section title="Haven't started">
              {tvSections.haventStarted.map(item => (
                <WatchEpisode key={item.id} episode={item} />
              ))}
            </Section>
          )}

          {tvSections && tvSections.waitingForEpisodes.length > 0 && (
            <Section
              title="Waiting for episodes"
              below={
                <Button variant="secondary" asChild>
                  <Link to="/upcoming" search={{ media: 'tv' }}>
                    <FontAwesomeIcon icon={faCalendarDays} className="size-4" />
                    <span>View release dates</span>
                  </Link>
                </Button>
              }
            >
              {tvSections.waitingForEpisodes.map(item => (
                <PosterCard
                  key={item.id}
                  id={item.showTmdbId}
                  title={item.name}
                  media="tv"
                  imagePaths={[item.poster, item.backdrop]}
                />
              ))}
            </Section>
          )}

          {tvSections && tvSections.stoppedWatching.length > 0 && (
            <Section title="Stopped watching" defaultCollapsed>
              {tvSections.stoppedWatching.map(item => {
                const hasEpisodesToWatch = item.episodeNumber >= 0 && item.seasonNumber >= 0
                if (hasEpisodesToWatch) return <WatchEpisode key={item.id} episode={item} />

                return (
                  <PosterCard
                    key={item.id}
                    id={item.showTmdbId}
                    title={item.name}
                    media="tv"
                    imagePaths={[item.poster, item.backdrop]}
                    progressPercentage={item.watchedPercentage}
                  />
                )
              })}
            </Section>
          )}

          {tvSections && tvSections.finished.length > 0 && (
            <Section title="Finished" defaultCollapsed>
              {tvSections.finished.map(item => (
                <PosterCard
                  key={item.id}
                  id={item.showTmdbId}
                  title={item.name}
                  media="tv"
                  imagePaths={[item.poster, item.backdrop]}
                />
              ))}
            </Section>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {movieSectionsLoading &&
            ['Watch next', ''].map((title, i) => (
              <Section title={title} key={i}>
                {Array.from({ length: 10 }).map((_, epispdeIndex) => (
                  <PosterCard key={epispdeIndex} isLoading />
                ))}
              </Section>
            ))}

          {movieSections && Object.values(movieSections).every(section => section.length === 0) && (
            <div className="screen-px mb-8 flex flex-col gap-4">
              <span className="font-semibold tracking-wide text-neutral-500">
                Your tracked movies will appear here. Start by finding them here:
              </span>

              <SignInButton mode="modal">
                <Button asChild>
                  <Link to="/discover" search={{ media: 'movie' }}>
                    <FontAwesomeIcon icon={faCompass} size="lg" />
                    <span>Find Movies</span>
                  </Link>
                </Button>
              </SignInButton>
            </div>
          )}

          {movieSections && movieSections.watchNext.length > 0 && (
            <Section title="Watch next">
              {movieSections.watchNext.map(item => (
                <WatchMovie key={item.tmdbId} movie={item} />
              ))}
            </Section>
          )}

          {movieSections && movieSections.unreleased.length > 0 && (
            <Section
              title="Not released yet"
              below={
                <Button variant="secondary" asChild>
                  <Link to="/upcoming" search={{ media: 'movie' }}>
                    <FontAwesomeIcon icon={faCalendarDays} className="size-4" />
                    <span>View release dates</span>
                  </Link>
                </Button>
              }
            >
              {movieSections.unreleased.map(item => (
                <PosterCard
                  key={item.tmdbId}
                  id={item.tmdbId}
                  title={item.name}
                  media="movie"
                  imagePaths={[item.poster, item.backdrop]}
                />
              ))}
            </Section>
          )}

          {movieSections && movieSections.finished.length > 0 && (
            <Section title="Finished">
              {movieSections.finished.map(item => (
                <PosterCard
                  key={item.tmdbId}
                  id={item.tmdbId}
                  title={item.name}
                  media="movie"
                  imagePaths={[item.poster, item.backdrop]}
                />
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  )
}
