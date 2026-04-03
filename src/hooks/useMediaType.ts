import { useSyncExternalStore } from 'react'

export type MediaType = 'tv' | 'movie'

let currentType: MediaType = 'tv'
const listeners = new Set<() => void>()

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
    listeners.forEach(l => l())
  }
}

export function useMediaType() {
  const type = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return [type, setMediaType] as const
}
