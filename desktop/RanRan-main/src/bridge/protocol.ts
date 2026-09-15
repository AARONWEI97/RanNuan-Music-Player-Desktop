/** 与 desktop/src/services/universeProtocol.ts 保持字段一致。 */

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
  currentProgress: number
  duration: number
  lyric: { lines: UniverseLyricLine[]; index: number } | null
  theme: DesktopThemeId
  /** 节拍能量 0~1（桌面端合成伪节拍：跨域流媒体挂不了分析器） */
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

export const isEmbedded =
  typeof window !== 'undefined' && window.parent !== window
