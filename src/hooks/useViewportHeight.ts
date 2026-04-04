import { useEffect, useState } from 'react'

export interface ViewportInfo {
  /** Current visual viewport height (excludes virtual keyboard) */
  visualHeight: number
  /** Full window inner height (includes virtual keyboard area) */
  fullHeight: number
  /** Whether a virtual keyboard is likely open */
  isKeyboardOpen: boolean
}

/**
 * Hook to track viewport height changes, especially useful for mobile
 * virtual keyboard detection and responsive layout adjustments.
 */
export function useViewportHeight(): ViewportInfo {
  const [viewport, setViewport] = useState<ViewportInfo>(() => {
    if (typeof window === 'undefined') {
      return {
        visualHeight: 0,
        fullHeight: 0,
        isKeyboardOpen: false,
      }
    }

    const visualHeight = window.visualViewport?.height ?? window.innerHeight
    const fullHeight = window.innerHeight

    return {
      visualHeight,
      fullHeight,
      isKeyboardOpen: fullHeight - visualHeight > 150, // Threshold for keyboard detection
    }
  })

  useEffect(() => {
    function updateViewport() {
      const visualHeight = window.visualViewport?.height ?? window.innerHeight
      const fullHeight = window.innerHeight

      setViewport({
        visualHeight,
        fullHeight,
        isKeyboardOpen: fullHeight - visualHeight > 150,
      })
    }

    // Listen to Visual Viewport API if available
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewport)
      return () => {
        window.visualViewport?.removeEventListener('resize', updateViewport)
      }
    } else {
      // Fallback to window resize
      window.addEventListener('resize', updateViewport)
      return () => {
        window.removeEventListener('resize', updateViewport)
      }
    }
  }, [])

  return viewport
}

/**
 * Simple hook that returns just the keyboard open state
 */
export function useKeyboardOpen(): boolean {
  const { isKeyboardOpen } = useViewportHeight()
  return isKeyboardOpen
}
