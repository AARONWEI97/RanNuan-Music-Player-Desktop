import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const defaultDesktopPreferences: DesktopPreferences = {
  showSplash: true,
  resumePlayback: false,
  closeAction: 'tray',
  miniPlayerMode: 'automatic',
  openSearchShortcut: 'Ctrl+K',
  toggleSearchShortcut: 'Ctrl+Shift+S',
}

export interface DesktopPreferences {
  showSplash: boolean
  resumePlayback: boolean
  closeAction: 'tray' | 'quit'
  miniPlayerMode: 'automatic' | 'floating'
  openSearchShortcut: string
  toggleSearchShortcut: string
}

export type SearchShortcut = 'openSearchShortcut' | 'toggleSearchShortcut'

export const useDesktopPreferences = create<DesktopPreferences>()(
  persist(() => ({ ...defaultDesktopPreferences }), { name: 'desktop-preferences' }),
)

// Keep these combinations distinct from common WebView and application commands.
const reservedShortcuts = new Set([
  'Ctrl+A', 'Ctrl+C', 'Ctrl+F', 'Ctrl+J', 'Ctrl+L', 'Ctrl+P', 'Ctrl+R',
  'Ctrl+V', 'Ctrl+W', 'Ctrl+X', 'Ctrl+Y', 'Ctrl+Z',
  'Ctrl+Shift+C', 'Ctrl+Shift+I', 'Ctrl+Shift+J', 'Ctrl+Shift+R',
])

export function isSearchShortcut(value: unknown): value is string {
  return typeof value === 'string' &&
    /^Ctrl\+(?:Shift\+)?[A-Z0-9]$/.test(value) &&
    !reservedShortcuts.has(value)
}

export function readSearchShortcut(event: KeyboardEvent): string | null {
  if ((!event.ctrlKey && !event.metaKey) || event.altKey || event.isComposing) return null
  const key = event.key.toUpperCase()
  if (!/^[A-Z0-9]$/.test(key)) {
    if (!event.shiftKey || !/^Digit[0-9]$/.test(event.code)) return null
    return `Ctrl+Shift+${event.code.slice(-1)}`
  }
  return event.shiftKey ? `Ctrl+Shift+${key}` : `Ctrl+${key}`
}
