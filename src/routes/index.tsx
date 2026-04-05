import { api } from '#/../convex/_generated/api'
import { PosterCard } from '#/component/PosterCard'
import { Section } from '#/component/Section'
import { Button } from '#/component/ui/button'
import WatchEpisode from '#/component/WatchEpisode'
import WatchMovie from '#/component/WatchMovie'
import { useMediaType } from '#/hooks/useMediaType'
import { getTmdbImageUrl } from '#/lib/tmdbImage'
import { UrlParams } from '#/type/url'
import { SignInButton, useClerk } from '@clerk/tanstack-react-start'
import { convexQuery } from '@convex-dev/react-query'
import { faSignIn } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: App,
  validateSearch: UrlParams,
})

function App() {
  const clerk = useClerk()
  const [mediaType] = useMediaType()

  const { data: tvSections, isPending: tvSectionsLoading } = useQuery({
    ...convexQuery(api.watchlist.getTvSections, {}),
    enabled: mediaType === 'tv' && clerk.isSignedIn,
  })

  const { data: movieSections, isPending: movieSectionsLoading } = useQuery({
    ...convexQuery(api.watchlist.getMovieSections, {}),
    enabled: mediaType === 'movie' && clerk.isSignedIn,
  })

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
              <FontAwesomeIcon icon={faSignIn} className="mr-2" />
              <span>Sign in</span>
            </Button>
          </SignInButton>
        </div>
      )}

      {mediaType === 'tv' ? (
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
            <Section title="Waiting for episodes" defaultCollapsed>
              {tvSections.waitingForEpisodes.map(item => (
                <PosterCard
                  key={item.id}
                  id={item.tmdbId}
                  title={item.name}
                  mediaType="tv"
                  imageUrl={getTmdbImageUrl(item.poster, 'w342') || getTmdbImageUrl(item.poster, 'original')}
                />
              ))}
            </Section>
          )}

          {tvSections && tvSections.stoppedWatching.length > 0 && (
            <Section title="Stopped watching" defaultCollapsed>
              {tvSections.stoppedWatching.map(item => (
                <WatchEpisode key={item.id} episode={item} />
              ))}
            </Section>
          )}

          {tvSections && tvSections.finished.length > 0 && (
            <Section title="Finished" defaultCollapsed>
              {tvSections.finished.map(item => (
                <PosterCard
                  key={item.id}
                  id={item.tmdbId}
                  title={item.name}
                  mediaType="tv"
                  imageUrl={getTmdbImageUrl(item.poster, 'w342') || getTmdbImageUrl(item.poster, 'original')}
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

          {movieSections && movieSections.watchNext.length > 0 && (
            <Section title="Watch next">
              {movieSections.watchNext.map(item => (
                <WatchMovie key={item.tmdbId} movie={item} />
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
                  mediaType="movie"
                  imageUrl={getTmdbImageUrl(item.poster, 'w342') || getTmdbImageUrl(item.poster, 'original')}
                />
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  )
}
