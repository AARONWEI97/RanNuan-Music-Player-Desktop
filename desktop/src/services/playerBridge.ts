/**
 * 主窗口侧的事件桥。
 *
 * 职责：
 *  1. 订阅 player/playlist store，节流广播 `player:state` 快照给副窗口
 *  2. 监听副窗口回发的 `panel:cmd`，分发到 audioService / stores
 *
 * 只能在主窗口调用（main.tsx 已按 ?w= 分流，副窗口不会走到这里）。
 */
import { usePlayerStore, usePlaylistStore, type SongResult, type ILyricText } from '@shared'
import { isTauri } from '@tauri-apps/api/core'
import { togglePlay, playSong, seekTo, setVolume } from './audioService'
import { isFavorite, toggleFavorite } from '@/store/favoritesStore'
import { thumbUrl } from '@/utils/image'
import {
  EVT_CMD,
  EVT_REQUEST_STATE,
  EVT_STATE,
  EVT_VIEWERS,
  type PanelCommand,
  type PanelSong,
  type PlayerSnapshot,
} from './panelProtocol'

/** 进度每秒变化多次，节流到 250ms 一帧足够面板流畅 */
const THROTTLE_MS = 250
/** 队列预览条数 */
const QUEUE_PREVIEW = 5
/** 歌词窗上下文行数（当前行前后各取几行） */
const LYRIC_CONTEXT = 3

let started = false
let lyricsOpen = false
/** 当前有几个副窗口在看（面板 + 歌词窗）。为 0 时不广播，省掉无谓的 IPC。 */
let consumers = 0

function toPanelSong(song: SongResult | null | undefined): PanelSong | null {
  if (!song) return null
  const pic = song.picUrl || song.al?.picUrl || song.album?.picUrl
  return {
    id: song.id,
    name: song.name || '',
    artist: song.ar?.map((a) => a.name).filter(Boolean).join(' / ') || '',
    picUrl: pic ? thumbUrl(pic) : undefined,
    album: song.al?.name,
  }
}

/** 二分定位当前歌词行 —— 与 FloatingLyrics 的线性扫描等价，但对长歌词更省 */
function findLyricIndex(times: number[], progress: number): number {
  let lo = 0
  let hi = times.length - 1
  let found = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (times[mid] <= progress) {
      found = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return found
}

function buildLyric(song: SongResult | null, progress: number): PlayerSnapshot['lyric'] {
  const lyric = song?.lyric
  const arr = lyric?.lrcArray
  const times = lyric?.lrcTimeArray
  if (!arr?.length || !times?.length) return null

  const active = findLyricIndex(times, progress)
  const start = Math.max(0, active - LYRIC_CONTEXT)
  const end = Math.min(arr.length, (active < 0 ? 0 : active) + LYRIC_CONTEXT + 1)

  const lines = arr.slice(start, end).map((l: ILyricText) => ({
    text: l.text || '',
    sub: l.trText || l.romaText || undefined,
  }))

  return { lines, index: active < 0 ? -1 : active - start }
}

function buildSnapshot(): PlayerSnapshot {
  const player = usePlayerStore.getState()
  const playlist = usePlaylistStore.getState()
  const song = player.playMusic

  // 「接下来播放」：优先展示 playNextQueue，再接主列表当前位置之后的歌
  const upcoming: SongResult[] = [
    ...playlist.playNextQueue,
    ...playlist.playList.slice(playlist.playListIndex + 1),
  ].slice(0, QUEUE_PREVIEW)

  return {
    song: toPanelSong(song),
    isPlay: player.isPlay,
    isLoading: player.isLoading,
    currentProgress: player.currentProgress,
    duration: player.duration,
    volume: player.volume,
    isMuted: player.isMuted,
    playMode: playlist.playMode,
    isFav: song?.id ? isFavorite(song.id) : false,
    queueTotal: playlist.playList.length,
    queue: upcoming.map(toPanelSong).filter((s): s is PanelSong => s !== null),
    lyric: buildLyric(song ?? null, player.currentProgress),
    lyricsWindowOpen: lyricsOpen,
  }
}

// ═══════════════ 广播 ═══════════════

let pending = false
let lastSent = 0
let timer: ReturnType<typeof setTimeout> | null = null
let emitFn: ((event: string, payload: unknown) => void) | null = null

async function ensureEmitter() {
  if (emitFn) return
  const { emit } = await import('@tauri-apps/api/event')
  emitFn = (event, payload) => { emit(event, payload).catch(() => {}) }
}

function flush() {
  pending = false
  lastSent = Date.now()
  if (timer) { clearTimeout(timer); timer = null }
  const snapshot = buildSnapshot()
  ensureEmitter().then(() => emitFn?.(EVT_STATE, snapshot))
}

/** 请求广播一次快照。
 *
 * `force` 用于 Rust 的 request-state —— 那一刻副窗口尚未 show，consumers 还是 0，
 * 但我们恰恰需要在它显示前把状态推过去。
 */
export function pushPlayerState(immediate = false, force = false) {
  if (!isTauri()) return
  // 没有副窗口在看时不广播，避免播放期间每秒 4 次无谓 IPC
  if (!force && consumers <= 0) return
  if (immediate) { flush(); return }

  if (pending) return
  pending = true

  const elapsed = Date.now() - lastSent
  const wait = Math.max(0, THROTTLE_MS - elapsed)
  timer = setTimeout(flush, wait)
}

// ═══════════════ 命令分发 ═══════════════

function playAt(index: number) {
  const playlist = usePlaylistStore.getState()
  const song = playlist.playList[index]
  if (!song) return
  playlist.setPlayListIndex(index)
  playSong(song as SongResult)
}

async function handleCommand(cmd: PanelCommand) {
  const playlist = usePlaylistStore.getState()
  const player = usePlayerStore.getState()

  switch (cmd.type) {
    case 'toggle-play':
      if (player.playMusic) togglePlay()
      break

    case 'next': {
      if (playlist.playList.length === 0) break
      playlist.nextPlay()
      const song = usePlaylistStore.getState().getCurrentSong()
      if (song) playSong(song)
      break
    }

    case 'prev': {
      if (playlist.playList.length === 0) break
      playlist.prevPlay()
      const song = usePlaylistStore.getState().getCurrentSong()
      if (song) playSong(song)
      break
    }

    case 'seek':
      if (player.duration > 0) seekTo(Math.max(0, Math.min(player.duration, cmd.ms)))
      break

    case 'set-volume': {
      const v = Math.max(0, Math.min(1, cmd.volume))
      player.setVolume(v)
      player.setIsMuted(false)
      setVolume(v)
      break
    }

    case 'toggle-mute': {
      const muted = !player.isMuted
      player.setIsMuted(muted)
      setVolume(muted ? 0 : (player.volume || 0.5))
      break
    }

    case 'toggle-fav':
      if (player.playMusic) {
        toggleFavorite(player.playMusic)
        // favoritesStore 是普通模块、不是 zustand store，改动不会触发
        // 下面注册的 subscribe 广播。必须手动推一次，否则面板红心不变色。
        pushPlayerState()
      }
      break

    case 'cycle-mode':
      playlist.setPlayMode((playlist.playMode + 1) % 3)
      break

    case 'play-index':
      playAt(cmd.index)
      break

    case 'play-by-id': {
      // 在 playList 里按 ID 查找歌曲并播放
      const idx = playlist.playList.findIndex(s => s.id === cmd.id)
      if (idx >= 0) {
        playAt(idx)
      } else {
        // playNextQueue 里的歌曲暂不支持直接点击播放（会在下一首自然播放）
        console.warn('[bridge] play-by-id: 歌曲不在主列表中', cmd.id)
      }
      break
    }

    case 'toggle-lyrics':
      await setLyricsWindow(!lyricsOpen)
      break
  }

  // 命令必然改变状态，立刻回推一帧，面板无需等节流窗口
  pushPlayerState(true, true)
}

// ═══════════════ 桌面歌词窗口 ═══════════════

/** Rust 是歌词窗可见性的唯一权威来源，每次操作后都向 Rust 确认真实状态。 */
async function syncLyricsState(): Promise<boolean> {
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    lyricsOpen = await invoke<boolean>('is_lyrics_window_open')
  } catch {
    // invoke 失败（非 Tauri 环境 / 命令未注册），保持现有值
  }
  return lyricsOpen
}

