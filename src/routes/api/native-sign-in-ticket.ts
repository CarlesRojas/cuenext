import { createSignInTicket } from '#/lib/signInTicket'
import { auth } from '@clerk/tanstack-react-start/server'
import { createFileRoute } from '@tanstack/react-router'

// Called by the iOS app from its web view when a signed in user connects a Google account, so the connection can run
// in the system sign in sheet. The custom header forces a CORS preflight, so other sites can't call it.
export const Route = createFileRoute('/api/native-sign-in-ticket')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (request.headers.get('X-CueNext-Native') !== '1') return new Response('Forbidden', { status: 403 })

        const { userId } = await auth()
        if (!userId) return new Response('Unauthorized', { status: 401 })

        return Response.json({ ticket: await createSignInTicket(userId) })
      },
    },
  },
})
