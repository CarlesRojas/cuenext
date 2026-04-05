import { UrlParams } from '#/type/url'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/upcoming')({
  component: UpcomingPage,
  validateSearch: UrlParams,
})

function UpcomingPage() {
  return (
    <div className="screen-py flex w-full flex-col gap-2">
      <header className="screen-px mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">Upcoming</h1>
      </header>
    </div>
  )
}
