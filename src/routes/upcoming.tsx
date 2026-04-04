import { useMediaType } from '#/hooks/useMediaType'
import { useViewportHeight } from '#/hooks/useViewportHeight'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/upcoming')({
  component: UpcomingPage,
})

function UpcomingPage() {
  const [mediaType] = useMediaType()
  const { visualHeight, fullHeight, isKeyboardOpen } = useViewportHeight()

  return (
    <div className="screen-py flex w-full flex-col gap-2">
      <header className="screen-px mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">Upcoming</h1>

        <div className="mt-4 rounded-lg bg-neutral-800 p-3 text-sm text-neutral-300">
          <div className="font-semibold text-white">Viewport Debug:</div>
          <div>Visual Height: {visualHeight}px</div>
          <div>Full Height: {fullHeight}px</div>
          <div>Keyboard Height: {fullHeight - visualHeight}px</div>
          <div className={isKeyboardOpen ? 'text-yellow-400' : 'text-green-400'}>
            Keyboard: {isKeyboardOpen ? 'OPEN' : 'CLOSED'}
          </div>
        </div>
      </header>

      {/* {mediaType === 'tv' ? (
        <div className="flex flex-col gap-6">
          <Section title="This Week">
            <PosterCard mediaType={mediaType} id={11} title="Severance" isFollowed onToggleFollow={() => {}} />
            <PosterCard mediaType={mediaType} id={12} title="The White Lotus" isFollowed onToggleFollow={() => {}} />
          </Section>

          <Section title="Next Month">
            <PosterCard
              mediaType={mediaType}
              id={13}
              title="House of the Dragon"
              isFollowed
              onToggleFollow={() => {}}
            />
          </Section>
        </div>
      ) : (
        <Section title="Next Month">
          <PosterCard mediaType={mediaType} id={14} title="Dune: Part Three" isFollowed onToggleFollow={() => {}} />
          <PosterCard mediaType={mediaType} id={15} title="Spider-Man 4" isFollowed onToggleFollow={() => {}} />
        </Section>
      )} */}
    </div>
  )
}
