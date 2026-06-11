import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import {
  addDownload,
  batchDownload as batchAdd,
  cancelDownload as cancelAdd,
  setDownloadCallbacks,
  type DownloadTask,
  type DownloadState,
} from '@/utils/download'

export interface CompletedItem {
  songId: number
  songName: string
  artist?: string
  fileName: string
  downloadedAt: number
  fileSize?: number
  picUrl?: string
  album?: string
}

interface DownloadStore {
  tasks: Map<string, DownloadTask>
  completed: CompletedItem[]

  downloadSong: (songId: number, songName: string, url: string, artist?: string, meta?: { picUrl?: string; album?: string }) => string
  downloadBatch: (songs: Array<{ songId: number; songName: string; url: string; artist?: string; picUrl?: string; album?: string }>) => string[]
  cancelTask: (taskId: string) => void
  clearCompleted: () => void
  deleteCompleted: (songId: number, downloadedAt: number) => void
}

export const useDownloadStore = create<DownloadStore>()(
  persist(
    (set) => {
      setDownloadCallbacks(
        (taskId, progress, loaded, total) => {
          set((s) => {
            const t = s.tasks.get(taskId)
            if (t) {
              const next = new Map(s.tasks)
              next.set(taskId, { ...t, progress, loaded, total })
              return { tasks: next }
            }
            return {}
          })
        },
        (taskId, state, error) => {
          if (state === 'completed') {
            set((s) => {
              const t = s.tasks.get(taskId)
              if (!t) {
                console.warn(`[DownloadStore] Task ${taskId} not found when completing`)
                return {}
              }
              
              const next = new Map(s.tasks)
              next.set(taskId, { ...t, state: 'completed' as DownloadState, progress: 100 })
              
              const completedItem: CompletedItem = {
                songId: t.songId,
                songName: t.songName || '未知歌曲',
                artist: t.artist,
                fileName: `${t.songName || '未知歌曲'}${t.artist ? ` - ${t.artist}` : ''}.mp3`,
                downloadedAt: Date.now(),
                fileSize: t.total > 0 ? t.total : undefined,
                picUrl: t.picUrl,
                album: t.album,
              }
              
              return {
                tasks: next,
                completed: [completedItem, ...s.completed].slice(0, 100),
              }
            })
            // 完成后 3s 自动从 tasks Map 移除
            setTimeout(() => {
              set((s) => {
                const next = new Map(s.tasks)
                next.delete(taskId)
                return { tasks: next }
              })
            }, 3000)
          } else if (state === 'cancelled' || state === 'failed') {
            set((s) => {
              const t = s.tasks.get(taskId)
              const next = new Map(s.tasks)
              if (t) {
                next.set(taskId, { ...t, state, error })
              }
              return { tasks: next }
            })
            setTimeout(() => {
              set((s) => {
                const next = new Map(s.tasks)
                next.delete(taskId)
                return { tasks: next }
              })
            }, 5000)
          } else {
            set((s) => {
              const t = s.tasks.get(taskId)
              if (!t) return {}
              const next = new Map(s.tasks)
              next.set(taskId, { ...t, state })
              return { tasks: next }
            })
          }
        },
        // 任务入队时注册到 store（处理直接调 addDownload 的情况）
        (task) => {
          set((s) => {
            if (s.tasks.has(task.taskId)) return {}
            const next = new Map(s.tasks)
            next.set(task.taskId, task)
            return { tasks: next }
          })
        },
      )

      return {
        tasks: new Map(),
        completed: [],

        downloadSong: (songId, songName, url, artist, meta) => {
          const id = addDownload(songId, songName, url, artist, meta)
          // onTaskQueued 回调已处理注册
          return id
        },

        downloadBatch: (songs) => batchAdd(songs),

        cancelTask: (taskId) => {
          cancelAdd(taskId)
        },

        clearCompleted: () => {
          set({ completed: [] })
        },

        deleteCompleted: (songId, downloadedAt) => {
          set((s) => ({
            completed: s.completed.filter(
              (c) => !(c.songId === songId && c.downloadedAt === downloadedAt)
            ),
          }))
        },
      }
    },
    {
      name: 'download-store',
      storage: createJSONStorage(() => localStorage),
      // Map 无法直接序列化，需要自定义转换
      partialize: (state) => ({
        completed: state.completed,
        // tasks 不持久化（刷新后重置为空 Map，只保留 completed 历史）
      }),
    }
  )
)
