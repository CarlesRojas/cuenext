import { useCallback, useEffect, useState } from 'react'

export interface ViewportInfo {
  visualHeight: number
  fullHeight: number
  isKeyboardOpen: boolean
}

export function useViewportHeight(): ViewportInfo {
  const [viewport, setViewport] = useState<ViewportInfo>(() => {
    if (typeof window === 'undefined') return { visualHeight: 0, fullHeight: 0, isKeyboardOpen: false }

    const visualHeight = window.visualViewport?.height ?? window.innerHeight
    const fullHeight = window.innerHeight

    const html = document.documentElement
    html.style.setProperty('height', `${visualHeight}px`)
    html.style.setProperty('max-height', `${visualHeight}px`)
    html.style.setProperty('min-height', `${visualHeight}px`)

    return { visualHeight, fullHeight, isKeyboardOpen: fullHeight - visualHeight > 100 }
  })

  const updateViewportInternal = useCallback(() => {
    const visualHeight = window.visualViewport?.height ?? window.innerHeight
    const fullHeight = window.innerHeight

    const html = document.documentElement
    html.style.setProperty('height', `${visualHeight}px`)
    html.style.setProperty('max-height', `${visualHeight}px`)
    html.style.setProperty('min-height', `${visualHeight}px`)

    setViewport({ visualHeight, fullHeight, isKeyboardOpen: fullHeight - visualHeight > 100 })
  }, [])

  useEffect(() => {
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewportInternal, { passive: true })
      return () => {
        window.visualViewport?.removeEventListener('resize', updateViewportInternal)
      }
    }

    window.addEventListener('resize', updateViewportInternal)
    return () => {
      window.removeEventListener('resize', updateViewportInternal)
    }
  }, [updateViewportInternal])

  return viewport
}
