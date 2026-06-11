import { usePlayerStore, usePlaylistStore, type SongResult } from '@shared'

const SESSION_KEY = 'rannuan-player-session'

interface SavedSong {
  id: string | number
  name: string
  picUrl?: string
  ar?: { id: number; name: string }[]
  al?: { id: number; name: string; picUrl?: string }
  dt?: number
  duration?: number
  source?: string
}

interface SavedPlaylistItem {
  id: string | number
  name: string
  picUrl?: string
  ar?: { id: number; name: string }[]
  al?: { id: number; name: string; picUrl?: string }
  dt?: number
  duration?: number
  source?: string
}

interface SessionData {
  song: SavedSong | null
  playMusicUrl: string
  playList: SavedPlaylistItem[]
  playListIndex: number
  playMode: number
  currentProgress: number
  volume: number
  isMuted: boolean
  playbackRate: number
  timestamp: number
}

/** 保存当前播放会话到 localStorage（同步、防抖由 audioService 控制调用时机） */
export function saveSession(): void {
  try {
    const player = usePlayerStore.getState()
    const playlist = usePlaylistStore.getState()
    if (!player.playMusic) return

    const song = player.playMusic
    const data: SessionData = {
      song: {
        id: song.id,
        name: song.name,
        picUrl: song.picUrl || (song as SongResult).al?.picUrl,
        ar: song.ar?.map((a) => ({ id: a.id, name: a.name })),
        al: song.al ? { id: song.al.id, name: song.al.name, picUrl: song.al.picUrl } : undefined,
        dt: song.dt,
        duration: song.duration,
        source: song.source,
      },
      playMusicUrl: player.playMusicUrl,
      playList: playlist.playList.map((s) => ({
        id: s.id,
        name: s.name,
        picUrl: s.picUrl,
        ar: s.ar?.map((a) => ({ id: a.id, name: a.name })),
        al: s.al ? { id: s.al.id, name: s.al.name, picUrl: s.al.picUrl } : undefined,
        dt: s.dt,
        duration: s.duration,
        source: s.source,
      })),
      playListIndex: playlist.playListIndex,
      playMode: playlist.playMode,
      currentProgress: player.currentProgress,
      volume: player.volume,
      isMuted: player.isMuted,
      playbackRate: player.playbackRate,
      timestamp: Date.now(),
    }

    localStorage.setItem(SESSION_KEY, JSON.stringify(data))
  } catch {
    // 静默失败，不影响播放
  }
}

/** 读取保存的会话数据 */
export function loadSession(): SessionData | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as SessionData
    if (!data || !data.song) return null
    return data
  } catch {
    return null
  }
}

/** 清除保存的会话（用于重置等场景） */
export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // 静默失败
  }
}

// ★ 页面关闭前强制保存当前会话（兜底）
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    saveSession()
  })
}

/**
 * 恢复播放会话 — 在 App.tsx 启动时调用
 * 返回 true 表示成功恢复了会话
 */
export async function restoreSession(): Promise<boolean> {
  const session = loadSession()
  if (!session) {
    console.log('[Session] 无保存的会话')
    return false
  }

  console.log(
    '[Session] 发现保存的会话：',
    session.song?.name,
    `playlist[${session.playList.length}]`,
    `mode=${session.playMode}`,
  )

  const playlistState = usePlaylistStore.getState()

  // ★ 优先使用 Zustand persist 的 playList（数据更完整），session 作为 fallback
  if (playlistState.playList.length === 0 && session.playList.length > 0) {
    playlistState.setPlayList(session.playList as SongResult[], true)
  }

  // 恢复播放模式和音量
  usePlaylistStore.getState().setPlayMode(session.playMode)
  usePlayerStore.getState().setVolume(session.volume)
  usePlayerStore.getState().setIsMuted(session.isMuted)
  usePlayerStore.getState().setPlaybackRate(session.playbackRate)
  usePlayerStore.getState().setCurrentProgress(session.currentProgress)

  // 恢复当前歌曲
  const playlist = usePlaylistStore.getState()
  if (playlist.playList.length === 0) {
    console.log('[Session] 播放列表为空，无法恢复')
    return false
  }

  // 定位当前歌曲
  let currentSong: SongResult | undefined
  let currentIndex = playlist.playListIndex

  // 先尝试通过 index 找到歌曲
  if (currentIndex >= 0 && currentIndex < playlist.playList.length) {
    const song = playlist.playList[currentIndex]
    if (song && song.id === session.song!.id) {
      currentSong = song as SongResult
    }
  }

  // 如果 index 不匹配，遍历查找
  if (!currentSong) {
    currentIndex = playlist.playList.findIndex((s) => s.id === session.song!.id)
    if (currentIndex >= 0) {
      currentSong = playlist.playList[currentIndex] as SongResult
      usePlaylistStore.getState().setPlayListIndex(currentIndex)
    }
  }

  if (!currentSong) {
    console.log('[Session] 未找到当前歌曲，作为第一首')
    currentIndex = 0
    currentSong = playlist.playList[0] as SongResult
    usePlaylistStore.getState().setPlayListIndex(0)
  }

  // 设置 song 的基本信息
  currentSong.playMusicUrl = session.playMusicUrl

  // ★ 调用 playSong 完成 URL 解析 + 设置 audio.src，但不自动播放
  const { playSong } = await import('./audioService')
  currentSong.playMusicUrl = session.playMusicUrl
  await playSong(currentSong, 0, false) // autoPlay=false → 只设置 src，不播放

  console.log('[Session] ✅ 会话恢复完成（已暂停，src 已就绪，点击播放即可）')
  return true
}
