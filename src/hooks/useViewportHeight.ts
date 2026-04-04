import { useEffect, useState } from 'react'

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

    return { visualHeight, fullHeight, isKeyboardOpen: fullHeight - visualHeight > 100 }
  })

  useEffect(() => {
    function updateViewport() {
      const visualHeight = window.visualViewport?.height ?? window.innerHeight
      const fullHeight = window.innerHeight

      setViewport({ visualHeight, fullHeight, isKeyboardOpen: fullHeight - visualHeight > 100 })
    }

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewport)
      return () => {
        window.visualViewport?.removeEventListener('resize', updateViewport)
      }
    } else {
      window.addEventListener('resize', updateViewport)
      return () => {
        window.removeEventListener('resize', updateViewport)
      }
    }
  }, [])

  return viewport
}
