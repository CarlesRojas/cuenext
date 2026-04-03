import { Button } from '#/component/ui/button'
import { SignInButton, UserButton } from '@clerk/tanstack-react-start'
import { faSignIn } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Authenticated, Unauthenticated } from 'convex/react'

interface UserProps {
  isMobile?: boolean
}

export function User({ isMobile }: UserProps) {
  return (
    <>
      <Authenticated>
        <UserButton
          showName={!isMobile}
          appearance={{
            options: { shimmer: false },
            elements: isMobile
              ? { avatarBox: '!size-11' }
              : {
                  rootBox: '!w-full',
                  userButtonTrigger: '!w-full !shadow-none !rounded-full hover:!bg-neutral-400/10',
                  userButtonBox: '!w-full !flex-row-reverse !justify-end !gap-3 !p-1.5 ',
                  avatarBox: '!size-8',
                  userButtonOuterIdentifier: '!text-base !font-semibold !text-white !m-0 !p-0',
                },
          }}
        />
      </Authenticated>

      <Unauthenticated>
        <SignInButton mode="modal">
          <Button size={isMobile ? 'default' : 'full'}>
            <FontAwesomeIcon icon={faSignIn} size="xl" className="h-5 max-h-5 min-h-5" />
            <span>Sign In</span>
          </Button>
        </SignInButton>
      </Unauthenticated>
    </>
  )
}
