import { getTmdbImageUrl } from '#/lib/tmdbImage'
import type { TmdbTv } from '#/type/tmdb'

interface ShowDetailsProps {
  show: TmdbTv
}

export function ShowDetails({ show }: ShowDetailsProps) {
  const { name, poster_path, backdrop_path, first_air_date, number_of_seasons, overview, status } = show

  const posterUrl = getTmdbImageUrl(poster_path, 'original')
  const backdropUrl = getTmdbImageUrl(backdrop_path, 'w780') || getTmdbImageUrl(backdrop_path, 'original') || posterUrl

  return (
    <div className="flex h-fit w-full flex-col gap-8">
      <section
        className="relative aspect-video max-h-[50%] min-h-[30%] max-w-full min-w-full overflow-hidden"
        style={{ maskImage: 'linear-gradient(to bottom, black 40%, transparent)' }}
      >
        <img
          src={backdropUrl}
          alt={name}
          className="aspect-video h-full max-h-full w-full max-w-full object-cover object-center"
        />

        <div
          className="absolute inset-0 size-full backdrop-blur"
          style={{ maskImage: 'linear-gradient(to bottom, transparent 40%, black)' }}
        />

        <div className="absolute inset-0 size-full bg-radial from-transparent from-40% to-neutral-950 to-90%" />
      </section>

      {/* <div className="screen-px flex">
        <section className="flex-1">
          <h1 className="mb-4 text-4xl font-bold">{name}</h1>

          {first_air_date && (
            <p className="mb-2 text-lg text-gray-600">First aired: {new Date(first_air_date).toLocaleDateString()}</p>
          )}

          {number_of_seasons && (
            <p className="mb-4 text-lg text-gray-600">
              {number_of_seasons} season{number_of_seasons !== 1 ? 's' : ''}
            </p>
          )}

          {overview && (
            <div className="mb-6">
              <h2 className="mb-2 text-xl font-semibold">Overview</h2>
              <p className="leading-relaxed text-gray-700">{overview}</p>
            </div>
          )}

          {status && (
            <p className="text-lg">
              <span className="font-semibold">Status:</span> {status}
            </p>
          )}
        </section>
      </div> */}
    </div>
  )
}
