import { create } from 'zustand'
import type { SongResult } from '@shared'

const HISTORY_KEY = 'rannuan-play-history'
const MAX_HISTORY = 200

interface HistoryEntry {
  song: SongResult
  playedAt: number // P1-12: 播放时间戳
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

export function clearHistory() {
  localStorage.removeItem(HISTORY_KEY)
  usePlayHistoryStore.getState().setEntries([])
}

export function getHistory(): SongResult[] {
  return getStoredHistory().map((e) => e.song)
}

// P1-12: Zustand 响应式播放历史 store
interface PlayHistoryState {
  entries: HistoryEntry[]
  setEntries: (entries: HistoryEntry[]) => void
}

export const usePlayHistoryStore = create<PlayHistoryState>((set) => ({
  entries: getStoredHistory(),
  setEntries: (entries) => set({ entries }),
}))
