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
    <div className="screen-py flex w-full flex-col gap-2">
      <header className="screen-px mb-10">
        <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">Upcoming</h1>
      </header>

      {mediaType === 'tv' ? (
        <div className="flex flex-col gap-6">
          <Section title="This Week">
            <PosterCard mediaType={mediaType} id="11" title="Severance" isFollowed onToggleFollow={() => {}} />
            <PosterCard mediaType={mediaType} id="12" title="The White Lotus" isFollowed onToggleFollow={() => {}} />
          </Section>

          <Section title="Next Month">
            <PosterCard
              mediaType={mediaType}
              id="13"
              title="House of the Dragon"
              isFollowed
              onToggleFollow={() => {}}
            />
          </Section>
        </div>
      ) : (
        <Section title="Next Month">
          <PosterCard mediaType={mediaType} id="14" title="Dune: Part Three" isFollowed onToggleFollow={() => {}} />
          <PosterCard mediaType={mediaType} id="15" title="Spider-Man 4" isFollowed onToggleFollow={() => {}} />
        </Section>
      )}
    </div>
  )
}
