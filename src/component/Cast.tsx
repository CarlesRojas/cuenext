import { api } from '#/../convex/_generated/api'
import { ProgressiveImage } from '#/component/ProgressiveImage'
import { Section } from '#/component/Section'
import type { MediaType } from '#/type/media'
import type { TmdbCastMember } from '#/type/tmdb'
import { convexAction } from '@convex-dev/react-query'
import { faUser } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useQuery } from '@tanstack/react-query'

interface CastProps {
  tmdbId: number
  media: MediaType
}

export function Cast({ tmdbId, media }: CastProps) {
  const query = useQuery({
    ...convexAction(media === 'movie' ? api.tmdb.getMovieCredits : api.tmdb.getTvCredits, { tmdbId }),
    enabled: !!tmdbId,
  })

  if (query.isLoading) {
    return (
      <Section title="Cast">
        {Array.from({ length: 8 }, (_, index) => (
          <CastCardSkeleton key={index} />
        ))}
      </Section>
    )
  }

  if (!query.data?.cast || query.data.cast.length === 0) return null

  const mainCast = query.data.cast.slice(0, 30)

  return (
    <Section title="Cast">
      {mainCast.map(member => (
        <CastCard key={member.id} member={member} />
      ))}
    </Section>
  )
}

interface CastCardProps {
  member: TmdbCastMember
}

function CastCard({ member }: CastCardProps) {
  const profilePaths = member.profile_path ? [member.profile_path] : []

  return (
    <div className="group flex w-32 flex-col gap-2 pt-1">
      <div className="relative h-38 w-32 rounded-full border border-neutral-500/40 bg-neutral-800 shadow-xl">
        {profilePaths.length > 0 ? (
          <>
            <ProgressiveImage
              paths={profilePaths}
              alt={member.name}
              className="absolute inset-0 -z-10 h-full w-full rounded-full object-cover object-top opacity-50 blur-sm"
              maxSize="w185"
            />

            <ProgressiveImage
              paths={profilePaths}
              alt={member.name}
              className="h-full w-full rounded-full object-cover object-top"
              maxSize="w185"
            />
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <FontAwesomeIcon icon={faUser} className="size-10 max-w-10" size="8x" />
          </div>
        )}
      </div>

      <div className="flex w-full flex-col gap-0.5 text-center">
        <h3 className="line-clamp-1 text-sm leading-tight font-semibold">{member.name}</h3>
        {member.character && <p className="line-clamp-1 text-xs leading-tight text-neutral-500">{member.character}</p>}
      </div>
    </div>
  )
}

function CastCardSkeleton() {
  return (
    <div className="group flex w-32 flex-col gap-2 pt-1">
      <div className="relative h-38 w-32 animate-pulse rounded-full border border-neutral-500/40 bg-neutral-800 shadow-xl" />

      <div className="flex w-full flex-col items-center justify-center gap-0.5 text-center">
        <h3 className="w-3/4 animate-pulse rounded-lg bg-neutral-800 text-sm leading-tight font-semibold text-transparent select-none">
          -
        </h3>
        <p className="w-2/5 animate-pulse rounded-lg bg-neutral-800 text-xs leading-tight text-transparent select-none">
          -
        </p>
      </div>
    </div>
  )
}
