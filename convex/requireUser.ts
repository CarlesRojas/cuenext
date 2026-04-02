export async function requireUser(context: any) {
  const identity = await context.auth.getUserIdentity()

  if (!identity) throw new Error('Unauthenticated')

  return identity.subject
}
