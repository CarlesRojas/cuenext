import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/movie/$tmdbId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { tmdbId } = Route.useParams()
  return <div>Movie {tmdbId}</div>
}
