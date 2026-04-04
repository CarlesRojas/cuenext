import { api } from '#/../convex/_generated/api'
import { PosterCard } from '#/component/PosterCard'
import { Section } from '#/component/Section'
import WatchEpisode from '#/component/WatchEpisode'
import WatchMovie from '#/component/WatchMovie'
import { useMediaType } from '#/hooks/useMediaType'
import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: App,
})

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
                <WatchEpisode key={item.tmdbId} episode={item} />
              ))}
            </Section>
          )}

          {tvSections && tvSections.haventStarted.length > 0 && (
            <Section title="Haven't started">
              {tvSections.haventStarted.map(item => (
                <WatchEpisode key={item.tmdbId} episode={item} />
              ))}
            </Section>
          )}

          {tvSections && tvSections.waitingForEpisodes.length > 0 && (
            <Section title="Waiting for episodes" defaultCollapsed>
              {tvSections.waitingForEpisodes.map(item => (
                <WatchEpisode key={item.tmdbId} episode={item} />
              ))}
            </Section>
          )}

          {tvSections && tvSections.stoppedWatching.length > 0 && (
            <Section title="Stopped watching" defaultCollapsed>
              {tvSections.stoppedWatching.map(item => (
                <WatchEpisode key={item.tmdbId} episode={item} />
              ))}
            </Section>
          )}

          {tvSections && tvSections.finished.length > 0 && (
            <Section title="Finished" defaultCollapsed>
              {tvSections.finished.map(item => (
                <WatchEpisode key={item.tmdbId} episode={item} />
              ))}
            </Section>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {movieSectionsLoading &&
            ['Watch next', ''].map((title, i) => (
              <Section title={title} key={i} defaultCollapsed={title === 'Finished'}>
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
            <Section title="Finished" defaultCollapsed>
              {movieSections.finished.map(item => (
                <WatchMovie key={item.tmdbId} movie={item} />
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  )
}
