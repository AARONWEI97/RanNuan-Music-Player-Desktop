const DB_NAME = 'RanNuanMusicDB'
const DB_VERSION = 2
let dbPromise: Promise<IDBDatabase> | null = null

interface CacheEntry<T> {
  id: string | number
  data: T
  timestamp: number
}

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('artist')) {
        db.createObjectStore('artist', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('homepage')) {
        db.createObjectStore('homepage', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('localfiles')) {
        db.createObjectStore('localfiles')
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  return dbPromise
}

// ── 本地音乐文件存储（无 TTL）──
export async function storeLocalFile(id: string, arrayBuffer: ArrayBuffer): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('localfiles', 'readwrite')
    const store = tx.objectStore('localfiles')
    const req = store.put(arrayBuffer, id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function loadLocalFile(id: string): Promise<ArrayBuffer | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('localfiles', 'readonly')
    const store = tx.objectStore('localfiles')
    const req = store.get(id)
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => reject(req.error)
  })
}

export async function removeLocalFile(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('localfiles', 'readwrite')
    const store = tx.objectStore('localfiles')
    const req = store.delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

/** 写入缓存，带 TTL（默认 5 分钟） */
export async function setCache<T>(
  storeName: string,
  key: string | number,
  data: T,
  ttlMinutes = 5
): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const entry: CacheEntry<T> = {
      id: key,
      data,
      timestamp: Date.now() + ttlMinutes * 60 * 1000,
    }
    const req = store.put(entry)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

/** 读取缓存，过期返回 null */
export async function getCache<T>(
  storeName: string,
  key: string | number
): Promise<T | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const req = store.get(key)
    req.onsuccess = () => {
      const entry = req.result as CacheEntry<T> | undefined
      if (entry && Date.now() < entry.timestamp) {
        resolve(entry.data)
      } else {
        resolve(null)
      }
    }
    req.onerror = () => reject(req.error)
  })
}

/** 删除缓存 */
export async function deleteCache(
  storeName: string,
  key: string | number
): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const req = store.delete(key)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}
