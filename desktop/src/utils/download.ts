import { showToast } from './toast'

/* ─── 下载任务状态 ─── */
export type DownloadState = 'queued' | 'downloading' | 'completed' | 'failed' | 'cancelled'

export interface SongMeta {
  picUrl?: string
  album?: string
}

export interface DownloadTask {
  taskId: string
  songId: number
  songName: string
  artist?: string
  url: string
  state: DownloadState
  progress: number
  loaded: number
  total: number
  createdAt: number
  blobUrl?: string
  error?: string
  // 歌曲元信息（传给完成记录）
  picUrl?: string
  album?: string
}

type ProgressCallback = (taskId: string, progress: number, loaded: number, total: number) => void
type StateCallback = (taskId: string, state: DownloadState, error?: string) => void
export type TaskQueuedCallback = (task: DownloadTask) => void  // ★ 任务入队时通知 store

/* ─── 内部并发控制 ─── */
const MAX_CONCURRENT = 2
const queue: DownloadTask[] = []
const controllers: Map<string, AbortController> = new Map()
let running = 0

let onProgress: ProgressCallback | null = null
let onStateChange: StateCallback | null = null
let onTaskQueued: TaskQueuedCallback | null = null

export function setDownloadCallbacks(
  progress: ProgressCallback,
  state: StateCallback,
  queued: TaskQueuedCallback,
) {
  onProgress = progress
  onStateChange = state
  onTaskQueued = queued
}

function taskId(songId: number): string {
  return `dl_${songId}_${Date.now()}`
}

/* ─── 核心下载逻辑 ─── */
async function doDownload(task: DownloadTask) {
  const controller = new AbortController()
  controllers.set(task.taskId, controller)

  try {
    console.log(`[Download] Starting: "${task.songName}" → ${task.url.substring(0, 60)}...`)
    const resp = await fetch(task.url, { signal: controller.signal })

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    if (!resp.body) throw new Error('No readable stream')

    const total = Number(resp.headers.get('content-length') || 0)
    const reader = resp.body.getReader()
    const chunks: Uint8Array[] = []
    let loaded = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      loaded += value.length
      if (total > 0) {
        const pct = Math.round((loaded / total) * 100)
        task.progress = pct
        task.loaded = loaded
        task.total = total
        onProgress?.(task.taskId, pct, loaded, total)
      }
    }

    // 使用 application/octet-stream 强制浏览器下载而非播放
    const blob = new Blob(chunks as BlobPart[], { type: 'application/octet-stream' })
    const blobUrl = URL.createObjectURL(blob)
    task.blobUrl = blobUrl

    // 触发下载
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = `${task.songName}${task.artist ? ` - ${task.artist}` : ''}.mp3`
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    setTimeout(() => {
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
      task.blobUrl = undefined
    }, 5000)

    task.state = 'completed'
    onStateChange?.(task.taskId, 'completed')
    console.log(`[Download] Completed: "${task.songName}" (${(loaded / 1024 / 1024).toFixed(1)} MB)`)
    showToast('下载完成', task.songName)

  } catch (e: any) {
    if (e.name === 'AbortError') {
      task.state = 'cancelled'
      onStateChange?.(task.taskId, 'cancelled')
      console.log(`[Download] Cancelled: "${task.songName}"`)
    } else {
      task.state = 'failed'
      task.error = e.message
      onStateChange?.(task.taskId, 'failed', e.message)
      console.error(`[Download] Failed: "${task.songName}"`, e)
      showToast('下载失败', `${task.songName}: ${e.message}`)
    }
  } finally {
    controllers.delete(task.taskId)
    running--
    pumpQueue()
  }
}

function pumpQueue() {
  while (running < MAX_CONCURRENT && queue.length > 0) {
    const next = queue.shift()
    if (!next) break
    if (next.state === 'cancelled') continue
    next.state = 'downloading'
    onStateChange?.(next.taskId, 'downloading')
    running++
    doDownload(next)
  }
}

/* ─── 公开 API ─── */
export function addDownload(
  songId: number,
  songName: string,
  url: string,
  artist?: string,
  meta?: SongMeta,
): string {
  const id = taskId(songId)
  const task: DownloadTask = {
    taskId: id,
    songId,
    songName,
    artist,
    url,
    state: 'queued',
    progress: 0,
    loaded: 0,
    total: 0,
    createdAt: Date.now(),
    picUrl: meta?.picUrl,
    album: meta?.album,
  }
  queue.push(task)
  onStateChange?.(id, 'queued')
  onTaskQueued?.(task)
  console.log(`[Download] Queued: "${songName}" (queue: ${queue.length}, running: ${running})`)
  pumpQueue()
  return id
}

// ★ Bug 1 修复：导出 downloadSong 别名供 SongRow 使用
export const downloadSong = addDownload

export function batchDownload(songs: Array<{ songId: number; songName: string; url: string; artist?: string; picUrl?: string; album?: string }>) {
  const ids: string[] = []
  for (const s of songs) {
    ids.push(addDownload(s.songId, s.songName, s.url, s.artist, { picUrl: s.picUrl, album: s.album }))
  }
  showToast('批量下载', `${songs.length} 首歌曲已加入队列`)
  return ids
}

export function cancelDownload(taskId: string) {
  // 先 abort 正在下载的 controller
  const controller = controllers.get(taskId)
  if (controller) {
    controller.abort()
    controllers.delete(taskId)
  }
  // 同时从队列移除尚未开始的任务
  const idx = queue.findIndex(t => t.taskId === taskId)
  if (idx >= 0) {
    queue[idx].state = 'cancelled'
    queue.splice(idx, 1)
    onStateChange?.(taskId, 'cancelled')
  }
}

export function getQueueSnapshot(): DownloadTask[] {
  return [...queue]
}
