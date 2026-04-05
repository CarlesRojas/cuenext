import { PosterCard } from '#/component/PosterCard'
import { Section } from '#/component/Section'
import { Button } from '#/component/ui/button'
import { useMediaType } from '#/hooks/useMediaType'
import { UrlParams } from '#/type/url'
import { SignInButton, useUser } from '@clerk/tanstack-react-start'
import { faSignIn } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/profile')({
  component: ProfilePage,
  validateSearch: UrlParams,
})

function ProfilePage() {
  const [mediaType] = useMediaType()
  const { user } = useUser()

  return (
    <div className="screen-py flex w-full flex-col gap-2">
      <header className="screen-px mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">Profile</h1>

          <p className="mt-2 text-neutral-400">
            {user
              ? `Signed in as ${user.fullName || user.username || user.primaryEmailAddress?.emailAddress}`
              : 'Sign in to view your stats'}
          </p>
        </div>

        {!user && (
          <SignInButton mode="modal">
            <Button>
              <FontAwesomeIcon icon={faSignIn} className="mr-2" />
              <span>Sign in</span>
            </Button>
          </SignInButton>
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
          <PosterCard mediaType={mediaType} id={21} title="Breaking Bad" isFollowed onToggleFollow={() => {}} />
          <PosterCard mediaType={mediaType} id={22} title="Better Call Saul" isFollowed onToggleFollow={() => {}} />
        </Section>
      ) : (
        <Section title="Watched Movies">
          <PosterCard mediaType={mediaType} id={23} title="The Matrix" isFollowed onToggleFollow={() => {}} />
          <PosterCard mediaType={mediaType} id={24} title="Inception" isFollowed onToggleFollow={() => {}} />
        </Section>
      )}
    </div>
  )
}
