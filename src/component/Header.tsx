import { SignInButton, UserButton } from '@clerk/tanstack-react-start'
import { Authenticated, Unauthenticated } from 'convex/react'
import ThemeToggle from './ThemeToggle'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b px-4 backdrop-blur-lg">
      <nav className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3 sm:py-4">
        <Authenticated>
          <UserButton />
        </Authenticated>

        <Unauthenticated>
          <SignInButton />
        </Unauthenticated>

        <ThemeToggle />
      </nav>
    </header>
  )
}
