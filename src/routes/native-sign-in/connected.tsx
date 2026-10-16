import { NativeSignInStatus } from '#/component/NativeSignInStatus'
import { NATIVE_CALLBACK_URL } from '#/lib/nativeSignIn'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import z from 'zod'

export const Route = createFileRoute('/native-sign-in/connected')({
  validateSearch: z.object({ state: z.string().min(1) }),
  component: Connected,
})

function Connected() {
  const { state } = Route.useSearch()

  useEffect(() => {
    window.location.href = `${NATIVE_CALLBACK_URL}?${new URLSearchParams({ state, connected: '1' })}`
  }, [state])

  return <NativeSignInStatus message="Returning to CueNext..." />
}
