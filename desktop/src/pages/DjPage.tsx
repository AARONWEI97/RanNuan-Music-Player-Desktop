import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getDjDetail, getDjProgram, type SongResult, usePlaylistStore } from '@shared'
import { ArrowLeft, Calendar, Headphones, Loader, Music2, Play, Radio, User } from 'lucide-react'
import SongRow from '@/components/common/SongRow'
import { playSong } from '@/services/audioService'
import { coverUrl, thumbUrl } from '@/utils/image'

const PAGE_SIZE = 30

function fmt(n: number) {
  if (!n) return '0'
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}亿`
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`
  return `${n}`
}

function fmtDate(t?: number) {
  if (!t) return ''
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getDetailPayload(res: any) {
  return res?.data?.data || res?.data?.djRadio || res?.data?.radio || res?.data || null
}

function getProgramListPayload(res: any) {
  const data = res?.data?.data || res?.data || {}
  const programs = data.programs || data.list || data.data || []
  return {
    programs: Array.isArray(programs) ? programs : [],
    more: Boolean(data.more ?? data.hasMore ?? programs.length >= PAGE_SIZE),
    count: Number(data.count ?? data.total ?? 0),
  }
}

function normalizeProgram(program: any, radio: any): SongResult | null {
  const mainSong = program?.mainSong || program?.song || {}
  const trackId = program?.mainTrackId || mainSong?.id
  if (!trackId) return null

  const djName = program?.dj?.nickname || radio?.dj?.nickname || '电台节目'
  const cover = program?.coverUrl || program?.blurCoverUrl || mainSong?.al?.picUrl || mainSong?.album?.picUrl || radio?.picUrl || ''
  const duration = program?.duration || mainSong?.dt || mainSong?.duration || 0

  return {
    id: trackId,
    name: program?.name || mainSong?.name || '未命名节目',
    picUrl: cover,
    ar: mainSong?.ar || mainSong?.artists || [{ id: program?.dj?.userId || radio?.dj?.userId || 0, name: djName }],
    al: mainSong?.al || mainSong?.album || { id: radio?.id || 0, name: radio?.name || '电台', picUrl: cover },
    dt: duration,
    duration,
    count: 0,
    program,
    source: 'dj',
    djProgramId: program?.id,
    serialNum: program?.serialNum,
  }
}

export default function DjPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const radioId = Number(id)
  const { setPlayList, setPlayListIndex } = usePlaylistStore()

  const [radio, setRadio] = useState<any>(null)
  const [programs, setPrograms] = useState<SongResult[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')

  const cover = radio?.picUrl || radio?.coverUrl || ''
  const title = radio?.name || '电台详情'
  const dj = radio?.dj || radio?.profile || null

  const visiblePrograms = useMemo(() => programs.filter(Boolean), [programs])

  useEffect(() => {
    if (!radioId) return
    let cancelled = false

    async function fetchInitial() {
      setLoading(true)
      setError('')
      setPrograms([])
      try {
        const [detailRes, programRes] = await Promise.all([
          getDjDetail(radioId),
          getDjProgram({ rid: radioId, limit: PAGE_SIZE, offset: 0 }),
        ])
        if (cancelled) return

        const detail = getDetailPayload(detailRes)
        const programPayload = getProgramListPayload(programRes)
        const radioInfo = detail || {}
        setRadio(radioInfo)
        setPrograms(programPayload.programs.map((p: any) => normalizeProgram(p, radioInfo)).filter(Boolean) as SongResult[])
        setHasMore(programPayload.more)
        setTotal(programPayload.count)
      } catch {
        if (!cancelled) setError('电台加载失败')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchInitial()
    return () => { cancelled = true }
  }, [radioId])

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore || !radioId) return
    setLoadingMore(true)
    try {
      const res = await getDjProgram({ rid: radioId, limit: PAGE_SIZE, offset: programs.length })
      const payload = getProgramListPayload(res)
      setPrograms(prev => [...prev, ...(payload.programs.map((p: any) => normalizeProgram(p, radio)).filter(Boolean) as SongResult[])])
      setHasMore(payload.more)
      if (payload.count) setTotal(payload.count)
    } finally {
      setLoadingMore(false)
    }
  }

  const handlePlayAll = () => {
    if (visiblePrograms.length === 0) return
    setPlayList(visiblePrograms)
    setPlayListIndex(0)
    playSong(visiblePrograms[0])
  }

  const handlePlayOne = (song: SongResult) => {
    const index = visiblePrograms.findIndex(s => s.id === song.id)
    setPlayList(visiblePrograms)
    setPlayListIndex(Math.max(0, index))
    playSong(song)
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-20 rounded bg-gray-100 dark:bg-white/[0.06] animate-pulse" />
        <div className="h-56 rounded-2xl bg-gray-100 dark:bg-white/[0.06] animate-pulse" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 rounded-lg bg-gray-100 dark:bg-white/[0.04] animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#e60026] transition-colors mb-5">
          <ArrowLeft className="w-4 h-4" /> 返回
        </button>
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Radio className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#e60026] transition-colors">
        <ArrowLeft className="w-4 h-4" /> 返回
      </button>

      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#e60026]/10 via-gray-50 to-white dark:from-[#e60026]/12 dark:via-white/[0.03] dark:to-white/[0.02] p-6">
        <div className="flex gap-6 items-start">
          <div className="w-44 h-44 rounded-xl bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0 shadow-lg">
            {cover ? (
              <img src={coverUrl(cover)} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400"><Radio className="w-12 h-12" /></div>
            )}
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#e60026] text-white">电台</span>
              {radio?.category && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/70 dark:bg-white/[0.08] text-gray-500">{radio.category}</span>}
            </div>
            <h1 className="text-2xl font-bold mb-2 truncate">{title}</h1>
            {dj && (
              <button onClick={() => dj.userId && navigate(`/user/${dj.userId}`)} className="flex items-center gap-2 mb-3 text-sm text-gray-600 dark:text-gray-400 hover:text-[#e60026] transition-colors">
                {dj.avatarUrl ? <img src={thumbUrl(dj.avatarUrl)} alt="" className="w-6 h-6 rounded-full object-cover" /> : <User className="w-4 h-4" />}
                <span>{dj.nickname}</span>
              </button>
            )}
            <p className="text-sm text-gray-500 line-clamp-3 mb-4 max-w-2xl">{radio?.desc || radio?.description || '暂无简介'}</p>
            <div className="flex items-center gap-5 text-xs text-gray-500 mb-5 flex-wrap">
              <span className="flex items-center gap-1"><Music2 className="w-3.5 h-3.5" />{fmt(total || radio?.programCount || visiblePrograms.length)} 期</span>
              <span className="flex items-center gap-1"><Headphones className="w-3.5 h-3.5" />{fmt(radio?.playCount || 0)} 播放</span>
              {radio?.createTime && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{fmtDate(radio.createTime)} 创建</span>}
            </div>
            <button onClick={handlePlayAll} disabled={visiblePrograms.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#e60026] text-white rounded-full text-sm font-semibold hover:bg-[#c4001f] hover:shadow-lg hover:shadow-[#e60026]/20 transition-all disabled:opacity-40">
              <Play className="w-4 h-4" /> 播放全部
            </button>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">节目列表</h2>
          <span className="text-xs text-gray-400">{visiblePrograms.length}{total ? ` / ${total}` : ''}</span>
        </div>
        {visiblePrograms.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <Radio className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">暂无节目</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {visiblePrograms.map((program, index) => (
              <SongRow key={`${program.djProgramId || program.id}-${index}`} song={program} index={index} onPlay={() => handlePlayOne(program)} />
            ))}
          </div>
        )}
      </div>

      {hasMore && (
        <div className="flex justify-center py-4">
          <button onClick={handleLoadMore} disabled={loadingMore}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#e60026] transition-colors disabled:opacity-40">
            {loadingMore ? <><Loader className="w-3 h-3 animate-spin" /> 加载中...</> : '加载更多节目'}
          </button>
        </div>
      )}
    </div>
  )
}
