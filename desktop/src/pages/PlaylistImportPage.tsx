import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { importPlaylist, getImportTaskStatus } from '@shared'
import { useAuthStore } from '@/store/authStore'
import {
  ArrowLeft, Import, Loader, Link, FileText, Database,
  CheckCircle, XCircle, Clock, AlertCircle, User,
} from 'lucide-react'

type ImportMode = 'link' | 'text' | 'local'

interface TaskState {
  id: string | number
  status: 'running' | 'success' | 'failed'
  playlistName?: string
  message?: string
  songCount?: number
}

const modeConfig: Record<ImportMode, { label: string; icon: typeof Link; placeholder: string; rows: number; desc: string }> = {
  link: {
    label: '链接导入', icon: Link,
    placeholder: '粘贴 QQ音乐/网易云/酷狗/酷我 歌单分享链接…\n支持多个链接，每行一个',
    rows: 2, desc: '支持 QQ音乐 / 网易云 / 酷狗 / 酷我 歌单分享链接',
  },
  text: {
    label: '文本导入', icon: FileText,
    placeholder: '粘贴歌曲列表，每行一首…\n格式: 歌曲名 - 歌手名\n例如:\n晴天 - 周杰伦\n燕尾蝶 - 五月天',
    rows: 6, desc: '每行一首，格式「歌曲名 - 歌手名」',
  },
  local: {
    label: '元数据导入', icon: Database,
    placeholder: '粘贴 JSON 数据…\n格式: [{"name":"歌曲名","artist":"歌手","album":"专辑"},…]\n或每行一条 JSON',
    rows: 6, desc: 'JSON 数组格式，含 name/artist/album 字段',
  },
}

