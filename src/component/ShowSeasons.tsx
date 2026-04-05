import { getTmdbImageUrl } from '#/lib/tmdbImage'
import type { TmdbSeason, TmdbTv } from '#/type/tmdb'

interface ShowSeasonsProps {
  show: TmdbTv
  seasons: TmdbSeason[]
}

export function ShowSeasons({ show, seasons }: ShowSeasonsProps) {
  const { seasons: showSeasons } = show

  if (!showSeasons?.length) {
    return null
  }

  return (
    <div>
      <h2 className="mb-6 text-3xl font-bold">Seasons</h2>
      <div className="space-y-6">
        {showSeasons.map(season => {
          // Find the corresponding season details
          const seasonDetails = seasons.find(s => s.season_number === season.season_number)
          return <SeasonCard key={season.season_number} season={season} seasonDetails={seasonDetails} />
        })}
      </div>
    </div>
  )
}

function SeasonCard({
  season,
  seasonDetails,
}: {
  season: NonNullable<TmdbTv['seasons']>[0]
  seasonDetails?: TmdbSeason
}) {
  return (
    <div className="rounded-lg border p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row">
        {/* Season Poster */}
        <div className="flex-shrink-0">
          <img
            src={getTmdbImageUrl(season.poster_path, 'w342') || getTmdbImageUrl(season.poster_path, 'original')}
            alt={season.name}
            className="h-36 w-24 rounded object-cover shadow"
          />
        </div>

        {/* Season Info */}
        <div className="flex-1">
          <h3 className="mb-2 text-xl font-semibold">{season.name}</h3>

          {season.air_date && (
            <p className="mb-2 text-gray-600">Aired: {new Date(season.air_date).toLocaleDateString()}</p>
          )}

          <p className="mb-3 text-gray-600">
            {season.episode_count} episode{season.episode_count !== 1 ? 's' : ''}
          </p>

          {season.overview && <p className="mb-4 text-gray-700">{season.overview}</p>}

          {/* Episodes */}
          {seasonDetails?.episodes?.length && (
            <div>
              <h4 className="mb-3 text-lg font-semibold">Episodes</h4>
              <div className="space-y-2">
                {seasonDetails.episodes.slice(0, 3).map(episode => (
                  <div key={episode.id} className="rounded bg-gray-50 p-3">
                    <div className="font-medium">
                      {episode.episode_number}. {episode.name}
                    </div>
                    {episode.overview && <p className="mt-1 line-clamp-2 text-sm text-gray-600">{episode.overview}</p>}
                  </div>
                ))}
                {seasonDetails.episodes.length > 3 && (
                  <p className="text-sm text-gray-500">And {seasonDetails.episodes.length - 3} more episodes...</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
