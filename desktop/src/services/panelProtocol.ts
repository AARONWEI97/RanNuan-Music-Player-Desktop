/**
 * 主窗口 ⇄ 副窗口（托盘面板 / 桌面歌词）之间传输的数据契约。
 *
 * 副窗口是独立 webview，JS 上下文与主窗口完全隔离，读不到 Zustand store。
 * 主窗口持有唯一的 HTMLAudioElement，是唯一真相源；副窗口只负责渲染快照
 * 和回发命令。所有跨窗口数据都必须能被 structured clone 序列化。
 */

/** 主窗口 → 副窗口：播放状态快照 */
export const EVT_STATE = 'player:state'
/** 副窗口 → 主窗口：控制命令 */
export const EVT_CMD = 'panel:cmd'
/** Rust → 主窗口：副窗口即将显示，请重发一次全量快照 */
export const EVT_REQUEST_STATE = 'panel:request-state'
/** Rust → 主窗口：当前可见副窗口数量（0 时主窗口停止广播） */
export const EVT_VIEWERS = 'panel:viewers'

export interface PanelSong {
  id: string | number
  name: string
  artist: string
  picUrl?: string
  album?: string
}

export interface PanelLyricLine {
  text: string
  sub?: string
}

export interface PlayerSnapshot {
  song: PanelSong | null
  isPlay: boolean
  isLoading: boolean
  /** 毫秒 */
  currentProgress: number
  /** 毫秒 */
  duration: number
  volume: number
  isMuted: boolean
  /** 0=列表循环 1=单曲循环 2=随机 */
  playMode: number
  isFav: boolean
  /** 队列总长度（用于角标显示，queue 本身是裁剪过的） */
  queueTotal: number
  /** 当前歌曲之后的若干首，用于面板「接下来播放」预览 */
  queue: PanelSong[]
  /** 当前歌词行 + 上下文行（歌词窗用），index 指向 lines 中的当前行 */
  lyric: { lines: PanelLyricLine[]; index: number } | null
  lyricsWindowOpen: boolean
}

export type PanelCommand =
  | { type: 'toggle-play' }
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'seek'; ms: number }
  | { type: 'set-volume'; volume: number }
  | { type: 'toggle-mute' }
  | { type: 'toggle-fav' }
  | { type: 'cycle-mode' }
  | { type: 'play-index'; index: number }
  /** 队列面板点击某首歌：按 ID 在 playList / playNextQueue 里找到并播放 */
  | { type: 'play-by-id'; id: string | number }
  | { type: 'toggle-lyrics' }

export const EMPTY_SNAPSHOT: PlayerSnapshot = {
  song: null,
  isPlay: false,
  isLoading: false,
  currentProgress: 0,
  duration: 0,
  volume: 0.5,
  isMuted: false,
  playMode: 0,
  isFav: false,
  queueTotal: 0,
  queue: [],
  lyric: null,
  lyricsWindowOpen: false,
}
