import { useState, useEffect, useCallback, memo, useRef } from 'react'
import {
  getNewComment, getFloorComment,
  likeComment, sendComment, hugComment, reportComment,
} from '@shared'
import { useAuthStore } from '@/store/authStore'
import { showToast } from '@/utils/toast'
import {
  Heart, Music, MessageCircle, Send, HandHeart, Reply, Flag,
  ChevronDown, ChevronUp, Loader,
} from 'lucide-react'

/* ═══════════════ TYPES ═══════════════ */

export interface CommentData {
  commentId: number
  content: string
  time: number
  user: { userId: number; nickname: string; avatarUrl: string }
  likedCount: number
  liked: boolean
  beReplied?: { content: string; user: { nickname: string } }[]
  showFloorCount?: number
  hugCount?: number
  hugged?: boolean
}

type CommentSort = 'hot' | 'new'

const TYPE_MAP: Record<string, number> = { song: 0, mv: 1, playlist: 2, album: 3, dj: 4, video: 5, event: 6 }
const PAGE_SIZE = 20

/* ═══════════════ COMMENTSECTION PROPS ═══════════════ */

interface CommentSectionProps {
  resourceId: number
  resourceType: 'song' | 'playlist' | 'album'
  onTotalChange?: (total: number) => void
  initialComments?: CommentData[]
  customFetcher?: (offset: number) => Promise<{ comments: CommentData[]; total: number; more: boolean }>
  historyMode?: boolean
}

/* ═══════════════ SINGLE COMMENT CARD ═══════════════ */

const REPORT_REASONS = ['违规内容', '垃圾广告', '人身攻击', '低俗色情', '抄袭', '其他']

