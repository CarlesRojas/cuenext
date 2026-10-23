import { useEffect } from 'react'
import { isAndroid } from 'react-device-detect'

// Chrome paints its own grey under the Android gesture bar unless the page opts into drawing there.
// Only the installed Android app opts in: iOS and browser tabs keep their current layout, and
// env(safe-area-inset-bottom) stays 0 for them, so the padding that uses it is a no-op there.
export function AndroidEdgeToEdge() {
  useEffect(() => {
    if (!isAndroid || !window.matchMedia('(display-mode: standalone)').matches) return

    const viewport = document.querySelector('meta[name="viewport"]')
    const content = viewport?.getAttribute('content')
    if (!viewport || !content || content.includes('viewport-fit')) return

    viewport.setAttribute('content', `${content}, viewport-fit=cover`)
  }, [])

  return null
}
