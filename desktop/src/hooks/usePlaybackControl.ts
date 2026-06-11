import { useCallback } from 'react'
import { usePlayerStore } from '@shared'
import { usePlaylistStore } from '@shared'
import { playSong, togglePlay as audioTogglePlay } from '@/services/audioService'
import { showToast } from '@/utils/toast'

/**
 * P1-11: 统一播放控制入口
 * 所有播放/暂停/切歌操作都通过此 hook 调用
 * 统一错误处理、状态管理、Toast 反馈
 */
export function usePlaybackControl() {
  const playerStore = usePlayerStore()
  const playlistStore = usePlaylistStore()

  /** 播放/暂停切换 */
  const playMusicEvent = useCallback(async () => {
    try {
      const currentSong = playlistStore.getCurrentSong()
      if (!currentSong) return

      if (playerStore.isPlay) {
        audioTogglePlay()
      } else {
        // 恢复播放
        audioTogglePlay()
      }
    } catch (error) {
      console.error('播放操作失败:', error)
      // 播放失败自动切下一首
      playlistStore.nextPlay()
      const nextSong = playlistStore.getCurrentSong()
      if (nextSong) playSong(nextSong)
    }
  }, [playerStore.isPlay, playlistStore])

  /** 下一首 */
  const handleNext = useCallback(() => {
    playlistStore.nextPlay()
    const song = playlistStore.getCurrentSong()
    if (song) playSong(song)
  }, [playlistStore])

  /** 上一首 */
  const handlePrev = useCallback(() => {
    playlistStore.prevPlay()
    const song = playlistStore.getCurrentSong()
    if (song) playSong(song)
  }, [playlistStore])

  /** 播放指定歌曲 */
  const handlePlaySong = useCallback((song: Parameters<typeof playSong>[0]) => {
    playSong(song)
  }, [])

  /** 播放指定索引的歌曲 */
  const handlePlayIndex = useCallback((index: number) => {
    playlistStore.setPlayListIndex(index)
    const song = playlistStore.getCurrentSong()
    if (song) playSong(song)
  }, [playlistStore])

  /** 切换播放模式 */
  const handleToggleMode = useCallback(() => {
    playlistStore.togglePlayMode()
    const modeNames = ['列表循环', '单曲循环', '随机播放']
    showToast('播放模式', modeNames[playlistStore.playMode])
  }, [playlistStore])

  /** 清空播放列表 */
  const handleClearAll = useCallback(() => {
    playlistStore.clearPlayAll()
    showToast('已清空', '播放列表已清空')
  }, [playlistStore])

  return {
    isPlaying: playerStore.isPlay,
    playMusicEvent,
    handleNext,
    handlePrev,
    handlePlaySong,
    handlePlayIndex,
    handleToggleMode,
    handleClearAll,
  }
}
