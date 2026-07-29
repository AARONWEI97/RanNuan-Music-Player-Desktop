import { useEffect } from 'react'
import { isTauri } from '@tauri-apps/api/core'
import { register } from '@tauri-apps/plugin-global-shortcut'
import { togglePlay, playSong } from '@/services/audioService'
import { usePlaylistStore } from '@shared'

let shortcutsReady = false
let setupPromise: Promise<void> | null = null

export function useGlobalShortcuts() {
  useEffect(() => {
    if (!isTauri() || shortcutsReady) return

    const registerPressed = async (shortcut: string, action: () => void) => {
      try {
        await register(shortcut, (event) => {
          if (event.state === 'Pressed') action()
        })
      } catch (error) {
        console.warn(`[shortcuts] 注册失败: ${shortcut}`, error)
      }
    }

    setupPromise ??= (async () => {
      await registerPressed('MediaPlayPause', () => {
        togglePlay()
      })
      await registerPressed('MediaNextTrack', () => {
          const { nextPlay, getCurrentSong } = usePlaylistStore.getState()
          nextPlay()
          const song = getCurrentSong()
          if (song) playSong(song)
      })
      await registerPressed('MediaPreviousTrack', () => {
          const { prevPlay, getCurrentSong } = usePlaylistStore.getState()
          prevPlay()
          const song = getCurrentSong()
          if (song) playSong(song)
      })
      shortcutsReady = true
    })().catch((error) => {
      setupPromise = null
      console.warn('[shortcuts] 初始化失败', error)
    })

    // Ctrl+D / Ctrl+Alt+L 由 Rust 原生层注册，主窗口隐藏或 WebView 重载也不会失效。
    // 此处只注册媒体键，且不能调用 unregisterAll 影响原生歌词快捷键。
  }, [])
}
