/**
 * 主窗口 ⇄ 宇宙相册 iframe 的消息契约。
 * 与 RanRan `src/bridge/protocol.ts` 保持字段一致。
 */

export const UNIVERSE_CHANNEL = 'ranran-universe'

export const UNIVERSE_READY = 'universe:ready'
export const UNIVERSE_STATE = 'universe:state'
export const UNIVERSE_THEME = 'universe:theme'
export const UNIVERSE_SEARCH_RESULT = 'universe:search-result'
export const UNIVERSE_CMD = 'universe:cmd'

export type DesktopThemeId = 'dog-light' | 'dog-dark' | 'light' | 'dark' | string

export interface UniverseSong {
  id: string | number
  name: string
  artist: string
  picUrl?: string
  album?: string
}

export interface UniverseLyricLine {
  text: string
  sub?: string
}

export interface UniverseSnapshot {
  song: UniverseSong | null
  isPlay: boolean
  isLoading: boolean
  /** 毫秒 */
  currentProgress: number
  /** 毫秒 */
  duration: number
  lyric: { lines: UniverseLyricLine[]; index: number } | null
  theme: DesktopThemeId
  /**
   * 节拍能量 0~1。注意：主播放器是跨域流媒体，无法挂 Web Audio 分析器
   *（createMediaElementSource 会让无 CORS 头的流静音），此值为按进度合成的伪节拍。
   */
  energy?: number
}

export type UniverseCommand =
  | { type: 'toggle-play' }
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'search'; requestId: string; keywords: string }
  | { type: 'play-song'; song: UniverseSong }

export interface UniverseSearchResult {
  requestId: string
  songs: UniverseSong[]
}

export interface UniverseHostMessage {
  channel: typeof UNIVERSE_CHANNEL
  type: typeof UNIVERSE_STATE | typeof UNIVERSE_THEME | typeof UNIVERSE_SEARCH_RESULT
  snapshot?: UniverseSnapshot
  theme?: DesktopThemeId
  search?: UniverseSearchResult
}

export interface UniverseFrameMessage {
  channel: typeof UNIVERSE_CHANNEL
  type: typeof UNIVERSE_READY | typeof UNIVERSE_CMD
  cmd?: UniverseCommand
}

export const EMPTY_UNIVERSE_SNAPSHOT: UniverseSnapshot = {
  song: null,
  isPlay: false,
  isLoading: false,
  currentProgress: 0,
  duration: 0,
  lyric: null,
  theme: 'dog-light',
}
