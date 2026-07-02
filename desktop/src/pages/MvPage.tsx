import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getMvDetail, getMvUrl, getSimiMv } from '@shared'
import { ArrowLeft, Calendar, Eye, Heart, Loader, MessageCircle, Share2, Video } from 'lucide-react'
import CommentSection from '@/components/common/CommentSection'
import { coverUrl } from '@/utils/image'
import { showToast } from '@/utils/toast'

function formatCount(n?: number) {
  if (!n) return '0'
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}亿`
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`
  return `${n}`
}

function formatDuration(ms?: number) {
  if (!ms) return ''
  const total = Math.floor(ms / 1000)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

function pickDetail(res: any) {
  return res?.data?.data || res?.data?.mv || res?.data || null
}

function pickUrl(res: any) {
  return res?.data?.data?.url || res?.data?.url || ''
}

export default function MvPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const mvId = Number(id)

  const [detail, setDetail] = useState<any>(null)
  const [videoUrl, setVideoUrl] = useState('')
  const [quality, setQuality] = useState<number>(1080)
  const [similar, setSimilar] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [urlLoading, setUrlLoading] = useState(false)
  const [error, setError] = useState('')

  const qualities = useMemo((): number[] => {
    const brs = Array.isArray(detail?.brs) ? detail.brs : []
    const list: number[] = []
    for (const item of brs) {
      const n = Number((item as { br?: number | string }).br)
      if (Number.isFinite(n) && n > 0) list.push(n)
    }
    return [...new Set(list)].sort((a, b) => b - a)
  }, [detail])

  const loadUrl = useCallback(async (nextQuality: number) => {
    if (!mvId) return
    setUrlLoading(true)
    try {
      const res = await getMvUrl(mvId, nextQuality)
      const url = pickUrl(res)
      if (!url) {
        showToast('MV 地址不可用', '可能受版权或清晰度限制')
        setVideoUrl('')
      } else {
        setVideoUrl(url)
      }
    } catch {
      setVideoUrl('')
      showToast('MV 地址获取失败')
    } finally {
      setUrlLoading(false)
    }
  }, [mvId])

  useEffect(() => {
    if (!mvId) return
    let cancelled = false
    setLoading(true)
    setError('')
    setVideoUrl('')

    Promise.allSettled([
      getMvDetail(mvId),
      getSimiMv(mvId),
    ]).then(([detailRes, simiRes]) => {
      if (cancelled) return
      if (detailRes.status !== 'fulfilled') {
        setError('MV 详情加载失败')
        return
      }
      const nextDetail = pickDetail(detailRes.value)
      setDetail(nextDetail)
      const brs = Array.isArray(nextDetail?.brs) ? nextDetail.brs : []
      const bestQuality = brs.map((item: any) => Number(item.br)).filter(Boolean).sort((a: number, b: number) => b - a)[0] || 1080
      setQuality(bestQuality)
      loadUrl(bestQuality)
      if (simiRes.status === 'fulfilled') {
        setSimilar(simiRes.value?.data?.mvs || simiRes.value?.data?.data || [])
      } else {
        setSimilar([])
      }
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })

    return () => { cancelled = true }
  }, [mvId, loadUrl])

  const handleQuality = (next: number) => {
    setQuality(next)
    loadUrl(next)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <Loader className="w-7 h-7 animate-spin text-[#e60026]" />
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <Video className="w-14 h-14 mb-3 opacity-25" />
        <p className="text-sm">{error || 'MV 不存在'}</p>
        <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 rounded-full bg-[#e60026] text-white text-sm">返回</button>
      </div>
    )
  }

  const cover = detail.cover || detail.imgurl || detail.imgurl16v9 || ''
  const title = detail.name || detail.title || 'MV'
  const artists = Array.isArray(detail.artists) ? detail.artists : []

  return (
    <div className="-mx-6 -mt-6 min-h-full bg-white dark:bg-[#151515]">
      <div className="relative overflow-hidden">
        {cover && (
          <>
            <img src={coverUrl(cover)} alt="" className="absolute inset-0 h-[420px] w-full object-cover blur-3xl scale-110 opacity-25 dark:opacity-18" />
            <div className="absolute inset-0 h-[420px] bg-gradient-to-b from-white/55 via-white/95 to-white dark:from-black/40 dark:via-[#151515]/92 dark:to-[#151515]" />
          </>
        )}

        <div className="relative z-10 max-w-5xl mx-auto px-6 pt-4 pb-10">
          <button onClick={() => navigate(-1)} className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#e60026] dark:text-gray-400 dark:hover:text-white">
            <ArrowLeft className="w-4 h-4" /> 返回
          </button>

          <div className="overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-black/10 dark:ring-white/10">
            {videoUrl ? (
              <video
                key={videoUrl}
                src={videoUrl}
                poster={cover ? coverUrl(cover) : undefined}
                controls
                className="w-full aspect-video bg-black"
              />
            ) : (
              <div className="aspect-video flex flex-col items-center justify-center text-white/55">
                {urlLoading ? <Loader className="w-8 h-8 animate-spin mb-3" /> : <Video className="w-12 h-12 mb-3 opacity-40" />}
                <p className="text-sm">{urlLoading ? '正在获取播放地址...' : '暂无可播放地址'}</p>
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">{title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                {artists.length > 0 ? artists.map((artist: any, index: number) => (
                  <button key={artist.id || artist.name} onClick={() => artist.id && navigate(`/artist/${artist.id}`)} className="hover:text-[#e60026]">
                    {artist.name}{index < artists.length - 1 ? ' / ' : ''}
                  </button>
                )) : <span>{detail.artistName}</span>}
                {detail.publishTime && <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{detail.publishTime}</span>}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {qualities.map((q) => (
                <button
                  key={q}
                  onClick={() => handleQuality(q)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    quality === q ? 'bg-[#e60026] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-white/[0.06] dark:text-gray-300 dark:hover:bg-white/[0.1]'
                  }`}
                >
                  {q}P
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 dark:bg-white/[0.06]"><Eye className="w-3.5 h-3.5" />{formatCount(detail.playCount || detail.plays)}播放</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 dark:bg-white/[0.06]"><Heart className="w-3.5 h-3.5" />{formatCount(detail.subCount)}收藏</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 dark:bg-white/[0.06]"><MessageCircle className="w-3.5 h-3.5" />{formatCount(detail.commentCount)}评论</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 dark:bg-white/[0.06]"><Share2 className="w-3.5 h-3.5" />{formatCount(detail.shareCount)}分享</span>
          </div>

          {(detail.desc || detail.briefDesc) && (
            <p className="mt-4 text-sm leading-6 text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{detail.desc || detail.briefDesc}</p>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-12 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
        <section>
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">评论</h2>
          <CommentSection resourceId={mvId} resourceType="mv" />
        </section>

        <aside>
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">相关 MV</h2>
          <div className="space-y-3">
            {similar.length === 0 ? (
              <p className="text-sm text-gray-400">暂无相关 MV</p>
            ) : similar.slice(0, 8).map((mv: any) => (
              <button
                key={mv.id}
                onClick={() => navigate(`/mv/${mv.id}`)}
                className="group flex w-full gap-3 text-left"
              >
                <div className="relative w-28 aspect-video flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-white/[0.06]">
                  <img src={coverUrl(mv.cover || mv.imgurl || mv.imgurl16v9 || '')} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  {mv.duration && <span className="absolute bottom-1 right-1 rounded bg-black/55 px-1 text-[10px] text-white">{formatDuration(mv.duration)}</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium text-gray-800 group-hover:text-[#e60026] dark:text-gray-200">{mv.name}</p>
                  <p className="mt-1 truncate text-xs text-gray-400">{mv.artistName}</p>
                </div>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}
