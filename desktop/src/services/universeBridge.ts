/**
 * 宇宙相册 iframe 桥：把桌面端播放状态推给 RanRan，并执行它回发的播放/搜索命令。
 */
import { getSearch, usePlayerStore, usePlaylistStore, useSettingsStore, type SongResult, type ILyricText } from '@shared'
import { playSong, togglePlay } from './audioService'
import { getFavorites } from '@/store/favoritesStore'
import { getHistory } from '@/store/historyStore'
import { coverUrl } from '@/utils/image'
import {
  EMPTY_UNIVERSE_SNAPSHOT,
  UNIVERSE_CHANNEL,
  UNIVERSE_CMD,
  UNIVERSE_READY,
  UNIVERSE_SEARCH_RESULT,
  UNIVERSE_STATE,
  type UniverseCommand,
  type UniverseFrameMessage,
  type UniverseHostMessage,
  type UniverseSnapshot,
  type UniverseSong,
} from './universeProtocol'

const THROTTLE_MS = 250
const LYRIC_CONTEXT = 2

interface SearchResponse {
  result?: { songs?: SongResult[] }
  songs?: SongResult[]
}

const songCache = new Map<string, SongResult>()
let target: Window | null = null
let pending = false
let lastSent = 0
let timer: ReturnType<typeof setTimeout> | null = null
let started = false
let unsubFns: Array<() => void> = []

function toUniverseSong(song: SongResult | null | undefined): UniverseSong | null {
  if (!song?.id) return null
  const pic = song.picUrl || song.al?.picUrl || song.album?.picUrl
  return {
    id: song.id,
    name: song.name || '',
    artist: song.ar?.map((a) => a.name).filter(Boolean).join(' / ')
      || song.artists?.map((a) => a.name).filter(Boolean).join(' / ')
      || '',
    picUrl: pic ? coverUrl(pic) : undefined,
    album: song.al?.name || song.album?.name,
  }
}

function findLyricIndex(times: number[], progressMs: number): number {
  let lo = 0
  let hi = times.length - 1
  let found = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (times[mid] <= progressMs) {
      found = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return found
}

function buildLyric(song: SongResult | null, progress: number): UniverseSnapshot['lyric'] {
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

function remember(song: SongResult | undefined) {
  if (!song?.id) return
  songCache.set(String(song.id), song)
}

// 合成节拍能量 0~1：主播放器是跨域流媒体，挂 Web Audio 分析器会导致静音，
// 只能按播放进度生成伪节拍（≈114 BPM 鼓点 + 4 拍一循环的强弱起伏），相位锁定进度故不漂移。
function computeBeatEnergy(isPlay: boolean, hasSong: boolean, progressMs: number): number {
  if (!isPlay || !hasSong) return 0
  const t = progressMs / 1000
  const beat = Math.pow(0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 1.9), 3)
  const bar = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 0.475)
  return Math.min(1, 0.25 + 0.45 * beat + 0.25 * bar * beat)
}

export function buildUniverseSnapshot(): UniverseSnapshot {
  const player = usePlayerStore.getState()
  const song = player.playMusic
  remember(song || undefined)
  return {
    song: toUniverseSong(song),
    isPlay: player.isPlay,
    isLoading: player.isLoading,
    currentProgress: player.currentProgress,
    duration: player.duration,
    lyric: buildLyric(song ?? null, player.currentProgress),
    theme: useSettingsStore.getState().theme,
    energy: computeBeatEnergy(player.isPlay, !!song, player.currentProgress),
  }
}

function postToFrame(message: UniverseHostMessage) {
  if (!target) return
  target.postMessage(message, window.location.origin)
}

function flush() {
  pending = false
  lastSent = Date.now()
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  postToFrame({
    channel: UNIVERSE_CHANNEL,
    type: UNIVERSE_STATE,
    snapshot: target ? buildUniverseSnapshot() : EMPTY_UNIVERSE_SNAPSHOT,
  })
}

export function pushUniverseState(immediate = false) {
  if (!target) return
  if (immediate) {
    flush()
    return
  }
  if (pending) return
  pending = true
  const wait = Math.max(0, THROTTLE_MS - (Date.now() - lastSent))
  timer = setTimeout(flush, wait)
}

function playAt(index: number) {
  const playlist = usePlaylistStore.getState()
  const song = playlist.playList[index]
  if (!song) return
  playlist.setPlayListIndex(index)
  playSong(song as SongResult)
}

