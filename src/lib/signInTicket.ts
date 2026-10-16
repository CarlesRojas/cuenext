import { clerkClient } from '@clerk/tanstack-react-start/server'

const TICKET_TTL_SECONDS = 60

// One time Clerk sign in ticket, used to move a session between the iOS app's web view and its system sign in sheet
export async function createSignInTicket(userId: string) {
  const { token } = await clerkClient().signInTokens.createSignInToken({ userId, expiresInSeconds: TICKET_TTL_SECONDS })
  return token
}
