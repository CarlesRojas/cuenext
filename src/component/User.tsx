import { Button } from '#/component/ui/button'
import { useUserDataTransfer } from '#/hooks/useUserDataTransfer'
import { cn } from '#/lib/cn'
import { SignInButton, UserButton, useClerk } from '@clerk/tanstack-react-start'
import { faGear, faRightFromBracket, faRightToBracket, faSignIn } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Authenticated, Unauthenticated, useConvexAuth } from 'convex/react'

interface UserProps {
  isMobile?: boolean
  isExpanded?: boolean
}

// Clerk's default popover entries can't have their icons replaced, so they are hidden and
// recreated as custom actions with our own icons (see the MenuItems below).
const hiddenDefaultMenuItems = {
  userButtonPopoverActionButton__manageAccount: 'hidden!',
  userButtonPopoverActionButton__signOut: 'hidden!',
}

export function User({ isMobile, isExpanded }: UserProps) {
  const { isLoading } = useConvexAuth()
  const { exportUserData, importUserData } = useUserDataTransfer()
  const clerk = useClerk()

  if (isLoading) return null

  return (
    <>
      <Authenticated>
        <UserButton
          showName={!isMobile}
          appearance={{
            options: { shimmer: false },
            elements: isMobile
              ? { avatarBox: '!size-11', ...hiddenDefaultMenuItems }
              : isExpanded
                ? {
                    ...hiddenDefaultMenuItems,
                    rootBox: 'w-full! max-w-full! overflow-hidden!',
                    userButtonTrigger:
                      '!w-full !shadow-none !rounded-full hover:!bg-neutral-400/10 focus-visible:!bg-neutral-400/10',
                    userButtonBox: '!w-full !flex-row-reverse !justify-end !gap-0 p-1!',
                    avatarBox: '!size-9',
                    userButtonOuterIdentifier:
                      '!text-base !font-semibold !text-white pl-3! pr-2! !m-0 !p-0 w-full! max-w-full! !text-left opacity-100! transition-[max-width,opacity]! duration-slow! text-nowrap! overflow-hidden! text-ellipsis!',
                  }
                : {
                    ...hiddenDefaultMenuItems,
                    rootBox: 'w-full! max-w-full! overflow-hidden!',
                    userButtonTrigger:
                      '!w-full !shadow-none !rounded-full hover:!bg-neutral-400/10 focus-visible:!bg-neutral-400/10',
                    userButtonBox:
                      '!w-full !flex-row-reverse !justify-end !gap-0 p-1! transition-[gap]! duration-slow!',
                    avatarBox: '!size-9',
                    userButtonOuterIdentifier:
                      '!text-base !font-semibold !text-white pl-3! pr-2! !m-0 !p-0 w-full! max-w-0! !text-left opacity-0! transition-[max-width,opacity]! duration-slow! overflow-hidden! text-nowrap! text-ellipsis!',
                  },
          }}
        >
          <UserButton.MenuItems>
            <UserButton.Action
              label="Manage account"
              labelIcon={<FontAwesomeIcon icon={faGear} />}
              onClick={() => clerk.openUserProfile()}
            />
            <UserButton.Action
              label="Export data"
              labelIcon={<FontAwesomeIcon icon={faRightFromBracket} rotation={270} />}
              onClick={exportUserData}
            />
            <UserButton.Action
              label="Import data"
              labelIcon={<FontAwesomeIcon icon={faRightToBracket} rotation={90} />}
              onClick={importUserData}
            />
            <UserButton.Action
              label="Sign out"
              labelIcon={<FontAwesomeIcon icon={faRightFromBracket} className="sign-out-menu-icon" />}
              onClick={() => clerk.signOut()}
            />
          </UserButton.MenuItems>
        </UserButton>
      </Authenticated>

      <Unauthenticated>
        <SignInButton mode="modal">
          <Button size={isMobile ? 'default' : 'full'} className="gap-0">
            <FontAwesomeIcon icon={faSignIn} size="xl" className="h-5 max-h-5 min-h-5 w-5 max-w-5 min-w-5" />
            <span
              className={cn(
                'duration-slow max-w-full overflow-hidden pl-3 text-nowrap opacity-100 transition-[max-width,opacity,padding]',
                !isExpanded && !isMobile && 'max-w-0 pl-0 opacity-0',
              )}
            >
              Sign In
            </span>
          </Button>
        </SignInButton>
      </Unauthenticated>
    </>
  )
}
