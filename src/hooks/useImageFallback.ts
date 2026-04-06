import { useState } from 'react'

export function useImageFallback(urls: string[]) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const imageUrl = currentImageIndex < urls.length ? urls[currentImageIndex] : undefined

  const handleImageError = () => {
    if (currentImageIndex < urls.length - 1) setCurrentImageIndex(prev => prev + 1)
  }

  return { imageUrl, handleImageError, hasImage: currentImageIndex < urls.length }
}
