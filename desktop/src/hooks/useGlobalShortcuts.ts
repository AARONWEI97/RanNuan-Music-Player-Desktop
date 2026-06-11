import { useEffect } from 'react'
import { isTauri } from '@tauri-apps/api/core'
import { register, unregisterAll } from '@tauri-apps/plugin-global-shortcut'
import { togglePlay, playSong } from '@/services/audioService'
import { usePlaylistStore } from '@shared'

export function useGlobalShortcuts() {
  useEffect(() => {
    if (!isTauri()) return

    const setupShortcuts = async () => {
      try {
        await unregisterAll()
        await register('MediaPlayPause', () => {
          togglePlay()
        })
        await register('MediaNextTrack', () => {
          const { nextPlay, getCurrentSong } = usePlaylistStore.getState()
          nextPlay()
          const song = getCurrentSong()
          if (song) playSong(song)
        })
        await register('MediaPreviousTrack', () => {
          const { prevPlay, getCurrentSong } = usePlaylistStore.getState()
          prevPlay()
          const song = getCurrentSong()
          if (song) playSong(song)
        })
      } catch {
        // Shortcuts might not be available on all systems
      }
    }

    setupShortcuts()

    return () => {
      if (isTauri()) {
        unregisterAll().catch(() => {/* ignore */})
      }
    }
  }, [])
}
