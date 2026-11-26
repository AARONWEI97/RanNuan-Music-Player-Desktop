import { useSyncExternalStore } from 'react'

const systemColorScheme = window.matchMedia('(prefers-color-scheme: dark)')

function subscribe(listener: () => void) {
  systemColorScheme.addEventListener('change', listener)
  return () => systemColorScheme.removeEventListener('change', listener)
}

export function useSystemDark() {
  return useSyncExternalStore(subscribe, () => systemColorScheme.matches)
}