const CommentItem = memo(function CommentItem({
  c, onLike, onReply, onDelete, onHug, onViewFloor, onReport, isFloor,
}: {
  c: CommentData
  onLike: (c: CommentData) => void
  onReply: (c: CommentData, content: string) => void
  onDelete: (c: CommentData) => void
  onHug: (c: CommentData) => void
  onViewFloor: (c: CommentData) => void
  onReport: (c: CommentData) => void
  isFloor?: boolean
}) {
  const selfUid = useAuthStore(s => s.profile?.userId || 0)
  const isOwner = c.user?.userId === selfUid
  const [replying, setReplying] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [showDelete, setShowDelete] = useState(false)
  const [showReport, setShowReport] = useState(false)

  const handleSubmitReply = () => {
    if (!replyText.trim()) return
    onReply(c, replyText.trim())
    setReplyText('')
    setReplying(false)
  }

  return (
    <div className={`flex gap-2.5 py-3 group ${isFloor ? 'ml-10 pl-3 border-l-2 border-gray-100 dark:border-white/[0.06]' : ''}`}>
      <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0 ring-1 ring-gray-100 dark:ring-white/5">
        {c.user?.avatarUrl ? (
          <img src={c.user.avatarUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400"><Music className="w-4 h-4" /></div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        {/* meta */}
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-semibold text-blue-500">{c.user?.nickname || '匿名'}</span>
          <span className="text-[10px] text-gray-400">{new Date(c.time).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        {/* beReplied context */}
        {c.beReplied && c.beReplied.length > 0 && (
          <div className="text-[11px] text-gray-400 mt-0.5 bg-gray-50 dark:bg-white/[0.03] rounded px-2 py-1">
            <span className="font-medium">回复 {c.beReplied[0].user.nickname}：</span>{c.beReplied[0].content}
          </div>
        )}
        <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 leading-relaxed whitespace-pre-wrap">{c.content}</p>

        {/* actions */}
        <div className="flex items-center gap-4 mt-1.5 flex-wrap">
          {/* like */}
          <button onClick={() => onLike(c)}
            className={`flex items-center gap-1 text-[11px] transition-all ${c.liked ? 'text-red-500 scale-105' : 'text-gray-400 hover:text-red-400'}`}>
            <Heart className={`w-3 h-3 ${c.liked ? 'fill-red-500' : ''}`} />
            {c.likedCount > 0 && c.likedCount}
          </button>
          {/* hug */}
          <button onClick={() => onHug(c)}
            className={`flex items-center gap-1 text-[11px] transition-all ${c.hugged ? 'text-pink-500' : 'text-gray-400 hover:text-pink-400'}`}>
            <HandHeart className={`w-3.5 h-3.5 ${c.hugged ? 'fill-pink-500' : ''}`} />
            {c.hugCount && c.hugCount > 0 ? c.hugCount : ' 抱抱'}
          </button>
          {/* floor view (only main comments, not floor replies) */}
          {!isFloor && (c.showFloorCount || 0) > 0 && (
            <button onClick={() => onViewFloor(c)} className="text-[11px] text-gray-400 hover:text-[#e60026] transition-colors">
              查看 {c.showFloorCount} 条回复
            </button>
          )}
          {/* reply */}
          <button onClick={() => setReplying(!replying)} className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-[#e60026] transition-colors">
            <Reply className="w-3 h-3" /> 回复
          </button>
          {/* report — always visible */}
          <div className="relative">
            <button onClick={() => setShowReport(!showReport)}
              className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-orange-400 transition-colors opacity-0 group-hover:opacity-100">
              <Flag className="w-3 h-3" />
            </button>
            {showReport && (
              <div className="absolute bottom-full left-0 mb-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-20 min-w-[100px]">
                {REPORT_REASONS.map(r => (
                  <button key={r} onClick={() => { onReport(c); setShowReport(false) }}
                    className="block w-full text-left px-3 py-1 text-[11px] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.06] transition-colors">
                    {r}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* owner actions */}
          {isOwner && (
            <button onClick={() => setShowDelete(!showDelete)}
              className="text-[11px] text-gray-400 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
              删除
            </button>
          )}
          {showDelete && isOwner && (
            <span className="flex items-center gap-1 text-[10px] ml-auto">
              <span className="text-red-400">确认?</span>
              <button onClick={() => { onDelete(c); setShowDelete(false) }} className="text-red-500 font-medium hover:underline">删除</button>
              <button onClick={() => setShowDelete(false)} className="text-gray-400 hover:underline">取消</button>
            </span>
          )}
        </div>

        {/* reply input */}
        {replying && (
          <div className="mt-2 flex items-center gap-2">
            <input type="text" value={replyText} onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmitReply()}
              placeholder="写下你的回复..." autoFocus
              className="flex-1 px-3 py-1.5 rounded-full text-xs bg-gray-100 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.08] outline-none focus:ring-1 focus:ring-[#e60026]/30" />
            <button onClick={handleSubmitReply} disabled={!replyText.trim()}
              className="p-1.5 rounded-full bg-[#e60026] text-white disabled:opacity-30 hover:bg-[#c4001f] transition-colors">
              <Send className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
})

/* ═══════════════ MAIN: CommentSection ═══════════════ */

export default function CommentSection({
  resourceId, resourceType, onTotalChange, customFetcher, historyMode,
}: CommentSectionProps) {
  const selfProfile = useAuthStore(s => s.profile)
  const selfUid = selfProfile?.userId || 0
  const typeNum = TYPE_MAP[resourceType] || 0

  // ── tabs ──
  const [sort, setSort] = useState<CommentSort>('hot')
  // per-tab state
  const [hotComments, setHotComments] = useState<CommentData[]>([])
  const [newComments, setNewComments] = useState<CommentData[]>([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(!historyMode)
  const [loadingMore, setLoadingMore] = useState(false)
  // hot page tracking
  const hotOffsetRef = useRef(0)
  const newPageRef = useRef(1)

  // ── floor replies ──
  const [floorMap, setFloorMap] = useState<Record<number, { loaded: boolean; items: CommentData[] }>>({})

  // ── new comment input ──
  const [newCommentText, setNewCommentText] = useState('')
  const [sending, setSending] = useState(false)

  const comments = sort === 'hot' ? hotComments : newComments

  // ── fetcher ──
  const fetchComments = useCallback(async (reset: boolean) => {
    if (historyMode || customFetcher) return
    setLoading(reset)
    try {
      if (sort === 'hot') {
        const r: any = await getNewComment({
          id: resourceId, type: typeNum, pageNo: 1, pageSize: PAGE_SIZE, sortType: 2,
        })
        const data = r?.data
        const list: CommentData[] = (data?.data?.comments || data?.comments || []).map((c: any) => ({
          ...c, liked: c.liked || false, hugged: c.hugged || false, hugCount: c.hugCount || 0, showFloorCount: c.showFloorCount || c.repliedCount || 0,
        }))
        setHotComments(list)
        setTotal(data?.data?.totalCount || data?.totalCount || data?.total || 0)
        setHasMore(list.length >= PAGE_SIZE)
        hotOffsetRef.current = PAGE_SIZE
        onTotalChange?.(data?.data?.totalCount || data?.totalCount || data?.total || 0)
      } else {
        const r: any = await getNewComment({
          id: resourceId, type: typeNum, pageNo: 1, pageSize: PAGE_SIZE, sortType: 3,
        })
        const data = r?.data
        const list: CommentData[] = (data?.data?.comments || data?.comments || []).map((c: any) => ({
          ...c, liked: c.liked || false, hugged: c.hugged || false, hugCount: c.hugCount || 0, showFloorCount: c.showFloorCount || c.repliedCount || 0,
        }))
        setNewComments(list)
        setTotal(data?.data?.totalCount || data?.totalCount || data?.total || 0)
        setHasMore(list.length >= PAGE_SIZE)
        newPageRef.current = 2
        onTotalChange?.(data?.data?.totalCount || data?.totalCount || data?.total || 0)
      }
    } catch { } finally { setLoading(false) }
  }, [resourceId, typeNum, sort, historyMode, customFetcher])

  useEffect(() => {
    if (!historyMode && !customFetcher) fetchComments(true)
  }, [fetchComments])

  // ── load more ──
  const handleLoadMore = useCallback(async () => {
    if (loadingMore) return
    setLoadingMore(true)
    try {
      if (sort === 'hot') {
        const r: any = await getNewComment({
          id: resourceId, type: typeNum, pageNo: Math.ceil(hotOffsetRef.current / PAGE_SIZE) + 1,
          pageSize: PAGE_SIZE, sortType: 2,
        })
        const list: CommentData[] = (r?.data?.data?.comments || r?.data?.comments || []).map((c: any) => ({
          ...c, liked: c.liked || false, hugged: c.hugged || false, hugCount: c.hugCount || 0, showFloorCount: c.showFloorCount || c.repliedCount || 0,
        }))
        setHotComments(prev => [...prev, ...list])
        setHasMore(list.length >= PAGE_SIZE)
        hotOffsetRef.current += PAGE_SIZE
      } else {
        const r: any = await getNewComment({
          id: resourceId, type: typeNum, pageNo: newPageRef.current,
          pageSize: PAGE_SIZE, sortType: 3,
        })
        const list: CommentData[] = (r?.data?.data?.comments || r?.data?.comments || []).map((c: any) => ({
          ...c, liked: c.liked || false, hugged: c.hugged || false, hugCount: c.hugCount || 0, showFloorCount: c.showFloorCount || c.repliedCount || 0,
        }))
        setNewComments(prev => [...prev, ...list])
        setHasMore(list.length >= PAGE_SIZE)
        newPageRef.current += 1
      }
    } catch { } finally { setLoadingMore(false) }
  }, [loadingMore, sort, resourceId, typeNum])

  // ── sort switch ──
  const handleSort = (s: CommentSort) => {
    if (s === sort) return
    setSort(s)
    setHasMore(false)
  }

  // ── actions ──
  const handleLike = useCallback(async (c: CommentData) => {
    const t = c.liked ? 0 : 1
    const updater = (prev: CommentData[]) => prev.map(x =>
      x.commentId === c.commentId ? { ...x, liked: !c.liked, likedCount: x.likedCount + (c.liked ? -1 : 1) } : x)
    setHotComments(updater)
    setNewComments(updater)
    try { await likeComment({ id: resourceId, cid: c.commentId, t, type: typeNum }) } catch { showToast('操作失败') }
  }, [resourceId, typeNum])

  const handleReply = useCallback(async (c: CommentData, content: string) => {
    try {
      await sendComment({ t: 2, type: typeNum, id: resourceId, commentId: c.commentId, content })
      showToast('回复成功')
    } catch { showToast('回复失败') }
  }, [resourceId, typeNum])

  const handleDelete = useCallback(async (c: CommentData) => {
    const remover = (prev: CommentData[]) => prev.filter(x => x.commentId !== c.commentId)
    setHotComments(remover)
    setNewComments(remover)
    try { await sendComment({ t: 0, type: typeNum, id: resourceId, commentId: c.commentId, content: '' }) } catch { showToast('删除失败') }
  }, [resourceId, typeNum])

  const handleHug = useCallback(async (c: CommentData) => {
    if (!selfUid) { showToast('请先登录'); return }
    const updater = (prev: CommentData[]) => prev.map(x =>
      x.commentId === c.commentId ? { ...x, hugged: !x.hugged, hugCount: Math.max(0, (x.hugCount || 0) + (x.hugged ? -1 : 1)) } : x)
    setHotComments(updater)
    setNewComments(updater)
    try { await hugComment({ uid: selfUid, cid: c.commentId, sid: resourceId }) } catch { showToast('操作失败') }
  }, [selfUid, resourceId])

  const handleViewFloor = useCallback(async (c: CommentData) => {
    const existing = floorMap[c.commentId]
    if (existing?.loaded) {
      // collapse
      setFloorMap(prev => { const n = { ...prev }; delete n[c.commentId]; return n })
      return
    }
    try {
      const r: any = await getFloorComment({ parentCommentId: c.commentId, id: resourceId, type: typeNum, limit: 20 })
      const list: CommentData[] = (r?.data?.data || r?.data || []).map((x: any) => ({ ...x, liked: x.liked || false }))
      setFloorMap(prev => ({ ...prev, [c.commentId]: { loaded: true, items: list } }))
    } catch { showToast('加载回复失败') }
  }, [resourceId, typeNum, floorMap])

  const handleReport = useCallback(async (c: CommentData) => {
    try {
      await reportComment({ id: resourceId, cid: c.commentId, reason: '用户举报', type: typeNum })
      showToast('举报已提交', '感谢你的反馈')
    } catch { showToast('举报失败') }
  }, [resourceId, typeNum])

  const handleSendNewComment = useCallback(async () => {
    if (!selfUid) { showToast('请先登录'); return }
    if (!newCommentText.trim()) return
    setSending(true)
    try {
      await sendComment({ t: 1, type: typeNum, id: resourceId, content: newCommentText.trim() })
      setNewCommentText('')
      showToast('评论发送成功')
      // refresh current tab
      fetchComments(true)
    } catch { showToast('发送失败') }
    finally { setSending(false) }
  }, [selfUid, resourceId, typeNum, newCommentText, fetchComments])

  // ── RENDER ──
  if (loading) {
    return (
      <div className="space-y-4 py-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-2.5 animate-pulse">
            <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      {/* ═══ Tab pills + total ═══ */}
      {!historyMode && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <div className="flex gap-1">
            {([
              { s: 'hot' as CommentSort, l: '热门' },
              { s: 'new' as CommentSort, l: '最新' },
            ]).map(t => (
              <button key={t.s} onClick={() => handleSort(t.s)}
                className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                  sort === t.s ? 'bg-[#e60026] text-white shadow-sm' : 'bg-gray-100 dark:bg-white/[0.05] text-gray-500 hover:bg-gray-200 dark:hover:bg-white/[0.08]'
                }`}>
                {t.l}
              </button>
            ))}
          </div>
          {total > 0 && (
            <span className="text-[11px] text-gray-400 ml-auto">{total} 条评论</span>
          )}
        </div>
      )}

      {/* ═══ New comment input ═══ */}
      {!historyMode && (
        <div className="flex items-start gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#e60026]/20 to-red-100 dark:to-red-900/20 flex items-center justify-center flex-shrink-0 mt-1 overflow-hidden">
            {selfProfile?.avatarUrl ? (
              <img src={selfProfile.avatarUrl} alt="" className="w-full h-full object-cover rounded-full" />
            ) : (
              <Music className="w-4 h-4 text-[#e60026]/60" />
            )}
          </div>
          <div className="flex-1 relative">
            <input
              type="text" value={newCommentText} onChange={e => setNewCommentText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendNewComment() } }}
              placeholder={selfUid ? '写下你的评论...' : '登录后发表评论'}
              disabled={!selfUid}
              maxLength={1000}
              className="w-full px-3 py-2 pr-10 rounded-xl text-xs bg-gray-100 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.08] outline-none focus:ring-1 focus:ring-[#e60026]/30 disabled:opacity-40"
            />
            <button onClick={handleSendNewComment} disabled={!newCommentText.trim() || sending}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-full bg-[#e60026] text-white hover:bg-[#c4001f] disabled:opacity-30 transition-colors">
              {sending ? <Loader className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            </button>
          </div>
        </div>
      )}

      {/* ═══ Comment list ═══ */}
      {comments.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-gray-400">
          <MessageCircle className="w-12 h-12 mb-3 opacity-20" />
          <p className="text-sm">暂无评论</p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-gray-100 dark:divide-white/[0.04]">
            {comments.map(c => (
              <div key={c.commentId}>
                <CommentItem
                  c={c}
                  onLike={handleLike}
                  onReply={handleReply}
                  onDelete={handleDelete}
                  onHug={handleHug}
                  onViewFloor={handleViewFloor}
                  onReport={handleReport}
                />
                {/* floor replies */}
                {floorMap[c.commentId]?.loaded && (
                  <div className="bg-gray-50/50 dark:bg-white/[0.01] rounded-b-lg">
                    {floorMap[c.commentId].items.length === 0 ? (
                      <p className="py-4 text-center text-[11px] text-gray-400">暂无回复</p>
                    ) : (
                      floorMap[c.commentId].items.map(fr => (
                        <CommentItem key={fr.commentId} c={fr}
                          onLike={handleLike} onReply={handleReply} onDelete={handleDelete}
                          onHug={handleHug} onViewFloor={handleViewFloor} onReport={handleReport}
                          isFloor
                        />
                      ))
                    )}
                    <button onClick={() => handleViewFloor(c)}
                      className="w-full py-1.5 text-[10px] text-gray-400 hover:text-[#e60026] transition-colors flex items-center justify-center gap-1">
                      <ChevronUp className="w-3 h-3" /> 收起回复
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* load more */}
          {hasMore && (
            <div className="flex justify-center py-4">
              <button onClick={handleLoadMore} disabled={loadingMore}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#e60026] transition-colors disabled:opacity-30">
                {loadingMore ? <><Loader className="w-3 h-3 animate-spin" /> 加载中...</> : <><ChevronDown className="w-3 h-3" /> 加载更多评论</>}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
