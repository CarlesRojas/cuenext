import { PosterCard } from '#/component/PosterCard'
import { Section } from '#/component/Section'
import { useMediaType } from '#/hooks/useMediaType'
import { SignOutButton, useUser } from '@clerk/tanstack-react-start'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/profile')({
  component: ProfilePage,
})

function ProfilePage() {
  const [mediaType] = useMediaType()
  const { user } = useUser()

  return (
    <div className="screen-py flex w-full flex-col gap-2">
      <header className="screen-px mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">Profile</h1>
          <p className="mt-2 text-neutral-400">
            {user
              ? `Signed in as ${user.fullName || user.username || user.primaryEmailAddress?.emailAddress}`
              : 'Your stats and history.'}
          </p>
        </div>

        {user && (
          <SignOutButton>
            <button className="w-fit rounded-full bg-neutral-800 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-neutral-700">
              Sign out
            </button>
          </SignOutButton>
        )}
      </header>

      <section className="screen-px grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="flex flex-col rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
          <span className="text-3xl font-bold text-white">42</span>
          <span className="text-sm font-medium text-neutral-500">Shows Finished</span>
        </div>
        <div className="flex flex-col rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
          <span className="text-3xl font-bold text-white">128</span>
          <span className="text-sm font-medium text-neutral-500">Movies Watched</span>
        </div>
        <div className="flex flex-col rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
          <span className="text-3xl font-bold text-white">1,337</span>
          <span className="text-sm font-medium text-neutral-500">Episodes Watched</span>
        </div>
        <div className="flex flex-col rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
          <span className="text-3xl font-bold text-white">2.5k</span>
          <span className="text-sm font-medium text-neutral-500">Hours Watched</span>
        </div>
      </section>

      {mediaType === 'tv' ? (
        <Section title="Finished Shows">
          <PosterCard mediaType={mediaType} id="21" title="Breaking Bad" isFollowed onToggleFollow={() => {}} />
          <PosterCard mediaType={mediaType} id="22" title="Better Call Saul" isFollowed onToggleFollow={() => {}} />
        </Section>
      ) : (
        <Section title="Watched Movies">
          <PosterCard mediaType={mediaType} id="23" title="The Matrix" isFollowed onToggleFollow={() => {}} />
          <PosterCard mediaType={mediaType} id="24" title="Inception" isFollowed onToggleFollow={() => {}} />
        </Section>
      )}
    </div>
  )
}
