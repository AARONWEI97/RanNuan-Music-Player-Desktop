import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getPlaylistDetail, getPlaylistTrackAll, subscribePlaylist, updatePlaylistTracks, type SongResult, usePlaylistStore } from '@shared'
import { playSong } from '@/services/audioService'
import SongRow from '@/components/common/SongRow'
import { useProgressiveRender } from '@/hooks/useProgressiveRender'
import { coverUrl, thumbUrl } from '@/utils/image'
import { Play, Heart, Headphones, Clock, Music2, ChevronLeft, Loader } from 'lucide-react'
import { showToast } from '@/utils/toast'
import { useAuthStore } from '@/store/authStore'

function fmt(n: number) {
  if (!n) return '0'
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}亿`
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`
  return `${n}`
}
function fmtDate(t: number) {
  if (!t) return ''
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function normalizeSong(s: any): SongResult {
  return {
    id: s.id, name: s.name,
    picUrl: s.al?.picUrl || s.album?.picUrl || '',
    ar: s.ar || s.artists?.map((a: any) => ({ id: a.id, name: a.name })) || [],
    al: s.al || s.album || { id: 0, name: '', picUrl: '' },
    dt: s.dt || 0,
    count: s.count ?? 0,
  }
}

export default function PlaylistPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [playlist, setPlaylist] = useState<any>(null)
  const [tracks, setTracks] = useState<SongResult[]>([])
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState(false)
  const profile = useAuthStore(s => s.profile)
  const { setPlayList, setPlayListIndex } = usePlaylistStore()
  const isOwnPlaylist = Boolean(profile?.userId && playlist?.creator?.userId === profile.userId)

  // ★ 并行请求：metadata + 全量歌曲（与移动端对齐，limit=9999 一次性全拿）
  useEffect(() => {
    if (!id) return
    const numId = Number(id)
    setLoading(true)
    Promise.all([
      getPlaylistDetail(numId),
      getPlaylistTrackAll({ id: numId, limit: 9999, offset: 0 }),  // ← 移动端同款
    ]).then(([dr, tr]) => {
      setPlaylist(dr?.data?.playlist)
      const raw = tr?.data?.songs || []
      setTracks(raw.map(normalizeSong))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  // 渐进式渲染（DOM 优化，数据已全量）
  const { renderedItems, placeholderHeight, sentinelRef } = useProgressiveRender({
    items: tracks, itemHeight: 50, initialCount: 40, batchSize: 40, resetKey: id,
  })

  const handlePlayAll = () => {
    if (tracks.length === 0) return
    setPlayList(tracks)
    setPlayListIndex(0)
    playSong(tracks[0])
  }
  const handlePlayOne = (song: SongResult) => {
    setPlayList(tracks)
    setPlayListIndex(tracks.indexOf(song))
    playSong(song)
  }
  const handleSubscribe = async () => {
    if (!playlist?.id || subscribing) return
    const subscribed = Boolean(playlist.subscribed)
    setSubscribing(true)
    setPlaylist((prev: any) => prev ? {
      ...prev,
      subscribed: !subscribed,
      subscribedCount: Math.max(0, (prev.subscribedCount || 0) + (subscribed ? -1 : 1)),
    } : prev)
    try {
      await subscribePlaylist({ id: playlist.id, t: subscribed ? 2 : 1 })
      showToast(subscribed ? '已取消收藏' : '已收藏', playlist.name)
    } catch (e: any) {
      setPlaylist((prev: any) => prev ? {
        ...prev,
        subscribed,
        subscribedCount: Math.max(0, (prev.subscribedCount || 0) + (subscribed ? 1 : -1)),
      } : prev)
      showToast('操作失败', e?.message || '请稍后重试')
    } finally {
      setSubscribing(false)
    }
  }
  const handleRemoveFromPlaylist = async (song: SongResult) => {
    if (!playlist?.id || !isOwnPlaylist) return
    const ok = window.confirm(`确定从歌单「${playlist.name}」中删除《${song.name}》吗？`)
    if (!ok) return
    const prevTracks = tracks
    setTracks(prev => prev.filter(item => item.id !== song.id))
    setPlaylist((prev: any) => prev ? {
      ...prev,
      trackCount: Math.max(0, (prev.trackCount || prevTracks.length) - 1),
    } : prev)
    try {
      await updatePlaylistTracks({ op: 'del', pid: playlist.id, tracks: String(song.id) })
      showToast('已从歌单删除', song.name)
    } catch (e: any) {
      setTracks(prevTracks)
      setPlaylist((prev: any) => prev ? {
        ...prev,
        trackCount: prevTracks.length,
      } : prev)
      showToast('删除失败', e?.message || '请稍后重试')
    }
  }

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#e60026] transition-colors">
        <ChevronLeft className="w-4 h-4" /> 返回
      </button>

      {/* Header */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#e60026]/10 via-transparent to-transparent p-6">
        <div className="flex gap-6 items-start">
          <div className="w-44 h-44 rounded-xl bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0 shadow-lg">
            {playlist?.coverImgUrl ? (
              <img src={coverUrl(playlist.coverImgUrl)} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400"><Music2 className="w-12 h-12" /></div>
            )}
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-2 mb-2">
              {playlist?.highQuality && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold border border-[#e60026] text-[#e60026]">精品</span>}
              {playlist?.officialPlaylistType && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#e60026] text-white">{playlist.officialPlaylistType}</span>}
            </div>
            <h1 className="text-2xl font-bold mb-2 truncate">{playlist?.name || '加载中…'}</h1>
            {playlist?.creator && (
              <div className="flex items-center gap-2 mb-3">
                <img src={thumbUrl(playlist.creator.avatarUrl)} alt="" className="w-6 h-6 rounded-full object-cover" />
                <span className="text-sm text-gray-600 dark:text-gray-400">{playlist.creator.nickname}</span>
                {playlist.createTime && <span className="text-xs text-gray-400">{fmtDate(playlist.createTime)} 创建</span>}
              </div>
            )}
            <p className="text-sm text-gray-500 line-clamp-2 mb-4 max-w-xl">{playlist?.description}</p>
            <div className="flex items-center gap-5 text-xs text-gray-500 mb-5">
              <span className="flex items-center gap-1"><Music2 className="w-3.5 h-3.5" />{playlist?.trackCount || tracks.length} 首</span>
              <span className="flex items-center gap-1"><Headphones className="w-3.5 h-3.5" />{fmt(playlist?.playCount || 0)} 播放</span>
              <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" />{fmt(playlist?.subscribedCount || 0)} 收藏</span>
              {playlist?.updateTime && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{fmtDate(playlist.updateTime)} 更新</span>}
            </div>
            {playlist?.tags && playlist.tags.length > 0 && (
              <div className="flex items-center gap-2 mb-4">
                {playlist.tags.map((tag: string) => (
                  <span key={tag} className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-xs text-gray-500">{tag}</span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-3">
              <button onClick={handlePlayAll} className="flex items-center gap-2 px-6 py-2.5 bg-[#e60026] text-white rounded-full text-sm font-semibold hover:bg-[#c4001f] hover:shadow-lg hover:shadow-[#e60026]/20 transition-all">
                <Play className="w-4 h-4" /> 播放全部
              </button>
              <button onClick={handleSubscribe} disabled={subscribing || !playlist?.id}
                className={`flex items-center gap-2 px-5 py-2.5 border rounded-full text-sm font-medium transition-colors disabled:opacity-50 ${
                  playlist?.subscribed
                    ? 'border-[#e60026]/20 bg-[#e60026]/8 text-[#e60026] hover:bg-[#e60026]/12'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-white/5'
                }`}>
                {subscribing ? <Loader className="w-4 h-4 animate-spin" /> : <Heart className={`w-4 h-4 ${playlist?.subscribed ? 'fill-current' : ''}`} />}
                {playlist?.subscribed ? '已收藏' : '收藏'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Track list */}
      <div className="space-y-0.5">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-3 px-3 rounded-lg">
              <div className="w-5 h-5 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
              <div className="w-10 h-10 rounded bg-gray-200 dark:bg-gray-700 animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2"><div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" /><div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" /></div>
              <div className="h-3 w-10 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
            </div>
          ))
        ) : tracks.length === 0 ? (
          <div className="text-center py-12 text-gray-400">暂无歌曲</div>
        ) : (
          renderedItems.map((song, idx) => (
            <SongRow
              key={String(song.id)}
              song={song}
              index={idx}
              onPlay={() => handlePlayOne(song)}
              inOwnPlaylist={isOwnPlaylist}
              playlistId={playlist?.id}
              onRemoveFromPlaylist={handleRemoveFromPlaylist}
            />
          ))
        )}
      </div>
      {placeholderHeight > 0 && (
        <div style={{ height: placeholderHeight }} className="flex items-center justify-center">
          <span className="text-xs text-gray-400">↓ 下滑继续加载 ({tracks.length - renderedItems.length} 首)</span>
        </div>
      )}
      <div ref={sentinelRef} className="h-0" />
    </div>
  )
}
