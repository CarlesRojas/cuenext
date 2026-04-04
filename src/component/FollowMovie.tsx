import { api } from '#/../convex/_generated/api'
import { PosterCard } from '#/component/PosterCard'
import { useUndoToast } from '#/hooks/useUndoToast'
import { getTmdbImageUrl } from '#/lib/tmdbImage'
import type { TmdbMovie } from '#/type/tmdb'
import { useClerk } from '@clerk/tanstack-react-start'
import { convexQuery } from '@convex-dev/react-query'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMutation as useDbMutation } from 'convex/react'

interface Props {
  movie: TmdbMovie
  number?: number
}

export default function WatchMovie({ movie, number }: Props) {
  const clerk = useClerk()

  const { showUndoToast } = useUndoToast()

  const { data: followedMedia, isPending: isFollowedLoading } = useQuery({
    ...convexQuery(api.library.listFollowed, { type: 'movie' }),
  })

  const markAsFollowed = useDbMutation(api.library.follow)
  const unmarkAsFollowed = useDbMutation(api.library.unfollow)

  const follow = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      await markAsFollowed({ type: 'movie', tmdbId: id, name: movie.title, poster: movie.poster_path ?? null })
    },
  })

  const unfollow = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      await unmarkAsFollowed({ type: 'movie', tmdbId: id })
    },
  })

  const toggleFollow = async (id: number, title: string) => {
    if (!clerk.isSignedIn) return clerk.openSignIn({ forceRedirectUrl: window.location.href })

    const isFollowing = Array.isArray(followedMedia) && followedMedia.includes(id)
    const mediaKey = `movie-${id}`

    if (isFollowing) {
      await unfollow.mutateAsync({ id })
      showUndoToast(title, 'unfollow', mediaKey, async () => await follow.mutateAsync({ id }))
    } else {
      await follow.mutateAsync({ id })
      showUndoToast(title, 'follow', mediaKey, async () => await unfollow.mutateAsync({ id }))
    }
  }

  return (
    <PosterCard
      mediaType="movie"
      key={movie.id}
      id={movie.id}
      title={movie.title}
      number={number}
      imageUrl={getTmdbImageUrl(movie.poster_path, 'w342') || undefined}
      showFollow
      isFollowed={Array.isArray(followedMedia) && followedMedia.includes(movie.id)}
      onToggleFollow={() => toggleFollow(movie.id, movie.title)}
      isFollowLoading={isFollowedLoading || follow.isPending || unfollow.isPending}
    />
  )
}
