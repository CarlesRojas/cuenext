import { ProgressiveImage } from '#/component/ProgressiveImage'
import { Button } from '#/component/ui/button'
import type { TmdbSeason } from '#/type/tmdb'
import { faEye, faTv } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState } from 'react'

interface Props {
  season: TmdbSeason
  isSpecials?: boolean
}

export function ShowSeason({ season }: Props) {
  console.log(season)
  const { id, name, air_date, poster_path, episodes } = season

  const [hasImage, setHasImage] = useState(true)

  const formatedAirDate = air_date
    ? new Date(air_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : undefined

  return (
    <div
      key={id}
      className="relative grid h-24 max-h-24 min-h-24 w-full grid-cols-[auto_1fr] grid-rows-1 overflow-hidden rounded-[22px] border border-neutral-500/40 bg-neutral-800 shadow-xl"
    >
      {poster_path && hasImage ? (
        <div className="relative aspect-video h-full rounded-[22px] bg-neutral-900">
          <ProgressiveImage
            paths={[poster_path]}
            alt={name}
            className="absolute inset-y-0 left-0 aspect-video h-full scale-200 rounded-[22px] object-cover object-center opacity-30 blur-2xl"
            minSize="w342"
            maxSize="w342"
            loading="lazy"
          />

          <ProgressiveImage
            paths={[poster_path]}
            alt={name}
            className="aspect-video h-full rounded-[22px] object-cover object-center"
            onNoImage={() => setHasImage(false)}
            minSize="w342"
            maxSize="w342"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="flex aspect-video h-full items-center justify-center rounded-[22px] bg-neutral-900">
          <FontAwesomeIcon icon={faTv} size="6x" className="max-w-10 opacity-40" />
        </div>
      )}

      <div className="flex items-center justify-between p-3 lg:p-4">
        <div className="flex flex-col pr-24">
          <h2 className="line-clamp-1 text-lg leading-6 font-semibold">{name}</h2>
          {formatedAirDate && <p className="line-clamp-1 text-sm text-neutral-400">{formatedAirDate}</p>}
        </div>

        <div className="flex items-center gap-2">
          {episodes && (
            <span className="line-clamp-1 text-sm text-neutral-400">
              {43} / {episodes.length}
            </span>
          )}

          <Button variant="secondary" size="icon" onClick={e => e.preventDefault()}>
            <FontAwesomeIcon icon={faEye} />
          </Button>
        </div>
      </div>
    </div>
  )
}
