import { useImageFallback } from '#/hooks/useImageFallback'
import { cn } from '#/lib/cn'
import type { ImageSize } from '#/lib/tmdbImage'
import { getTmdbImageUrls } from '#/lib/tmdbImage'
import { useEffect, useState } from 'react'

const IMAGE_SIZES: ImageSize[] = ['w92', 'w154', 'w185', 'w342', 'w500', 'w780', 'original']

interface Props extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onError'> {
  paths: (string | null | undefined)[]
  onNoImage?: () => void
  minSize?: ImageSize
  maxSize?: ImageSize
}

export function ProgressiveImage({
  paths,
  onNoImage,
  minSize = 'w92',
  maxSize = 'original',
  className,
  ...imgProps
}: Props) {
  const [largeImageLoaded, setLargeImageLoaded] = useState(false)

  const minSizeIndex = IMAGE_SIZES.indexOf(minSize)
  const maxSizeIndex = IMAGE_SIZES.indexOf(maxSize)

  const startIndex = minSizeIndex >= 0 ? minSizeIndex : 0
  const endIndex = maxSizeIndex >= 0 ? maxSizeIndex + 1 : IMAGE_SIZES.length

  const smallSizes = IMAGE_SIZES.slice(startIndex, endIndex - 1)
  const bigSizes = IMAGE_SIZES.slice(endIndex - 1)

  const smallImageUrls = paths.flatMap(path => getTmdbImageUrls(path, smallSizes))
  const largeImageUrls = paths.flatMap(path => getTmdbImageUrls(path, bigSizes))

  const smallImage = useImageFallback(smallImageUrls)
  const largeImage = useImageFallback(largeImageUrls)

  useEffect(() => {
    if (!smallImage.hasImage && !largeImage.hasImage) onNoImage?.()
  }, [smallImage.hasImage, largeImage.hasImage, onNoImage])

  console.log(smallSizes, bigSizes)

  return (
    <>
      {smallImage.hasImage && !largeImageLoaded && minSize !== maxSize && (
        <img
          {...imgProps}
          src={smallImage.imageUrl}
          onError={smallImage.handleImageError}
          className={cn('absolute inset-0', className)}
        />
      )}

      {largeImage.hasImage && (
        <img
          {...imgProps}
          src={largeImage.imageUrl}
          onError={largeImage.handleImageError}
          onLoad={() => setLargeImageLoaded(true)}
          className={className}
        />
      )}
    </>
  )
}
