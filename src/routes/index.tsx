import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: App })

function App() {
  // const { data, error } = useQuery({
  //   ...convexQuery(api.library.listFollowed, { type: 'movie' }),
  //   gcTime: 60_000,
  // })

  return (
    <main className="full-page">
      <p>Hola</p>
    </main>
  )
}
