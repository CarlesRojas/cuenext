import { z } from 'zod'
import type { TmdbEpisode, TmdbSeason, TmdbTv } from '../../src/type/tmdb'
import { tmdbSeasonSchema, tmdbTvSchema } from '../../src/type/tmdb'
import type { ActionCtx } from '../_generated/server'
import { fetchTmdbCached } from '../tmdbCache'
import type { ShowSeasonsLayout } from './showSeasonsShared'

// Server-side twin of the client's show bundle: one TMDB request carrying the show and its
// seasons, instead of the show plus one request per season. The season layout refresh used
// to run a separate cached action for every season of the show.
//
// Ten is under TMDB's limit of twenty appended requests and keeps the joined payload inside
// Convex's 1 MiB document limit, which is what the response is cached as.
const SEASONS_PER_REQUEST = 10

// catchall keeps the appended `season/N` keys, which a plain object schema would strip.
const showBundleSchema = tmdbTvSchema.catchall(z.unknown())

function seasonAppendParam(seasonNumbers: number[]): string {
  return seasonNumbers.map(seasonNumber => `season/${seasonNumber}`).join(',')
}

function appendedSeasons(raw: Record<string, unknown>): TmdbSeason[] {
  const seasons: TmdbSeason[] = []

  for (const [key, value] of Object.entries(raw)) {
    if (!/^season\/\d+$/.test(key)) continue

    const parsed = tmdbSeasonSchema.safeParse(value)
    if (parsed.success) seasons.push(parsed.data)
  }

  return seasons
}

export async function fetchShowBundle(
  context: ActionCtx,
  tmdbId: number,
): Promise<{ show: TmdbTv; seasons: TmdbSeason[] }> {
  const firstBatch = Array.from({ length: SEASONS_PER_REQUEST }, (_, index) => index + 1)

  const raw = await fetchTmdbCached(context, showBundleSchema, `/tv/${tmdbId}`, {
    append_to_response: seasonAppendParam(firstBatch),
  })

  const show = tmdbTvSchema.parse(raw)
  const seasons = appendedSeasons(raw)

  const remaining = (show.seasons ?? [])
    .map(season => season.season_number)
    .filter(seasonNumber => seasonNumber > SEASONS_PER_REQUEST)
    .sort((a, b) => a - b)

  for (let index = 0; index < remaining.length; index += SEASONS_PER_REQUEST) {
    const chunk = remaining.slice(index, index + SEASONS_PER_REQUEST)

    const extra = await fetchTmdbCached(context, showBundleSchema, `/tv/${tmdbId}`, {
      append_to_response: seasonAppendParam(chunk),
    })

    seasons.push(...appendedSeasons(extra))
  }

  seasons.sort((a, b) => a.season_number - b.season_number)

  return { show, seasons }
}

const hasAired = (episode: TmdbEpisode) => {
  if (!episode.air_date) return false

  return new Date(episode.air_date) <= new Date()
}

export async function fetchShowSeasonsLayout(context: ActionCtx, tmdbId: number): Promise<ShowSeasonsLayout> {
  const { show, seasons } = await fetchShowBundle(context, tmdbId)

  // Specials never count towards progress, and their season number would break the
  // zero-based indexing the rest of the computation relies on.
  const regularSeasons = seasons.filter(season => season.season_number > 0)

  const nextAirDate = show.next_episode_to_air?.air_date
  const parsedNextAirDate = nextAirDate ? new Date(nextAirDate).getTime() : Number.NaN

  return {
    seasonEpisodeCounts: regularSeasons.map(season => season.episodes?.filter(hasAired).length ?? 0),
    seasonFirstEpisodeIndex: regularSeasons.map(season =>
      season.episodes && season.episodes.length > 0 ? season.episodes[0].episode_number - 1 : 0,
    ),
    numberOfSeasons: regularSeasons.length,
    status: show.status?.toLowerCase() || 'ongoing',
    nextEpisodeAirDate: Number.isNaN(parsedNextAirDate) ? null : parsedNextAirDate,
  }
}
