export async function requireUser(context: any) {
  const identity = await context.auth.getUserIdentity()

  if (!identity) throw new Error('Unauthenticated')

  return identity.subject
}

// Reviews store the author name and avatar alongside the row so a list can be rendered
// without a per-author lookup, which needs the whole identity and not just the subject
// requireUser returns. name and picture only reach us when the Clerk JWT template includes
// those claims, so hasName tells the caller whether to fall back to what the client sent.
export async function requireIdentity(context: any) {
  const identity = await context.auth.getUserIdentity()

  if (!identity) throw new Error('Unauthenticated')

  const name: string | undefined = identity.name || identity.nickname || identity.givenName || identity.email

  return {
    userId: identity.subject as string,
    authorName: name || 'CueNext user',
    hasName: !!name,
    authorImage: (identity.pictureUrl as string | undefined) ?? null,
  }
}

// Reviews are public, so their queries run for signed-out visitors too and only use the
// identity to mark which rows belong to the reader and which ones they upvoted.
export async function optionalUser(context: any): Promise<string | null> {
  const identity = await context.auth.getUserIdentity()

  return identity ? (identity.subject as string) : null
}
