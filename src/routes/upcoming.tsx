import { PosterCard } from '#/component/PosterCard'
import { Section } from '#/component/Section'
import { useMediaType } from '#/hooks/useMediaType'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/upcoming')({
  component: UpcomingPage,
})

function UpcomingPage() {
  const [mediaType] = useMediaType()

  return (
    <main className="flex w-full flex-col gap-8 p-4 md:p-8">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-5xl">Upcoming</h1>
        <p className="mt-2 text-neutral-400">See what's airing and releasing soon.</p>
      </header>

      {mediaType === 'tv' ? (
        <div className="flex flex-col gap-6">
          <Section title="This Week">
            <PosterCard id="11" title="Severance" isFollowed onToggleFollow={() => {}} />
            <PosterCard id="12" title="The White Lotus" isFollowed onToggleFollow={() => {}} />
          </Section>

          <Section title="Next Month">
            <PosterCard id="13" title="House of the Dragon" isFollowed onToggleFollow={() => {}} />
          </Section>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <Section title="Next Month">
            <PosterCard id="14" title="Dune: Part Three" isFollowed onToggleFollow={() => {}} />
            <PosterCard id="15" title="Spider-Man 4" isFollowed onToggleFollow={() => {}} />
          </Section>
        </div>
      )}
    </main>
  )
}
