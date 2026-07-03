import { Section } from '#/component/Section'
import { useMediaExtras } from '#/hooks/useMediaExtras'
import { cn } from '#/lib/cn'
import type { MediaType } from '#/type/media'
import type { TmdbVideo } from '#/type/tmdb'
import { faPlay } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { MouseEvent } from 'react'
import { useState } from 'react'
import { isAndroid, isIOS } from 'react-device-detect'

interface VideosProps {
  tmdbId: number
  media: MediaType
}

interface VideoItemProps {
  video: TmdbVideo
}

function VideoItem({ video }: VideoItemProps) {
  const [hasError, setHasError] = useState(false)

  const thumbnailUrl = `https://img.youtube.com/vi/${video.key}/mqdefault.jpg`
  const videoUrl = `https://www.youtube.com/watch?v=${video.key}`

  const handleImageError = () => {
    setHasError(true)
  }

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()

    if (isIOS) {
      const youtubeAppUrl = `youtube://www.youtube.com/watch?v=${video.key}`

      const link = document.createElement('a')
      link.href = youtubeAppUrl
      link.click()
    } else if (isAndroid) {
      const intentUrl = `intent://www.youtube.com/watch?v=${video.key}#Intent;scheme=https;package=com.google.android.youtube;end`

      window.location.href = intentUrl
    } else {
      window.open(videoUrl, '_blank', 'noopener,noreferrer')
    }
  }

  if (hasError) return null

  return (
    <a
      href={videoUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={cn(
        'group duration-slow relative flex w-64 flex-col overflow-hidden rounded-[22px] border border-neutral-500/40 bg-neutral-800 shadow-xl transition-all hover:scale-105 focus-visible:scale-105 lg:w-72',
      )}
    >
      <div className="relative aspect-video w-64 lg:w-72">
        <img
          src={thumbnailUrl}
          alt={video.name}
          onError={handleImageError}
          className="absolute inset-0 aspect-2/3 h-full scale-200 overflow-hidden rounded-[22px] object-cover opacity-30 blur-2xl"
        />

        <img
          src={thumbnailUrl}
          alt={video.name}
          onError={handleImageError}
          className="h-full w-full overflow-hidden rounded-[22px] object-cover"
        />

        <div className="absolute inset-0 flex items-center justify-center">
          <FontAwesomeIcon icon={faPlay} className="size-8 min-h-8 min-w-8" />
        </div>

        {video.type && (
          <div className="absolute top-2 right-2 rounded-full border border-neutral-500/40 bg-black/50 px-3 py-1 text-xs font-medium backdrop-blur-md">
            {video.type}
          </div>
        )}

        <h3
          style={{
            maskImage: 'linear-gradient(to top, black 30%, transparent)',
          }}
          className="absolute inset-x-0 bottom-0 line-clamp-2 w-full max-w-full bg-black/20 px-4 pt-8 pb-1 text-left text-sm font-medium text-nowrap text-ellipsis backdrop-blur-md"
        >
          {video.name}
        </h3>
      </div>
    </a>
  )
}

export function Videos({ tmdbId, media }: VideosProps) {
  const { movie, show } = useMediaExtras(media, tmdbId)
  const videos = (media === 'movie' ? movie : show).data?.videos

  if (!videos?.results.length) return null

  const sortedVideos = videos.results
    .filter(video => video.site.toLowerCase() === 'youtube')

    .sort((a, b) => {
      if (a.official && !b.official) return -1
      if (!a.official && b.official) return 1

      if (a.type === 'Trailer' && b.type !== 'Trailer') return -1
      if (a.type !== 'Trailer' && b.type === 'Trailer') return 1

      return new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
    })
    .slice(0, 15)

  return (
    <Section sectionKey="videos" title="Videos">
      {sortedVideos.map(video => (
        <VideoItem key={video.id} video={video} />
      ))}
    </Section>
  )
}
