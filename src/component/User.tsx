import { Button } from '#/component/ui/button'
import { useUserDataTransfer } from '#/hooks/useUserDataTransfer'
import { cn } from '#/lib/cn'
import { SignInButton, UserButton } from '@clerk/tanstack-react-start'
import { faFileExport, faFileImport, faSignIn } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Authenticated, Unauthenticated, useConvexAuth } from 'convex/react'

interface UserProps {
  isMobile?: boolean
  isExpanded?: boolean
}

export function User({ isMobile, isExpanded }: UserProps) {
  const { isLoading } = useConvexAuth()
  const { exportUserData, importUserData } = useUserDataTransfer()

  if (isLoading) return null

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
                    rootBox: 'w-full! max-w-full! overflow-hidden!',
                    userButtonTrigger:
                      '!w-full !shadow-none !rounded-full hover:!bg-neutral-400/10 focus-visible:!bg-neutral-400/10',
                    userButtonBox: '!w-full !flex-row-reverse !justify-end !gap-0 p-1!',
                    avatarBox: '!size-9',
                    userButtonOuterIdentifier:
                      '!text-base !font-semibold !text-white pl-3! pr-2! !m-0 !p-0 w-full! max-w-full! !text-left opacity-100! transition-[max-width,opacity]! duration-slow! text-nowrap! overflow-hidden! text-ellipsis!',
                  }
                : {
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
              label="Export data"
              labelIcon={<FontAwesomeIcon icon={faFileExport} />}
              onClick={exportUserData}
            />
            <UserButton.Action
              label="Import data"
              labelIcon={<FontAwesomeIcon icon={faFileImport} />}
              onClick={importUserData}
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
