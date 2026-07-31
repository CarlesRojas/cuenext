export async function requireUser(context: any) {
  const identity = await context.auth.getUserIdentity()

  if (!identity) throw new Error('Unauthenticated')

  return identity.subject
}

// Reviews and comments store the author name and avatar alongside the row so a thread can
// be rendered without a per-author lookup, which needs the whole identity and not just the
// subject requireUser returns.
export async function requireIdentity(context: any) {
  const identity = await context.auth.getUserIdentity()

  if (!identity) throw new Error('Unauthenticated')

  const name: string = identity.name || identity.nickname || identity.givenName || identity.email || 'CueNext user'

  return {
    userId: identity.subject as string,
    authorName: name,
    authorImage: (identity.pictureUrl as string | undefined) ?? null,
  }
}

// Reviews are public, so their queries run for signed-out visitors too and only use the
// identity to mark which rows belong to the reader and which ones they upvoted.
export async function optionalUser(context: any): Promise<string | null> {
  const identity = await context.auth.getUserIdentity()

  return identity ? (identity.subject as string) : null
}
