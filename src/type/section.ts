export type TvSectionItem = {
  id: string
  tmdbId: number
  lastWatchedAt: number | null
  manuallyStopped: boolean
  seasonNumber: number
  episodeNumber: number
  followedAt?: number
  watchedPercentage: number
  status: 'ended' | 'ongoing'
  name: string
  poster?: string | null
  backdrop?: string | null
}

export type MovieSectionItem = {
  tmdbId: number
  watchedAt?: number | null
  followedAt?: number
  name: string
  poster?: string | null
  backdrop?: string | null
}