/** 打开/关闭独立桌面歌词窗口。返回 Rust 确认后的真实状态。 */
export async function setLyricsWindow(open: boolean): Promise<boolean> {
  if (!isTauri()) return false
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke(open ? 'open_lyrics_window' : 'close_lyrics_window')
  } catch (e) {
    console.warn('[bridge] 切换桌面歌词窗口失败:', e)
  }
  // 以 Rust 真实可见性为准，不信任本地 open 参数
  await syncLyricsState()
  pushPlayerState(true, true)
  return lyricsOpen
}

export function isLyricsWindowOpen() {
  return lyricsOpen
}

// ═══════════════ 启动 ═══════════════

/**
 * 在主窗口挂载。真正的单例 —— 重复调用直接返回。
 *
 * 刻意不提供 teardown：Tauri 的 `listen` 是异步注册的，若在 StrictMode 的
 * 双次挂载中拆掉 `started` 标志却没能同步注销监听器，就会出现两份
 * `panel:cmd` 处理器，一次「下一首」会跳两首歌。桥的生命周期本就等同于
 * 主窗口，注册一次、常驻即可。
 */
export function startPlayerBridge() {
  if (started || !isTauri()) return
  started = true

  // 启动时向 Rust 同步一次真实歌词窗状态，避免热重载/重启时 JS 状态陈旧
  syncLyricsState().then(() => pushPlayerState(true, true))

  // store 变化 → 节流广播
  usePlayerStore.subscribe(() => pushPlayerState())
  usePlaylistStore.subscribe(() => pushPlayerState())

  // 副窗口命令 / Rust 的重发请求 / 可见副窗口数变化
  import('@tauri-apps/api/event').then(({ listen }) => {
    listen<PanelCommand>(EVT_CMD, (e) => {
      if (e.payload) handleCommand(e.payload)
    })
    // force=true：此刻副窗口尚未 show，consumers 还是 0，但正需要这一帧
      listen(EVT_REQUEST_STATE, () => pushPlayerState(true, true))
      listen<boolean>('lyrics:visible-state', (e) => {
        lyricsOpen = e.payload
        pushPlayerState(true, true)
      })
      listen<number>(EVT_VIEWERS, (e) => {
      consumers = e.payload ?? 0
      // 当所有副窗口都不可见时，向 Rust 确认一次歌词窗真实状态，
      // 而不是粗暴地把 lyricsOpen 设为 false。
      // 场景：面板关了但歌词窗还开着 → consumers=1，不走这里；
      //       两者都关了 → consumers=0，向 Rust 查询确认。
      if (consumers === 0) {
        syncLyricsState().then(() => pushPlayerState(true, true))
      }
    })
  })

  // 收藏是 localStorage + 内存缓存，不走 Zustand，靠面板命令后的 immediate push 覆盖

  pushPlayerState(true, true)
}
