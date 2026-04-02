import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { api } from 'convex/_generated/api'

export const Route = createFileRoute('/')({ component: App })

function App() {
  const { data, error } = useQuery({
    ...convexQuery(api.library.listFollowed, { type: 'movie' }),
    gcTime: 60_000,
  })

  return (
    <main className="full-page">
      {error && <p>Error: {error.message}</p>}
      <p>{JSON.stringify(data)}</p>
    </main>
  )
}
