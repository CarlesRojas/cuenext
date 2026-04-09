import { useMemo } from 'react'

export function useAppEnvironment() {
  return useMemo(() => {
    const isPWAShell = navigator.userAgent.includes('PWAShell')

    return isPWAShell
  }, [])
}
