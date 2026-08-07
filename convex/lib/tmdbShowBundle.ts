import { z } from 'zod'
import type { TmdbEpisode, TmdbSeason, TmdbTv } from '../../src/type/tmdb'
import { tmdbSeasonSchema, tmdbTvSchema } from '../../src/type/tmdb'
import { initialSeasonNumbers, remainingSeasonChunks, seasonAppendParam } from '../../src/lib/showBundleChunks'
import type { ActionCtx } from '../_generated/server'
import { fetchTmdbCached } from '../tmdbCache'
import type { ShowSeasonsLayout } from './showSeasonsShared'

// Server-side twin of the client's show bundle: one TMDB request carrying the show and its
// seasons, instead of the show plus one request per season. The season layout refresh used
// to run a separate cached action for every season of the show.
//
// The chunking is shared with the browser so both build the same request and read the same
// cache row.

// catchall keeps the appended `season/N` keys, which a plain object schema would strip.
const showBundleSchema = tmdbTvSchema.catchall(z.unknown())

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
  const raw = await fetchTmdbCached(context, showBundleSchema, `/tv/${tmdbId}`, {
    append_to_response: seasonAppendParam(initialSeasonNumbers()),
  })

  const show = tmdbTvSchema.parse(raw)
  const seasons = appendedSeasons(raw)

  for (const chunk of remainingSeasonChunks(show.seasons)) {
    const extra = await fetchTmdbCached(context, showBundleSchema, `/tv/${tmdbId}`, {
      append_to_response: seasonAppendParam(chunk),
    })

    seasons.push(...appendedSeasons(extra))
  }

  // An empty bundle here is far more damaging than a failed request: the layout below would
  // come out with no seasons and no episodes, and computeNextEpisode reads that as "nothing
  // left to watch" for every viewer of the show. Refusing to return is what keeps a bad
  // request from being written to shared state.
  const expectedSeasons = (show.seasons ?? []).filter(season => season.season_number > 0).length
  const receivedSeasons = seasons.filter(season => season.season_number > 0).length

  if (expectedSeasons > 0 && receivedSeasons === 0)
    throw new Error(`TMDB returned no appended seasons for show ${tmdbId} (expected ${expectedSeasons})`)

  if (receivedSeasons < expectedSeasons)
    console.warn(`Show ${tmdbId}: TMDB appended ${receivedSeasons} of ${expectedSeasons} seasons`)

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