export default function PlaylistImportPage() {
  const navigate = useNavigate()
  const isLoggedIn = useAuthStore(s => s.isLoggedIn)

  const [mode, setMode] = useState<ImportMode>('link')
  const [inputVal, setInputVal] = useState('')
  const [playlistName, setPlaylistName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tasks, setTasks] = useState<TaskState[]>([])
  const pollRefs = useRef<Map<string | number, ReturnType<typeof setInterval>>>(new Map())

  const handleImport = useCallback(async () => {
    const val = inputVal.trim()
    if (!val) { setError('请输入内容'); return }

    setError('')
    setLoading(true)

    try {
      // 构建参数（按 API 文档规范）
      const params: Record<string, any> = {}
      if (playlistName.trim()) {
        params.playlistName = playlistName.trim()
      }

      if (mode === 'link') {
        // ★ API 要求 link 是 JSON.stringify([url1, url2]) 格式
        const links = val.split('\n').map(l => l.trim()).filter(Boolean)
        params.link = JSON.stringify(links)
      } else if (mode === 'text') {
        params.text = val
      } else if (mode === 'local') {
        // ★ 元数据格式: JSON string of [{name, artist, album}]
        // 支持完整的 JSON 数组字符串，也支持每行一条 JSON
        try {
          const parsed = JSON.parse(val)
          if (Array.isArray(parsed)) {
            params.local = JSON.stringify(parsed)
          } else {
            setError('元数据格式错误：需要一个 JSON 数组')
            setLoading(false)
            return
          }
        } catch {
          // 尝试按行解析
          const lines = val.split('\n').filter(Boolean)
          const items = lines.map(line => {
            try { return JSON.parse(line.trim()) } catch { return null }
          }).filter(Boolean)
          if (items.length === 0) {
            setError('元数据格式错误：无法解析为 JSON')
            setLoading(false)
            return
          }
          params.local = JSON.stringify(items)
        }
      }

      const res: any = await importPlaylist(params)
      const apiData = res?.data

      // ★ 先检查 API 返回的 code（对齐移动端逻辑）
      if (apiData?.code !== 200) {
        const msg = apiData?.message || apiData?.msg || `API 返回错误码: ${apiData?.code}`
        setError(msg)
        setLoading(false)
        return
      }

      // ★ 提取任务 ID（移动端模式：taskId 优先于 id；data 可能是对象或直接是 id 值）
      const taskData = apiData?.data
      const taskId = typeof taskData === 'object' ? (taskData?.taskId ?? taskData?.id) : taskData

      if (taskId && (typeof taskId === 'string' || typeof taskId === 'number')) {
        const task: TaskState = { id: taskId, status: 'running' }
        setTasks(prev => [task, ...prev])
        setInputVal('')
        setPlaylistName('')

        // 轮询状态（对齐移动端：读 tasks[0].status 而非 data.code）
        let failCount = 0
        const interval = setInterval(async () => {
          try {
            const sr: any = await getImportTaskStatus(taskId)
            const apiData = sr?.data

            // 外层 code 不是 200 → 轮询出错
            if (apiData?.code !== 200) {
              failCount++
              if (failCount >= 3) {
                clearInterval(interval)
                pollRefs.current.delete(taskId)
                setTasks(prev => prev.map(tk =>
                  tk.id === taskId
                    ? { ...tk, status: 'failed', message: apiData?.message || apiData?.msg || '查询任务状态失败' }
                    : tk
                ))
              }
              return
            }

            failCount = 0
            const taskData = apiData?.data
            // API 返回 { data: { tasks: [{ status: 'COMPLETE', succCount: N, existCount: M }] } }
            const taskItem = Array.isArray(taskData?.tasks) ? taskData.tasks[0] : taskData
            const status = typeof taskItem === 'object' ? taskItem?.status : undefined

            if (status === 'COMPLETE') {
              clearInterval(interval)
              pollRefs.current.delete(taskId)
              const succ = taskItem?.succCount ?? 0
              const exist = taskItem?.existCount ?? 0
              const msg = `导入成功 ${succ} 首${exist > 0 ? `，${exist} 首已存在` : ''}`
              setTasks(prev => prev.map(tk =>
                tk.id === taskId
                  ? { ...tk, status: 'success', message: msg, songCount: succ }
                  : tk
              ))
            } else if (status === 'FAILED') {
              clearInterval(interval)
              pollRefs.current.delete(taskId)
              setTasks(prev => prev.map(tk =>
                tk.id === taskId
                  ? { ...tk, status: 'failed', message: taskItem?.msg || '导入任务执行失败' }
                  : tk
              ))
            }
            // PENDING / PROCESSING → 继续轮询
          } catch {
            // 网络异常时继续轮询
          }
        }, 3000)
        pollRefs.current.set(taskId, interval)
      } else {
        setError('创建导入任务失败，请检查参数或重试')
      }
    } catch (e: any) {
      setError(e?.message || '导入失败，请检查网络后重试')
    } finally {
      setLoading(false)
    }
  }, [inputVal, playlistName, mode])

  // 清理所有轮询
  const clearAllPolls = () => {
    pollRefs.current.forEach(v => clearInterval(v))
    pollRefs.current.clear()
  }

  const conf = modeConfig[mode]

  return (
    <div>
      {/* header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">歌单导入</h1>
      </div>

      {!isLoggedIn ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <User className="w-12 h-12 mb-4 opacity-30" />
          <p>请先登录</p>
          <button onClick={() => navigate('/login')} className="mt-3 px-4 py-2 bg-[#e60026] text-white rounded-lg text-sm font-medium hover:bg-[#c4001f] transition-colors">
            去登录
          </button>
        </div>
      ) : (
        <div className="max-w-2xl">
          {/* 三模式切换 */}
          <div className="inline-flex p-1 rounded-full bg-gray-100 dark:bg-white/[0.06] mb-6">
            {(Object.entries(modeConfig) as [ImportMode, typeof conf][]).map(([k, v]) => (
              <button
                key={k}
                onClick={() => setMode(k)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  mode === k
                    ? 'bg-white dark:bg-gray-700 text-[#e60026] shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <v.icon className="w-4 h-4" />{v.label}
              </button>
            ))}
          </div>

          {/* 表单 */}
          <div className="space-y-4">
            {/* 输入区域 */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                {conf.label}内容
              </label>
              <textarea
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                placeholder={conf.placeholder}
                rows={conf.rows}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#e60026]/20 focus:border-[#e60026] resize-none"
              />
            </div>

            {/* 歌单名称 */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                歌单名称 <span className="font-normal text-gray-400">（可选）</span>
              </label>
              <input
                type="text"
                value={playlistName}
                onChange={e => setPlaylistName(e.target.value)}
                placeholder='留空则自动生成如 "导入音乐 2026/6/10 16:00:00"'
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#e60026]/20 focus:border-[#e60026]"
              />
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="flex items-center gap-1.5 text-sm text-red-500 bg-red-50 dark:bg-red-500/5 px-3 py-2 rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
              </div>
            )}

            {/* 提交按钮 */}
            <button
              onClick={handleImport}
              disabled={loading || !inputVal.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#e60026] text-white rounded-xl text-sm font-semibold hover:bg-[#c4001f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Import className="w-4 h-4" />}
              开始导入
            </button>
          </div>

          {/* 任务列表 */}
          {tasks.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">导入记录</h2>
                {tasks.every(t => t.status !== 'running') && (
                  <button
                    onClick={() => { clearAllPolls(); setTasks([]) }}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                  >清空记录</button>
                )}
              </div>
              <div className="space-y-2">
                {tasks.map(task => (
                  <div key={String(task.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                      task.status === 'running'
                        ? 'bg-amber-50/30 dark:bg-amber-500/5 border-amber-100 dark:border-amber-500/10'
                        : task.status === 'success'
                          ? 'bg-emerald-50/30 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/10'
                          : 'bg-red-50/30 dark:bg-red-500/5 border-red-100 dark:border-red-500/10'
                    }`}>
                    {task.status === 'running' ? (
                      <Loader className="w-5 h-5 animate-spin text-amber-500 flex-shrink-0" />
                    ) : task.status === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                        {task.playlistName || `任务 ${task.id}`}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        {task.status === 'running'
                          ? '匹配歌曲中…'
                          : task.status === 'success'
                            ? task.message || '导入成功'
                            : task.message || '导入失败'}
                      </p>
                    </div>
                    {task.status === 'running' && (
                      <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 说明 */}
          <div className="mt-8 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30">
            <h3 className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2">导入说明</h3>
            <ul className="text-[11px] text-amber-600 dark:text-amber-500 space-y-1">
              <li>· {conf.desc}</li>
              <li>· 链接导入：支持多个歌单链接，每行一个</li>
              <li>· 元数据导入：JSON 格式更精准，避免歌曲匹配错误</li>
              <li>· 导入过程需联网匹配歌曲，大型歌单可能需要数分钟</li>
              <li>· 导入成功后可在「创建的歌单」中查看</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
