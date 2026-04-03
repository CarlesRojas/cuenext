import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(auth)/explore')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Explore</div>
}
