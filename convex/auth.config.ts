export default {
  providers: [
    {
      domain: process.env.CLERK_FRONTEND_API_URL,
      applicationID: 'convex',
    },
  ],
}

export async function requireUser(context: any) {
  const identity = await context.auth.getUserIdentity()

  if (!identity) throw new Error('Unauthenticated')

  return identity.subject
}
