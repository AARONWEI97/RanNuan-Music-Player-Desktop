import type { SongResult } from '@shared'

const FAV_KEY = 'rannuan-favorites'

/** 内存缓存 */
let _cache: SongResult[] | null = null
let _idSet: Set<string> | null = null

let _writeTimer: ReturnType<typeof setTimeout> | null = null

function getCache(): SongResult[] {
  if (!_cache) {
    try {
      const raw = localStorage.getItem(FAV_KEY)
      if (!raw) { _cache = []; return _cache }
      const parsed = JSON.parse(raw)
      _cache = Array.isArray(parsed) ? parsed.filter((s: unknown) => s && typeof (s as SongResult).id !== 'undefined') : []
    } catch { _cache = [] }
  }
  return _cache
}

function getIdSet(): Set<string> {
  if (!_idSet) { _idSet = new Set(getCache().map(s => String(s.id))) }
  return _idSet
}

/** O(1) 哈希查找，零磁盘 IO */
export function isFavorite(id: string | number): boolean {
  return getIdSet().has(String(id))
}

/** 收藏 ID 集合，批量判断用 */
export function getFavoriteIdSet(): Set<string> {
  return getIdSet()
}

/** 防抖写入 localStorage（借鉴 AlgerMusicPlayer） */
function debouncedWrite(songs: SongResult[]) {
  if (_writeTimer) clearTimeout(_writeTimer)
  _writeTimer = setTimeout(() => {
    localStorage.setItem(FAV_KEY, JSON.stringify(songs))
    _writeTimer = null
  }, 2000)
}

/** 立即写入（页面卸载时） */
function flushWrite(songs: SongResult[]) {
  if (_writeTimer) { clearTimeout(_writeTimer); _writeTimer = null }
  localStorage.setItem(FAV_KEY, JSON.stringify(songs))
}

export function toggleFavorite(song: SongResult): boolean {
  const stored = getCache()
  const index = stored.findIndex((s) => s.id === song.id)
  if (index !== -1) {
    stored.splice(index, 1)
    // 保留并同步内存缓存。写入 localStorage 虽然防抖，但 UI 读取不能
    // 在这段时间内退回旧磁盘值，否则点击后会立即显示回未收藏。
    _idSet = new Set(stored.map((s) => String(s.id)))
    debouncedWrite([...stored])
    return false
  } else {
    stored.push(song)
    _idSet = new Set(stored.map((s) => String(s.id)))
    debouncedWrite([...stored])
    return true
  }
}

export function getFavorites(): SongResult[] {
  return getCache()
}

// 页面卸载时立即刷写
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => { if (_writeTimer) flushWrite(getCache()) })
}
