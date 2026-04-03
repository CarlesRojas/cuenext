import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/upcoming')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Upcoming</div>
}
