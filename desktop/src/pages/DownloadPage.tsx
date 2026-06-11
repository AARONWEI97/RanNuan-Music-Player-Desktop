import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useDownloadStore, type CompletedItem } from '@/store/downloadStore'
import { coverUrl, thumbUrl } from '@/utils/image'
import { openDownloadsFolder, getDownloadsPath } from '@/services/shellService'
import {
  ArrowLeft, Download, Music, CheckCircle2, Trash2,
  FolderOpen, XCircle, ExternalLink,
} from 'lucide-react'

/* ─── 时间 / 大小格式化 ─── */
function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return '刚刚'
  if (s < 3600) return `${Math.floor(s / 60)} 分钟前`
  if (s < 86400) return `${Math.floor(s / 3600)} 小时前`
  return `${Math.floor(s / 86400)} 天前`
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

/* ─── 列表行（已完成） ─── */
function CompletedRow({
  item,
  downloadsPath,
  onDelete,
  onOpenFolder,
}: {
  item: CompletedItem
  downloadsPath: string
  onDelete: (songId: number, downloadedAt: number) => void
  onOpenFolder: () => void
}) {
  return (
    <div className="group grid items-center gap-x-4 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
      style={{ gridTemplateColumns: '44px minmax(140px,1.5fr) minmax(100px,1fr) 80px 70px minmax(180px,1.5fr) 64px' }}>
      {/* 封面 */}
      <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-white/[0.05] overflow-hidden">
        {item.picUrl ? (
          <img src={thumbUrl(item.picUrl)} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
            <Music className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* 歌名 + 歌手 */}
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.songName}</p>
        {item.artist && (
          <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{item.artist}</p>
        )}
      </div>

      {/* 专辑 */}
      <div className="min-w-0">
        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{item.album || '-'}</p>
      </div>

      {/* 文件大小 */}
      <div>
        <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
          {item.fileSize ? formatSize(item.fileSize) : '-'}
        </span>
      </div>

      {/* 时间 */}
      <div className="text-left">
        <span className="text-[11px] text-gray-300 dark:text-gray-600">{timeAgo(item.downloadedAt)}</span>
      </div>

      {/* 文件路径 */}
      <div className="min-w-0 flex items-center gap-1">
        <FolderOpen className="w-3 h-3 text-gray-300 dark:text-gray-600 flex-shrink-0" />
        <span className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
          {downloadsPath || 'Downloads 文件夹'}
        </span>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center justify-end gap-1">
        <button
          onClick={onOpenFolder}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
          title="打开存放文件夹"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(item.songId, item.downloadedAt)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
          title="删除记录"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

/* ─── 主页面 ─── */
export default function DownloadPage() {
  const navigate = useNavigate()
  const tasks = useDownloadStore((s) => s.tasks)
  const completed = useDownloadStore((s) => s.completed)
  const clearCompleted = useDownloadStore((s) => s.clearCompleted)
  const cancelTask = useDownloadStore((s) => s.cancelTask)
  const deleteCompleted = useDownloadStore((s) => s.deleteCompleted)

  const [downloadsPath, setDownloadsPath] = useState('正在获取...')

  useEffect(() => {
    getDownloadsPath().then(setDownloadsPath)
  }, [])

  const taskList = [...tasks.values()].sort((a, b) => b.createdAt - a.createdAt)
  const activeCount = taskList.filter((t) => t.state === 'queued' || t.state === 'downloading').length
  const totalProgress =
    activeCount > 0
      ? taskList
          .filter((t) => t.state === 'queued' || t.state === 'downloading')
          .reduce((sum, t) => sum + t.progress, 0) / activeCount
      : 0

  // 首个有封面的 item 用于 Hero 大图
  const heroItem = (() => {
    const done = completed.find((c) => c.picUrl)
    if (done) return done
    const active = taskList.find((t) => t.picUrl)
    if (active) return { picUrl: active.picUrl, songName: active.songName, artist: active.artist, album: active.album }
    return completed[0] || null
  })()

  return (
    <div className="-mx-6 -mt-6">
      {/* ═══ HERO ═══ */}
      <div className="relative overflow-hidden" style={{ minHeight: 200 }}>
        {/* 背景 */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#e60026]/20 via-[#e60026]/5 to-transparent" />
        {heroItem?.picUrl && (
          <>
            <img
              src={coverUrl(heroItem.picUrl)}
              alt=""
              className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-black via-white/80 dark:via-black/80 to-transparent" />
          </>
        )}

        <div className="relative z-10 px-6 pt-5 pb-6">
          {/* 返回 */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white transition-colors px-2 py-1 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06]"
          >
            <ArrowLeft className="w-4 h-4" /> 返回
          </button>

          {/* Hero 内容 */}
          <div className="flex items-end gap-5 mt-3">
            {/* 封面大图 */}
            <div className="w-36 h-36 rounded-2xl bg-gray-200 dark:bg-gray-700 overflow-hidden shadow-2xl flex-shrink-0 ring-4 ring-gray-200/50 dark:ring-gray-800/50">
              {heroItem?.picUrl ? (
                <img src={coverUrl(heroItem.picUrl)} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#e60026]/30 to-[#e60026]/5">
                  <Download className="w-12 h-12 text-[#e60026]/40" />
                </div>
              )}
            </div>

            {/* 标题 */}
            <div className="flex-1 pb-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#e60026]/10 dark:bg-[#e60026]/20 text-[#e60026] dark:text-[#ff4d6d] text-[10px] font-semibold uppercase tracking-wider mb-3">
                下载记录
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {completed.length > 0 ? `${completed.length} 首已完成` : '下载管理'}
              </h1>
              {heroItem && 'songName' in heroItem && (
                <p className="text-sm text-gray-500 dark:text-white/40 mt-1 truncate max-w-md">
                  最近: {(heroItem as any).songName || heroItem}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ 工具栏（Sticky） ═══ */}
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            {/* 进行中 */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#e60026]/5 border border-[#e60026]/10">
              <Download className="w-3.5 h-3.5 text-[#e60026]" />
              <span className="text-sm font-bold text-[#e60026] tabular-nums">{activeCount}</span>
              <span className="text-[10px] text-gray-400">进行中</span>
            </div>
            {/* 已完成 */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-sm font-bold text-emerald-600 tabular-nums">{completed.length}</span>
              <span className="text-[10px] text-gray-400">已完成</span>
            </div>
            {/* 文件位置 */}
            <div className="flex items-center gap-1 text-[10px] text-gray-400">
              <FolderOpen className="w-3 h-3" />
              {downloadsPath}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openDownloadsFolder}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 border border-gray-200 dark:border-gray-700 transition-all"
              title="打开下载文件夹"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">打开文件夹</span>
            </button>
            {completed.length > 0 && (
              <button
                onClick={clearCompleted}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 border border-gray-200 dark:border-gray-700 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">清空记录</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ═══ CONTENT ═══ */}
      <div className="px-6 pt-4 pb-24">
        {/* 进行中任务 */}
        {taskList.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 rounded-full bg-[#e60026]" />
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">下载任务</h2>
              <span className="text-[10px] text-gray-400">{taskList.length}</span>
            </div>

            {activeCount > 0 && (
              <div className="mb-3 px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-gray-500">{activeCount} 个任务进行中</span>
                  <span className="text-xs font-medium text-[#e60026] tabular-nums">
                    {totalProgress.toFixed(0)}%
                  </span>
                </div>
                <div className="h-1.5 bg-gray-200 dark:bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#e60026] to-[#ff4d6d] rounded-full transition-all duration-500"
                    style={{ width: `${totalProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              {taskList.map((task) => {
                const isActive = task.state === 'queued' || task.state === 'downloading'
                const isDone = task.state === 'completed'
                const isFailed = task.state === 'failed'

                return (
                  <div
                    key={task.taskId}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl border transition-colors ${
                      isDone
                        ? 'bg-emerald-50/30 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/10'
                        : isFailed
                          ? 'bg-red-50/30 dark:bg-red-500/5 border-red-100 dark:border-red-500/10'
                          : 'bg-gray-50 dark:bg-white/[0.02] border-gray-100 dark:border-white/[0.04]'
                    }`}
                  >
                    {/* 封面 */}
                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-white/[0.05] overflow-hidden flex-shrink-0">
                      {task.picUrl ? (
                        <img src={thumbUrl(task.picUrl)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
                          <Music className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    {/* 信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {task.songName}
                        </span>
                        {task.artist && (
                          <span className="text-xs text-gray-400 dark:text-gray-500 truncate">
                            {task.artist}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        {/* 进度条 */}
                        {isActive && (
                          <div className="flex-1 mr-3">
                            <div className="h-1 bg-gray-200 dark:bg-white/[0.06] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#e60026] rounded-full transition-all duration-300"
                                style={{ width: `${task.progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                        <span
                          className={`text-[10px] flex-shrink-0 ${
                            isDone
                              ? 'text-emerald-500'
                              : isFailed
                                ? 'text-red-500'
                                : isActive
                                  ? 'text-[#e60026]'
                                  : 'text-gray-400'
                          }`}
                        >
                          {task.state === 'queued'
                            ? '排队中'
                            : task.state === 'downloading'
                              ? `${task.progress}%`
                              : isDone
                                ? '完成'
                                : isFailed
                                  ? '失败'
                                  : '已取消'}
                        </span>
                        {/* 取消按钮 */}
                        {isActive && (
                          <button
                            onClick={() => cancelTask(task.taskId)}
                            className="ml-2 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                            title="取消下载"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 已完成列表 */}
        {completed.length > 0 ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 rounded-full bg-emerald-400" />
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">已完成</h2>
              <span className="text-[10px] text-gray-400">{completed.length}</span>
            </div>

            {/* 表头 — 使用 grid 对齐行 */}
            <div className="grid items-center gap-x-4 px-3 py-2 text-[10px] text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-white/[0.04]"
              style={{ gridTemplateColumns: '44px minmax(140px,1.5fr) minmax(100px,1fr) 80px 70px minmax(180px,1.5fr) 64px' }}>
              <div />
              <div>歌曲</div>
              <div>专辑</div>
              <div>大小</div>
              <div className="text-left">时间</div>
              <div>
                <FolderOpen className="w-3 h-3 inline mr-0.5" />
                文件位置
              </div>
              <div className="text-right">操作</div>
            </div>

            <div>
              {completed.map((item) => (
                <CompletedRow
                  key={`${item.songId}_${item.downloadedAt}`}
                  item={item}
                  downloadsPath={downloadsPath}
                  onDelete={deleteCompleted}
                  onOpenFolder={openDownloadsFolder}
                />
              ))}
            </div>
          </div>
        ) : taskList.length === 0 ? (
          /* 空状态 */
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-5">
              <Music className="w-10 h-10 text-gray-300 dark:text-gray-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-1">下载队列为空</h2>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
              在歌曲上右键选择「下载」开始
            </p>
            <div className="space-y-2 text-xs text-gray-400 dark:text-gray-500 max-w-xs text-center">
              <div className="flex items-center gap-2 justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                流式下载，不会跳转到播放器
              </div>
              <div className="flex items-center gap-2 justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                最多 2 首同时下载
              </div>
              <div className="flex items-center gap-2 justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                文件保存到 {downloadsPath}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
