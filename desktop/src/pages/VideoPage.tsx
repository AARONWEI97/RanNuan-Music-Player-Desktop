import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getRelatedAllVideo, getVideoDetail, getVideoDetailInfo, getVideoUrl } from '@shared'
import { ArrowLeft, Calendar, Eye, Loader, MessageCircle, Play, Share2, ThumbsUp, Video } from 'lucide-react'
import CommentSection from '@/components/common/CommentSection'
import { avatarUrl, coverUrl } from '@/utils/image'
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
  return res?.data?.data || res?.data?.video || res?.data || null
}

function pickInfo(res: any) {
  return res?.data || {}
}

function pickUrl(res: any) {
  const data = res?.data?.data || res?.data
  const urls = data?.urls || res?.data?.urls
  return data?.url || urls?.[0]?.url || data?.data?.url || ''
}

function pickRelated(res: any) {
  const data = res?.data?.data || res?.data
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.relatedVideo)) return data.relatedVideo
  if (Array.isArray(data?.videos)) return data.videos
  return []
}

function getCreatorNames(detail: any) {
  const creators = Array.isArray(detail?.creator) ? detail.creator : detail?.creator ? [detail.creator] : []
  return creators.map((c: any) => c.nickname || c.userName || c.name).filter(Boolean).join(' / ')
}

function getCreatorAvatar(detail: any) {
  const creators = Array.isArray(detail?.creator) ? detail.creator : detail?.creator ? [detail.creator] : []
  return creators.find((c: any) => c.avatarUrl)?.avatarUrl || ''
}

