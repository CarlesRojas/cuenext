import { Show, SignInButton, UserButton } from '@clerk/tanstack-react-start'
import ThemeToggle from './ThemeToggle'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b px-4 backdrop-blur-lg">
      <nav className="page-wrap flex flex-wrap items-center gap-x-3 gap-y-2 py-3 sm:py-4">
        <Show when="signed-in">
          <UserButton />
        </Show>

        <Show when="signed-out">
          <SignInButton />
        </Show>

        <ThemeToggle />
      </nav>
    </header>
  )
}
