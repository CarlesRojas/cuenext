import { useImageFallback } from '#/hooks/useImageFallback'
import { cn } from '#/lib/cn'
import type { ImageSize } from '#/lib/tmdbImage'
import { getTmdbImageUrls } from '#/lib/tmdbImage'
import { useEffect } from 'react'

const IMAGE_SIZES: ImageSize[] = ['w92', 'w154', 'w185', 'w342', 'w500', 'w780']

interface Props extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onError'> {
  paths: (string | null | undefined)[]
  onNoImage?: () => void
  minSize?: ImageSize
}

export function ProgressiveImage({ paths, onNoImage, minSize = 'w92', className, ...imgProps }: Props) {
  const minSizeIndex = IMAGE_SIZES.indexOf(minSize)
  const allowedSizes = minSizeIndex >= 0 ? IMAGE_SIZES.slice(minSizeIndex) : IMAGE_SIZES

  const smallImageUrls = paths.flatMap(path => getTmdbImageUrls(path, allowedSizes))
  const largeImageUrls = paths.flatMap(path => getTmdbImageUrls(path, ['original']))

  const smallImage = useImageFallback(smallImageUrls)
  const largeImage = useImageFallback(largeImageUrls)

  useEffect(() => {
    if (!smallImage.hasImage && !largeImage.hasImage) {
      onNoImage?.()
    }
  }, [smallImage.hasImage, largeImage.hasImage, onNoImage])

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