async function playResolved(song: SongResult, extras: SongResult[] = []) {
  remember(song)
  extras.forEach(remember)
  const playlist = usePlaylistStore.getState()
  const existing = playlist.playList.findIndex((item) => String(item.id) === String(song.id))
  if (existing >= 0) {
    playAt(existing)
    return
  }
  const queue = extras.length > 0 ? extras : [song, ...playlist.playList]
  const index = queue.findIndex((item) => String(item.id) === String(song.id))
  playlist.setPlayList(queue)
  playlist.setPlayListIndex(index >= 0 ? index : 0)
  await playSong(song)
}

async function searchSongs(keywords: string): Promise<SongResult[]> {
  const collected: SongResult[] = []
  const seen = new Set<string>()
  const push = (song: SongResult | undefined) => {
    if (!song?.id || seen.has(String(song.id))) return
    seen.add(String(song.id))
    remember(song)
    collected.push(song)
  }

  const query = keywords.trim()
  if (query) {
    try {
      const response = await getSearch({ keywords: query, type: 1, limit: 12, offset: 0 })
      const data = response.data as SearchResponse
      const songs = data.result?.songs ?? data.songs ?? []
      songs.forEach(push)
    } catch (error) {
      console.warn('[universe] search failed', error)
    }
  }

  if (collected.length < 8) {
    getFavorites().slice(-8).reverse().forEach(push)
    getHistory().slice(0, 8).forEach(push)
  }

  return collected.slice(0, 16)
}

async function handleCommand(cmd: UniverseCommand) {
  const playlist = usePlaylistStore.getState()
  const player = usePlayerStore.getState()

  switch (cmd.type) {
    case 'toggle-play': {
      const current = player.playMusic || playlist.getCurrentSong()
      if (current) togglePlay()
      break
    }
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
    case 'search': {
      const songs = await searchSongs(cmd.keywords)
      postToFrame({
        channel: UNIVERSE_CHANNEL,
        type: UNIVERSE_SEARCH_RESULT,
        search: {
          requestId: cmd.requestId,
          songs: songs.map(toUniverseSong).filter((item): item is UniverseSong => item !== null),
        },
      })
      break
    }
    case 'play-song': {
      const cached = songCache.get(String(cmd.song.id))
      if (cached) {
        await playResolved(cached)
        break
      }
      const keywords = `${cmd.song.name} ${cmd.song.artist}`.trim()
      const songs = await searchSongs(keywords)
      const matched = songs.find((item) => String(item.id) === String(cmd.song.id)) || songs[0]
      if (matched) await playResolved(matched, songs)
      break
    }
  }

  pushUniverseState(true)
}

function onMessage(event: MessageEvent) {
  if (event.origin !== window.location.origin) return
  const data = event.data as UniverseFrameMessage | { type?: string }
  if (!data || typeof data !== 'object') return

  // 兼容旧版一次性 search-play
  if ((data as { type?: string }).type === 'ranran:search-play') {
    const legacy = data as { title?: string; artist?: string }
    void handleCommand({
      type: 'search',
      requestId: `legacy-${Date.now()}`,
      keywords: `${legacy.title || ''} ${legacy.artist || ''}`.trim(),
    })
    return
  }

  const message = data as UniverseFrameMessage
  if (message.channel !== UNIVERSE_CHANNEL) return
  if (message.type === UNIVERSE_READY) {
    pushUniverseState(true)
    return
  }
  if (message.type === UNIVERSE_CMD && message.cmd) {
    void handleCommand(message.cmd)
  }
}

export function attachUniverseBridge(frameWindow: Window | null) {
  target = frameWindow
  if (!started) {
    started = true
    window.addEventListener('message', onMessage)
    unsubFns = [
      usePlayerStore.subscribe(() => pushUniverseState()),
      usePlaylistStore.subscribe(() => pushUniverseState()),
      useSettingsStore.subscribe(() => pushUniverseState(true)),
    ]
  }
  if (frameWindow) pushUniverseState(true)

  return () => {
    if (target === frameWindow) target = null
  }
}

export function detachUniverseBridge() {
  target = null
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  // 取消 store 订阅并复位，下次 attach 重新订阅，避免离开页面后空推快照
  if (started) {
    unsubFns.forEach((unsub) => unsub())
    unsubFns = []
    started = false
    window.removeEventListener('message', onMessage)
  }
  pending = false
}