export default function VideoPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const videoId = id || ''

  const [detail, setDetail] = useState<any>(null)
  const [info, setInfo] = useState<any>(null)
  const [videoUrl, setVideoUrl] = useState('')
  const [quality, setQuality] = useState<number>(1080)
  const [related, setRelated] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [urlLoading, setUrlLoading] = useState(false)
  const [error, setError] = useState('')

  const qualities = useMemo((): number[] => {
    const resolutions = Array.isArray(detail?.resolutions) ? detail.resolutions : []
    const list: number[] = []
    for (const item of resolutions) {
      const row = item as { resolution?: number | string; size?: number | string; br?: number | string }
      const n = Number(row.resolution || row.size || row.br)
      if (Number.isFinite(n) && n > 0) list.push(n)
    }
    const defaults = [1080, 720, 480]
    return [...new Set(list.length > 0 ? list : defaults)].sort((a, b) => b - a)
  }, [detail])

  const loadUrl = useCallback(async (nextQuality: number) => {
    if (!videoId) return
    setUrlLoading(true)
    try {
      const res = await getVideoUrl(videoId, nextQuality)
      const url = pickUrl(res)
      if (!url) {
        showToast('视频地址不可用', '可能受版权、登录态或清晰度限制')
        setVideoUrl('')
      } else {
        setVideoUrl(url)
      }
    } catch {
      setVideoUrl('')
      showToast('视频地址获取失败')
    } finally {
      setUrlLoading(false)
    }
  }, [videoId])

  useEffect(() => {
    if (!videoId) return
    let cancelled = false
    setLoading(true)
    setError('')
    setDetail(null)
    setInfo(null)
    setVideoUrl('')

    Promise.allSettled([
      getVideoDetail(videoId),
      getVideoDetailInfo(videoId),
      getRelatedAllVideo(videoId),
    ]).then(([detailRes, infoRes, relatedRes]) => {
      if (cancelled) return
      if (detailRes.status !== 'fulfilled') {
        setError('视频详情加载失败')
        return
      }
      const nextDetail = pickDetail(detailRes.value)
      setDetail(nextDetail)
      if (infoRes.status === 'fulfilled') setInfo(pickInfo(infoRes.value))
      if (relatedRes.status === 'fulfilled') setRelated(pickRelated(relatedRes.value))
      else setRelated([])

      const resolutions = Array.isArray(nextDetail?.resolutions) ? nextDetail.resolutions : []
      const bestQuality = resolutions
        .map((item: any) => Number(item.resolution || item.size || item.br))
        .filter(Boolean)
        .sort((a: number, b: number) => b - a)[0] || 1080
      setQuality(bestQuality)
      loadUrl(bestQuality)
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })

    return () => { cancelled = true }
  }, [videoId, loadUrl])

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
        <p className="text-sm">{error || '视频不存在'}</p>
        <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 rounded-full bg-[#e60026] text-white text-sm">返回</button>
      </div>
    )
  }

  const cover = detail.coverUrl || detail.cover || detail.imgUrl || detail.imageUrl || ''
  const title = detail.title || detail.name || '视频'
  const creator = getCreatorNames(detail)
  const creatorCover = getCreatorAvatar(detail)
  const publishTime = detail.publishTime || detail.publishDate || detail.createTime
  const commentCount = info?.commentCount ?? detail.commentCount
  const shareCount = info?.shareCount ?? detail.shareCount
  const likedCount = info?.likedCount ?? info?.praisedCount ?? detail.praisedCount
  const playCount = detail.playTime ?? detail.playCount

  return (
    <div className="-mx-6 -mt-6 min-h-full bg-white dark:bg-[#151515]">
      <div className="relative overflow-hidden">
        {cover && (
          <>
            <img src={coverUrl(cover)} alt="" className="absolute inset-0 h-[420px] w-full object-cover blur-3xl scale-110 opacity-24 dark:opacity-16" />
            <div className="absolute inset-0 h-[420px] bg-gradient-to-b from-white/50 via-white/95 to-white dark:from-black/40 dark:via-[#151515]/92 dark:to-[#151515]" />
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
                {creatorCover && <img src={avatarUrl(creatorCover)} alt="" className="w-5 h-5 rounded-full object-cover" />}
                {creator && <span>{creator}</span>}
                {publishTime && <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{typeof publishTime === 'number' ? new Date(publishTime).toLocaleDateString() : publishTime}</span>}
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
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 dark:bg-white/[0.06]"><Eye className="w-3.5 h-3.5" />{formatCount(playCount)}播放</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 dark:bg-white/[0.06]"><ThumbsUp className="w-3.5 h-3.5" />{formatCount(likedCount)}赞</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 dark:bg-white/[0.06]"><MessageCircle className="w-3.5 h-3.5" />{formatCount(commentCount)}评论</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 dark:bg-white/[0.06]"><Share2 className="w-3.5 h-3.5" />{formatCount(shareCount)}分享</span>
          </div>

          {(detail.description || detail.desc) && (
            <p className="mt-4 text-sm leading-6 text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{detail.description || detail.desc}</p>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-12 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
        <section>
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">评论</h2>
          <CommentSection resourceId={videoId} resourceType="video" />
        </section>

        <aside>
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">相关视频</h2>
          <div className="space-y-3">
            {related.length === 0 ? (
              <p className="text-sm text-gray-400">暂无相关视频</p>
            ) : related.slice(0, 8).map((video: any) => {
              const relatedId = video.vid || video.id
              return (
                <button
                  key={relatedId || video.title}
                  onClick={() => relatedId && navigate(`/video/${relatedId}`)}
                  className="group flex w-full gap-3 text-left"
                >
                  <div className="relative w-28 aspect-video flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-white/[0.06]">
                    <img src={coverUrl(video.coverUrl || video.cover || video.imgUrl || '')} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    {(video.durationms || video.duration) && <span className="absolute bottom-1 right-1 rounded bg-black/55 px-1 text-[10px] text-white">{formatDuration(video.durationms || video.duration)}</span>}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-6 h-6 text-white fill-white drop-shadow" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium text-gray-800 group-hover:text-[#e60026] dark:text-gray-200">{video.title || video.name}</p>
                    <p className="mt-1 truncate text-xs text-gray-400">{getCreatorNames(video) || '视频'}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </aside>
      </div>
    </div>
  )
}
