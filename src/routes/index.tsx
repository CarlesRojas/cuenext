import { m } from '#/locale/messages'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: App })

function App() {
  return (
    <main className="full-page">
      <p>{m.example_message({ username: 'TanStack Router' })}</p>
    </main>
  )
}
