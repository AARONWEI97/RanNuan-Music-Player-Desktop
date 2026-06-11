import { useEffect } from 'react'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { usePlayerStore, usePlaylistStore } from '@shared'
import { togglePlay, playSong } from '@/services/audioService'

/**
 * 监听系统托盘菜单触发的播放控制事件
 * 在 App.tsx 根组件中调用一次即可
 */
export function useTrayEvents() {
  useEffect(() => {
    const unlisteners: UnlistenFn[] = []

    // ⏯ 播放 / 暂停
    listen('tray:play-pause', () => {
      const player = usePlayerStore.getState()
      if (player.playMusic) {
        togglePlay()
      }
    }).then((fn) => unlisteners.push(fn))

    // ⏭ 下一首
    listen('tray:next', () => {
      const playlist = usePlaylistStore.getState()
      if (playlist.playList.length === 0) return
      playlist.nextPlay()
      const song = playlist.getCurrentSong()
      if (song) playSong(song)
    }).then((fn) => unlisteners.push(fn))

    // ⏮ 上一首
    listen('tray:prev', () => {
      const playlist = usePlaylistStore.getState()
      if (playlist.playList.length === 0) return
      playlist.prevPlay()
      const song = playlist.getCurrentSong()
      if (song) playSong(song)
    }).then((fn) => unlisteners.push(fn))

    return () => {
      unlisteners.forEach((fn) => fn())
    }
  }, [])
}
