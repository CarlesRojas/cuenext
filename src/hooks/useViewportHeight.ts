import { useEffect, useState } from 'react'

export interface ViewportInfo {
  visualHeight: number
  fullHeight: number
  isKeyboardOpen: boolean
}

export function useViewportHeight(): ViewportInfo {
  const [viewport, setViewport] = useState<ViewportInfo>(() => {
    if (typeof window === 'undefined') return { visualHeight: 0, fullHeight: 0, isKeyboardOpen: false }

    const visualHeight = window.innerHeight * 0.6 // window.visualViewport?.height ?? window.innerHeight
    const fullHeight = window.innerHeight

    console.log(2, visualHeight, document.documentElement)
    const html = document.documentElement
    html.style.setProperty('height', `${visualHeight}px`)

    return { visualHeight, fullHeight, isKeyboardOpen: fullHeight - visualHeight > 100 }
  })

  useEffect(() => {
    function updateViewport() {
      const visualHeight = window.innerHeight * 0.6 // window.visualViewport?.height ?? window.innerHeight
      const fullHeight = window.innerHeight

      console.log(1, visualHeight, document.documentElement)
      const html = document.documentElement
      html.style.setProperty('height', `${visualHeight}px`)

      setViewport({ visualHeight, fullHeight, isKeyboardOpen: fullHeight - visualHeight > 100 })
    }

    updateViewport()

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewport)
      return () => {
        window.visualViewport?.removeEventListener('resize', updateViewport)
      }
    }

    window.addEventListener('resize', updateViewport)
    return () => {
      window.removeEventListener('resize', updateViewport)
    }
  }, [])

  return viewport
}
