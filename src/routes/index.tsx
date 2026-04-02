import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: App })

function App() {
  // const { data, error } = useSuspenseQuery({
  //   ...convexQuery(api.library.listFollowed, { type: 'movie' }),
  //   gcTime: 60_000,
  // })

  return (
    <main className="full-page">
      <p>hola</p>
      {/* {error && <p>Error: {error.message}</p>}
      <p>{JSON.stringify(data)}</p> */}
    </main>
  )
}
