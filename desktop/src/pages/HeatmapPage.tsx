import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMusicCalendar } from '@shared'
import { useAuthStore } from '@/store/authStore'
import { ArrowLeft, Loader, TrendingUp, ChevronLeft, ChevronRight, User, AlertCircle } from 'lucide-react'

interface DayData {
  date: string    // 'YYYY-MM-DD'
  count: number
}

type MonthKey = string  // 'YYYY-MM'

export default function HeatmapPage() {
  const navigate = useNavigate()
  const profile = useAuthStore(s => s.profile)
  const isLoggedIn = useAuthStore(s => s.isLoggedIn)

  const [calendar, setCalendar] = useState<DayData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [year, setYear] = useState(new Date().getFullYear())
  const [reloadKey, setReloadKey] = useState(0)
  const currentYear = new Date().getFullYear()

  const normalizeDate = (value: unknown) => {
    if (!value) return ''
    if (typeof value === 'number') {
      const d = new Date(value)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }
    const str = String(value)
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str
    if (/^\d{8}$/.test(str)) return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`
    return str.slice(0, 10)
  }

  const normalizeCalendar = (payload: any): DayData[] => {
    const data = payload?.data?.data || payload?.data || payload
    const raw = data?.calendar || data?.everyday || data?.list || data
    if (!Array.isArray(raw)) return []
    return raw
      .map((d: any) => ({
        date: normalizeDate(d.date || d.day || d.time || d.timestamp),
        count: Number(d.count ?? d.listenCount ?? d.playCount ?? d.songCount ?? d.value ?? d.resources?.length ?? 0),
      }))
      .filter((d: DayData) => d.date && d.date.startsWith(`${year}-`))
  }

  useEffect(() => {
    if (!isLoggedIn || !profile?.userId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    const start = new Date(year, 0, 1).getTime()
    const end = new Date(year, 11, 31, 23, 59, 59).getTime()
    getMusicCalendar(start, end)
      .then((res: any) => {
        setCalendar(normalizeCalendar(res))
      })
      .catch((e: any) => {
        setCalendar([])
        setError(e?.response?.data?.message || e?.message || '听歌日历加载失败，请稍后重试')
      })
      .finally(() => setLoading(false))
  }, [profile?.userId, isLoggedIn, year, reloadKey])

  // build date-count map
  const countMap = useMemo(() => {
    const m = new Map<string, number>()
    calendar.forEach(d => { if (d.date) m.set(d.date, d.count) })
    return m
  }, [calendar])

  const maxCount = useMemo(() => Math.max(1, ...Array.from(countMap.values())), [countMap])
  const stats = useMemo(() => {
    const values = Array.from(countMap.values())
    const total = values.reduce((sum, count) => sum + count, 0)
    const activeDays = values.filter(count => count > 0).length
    const maxDay = calendar.reduce<DayData | null>((best, item) => (!best || item.count > best.count ? item : best), null)
    return {
      total,
      activeDays,
      maxDay,
      average: activeDays > 0 ? Math.round(total / activeDays) : 0,
    }
  }, [calendar, countMap])

  // generate month grids
  const months = useMemo(() => {
    const result: { key: MonthKey; label: string; days: (number | null)[]; offsets: number }[] = []
    for (let m = 0; m < 12; m++) {
      const date = new Date(year, m, 1)
      const key: MonthKey = `${year}-${String(m + 1).padStart(2, '0')}`
      const label = `${m + 1}月`
      const startDay = date.getDay() // 0=Sunday
      const daysInMonth = new Date(year, m + 1, 0).getDate()
      const days: (number | null)[] = []
      // pad start
      for (let i = 0; i < startDay; i++) days.push(null)
      for (let d = 1; d <= daysInMonth; d++) days.push(d)
      result.push({ key, label, days, offsets: startDay })
    }
    return result
  }, [year])

  const getColor = useCallback((day: number | null, monthIdx: number) => {
    if (day === null) return ''
    const dateStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const cnt = countMap.get(dateStr) || 0
    if (cnt === 0) return 'bg-gray-100 dark:bg-white/[0.04]'
    // 4 levels
    const level = Math.ceil((cnt / maxCount) * 4)
    const colors = [
      'bg-green-200 dark:bg-green-800/40',
      'bg-green-400 dark:bg-green-600/50',
      'bg-green-500 dark:bg-green-500/60',
      'bg-green-600 dark:bg-green-400/70',
    ]
    return colors[Math.min(level, 4) - 1]
  }, [countMap, maxCount, year])

  const formatDate = (day: number, monthIdx: number) => {
    const dateStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const cnt = countMap.get(dateStr) || 0
    return `${dateStr} · ${cnt} 首`
  }

  return (
    <div>
      {/* header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
          <h1 className="text-2xl font-bold">听歌热力图</h1>
        </div>
        {/* year switcher */}
        <div className="flex items-center gap-2">
          <button onClick={() => setYear(y => y - 1)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <ChevronLeft className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 w-12 text-center">{year}</span>
          <button
            onClick={() => setYear(y => Math.min(y + 1, currentYear))}
            disabled={year >= currentYear}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {!isLoggedIn ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <User className="w-12 h-12 mb-4 opacity-30" />
          <p>请先登录</p>
          <button onClick={() => navigate('/login')} className="mt-3 px-4 py-2 bg-[#e60026] text-white rounded-lg text-sm font-medium hover:bg-[#c4001f] transition-colors">
            去登录
          </button>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16"><Loader className="w-6 h-6 animate-spin text-[#e60026]" /></div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <AlertCircle className="w-12 h-12 mb-4 opacity-30" />
          <p className="text-sm">{error}</p>
          <button onClick={() => setReloadKey(k => k + 1)} className="mt-3 px-4 py-2 bg-[#e60026] text-white rounded-lg text-sm font-medium hover:bg-[#c4001f] transition-colors">
            重试
          </button>
        </div>
      ) : (
        <>
          {/* summary */}
          <div className="flex items-center gap-4 mb-5 p-4 rounded-xl bg-gray-50 dark:bg-white/[0.03]">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <div>
                <div className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{stats.total} 首</div>
                <div className="text-[10px] text-gray-400">{year}年总播放</div>
              </div>
            </div>
            <div className="h-8 w-px bg-gray-200 dark:bg-white/[0.06]" />
            <div>
              <div className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{stats.activeDays} 天</div>
              <div className="text-[10px] text-gray-400">活跃天数</div>
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{stats.maxDay?.count || 0} 首</div>
              <div className="text-[10px] text-gray-400">{stats.maxDay?.date || '最高单日'}</div>
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{stats.average} 首</div>
              <div className="text-[10px] text-gray-400">活跃日均</div>
            </div>
            <div className="flex-1" />
            {/* legend */}
            <div className="flex items-center gap-1 text-[10px] text-gray-400">
              <span>少</span>
              <div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-white/[0.04]" />
              <div className="w-3 h-3 rounded-sm bg-green-200 dark:bg-green-800/40" />
              <div className="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-600/50" />
              <div className="w-3 h-3 rounded-sm bg-green-500 dark:bg-green-500/60" />
              <div className="w-3 h-3 rounded-sm bg-green-600 dark:bg-green-400/70" />
              <span>多</span>
            </div>
          </div>

          {/* heatmap grid — 3 months per row on large screens */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {months.map((month, mi) => (
              <div key={month.key} className="space-y-1.5">
                <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">{month.label}</p>
                <div className="grid grid-cols-7 gap-1">
                  {/* day-of-week headers */}
                  {['日', '一', '二', '三', '四', '五', '六'].map(d => (
                    <div key={d} className="text-[8px] text-gray-300 dark:text-gray-600 text-center leading-4">{d}</div>
                  ))}
                  {month.days.map((day, i) => (
                    <div key={i} className={`w-full pt-[100%] relative rounded-sm ${day !== null ? getColor(day, mi) + ' hover:ring-2 hover:ring-[#e60026]/40 transition-all' : 'bg-transparent'}`}>
                      {day !== null && (
                        <span className="absolute inset-0 flex items-center justify-center text-[8px] text-gray-500 dark:text-gray-400 opacity-0 hover:opacity-100 transition-opacity"
                          title={formatDate(day, mi)}>
                          {day}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
