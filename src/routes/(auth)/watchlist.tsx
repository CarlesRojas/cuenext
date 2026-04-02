import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/(auth)/watchlist')({
  component: RouteComponent,
  beforeLoad: async ({ context: { isAuthenticated } }) => {
    if (!isAuthenticated) throw redirect({ to: '/' })
  },
})

function RouteComponent() {
  return <div>Watchlist</div>
}
