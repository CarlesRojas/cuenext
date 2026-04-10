import { Button } from '#/component/ui/button'
import { SignInButton, UserButton } from '@clerk/tanstack-react-start'
import { faSignIn } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Authenticated, Unauthenticated } from 'convex/react'

interface UserProps {
  isMobile?: boolean
  isExpanded?: boolean
}

export function User({ isMobile, isExpanded }: UserProps) {
  return (
    <>
      <Authenticated>
        <UserButton
          showName={!isMobile}
          appearance={{
            options: { shimmer: false },
            elements: isMobile
              ? { avatarBox: '!size-11' }
              : isExpanded
                ? {
                    rootBox: '!w-full',
                    userButtonTrigger: '!w-full !shadow-none !rounded-full hover:!bg-neutral-400/10',
                    userButtonBox: '!w-full !flex-row-reverse !justify-end !gap-0 p-1!',
                    avatarBox: '!size-9',
                    userButtonOuterIdentifier:
                      '!text-base !font-semibold !text-white pl-3! !m-0 !p-0 w-full! max-w-full! !text-left opacity-100! transition-[max-width,opacity]! duration-slow! text-nowrap!',
                  }
                : {
                    rootBox: '!w-full',
                    userButtonTrigger: '!w-full !shadow-none !rounded-full hover:!bg-neutral-400/10',
                    userButtonBox:
                      '!w-full !flex-row-reverse !justify-end !gap-0 p-1! transition-[gap]! duration-slow!',
                    avatarBox: '!size-9',
                    userButtonOuterIdentifier:
                      '!text-base !font-semibold !text-white pl-3! !m-0 !p-0 w-full! max-w-0! !text-left opacity-0! transition-[max-width,opacity]! duration-slow! overflow-hidden! text-nowrap!',
                  },
          }}
        />
      </Authenticated>

      <Unauthenticated>
        <SignInButton mode="modal">
          <Button size={isMobile ? 'default' : isExpanded ? 'icon' : 'full'}>
            <FontAwesomeIcon icon={faSignIn} size="xl" className="h-5 max-h-5 min-h-5" />
            {(isMobile || !isExpanded) && <span>Sign In</span>}
          </Button>
        </SignInButton>
      </Unauthenticated>
    </>
  )
}
