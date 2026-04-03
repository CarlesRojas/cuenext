import { useSyncExternalStore } from 'react'

export type MediaType = 'tv' | 'movie'

let currentType: MediaType = 'tv'
const listeners = new Set<() => void>()

if (typeof window !== 'undefined') {
  const params = new URLSearchParams(window.location.search)
  const initialType = params.get('media')
  if (initialType === 'movie' || initialType === 'tv') {
    currentType = initialType
  } else {
    const url = new URL(window.location.href)
    url.searchParams.set('media', currentType)
    window.history.replaceState(null, '', url.toString())
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return currentType
}

export function setMediaType(type: MediaType) {
  if (currentType !== type) {
    currentType = type

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('media', type)
      window.history.replaceState(null, '', url.toString())
    }

    listeners.forEach(l => l())
  }
}

export function useMediaType() {
  const type = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return [type, setMediaType] as const
}
