import { create } from 'zustand'
import type { SongResult } from '@shared'

const HISTORY_KEY = 'rannuan-play-history'
const PLAY_EVENTS_KEY = 'rannuan-play-events-v1'
const MAX_HISTORY = 200
const MAX_PLAY_EVENTS = 10000

interface HistoryEntry {
  song: SongResult
  playedAt: number // P1-12: 播放时间戳
}

export interface PlayEvent {
  songId: number | string
  playedAt: number
}

function getStoredHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (e): e is HistoryEntry =>
        e && typeof e === 'object' && e.song && typeof e.song.id !== 'undefined'
    )
  } catch {
    return []
  }
}

function setStoredHistory(history: HistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)))
}

function getStoredPlayEvents(): PlayEvent[] {
  try {
    const raw = localStorage.getItem(PLAY_EVENTS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (event): event is PlayEvent =>
            event && typeof event === 'object' &&
            typeof event.songId !== 'undefined' &&
            Number.isFinite(Number(event.playedAt))
        )
      }
    }

    // Migrate the existing recent-play list so the heatmap is useful immediately.
    const migrated = getStoredHistory().map((entry) => ({
      songId: entry.song.id,
      playedAt: entry.playedAt,
    }))
    if (migrated.length > 0) {
      localStorage.setItem(PLAY_EVENTS_KEY, JSON.stringify(migrated))
    }
    return migrated
  } catch {
    return []
  }
}

function setStoredPlayEvents(events: PlayEvent[]) {
  localStorage.setItem(PLAY_EVENTS_KEY, JSON.stringify(events.slice(0, MAX_PLAY_EVENTS)))
}

export function addToHistory(song: SongResult) {
  const prev = getStoredHistory()
  // P1-12: 去重并添加时间戳
  const filtered = prev.filter((e) => e.song.id !== song.id)
  const entry: HistoryEntry = { song, playedAt: Date.now() }
  const next = [entry, ...filtered]
  setStoredHistory(next)
  // 同步更新 Zustand store
  usePlayHistoryStore.getState().setEntries(next)
}

/** Record a successful playback for daily listening statistics. */
export function recordSuccessfulPlay(song: SongResult) {
  addToHistory(song)
  const now = Date.now()
  const prev = getStoredPlayEvents()
  const latest = prev[0]
  if (latest && String(latest.songId) === String(song.id) && now - latest.playedAt < 10_000) {
    return
  }
  const next = [{ songId: song.id, playedAt: now }, ...prev]
  setStoredPlayEvents(next)
  usePlayEventStore.getState().setEvents(next)
}

export function clearHistory() {
  localStorage.removeItem(HISTORY_KEY)
  localStorage.removeItem(PLAY_EVENTS_KEY)
  usePlayHistoryStore.getState().setEntries([])
  usePlayEventStore.getState().setEvents([])
}

export function getHistory(): SongResult[] {
  return getStoredHistory().map((e) => e.song)
}

// P1-12: Zustand 响应式播放历史 store
interface PlayHistoryState {
  entries: HistoryEntry[]
  setEntries: (entries: HistoryEntry[]) => void
}

interface PlayEventState {
  events: PlayEvent[]
  setEvents: (events: PlayEvent[]) => void
}

export const usePlayHistoryStore = create<PlayHistoryState>((set) => ({
  entries: getStoredHistory(),
  setEntries: (entries) => set({ entries }),
}))

export const usePlayEventStore = create<PlayEventState>((set) => ({
  events: getStoredPlayEvents(),
  setEvents: (events) => set({ events }),
}))
