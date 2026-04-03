import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(auth)/upcoming')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Upcoming</div>
}
