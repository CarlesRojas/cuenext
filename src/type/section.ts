export type TvSectionItem = {
  tmdbId: number
  lastWatchedAt: number | null
  manuallyStopped: boolean
  seasonNumber: number
  episodeNumber: number
  followedAt?: number
  watchedPercentage: number
  status: 'ended' | 'ongoing'
}

export type MovieSectionItem = {
  tmdbId: number
  watchedAt?: number | null
  followedAt?: number
}
