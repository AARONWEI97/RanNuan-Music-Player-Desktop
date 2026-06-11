import { useEffect, useState } from 'react'
import { useDownloadStore } from '@/store/downloadStore'
import { CheckCircle2, Download, Loader, XCircle, X, ChevronDown, ChevronUp, Pause } from 'lucide-react'

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

export default function DownloadProgressToast() {
  const tasks = useDownloadStore((s) => s.tasks)
  const [expanded, setExpanded] = useState(true)
  const [visible, setVisible] = useState(false)
  const cancelTask = useDownloadStore((s) => s.cancelTask)

  const taskList = [...tasks.values()].filter(
    (t) => t.state === 'queued' || t.state === 'downloading' || t.state === 'completed'
  )

  const activeList = taskList.filter((t) => t.state === 'queued' || t.state === 'downloading')
  const completedCount = taskList.filter((t) => t.state === 'completed').length

  useEffect(() => {
    if (activeList.length > 0) {
      setVisible(true)
    } else if (completedCount > 0) {
      const timer = setTimeout(() => setVisible(false), 3000)
      return () => clearTimeout(timer)
    } else {
      setVisible(false)
    }
  }, [activeList.length, completedCount])

  if (!visible || taskList.length === 0) return null

  const totalProgress =
    activeList.length > 0
      ? activeList.reduce((sum, t) => sum + t.progress, 0) / activeList.length
      : 100

  return (
    <div
      className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-slide-up"
      role="region"
      aria-label="下载进度"
      aria-live="polite"
    >
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#e60026]/10 to-transparent border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#e60026]/10 flex items-center justify-center">
            {activeList.length > 0 ? (
              <Download className="w-4 h-4 text-[#e60026]" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {activeList.length > 0 ? '正在下载' : '下载完成'}
            </h3>
            <p className="text-[11px] text-gray-600 dark:text-gray-400">
              {activeList.length > 0
                ? `${activeList.length} 个任务 · ${totalProgress.toFixed(0)}%`
                : `${completedCount} 个任务已完成`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors focus:outline-2 focus:outline-blue-500"
            aria-label={expanded ? '收起任务列表' : '展开任务列表'}
            title={expanded ? '收起' : '展开'}
          >
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            )}
          </button>
          <button
            onClick={() => setVisible(false)}
            className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors focus:outline-2 focus:outline-blue-500"
            aria-label="关闭进度弹窗"
            title="关闭"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* 任务列表 */}
      {expanded && (
        <div className="max-h-80 overflow-y-auto scrollbar-thin">
          <div className="p-3 space-y-2">
            {taskList.map((task) => {
              const isActive = task.state === 'queued' || task.state === 'downloading'
              const isDone = task.state === 'completed'
              const isFailed = task.state === 'failed'

              return (
                <div
                  key={task.taskId}
                  className={`p-3 rounded-xl transition-all ${
                    isDone
                      ? 'bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10'
                      : isFailed
                        ? 'bg-red-50/50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/10'
                        : 'bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {/* 状态图标 */}
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isDone
                          ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600'
                          : isFailed
                            ? 'bg-red-100 dark:bg-red-500/20 text-red-500'
                            : isActive
                              ? 'bg-[#e60026]/10 text-[#e60026]'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                      }`}
                    >
                      {task.state === 'downloading' ? (
                        <Loader className="w-3.5 h-3.5 animate-spin" />
                      ) : isDone ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : isFailed ? (
                        <XCircle className="w-3.5 h-3.5" />
                      ) : task.state === 'queued' ? (
                        <Pause className="w-3.5 h-3.5" />
                      ) : null}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* 歌名 + 进度 */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                          {task.songName}
                        </span>
                        {isActive && (
                          <span className="text-[11px] font-semibold text-[#e60026] tabular-nums flex-shrink-0">
                            {task.progress.toFixed(0)}%
                          </span>
                        )}
                      </div>

                      {/* 歌手 */}
                      {task.artist && (
                        <p className="text-[11px] text-gray-600 dark:text-gray-400 truncate mt-0.5">
                          {task.artist}
                        </p>
                      )}

                      {/* 进度条 + 详情 */}
                      {isActive && (
                        <div className="mt-2">
                          <div
                            className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
                            role="progressbar"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={Math.round(task.progress)}
                            aria-label={`${task.songName} 下载进度 ${task.progress.toFixed(0)}%`}
                          >
                            <div
                              className="h-full bg-gradient-to-r from-[#e60026] to-[#ff4d6d] rounded-full"
                              style={{ width: `${task.progress}%`, transition: 'width 0.5s ease-out' }}
                            />
                          </div>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-[10px] text-gray-600 dark:text-gray-400 tabular-nums">
                              {formatSize(task.loaded)}
                              {task.total > 0 && ` / ${formatSize(task.total)}`}
                            </span>
                            <button
                              onClick={() => cancelTask(task.taskId)}
                              className="text-[10px] text-gray-500 hover:text-red-500 transition-colors px-1.5 py-0.5 rounded hover:bg-red-50 dark:hover:bg-red-500/10 focus:outline-2 focus:outline-blue-500"
                              aria-label={`取消下载 ${task.songName}`}
                            >
                              {task.state === 'queued' ? '取消排队' : '取消下载'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 完成 */}
                      {isDone && (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">
                          {task.songName} 下载完成
                        </p>
                      )}

                      {/* 失败 */}
                      {isFailed && task.error && (
                        <p className="text-[10px] text-red-600 dark:text-red-400 mt-1 truncate">
                          {task.error}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 总体进度条（底部） */}
      {activeList.length > 0 && (
        <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div
              className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(totalProgress)}
              aria-label={`总下载进度 ${totalProgress.toFixed(0)}%`}
            >
              <div
                className="h-full bg-gradient-to-r from-[#e60026] to-[#ff4d6d] rounded-full"
                style={{ width: `${totalProgress}%`, transition: 'width 0.5s ease-out' }}
              />
            </div>
            <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 tabular-nums">
              {totalProgress.toFixed(0)}%
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
