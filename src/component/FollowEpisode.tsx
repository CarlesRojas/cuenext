import { api } from '#/../convex/_generated/api'
import { PosterCard } from '#/component/PosterCard'
import { useUndoToast } from '#/hooks/useUndoToast'
import { getTmdbImageUrl } from '#/lib/tmdbImage'
import type { TmdbTv } from '#/type/tmdb'
import { useClerk } from '@clerk/tanstack-react-start'
import { convexQuery } from '@convex-dev/react-query'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useAction, useMutation as useDbMutation } from 'convex/react'

interface Props {
  episode: TmdbTv
  number?: number
}

export default function FollowEpisode({ episode, number }: Props) {
  const clerk = useClerk()

  const { showUndoToast } = useUndoToast()

  const { data: followedMedia } = useQuery({
    ...convexQuery(api.library.listFollowed, { type: 'tv' }),
  })

  const markAsFollowed = useDbMutation(api.library.follow)
  const unmarkAsFollowed = useDbMutation(api.library.unfollow)
  const updateNextEpisode = useAction(api.nextEpisode.updateNextEpisode)

  const follow = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      await markAsFollowed({ type: 'tv', tmdbId: id })
      await updateNextEpisode({ tmdbId: id })
    },
  })

  const unfollow = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      await unmarkAsFollowed({ type: 'tv', tmdbId: id })
      await updateNextEpisode({ tmdbId: id })
    },
  })

  const toggleFollow = async (id: number, title: string) => {
    if (!clerk.isSignedIn) return clerk.openSignIn({ forceRedirectUrl: window.location.href })

    const isFollowing = Array.isArray(followedMedia) && followedMedia.includes(id)
    const mediaKey = `tv-${id}`

    if (isFollowing) {
      await unfollow.mutateAsync({ id })
      showUndoToast(title, 'unfollow', mediaKey, () => follow.mutateAsync({ id }))
    } else {
      await follow.mutateAsync({ id })
      showUndoToast(title, 'follow', mediaKey, () => unfollow.mutateAsync({ id }))
    }
  }

  return (
    <PosterCard
      mediaType="tv"
      key={episode.id}
      id={episode.id}
      title={episode.name}
      imageUrl={getTmdbImageUrl(episode.poster_path, 'w342') || undefined}
      showFollow
      number={number}
      isFollowed={Array.isArray(followedMedia) && followedMedia.includes(episode.id)}
      onToggleFollow={() => toggleFollow(episode.id, episode.name)}
    />
  )
}
