import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/tv/$tmdbId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { tmdbId } = Route.useParams()
  return <div>TV Show {tmdbId}</div>
}
