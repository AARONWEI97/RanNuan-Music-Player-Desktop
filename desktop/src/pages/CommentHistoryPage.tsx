import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUserCommentHistory, getMusicDetail, sendComment, likeComment } from '@shared'
import { useAuthStore } from '@/store/authStore'
import { playSong } from '@/services/audioService'
import { thumbUrl } from '@/utils/image'
import { showToast } from '@/utils/toast'
import {
  ArrowLeft, MessageCircle, Music, Disc3, ListMusic,
  Heart, Play, User, Clock, Quote,
  Trash2, Loader, Filter,
} from 'lucide-react'

type ResourceType = 'song' | 'playlist' | 'album' | 'all'

interface CommentItem {
  commentId: number
  content: string
  time: number
  likedCount: number
  liked: boolean
  beReplied?: { content: string; user: { nickname: string; avatarUrl?: string } }[]
  resourceType: ResourceType
  resourceId: number
  resourceName: string
  resourceArtist?: string
  resourcePic?: string
  resourceSub?: string
  threadId?: string
  rawSong?: { id: number; name: string; ar?: { name: string }[]; al?: { picUrl: string } }
}

// ── helpers ──
function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins} 分钟前`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} 小时前`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days} 天前`
  if (days < 30) return `${Math.floor(days / 7)} 周前`
  return `${Math.floor(days / 30)} 个月前`
}

function fullDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const RES_TYPE_CONFIG: Record<string, { label: string; icon: typeof Music; color: string; bg: string }> = {
  song:     { label: '歌曲', icon: Music,     color: '#e60026', bg: '#e6002612' },
  playlist: { label: '歌单', icon: ListMusic, color: '#f59e0b', bg: '#f59e0b12' },
  album:    { label: '专辑', icon: Disc3,     color: '#06b6d4', bg: '#06b6d412' },
}

const TYPE_MAP: Record<string, number> = { song: 0, playlist: 2, album: 3 }

// ── parse threadId ──
function parseThreadId(threadId: string): { type: ResourceType; id: number } | null {
  if (!threadId) return null
  const parts = threadId.split('_')
  if (parts.length < 3) return null
  const id = Number(parts[parts.length - 1])
  if (!id) return null
  if (threadId.startsWith('R_SO_')) return { type: 'song', id }
  if (threadId.startsWith('A_PL_')) return { type: 'playlist', id }
  if (threadId.startsWith('R_AL_')) return { type: 'album', id }
  return null
}

// ── normalize ──
function normalizeComment(c: any): CommentItem {
  const song = c.song || c.beReplied?.[0]?.beRepliedComment?.song || null
  const playlist = c.playlist || c.beReplied?.[0]?.beRepliedComment?.playlist || null
  const album = c.album || c.beReplied?.[0]?.beRepliedComment?.album || null

  if (song) return {
    commentId: c.commentId, content: c.content, time: c.time,
    likedCount: c.likedCount || 0, liked: c.liked || false,
    beReplied: c.beReplied, threadId: c.threadId,
    resourceType: 'song', resourceId: song.id, resourceName: song.name,
    resourceArtist: song.ar?.map((a: any) => a.name).join('/') || '',
    resourcePic: song.al?.picUrl || '', resourceSub: '',
    rawSong: song,
  }
  if (playlist) return {
    commentId: c.commentId, content: c.content, time: c.time,
    likedCount: c.likedCount || 0, liked: c.liked || false,
    beReplied: c.beReplied, threadId: c.threadId,
    resourceType: 'playlist', resourceId: playlist.id, resourceName: playlist.name,
    resourcePic: playlist.coverImgUrl || '', resourceSub: `${playlist.trackCount || 0} 首`,
  }
  if (album) return {
    commentId: c.commentId, content: c.content, time: c.time,
    likedCount: c.likedCount || 0, liked: c.liked || false,
    beReplied: c.beReplied, threadId: c.threadId,
    resourceType: 'album', resourceId: album.id, resourceName: album.name,
    resourceArtist: album.artist?.name || album.artists?.[0]?.name,
    resourcePic: album.picUrl || '', resourceSub: `${album.size || 0} 首`,
  }

  const thread = parseThreadId(c.threadId || '')
  if (thread) return {
    commentId: c.commentId, content: c.content, time: c.time,
    likedCount: c.likedCount || 0, liked: c.liked || false,
    beReplied: c.beReplied, threadId: c.threadId,
    resourceType: thread.type, resourceId: thread.id, resourceName: '加载中…',
    resourceSub: '',
    rawSong: thread.type === 'song' ? { id: thread.id, name: '加载中…', ar: [], al: { picUrl: '' } } : undefined,
  }

  return {
    commentId: c.commentId, content: c.content, time: c.time,
    likedCount: c.likedCount || 0, liked: c.liked || false,
    beReplied: c.beReplied, threadId: c.threadId,
    resourceType: 'song', resourceId: 0, resourceName: '未知资源', resourceSub: '',
  }
}

function Sk({ className }: { className?: string }) {
  return <div className={`rounded-lg bg-gray-200 dark:bg-gray-700/50 animate-pulse ${className || ''}`} />
}

// ── Comment Card ──
function CommentCard({ item, index, onPlay, onLike, onDelete, onNavigate }: {
  item: CommentItem; index: number
  onPlay: (s: any) => void; onLike: (c: CommentItem) => void
  onDelete: (c: CommentItem) => void; onNavigate: (c: CommentItem) => void
}) {
  const cfg = RES_TYPE_CONFIG[item.resourceType]
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="group relative pl-10 pb-6 last:pb-0"
      style={{ animation: `fade-in-up 0.4s ease-out ${index * 45}ms both` }}>
      {/* timeline line + dot */}
      <div className="absolute left-0 top-0 bottom-0 flex flex-col items-center">
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-white dark:border-gray-800 shadow-sm group-hover:scale-110 transition-all z-10"
          style={{ backgroundColor: cfg?.bg || '#f59e0b12', borderColor: `${cfg?.color || '#f59e0b'}30` }}>
          {cfg ? <cfg.icon className="w-3.5 h-3.5" style={{ color: cfg.color }} /> : <MessageCircle className="w-3.5 h-3.5" />}
        </div>
        <div className="flex-1 w-px mt-1.5 bg-gradient-to-b from-gray-200 dark:from-gray-700 to-transparent" />
      </div>

      {/* card */}
      <div className="rounded-2xl bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.06] hover:border-gray-200 dark:hover:border-white/[0.1] hover:shadow-lg transition-all duration-300 overflow-hidden">
        {/* resource header — clickable */}
        <div onClick={() => onNavigate(item)}
          className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 dark:border-white/[0.04] cursor-pointer hover:opacity-90 transition-opacity"
          style={{ background: cfg ? `linear-gradient(135deg, ${cfg.bg} 0%, transparent 60%)` : undefined }}>
          {item.resourcePic ? (
            <img src={thumbUrl(item.resourcePic)} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 shadow-sm ring-1 ring-black/5 dark:ring-white/5" loading="lazy" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-white/[0.05] flex items-center justify-center flex-shrink-0">
              {cfg ? <cfg.icon className="w-5 h-5 text-gray-300 dark:text-gray-600" /> : <Music className="w-5 h-5 text-gray-300" />}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {cfg && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ color: cfg.color, backgroundColor: cfg.bg }}>{cfg.label}</span>}
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{item.resourceName}</p>
            </div>
            {(item.resourceArtist || item.resourceSub) && (
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">{item.resourceArtist}{item.resourceSub ? ` · ${item.resourceSub}` : ''}</p>
            )}
          </div>
          {item.resourceType === 'song' && item.rawSong && item.resourceId > 0 && (
            <button onClick={(e) => { e.stopPropagation(); onPlay(item.rawSong) }}
              className="w-8 h-8 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 hover:scale-110 hover:shadow-md transition-all flex-shrink-0">
              <Play className="w-3.5 h-3.5 text-[#e60026] ml-0.5" />
            </button>
          )}
        </div>

        {/* comment content */}
        <div className="px-4 py-3">
          <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed break-words whitespace-pre-wrap">{item.content}</p>
          {item.beReplied && item.beReplied.length > 0 && (
            <div className="mt-2.5 flex items-start gap-2 px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/[0.03] border-l-2 border-gray-200 dark:border-gray-600">
              <Quote className="w-3 h-3 text-gray-300 dark:text-gray-500 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">{item.beReplied[0].user.nickname}</span>
                <span className="text-[11px] text-gray-400 dark:text-gray-500 ml-1">：</span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">{item.beReplied[0].content}</span>
              </div>
            </div>
          )}
        </div>

        {/* footer */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50/50 dark:bg-black/10 border-t border-gray-50 dark:border-white/[0.03]">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500">
            <Clock className="w-3 h-3" />
            <span title={fullDate(item.time)}>{timeAgo(item.time)}</span>
          </div>
          <div className="flex items-center gap-3">
            {/* like */}
            <button onClick={() => onLike(item)}
              className={`flex items-center gap-1 text-[11px] transition-all duration-200 ${item.liked ? 'text-red-500 scale-105' : 'text-gray-400 hover:text-red-400'}`}>
              <Heart className={`w-3 h-3 transition-all ${item.liked ? 'fill-red-500' : ''}`} />
              {item.likedCount > 0 ? item.likedCount : ''}
            </button>
            {/* delete */}
            <div className="flex items-center">
              {confirmDelete ? (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-red-400">确认?</span>
                  <button onClick={() => { onDelete(item); setConfirmDelete(false) }}
                    className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500 text-white hover:bg-red-600 transition-colors">删除</button>
                  <button onClick={() => setConfirmDelete(false)}
                    className="px-1.5 py-0.5 rounded text-[10px] text-gray-400 hover:text-gray-600 transition-colors">取消</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(true)}
                  className="text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════ MAIN ═══════════════ */
export default function CommentHistoryPage() {
  const navigate = useNavigate()
  const profile = useAuthStore(s => s.profile)
  const isLoggedIn = useAuthStore(s => s.isLoggedIn)

  const [comments, setComments] = useState<CommentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [filter, setFilter] = useState<ResourceType>('all')
  const lastTimeRef = useRef<number | undefined>(undefined)

  // ── fetch ──
  const fetchComments = useCallback(async (cursor?: number) => {
    if (!profile?.userId) return
    const isLoadMore = !!cursor
    if (isLoadMore) setLoadingMore(true)
    else setLoading(true)

    try {
      const res: any = await getUserCommentHistory({ uid: profile.userId, limit: 30, ...(cursor ? { time: cursor } : {}) })
      const data = res?.data?.data?.comments || res?.data?.comments || []
      const list = Array.isArray(data) ? data : (data?.list || data?.comments || [])
      const normalized = list.map(normalizeComment)

      if (isLoadMore) {
        setComments(prev => [...prev, ...normalized])
      } else {
        setComments(normalized)
      }

      setHasMore(list.length >= 30)
      if (list.length > 0) {
        lastTimeRef.current = list[list.length - 1]?.time
      }

      // batch-fetch missing song details
      const missingIds: number[] = []
      normalized.forEach(c => {
        if (c.resourceType === 'song' && c.resourceId > 0 && !c.resourcePic && c.resourceName === '加载中…') {
          missingIds.push(c.resourceId)
        }
      })
      if (missingIds.length > 0) {
        getMusicDetail([...new Set(missingIds)]).then((d: any) => {
          const songsArr = d?.data?.songs || d?.data?.data?.songs || []
          const map = new Map<number, any>()
          songsArr.forEach((s: any) => map.set(s.id, s))
          setComments(prev => prev.map(c => {
            if (c.resourceType === 'song' && c.resourceId > 0 && map.has(c.resourceId)) {
              const s = map.get(c.resourceId)
              return { ...c, resourceName: s.name, resourceArtist: s.ar?.map((a: any) => a.name).join('/'), resourcePic: s.al?.picUrl || '', rawSong: { id: s.id, name: s.name, ar: s.ar, al: s.al } }
            }
            return c
          }))
        }).catch(() => {})
      }
    } catch { } finally {
      setLoading(false); setLoadingMore(false)
    }
  }, [profile?.userId])

  useEffect(() => {
    if (!isLoggedIn || !profile?.userId) { setLoading(false); return }
    fetchComments()
  }, [profile?.userId, isLoggedIn, fetchComments])

  // ── actions ──
  const handleLike = useCallback(async (c: CommentItem) => {
    const typeNum = TYPE_MAP[c.resourceType] || 0
    const t = c.liked ? 0 : 1
    // optimistic
    setComments(prev => prev.map(x => x.commentId === c.commentId ? { ...x, liked: !c.liked, likedCount: x.likedCount + (c.liked ? -1 : 1) } : x))
    try {
      await likeComment({ id: c.resourceId, cid: c.commentId, t, type: typeNum })
    } catch {
      // revert
      setComments(prev => prev.map(x => x.commentId === c.commentId ? { ...x, liked: c.liked, likedCount: c.likedCount } : x))
      showToast('操作失败')
    }
  }, [])

  const handleDelete = useCallback(async (c: CommentItem) => {
    const typeNum = TYPE_MAP[c.resourceType] || 0
    setComments(prev => prev.filter(x => x.commentId !== c.commentId))
    showToast('已删除')
    try {
      await sendComment({ t: 0, type: typeNum, id: c.resourceId, commentId: c.commentId, content: '' })
    } catch {
      showToast('删除失败，请刷新重试')
    }
  }, [])

  const handlePlaySong = (song: any) => {
    if (!song?.id) return
    playSong({ id: song.id, name: song.name, picUrl: song.al?.picUrl || '', ar: song.ar?.map((a: any) => ({ id: a.id, name: a.name })) || [], al: song.al || { id: 0, name: '', picUrl: '' }, count: 0 })
  }

  const handleNavigate = (c: CommentItem) => {
    if (c.resourceType === 'song' && c.resourceId > 0) navigate(`/song/${c.resourceId}`)
    else if (c.resourceType === 'playlist' && c.resourceId > 0) navigate(`/playlist/${c.resourceId}`)
    else if (c.resourceType === 'album' && c.resourceId > 0) navigate(`/album/${c.resourceId}`)
  }

  // ── stats + filter ──
  const filtered = useMemo(() => filter === 'all' ? comments : comments.filter(c => c.resourceType === filter), [comments, filter])
  const stats = useMemo(() => ({
    total: comments.length, totalLikes: comments.reduce((s, c) => s + c.likedCount, 0),
    songCount: comments.filter(c => c.resourceType === 'song').length,
    playlistCount: comments.filter(c => c.resourceType === 'playlist').length,
    albumCount: comments.filter(c => c.resourceType === 'album').length,
  }), [comments])

  /* ═══════════════ RENDER ═══════════════ */
  return (
    <div>
      {/* header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">评论历史</h1>
      </div>

      {/* ═══ STATS BAR ═══ */}
      {!loading && isLoggedIn && comments.length > 0 && (
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          {[
            { v: stats.total, l: '条评论', icon: MessageCircle, color: '#e60026' },
            { v: stats.totalLikes, l: '获赞', icon: Heart, color: '#ef4444' },
            { v: stats.songCount, l: '歌曲', icon: Music, color: '#f59e0b' },
            { v: stats.playlistCount, l: '歌单', icon: ListMusic, color: '#06b6d4' },
            { v: stats.albumCount, l: '专辑', icon: Disc3, color: '#8b5cf6' },
          ].map(s => (
            <div key={s.l} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05]">
              <s.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: s.color }} />
              <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{s.v}</span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500">{s.l}</span>
            </div>
          ))}
        </div>
      )}

      {/* ═══ FILTER TABS ═══ */}
      {!loading && isLoggedIn && comments.length > 0 && (
        <div className="flex gap-2 mb-5 overflow-x-auto scrollbar-none">
          {[ { k: 'all' as ResourceType, l: '全部', i: Filter },
             { k: 'song' as ResourceType, l: '歌曲', i: Music },
             { k: 'playlist' as ResourceType, l: '歌单', i: ListMusic },
             { k: 'album' as ResourceType, l: '专辑', i: Disc3 },
          ].map(t => (
            <button key={t.k} onClick={() => setFilter(t.k)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${filter === t.k ? 'bg-[#e60026] text-white shadow-sm' : 'bg-gray-100 dark:bg-white/[0.05] text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10'}`}>
              <t.i className="w-3.5 h-3.5" />{t.l}
            </button>
          ))}
        </div>
      )}

      {/* ═══ CONTENT ═══ */}
      {!isLoggedIn ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-5">
            <User className="w-10 h-10 text-gray-300 dark:text-gray-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-1">需要登录</h2>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">登录后查看你的评论历史</p>
          <button onClick={() => navigate('/login')} className="px-6 py-2.5 bg-[#e60026] hover:bg-[#c4001f] text-white rounded-xl text-sm font-semibold transition-all hover:shadow-lg hover:shadow-[#e60026]/25">立即登录</button>
        </div>
      ) : loading ? (
        <div className="space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Sk className="w-9 h-9 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2"><Sk className="w-full h-24" /></div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-5">
            <MessageCircle className="w-10 h-10 text-gray-300 dark:text-gray-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-1">还没有评论记录</h2>
          <p className="text-sm text-gray-400 dark:text-gray-500">去听歌时留下你的想法吧</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-5 rounded-full bg-[#e60026]" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">全部评论</h2>
            <span className="text-[11px] text-gray-400 ml-auto">{filtered.length} 条</span>
          </div>

          <div className="pl-2">
            {filtered.map((item, index) => (
              <CommentCard key={item.commentId} item={item} index={index}
                onPlay={handlePlaySong} onLike={handleLike} onDelete={handleDelete} onNavigate={handleNavigate} />
            ))}
          </div>

          {/* load more */}
          <div className="flex justify-center mt-6 pt-6 border-t border-gray-100 dark:border-white/[0.04]">
            {hasMore ? (
              <button onClick={() => fetchComments(lastTimeRef.current)} disabled={loadingMore}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-gray-500 hover:text-[#e60026] bg-gray-50 dark:bg-white/[0.03] hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all disabled:opacity-40">
                {loadingMore ? <Loader className="w-4 h-4 animate-spin" /> : null}
                加载更多
              </button>
            ) : (
              <p className="text-[10px] text-gray-300 dark:text-gray-600 flex items-center gap-1">
                <Quote className="w-3 h-3" /> 已加载全部评论
              </p>
            )}
          </div>
        </>
      )}

      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
