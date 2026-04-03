import { PosterCard } from '#/component/PosterCard'
import { Section } from '#/component/Section'
import { useMediaType } from '#/hooks/useMediaType'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  const [mediaType] = useMediaType()

  return (
    <div className="screen-py flex w-full flex-col gap-2">
      <header className="screen-px mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">Watchlist</h1>
      </header>

      {mediaType === 'tv' ? (
        <div className="flex flex-col gap-6">
          <Section title="Watch next">
            <PosterCard
              id="1"
              title="Stranger Things"
              isFollowed
              onToggleFollow={() => {}}
              onToggleWatch={() => {}}
              mediaType={'tv'}
            />
            <PosterCard
              id="2"
              title="The Last of Us"
              isFollowed
              onToggleFollow={() => {}}
              onToggleWatch={() => {}}
              mediaType={'tv'}
            />
          </Section>

          <Section title="Haven't started">
            <div className="flex w-full items-center justify-center p-8 text-neutral-500">
              No shows haven't been started.
            </div>
          </Section>

          <Section title="Stopped watching" defaultCollapsed>
            <div className="flex w-full items-center justify-center p-8 text-neutral-500">No stopped shows.</div>
          </Section>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <Section title="Watch next">
            <div className="flex w-full items-center justify-center p-8 text-neutral-500">No movies to watch next.</div>
          </Section>
        </div>
      )}
    </div>
  )
}
