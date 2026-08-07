import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getListenReport, getListenTodaySongs, getListenYearReport } from '@shared'
import { usePlayEventStore } from '@/store/historyStore'
import { useAuthStore } from '@/store/authStore'
import { ArrowLeft, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react'

interface DayData {
  date: string    // 'YYYY-MM-DD'
  count: number
}

type MonthKey = string  // 'YYYY-MM'

const DATE_KEYS = ['date', 'day', 'listenDate', 'playDate', 'timestamp', 'time'] as const
const COUNT_KEYS = ['count', 'listenCount', 'playCount', 'songCount', 'totalCount', 'value'] as const
const COLLECTION_KEYS = ['songs', 'records', 'items', 'resources', 'list'] as const

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function normalizeDate(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? '' : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (/^\d{13}$/.test(trimmed)) return normalizeDate(Number(trimmed))
  if (/^\d{8}$/.test(trimmed)) return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}`
  const match = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  return match ? `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}` : ''
}

function collectDailyCounts(value: unknown, year: number, result: Map<string, number>, depth = 0) {
  if (depth > 8 || value === null || typeof value !== 'object') return
  if (Array.isArray(value)) {
    value.forEach((item) => collectDailyCounts(item, year, result, depth + 1))
    return
  }

  const record = asRecord(value)
  if (!record) return
  const dateValue = DATE_KEYS.map((key) => record[key]).find((item) => item !== undefined)
  const date = normalizeDate(dateValue)
  let count = COUNT_KEYS
    .map((key) => Number(record[key]))
    .find((item) => Number.isFinite(item) && item >= 0)

  if (count === undefined) {
    const collection = COLLECTION_KEYS
      .map((key) => record[key])
      .find((item): item is unknown[] => Array.isArray(item))
    if (collection) count = collection.length
  }

  if (date.startsWith(`${year}-`) && count !== undefined) {
    result.set(date, Math.max(result.get(date) || 0, count))
  }
  Object.values(record).forEach((item) => collectDailyCounts(item, year, result, depth + 1))
}

function extractCollectionCount(value: unknown, depth = 0): number {
  if (depth > 8 || value === null || typeof value !== 'object') return 0
  if (Array.isArray(value)) return value.length
  const record = asRecord(value)
  if (!record) return 0
  const directCount = COUNT_KEYS
    .map((key) => Number(record[key]))
    .find((item) => Number.isFinite(item) && item >= 0)
  if (directCount !== undefined) return directCount
  const collection = COLLECTION_KEYS
    .map((key) => record[key])
    .find((item): item is unknown[] => Array.isArray(item))
  if (collection) return collection.length
  return Math.max(0, ...Object.values(record).map((item) => extractCollectionCount(item, depth + 1)))
}

export default function HeatmapPage() {
  const navigate = useNavigate()
  const playEvents = usePlayEventStore(s => s.events)
  const isLoggedIn = useAuthStore(s => s.isLoggedIn)

  const [year, setYear] = useState(new Date().getFullYear())
  const [remoteCalendar, setRemoteCalendar] = useState<DayData[]>([])
  const currentYear = new Date().getFullYear()

  const localCalendar = useMemo<DayData[]>(() => {
    const dailyCounts = new Map<string, number>()
    for (const event of playEvents) {
      const date = new Date(event.playedAt)
      if (date.getFullYear() !== year) continue
      const dateKey = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      dailyCounts.set(dateKey, (dailyCounts.get(dateKey) || 0) + 1)
    }
    return Array.from(dailyCounts, ([date, count]) => ({ date, count }))
  }, [playEvents, year])

  useEffect(() => {
    let cancelled = false
    setRemoteCalendar([])
    if (!isLoggedIn) return () => { cancelled = true }

    const loadRemote = async () => {
      const dailyCounts = new Map<string, number>()
      if (year === currentYear) {
        const [yearResult, todayResult] = await Promise.allSettled([
          getListenYearReport(),
          getListenTodaySongs(),
        ])
        if (yearResult.status === 'fulfilled') {
          collectDailyCounts(yearResult.value, year, dailyCounts)
        }
        if (todayResult.status === 'fulfilled') {
          collectDailyCounts(todayResult.value, year, dailyCounts)
          const todayCount = extractCollectionCount(todayResult.value)
          if (todayCount > 0) {
            const now = new Date()
            const today = `${year}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
            dailyCounts.set(today, Math.max(dailyCounts.get(today) || 0, todayCount))
          }
        }
      } else {
        const endTime = new Date(year, 11, 31).getTime()
        const report = await getListenReport('year', endTime)
        collectDailyCounts(report, year, dailyCounts)
      }
      if (!cancelled) {
        setRemoteCalendar(Array.from(dailyCounts, ([date, count]) => ({ date, count })))
      }
    }

    loadRemote().catch(() => {
      if (!cancelled) setRemoteCalendar([])
    })
    return () => { cancelled = true }
  }, [currentYear, isLoggedIn, year])

  const calendar = useMemo<DayData[]>(() => {
    const merged = new Map<string, number>()
    for (const item of remoteCalendar) merged.set(item.date, item.count)
    for (const item of localCalendar) {
      merged.set(item.date, Math.max(merged.get(item.date) || 0, item.count))
    }
    return Array.from(merged, ([date, count]) => ({ date, count }))
  }, [localCalendar, remoteCalendar])

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
    </div>
  )
}
