import { useImageFallback } from '#/hooks/useImageFallback'
import { cn } from '#/lib/cn'
import { getTmdbImageUrls } from '#/lib/tmdbImage'
import { useEffect } from 'react'

interface Props extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onError'> {
  paths: (string | null | undefined)[]
  onNoImage?: () => void
}

export function ProgressiveImage({ paths, onNoImage, className, ...imgProps }: Props) {
  const smallImageUrls = paths.flatMap(path => getTmdbImageUrls(path))
  const largeImageUrls = paths.flatMap(path => getTmdbImageUrls(path, ['original']))

  const smallImage = useImageFallback(smallImageUrls)
  const largeImage = useImageFallback(largeImageUrls)

  useEffect(() => {
    if (!largeImage.hasImage) onNoImage?.()
  }, [largeImage.hasImage, onNoImage])

  return (
    <>
      {smallImage.hasImage && (
        <img {...imgProps} src={smallImage.imageUrl} onError={smallImage.handleImageError} className={className} />
      )}

      {largeImage.hasImage && (
        <img
          {...imgProps}
          src={largeImage.imageUrl}
          onError={largeImage.handleImageError}
          className={cn('absolute inset-0', className)}
        />
      )}
    </>
  )
}
