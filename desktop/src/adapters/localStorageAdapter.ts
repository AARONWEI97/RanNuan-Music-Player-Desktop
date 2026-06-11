import type { StorageAdapter } from '@shared'

// P0-4: 防抖 localStorage 写入
// 高频状态变更（进度、音量等）不会每次都触发 localStorage.setItem
// 而是先缓存到 pendingWrites，2 秒后批量写入
const pendingWrites = new Map<string, string>()
let flushTimer: ReturnType<typeof setTimeout> | null = null

function flushPendingWrites() {
  pendingWrites.forEach((value, key) => {
    try {
      localStorage.setItem(key, value)
    } catch { /* ignore quota errors */ }
  })
  pendingWrites.clear()
  flushTimer = null
}

function debouncedSetItem(key: string, value: string) {
  pendingWrites.set(key, value)
  if (!flushTimer) {
    flushTimer = setTimeout(flushPendingWrites, 2000)
  }
}

// 页面卸载前立即写入
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (flushTimer) {
      clearTimeout(flushTimer)
      flushPendingWrites()
    }
  })
}

export const localStorageAdapter: StorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    try {
      // 优先从待写入缓存中读取最新值
      if (pendingWrites.has(key)) {
        return pendingWrites.get(key)!
      }
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    debouncedSetItem(key, value)
  },

  async removeItem(key: string): Promise<void> {
    pendingWrites.delete(key)
    try {
      localStorage.removeItem(key)
    } catch { /* ignore */ }
  },

  async getAllKeys(): Promise<string[]> {
    try {
      return Object.keys(localStorage)
    } catch {
      return []
    }
  },

  async multiRemove(keys: string[]): Promise<void> {
    try {
      for (const key of keys) {
        pendingWrites.delete(key)
        localStorage.removeItem(key)
      }
    } catch { /* ignore */ }
  },
}
