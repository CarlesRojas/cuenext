import type { TmdbSeason, TmdbTv } from '#/type/tmdb'

interface ShowSeasonsProps {
  show: TmdbTv
  seasons: TmdbSeason[]
}

export function ShowSeasons({ show, seasons }: ShowSeasonsProps) {
  return null
}
