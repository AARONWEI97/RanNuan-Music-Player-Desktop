import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  getArtistDetail,
  getArtistDesc,
  getArtistTopSongs,
  getArtistSongs,
  getArtistAlbums,
  getArtistMv,
  subscribeArtist,
  getArtistFollowCount,
  getSimiArtist,
  type SongResult,
  usePlaylistStore,
} from '@shared'
import SongRow from '@/components/common/SongRow'
import LoadMore from '@/components/common/LoadMore'
import { usePaginatedList } from '@/hooks/usePaginatedList'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { useProgressiveRender } from '@/hooks/useProgressiveRender'
import { useImageColor } from '@/hooks/useImageColor'
import { heroUrl, avatarUrl, coverUrl } from '@/utils/image'
import { TabCache } from '@/components/layout/KeepAlive'
import { useAuthStore } from '@/store/authStore'
import { showToast } from '@/utils/toast'
import { getCache, setCache } from '@/utils/indexedDB'
import { showContextMenu } from '@/hooks/useContextMenu'
import { isFavorite, toggleFavorite } from '@/store/favoritesStore'
import { playSong } from '@/services/audioService'
import {
  ArrowLeft, Play, ListPlus, Heart, Download, User, Disc, Music,
  UserPlus, UserCheck, Film, Users, Loader, AlertCircle, RefreshCw,
} from 'lucide-react'

type ArtistTabType = 'hot' | 'all' | 'album' | 'mv'

interface ArtistInfo {
  cover: string; avatar: string; name: string; briefDesc: string
  albumSize: number; musicSize: number; mvSize: number; alias: string[]; followed: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSong(song: any): SongResult {
  return {
    ...song, id: song.id, name: song.name,
    picUrl: song.picUrl || song.al?.picUrl || song.album?.picUrl || '',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ar: song.ar || song.artists?.map((a: any) => ({ id: a.id, name: a.name })) || [],
    al: song.al || (song.album ? { id: song.album.id, name: song.album.name, picUrl: song.album.picUrl } : { id: 0, name: '' }),
    dt: song.dt || song.duration || 0, count: 0,
  }
}

// ═══════════════════ Sub-components ═══════════════════

/** 热门歌曲 tab — 只在 active 时挂载 */
function HotSongsTab({
  hotSongs,
  handlePlayOne, handlePlayAll, handleAddToNext, handleToggleFav,
  onNavigate,
}: {
  artistId: string | undefined, hotSongs: SongResult[],
  handlePlayOne: (s: SongResult, i: number, list: SongResult[]) => void,
  handlePlayAll: (list: SongResult[]) => void,
  handleAddToNext: (s: SongResult) => void,
  handleToggleFav: (s: SongResult) => void,
  onNavigate: (path: string) => void,
}) {
  const [expanded, setExpanded] = useState(false)
  const toShow = expanded ? hotSongs : hotSongs.slice(0, 20)

  return (
    <div>
      {hotSongs.length > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => handlePlayAll(hotSongs)}
            className="flex items-center gap-2 px-5 py-2 bg-[#e60026] text-white rounded-full text-sm font-semibold hover:bg-[#c4001f] hover:shadow-lg hover:shadow-[#e60026]/20 transition-colors">
            <Play className="w-4 h-4" />播放全部
          </button>
          <span className="text-sm text-gray-500">{hotSongs.length} 首</span>
        </div>
      )}
      <div className="space-y-0.5">
        {toShow.map((song, idx) => (
          <SongRow key={String(song.id)} song={song} index={idx}
            onPlay={() => handlePlayOne(song, idx, hotSongs)}
            isFavorite={isFavorite(song.id)}
            onAddToNext={() => handleAddToNext(song)}
            onToggleFavorite={() => handleToggleFav(song)}
            onMore={(e: React.MouseEvent) => {
              const fav = isFavorite(song.id)
              showContextMenu(e.clientX, e.clientY, [
                { label: '播放', icon: <Play className="w-4 h-4" />, onClick: () => handlePlayOne(song, idx, hotSongs) },
                { label: '下一首播放', icon: <ListPlus className="w-4 h-4" />, onClick: () => handleAddToNext(song) },
                { label: fav ? '取消收藏' : '收藏', icon: <Heart className={`w-4 h-4 ${fav ? 'text-[#e60026]' : ''}`} />, onClick: () => handleToggleFav(song) },
                { label: '', divider: true, onClick: () => {} },
                { label: '歌手', icon: <User className="w-4 h-4" />, onClick: () => song.ar?.[0]?.id && onNavigate(`/artist/${song.ar[0].id}`) },
                { label: '专辑', icon: <Disc className="w-4 h-4" />, onClick: () => song.al?.id && onNavigate(`/album/${song.al.id}`) },
                { label: '', divider: true, onClick: () => {} },
                { label: '下载', icon: <Download className="w-4 h-4" />, onClick: () => {
                  if (song.playMusicUrl) {
                    const artistName = song.ar?.map((a: any) => a.name).join(' / ') || undefined
                    const meta = { picUrl: song.al?.picUrl, album: song.al?.name }
                    import('@/utils/download').then(m => m.downloadSong(song.id as number, song.name, song.playMusicUrl!, artistName, meta))
                  }
                  else showToast('请先播放歌曲', '播放后获取下载链接')
                }},
              ])
            }}
          />
        ))}
      </div>
      {hotSongs.length > 20 && (
        <button onClick={() => setExpanded(!expanded)} className="w-full py-3 text-sm text-[#e60026] hover:underline mt-2">
          {expanded ? '收起' : `查看全部 ${hotSongs.length} 首`}
        </button>
      )}
    </div>
  )
}

/** 全部歌曲 tab — 分页 + 渐进渲染 + 无限滚动 */
function AllSongsTab({
  artistId,
  handlePlayOne, handlePlayAll, handleAddToNext, handleToggleFav,
  onNavigate,
}: {
  artistId: number,
  handlePlayOne: (s: SongResult, i: number, list: SongResult[]) => void,
  handlePlayAll: (list: SongResult[]) => void,
  handleAddToNext: (s: SongResult) => void,
  handleToggleFav: (s: SongResult) => void,
  onNavigate: (path: string) => void,
}) {
  const [order, setOrder] = useState<'hot' | 'time'>('time')

  const params = useMemo(() => ({ id: artistId, order }), [artistId, order])
  // fetcher 用 useCallback 稳定引用，防止 useInfiniteScroll observer 频繁重建
  const fetcher = useCallback(async (p: typeof params & { offset: number; limit: number }) => {
    const res = await getArtistSongs({ id: p.id, limit: 50, offset: p.offset, order: p.order as 'hot' | 'time' })
    const data = res?.data?.songs
    return Array.isArray(data) ? data.map(mapSong) : []
  }, [])

  const list = usePaginatedList<SongResult, typeof params>({ fetcher, params, pageSize: 50 })

  const sentinelRef = useInfiniteScroll(list.loadMore, list.hasMore, list.loading)

  const { renderedItems, placeholderHeight, sentinelRef: prSentinel }
    = useProgressiveRender<SongResult>({ items: list.items, itemHeight: 42, initialCount: 20, batchSize: 20, resetKey: order })

  const remaining = useMemo(() => Math.max(0, list.items.length - renderedItems.length), [list.items.length, renderedItems.length])

  useEffect(() => { list.reset(); list.refresh() }, [order])

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex rounded-lg overflow-hidden bg-gray-100 dark:bg-white/5">
          <button onClick={() => setOrder('hot')} className={`px-3 py-1.5 text-xs font-medium ${order === 'hot' ? 'bg-[#e60026] text-white' : 'text-gray-500'}`}>最热</button>
          <button onClick={() => setOrder('time')} className={`px-3 py-1.5 text-xs font-medium ${order === 'time' ? 'bg-[#e60026] text-white' : 'text-gray-500'}`}>最新</button>
        </div>
        {list.items.length > 0 && (
          <button onClick={() => handlePlayAll(list.items)} className="flex items-center gap-2 px-4 py-1.5 bg-[#e60026] text-white rounded-full text-xs font-semibold hover:bg-[#c4001f] transition-colors">
            <Play className="w-3.5 h-3.5" />播放全部
          </button>
        )}
      </div>
      {list.initialLoading ? (
        <div className="flex justify-center py-8"><Loader className="w-6 h-6 animate-spin text-[#e60026]" /></div>
      ) : (
        <>
          <div className="space-y-0.5">
            {renderedItems.map((song, idx) => (
              <SongRow key={String(song.id)} song={song} index={idx}
                onPlay={() => handlePlayOne(song, idx, list.items)}
                isFavorite={isFavorite(song.id)}
                onAddToNext={() => handleAddToNext(song)}
                onToggleFavorite={() => handleToggleFav(song)}
                onMore={(e: React.MouseEvent) => {
                  const fav = isFavorite(song.id)
                  showContextMenu(e.clientX, e.clientY, [
                    { label: '播放', icon: <Play className="w-4 h-4" />, onClick: () => handlePlayOne(song, idx, list.items) },
                    { label: '下一首播放', icon: <ListPlus className="w-4 h-4" />, onClick: () => handleAddToNext(song) },
                    { label: fav ? '取消收藏' : '收藏', icon: <Heart className={`w-4 h-4 ${fav ? 'text-[#e60026]' : ''}`} />, onClick: () => handleToggleFav(song) },
                    { label: '', divider: true, onClick: () => {} },
                    { label: '歌手', icon: <User className="w-4 h-4" />, onClick: () => song.ar?.[0]?.id && onNavigate(`/artist/${song.ar[0].id}`) },
                    { label: '专辑', icon: <Disc className="w-4 h-4" />, onClick: () => song.al?.id && onNavigate(`/album/${song.al.id}`) },
                    { label: '', divider: true, onClick: () => {} },
                    { label: '下载', icon: <Download className="w-4 h-4" />, onClick: () => {
                      if (song.playMusicUrl) {
                        const artistName = song.ar?.map((a: any) => a.name).join(' / ') || undefined
                        const meta = { picUrl: song.al?.picUrl, album: song.al?.name }
                        import('@/utils/download').then(m => m.downloadSong(song.id as number, song.name, song.playMusicUrl!, artistName, meta))
                      }
                      else showToast('请先播放歌曲', '播放后获取下载链接')
                    }},
                  ])
                }}
              />
            ))}
          </div>
          {remaining > 0 && (
            <div style={{ height: placeholderHeight }} className="flex items-center justify-center">
              <span className="text-sm text-gray-400 dark:text-gray-500">↓ 还有 {remaining} 首</span>
            </div>
          )}
          <div ref={prSentinel} className="h-1" />
          <div ref={sentinelRef} className="h-4" />
          <LoadMore loading={list.loading && !list.initialLoading} hasMore={list.hasMore}
            error={list.error} onLoadMore={list.loadMore} onRetry={list.refresh} />
        </>
      )}
    </div>
  )
}

/** 专辑 tab — 分页 + 渐进渲染 */
function AlbumTab({ artistId, onNavigate }: { artistId: number, onNavigate: (path: string) => void }) {
  const params = useMemo(() => ({ id: artistId }), [artistId])
  const fetcher = useCallback(async (p: typeof params & { offset: number; limit: number }) => {
    const res = await getArtistAlbums({ id: p.id, limit: 30, offset: p.offset })
    const data = res?.data?.hotAlbums || res?.data?.albums
    return Array.isArray(data) ? data : []
  }, [])

  const list = usePaginatedList<any, typeof params>({ fetcher, params, pageSize: 30 })
  const sentinelRef = useInfiniteScroll(list.loadMore, list.hasMore, list.loading)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { renderedItems, placeholderHeight, sentinelRef: prSentinel }
    = useProgressiveRender<any>({ items: list.items, itemHeight: 260, initialCount: 10, batchSize: 10, resetKey: artistId })

  useEffect(() => { list.refresh() }, [artistId])

  return list.initialLoading ? (
    <div className="flex justify-center py-8"><Loader className="w-6 h-6 animate-spin text-[#e60026]" /></div>
  ) : list.items.length === 0 ? (
    <p className="text-center text-gray-400 py-8">暂无专辑</p>
  ) : (
    <>
      <div className="grid grid-cols-5 gap-4">
        {renderedItems.map((item: any) => (
          <div key={String(item.id)} className="cursor-pointer group" onClick={() => onNavigate(`/album/${item.id}`)}>
            <div className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden shadow-sm group-hover:shadow-lg group-hover:-translate-y-1 transition-transform">
              <img src={coverUrl(item.picUrl || item.coverImgUrl)} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" loading="lazy" decoding="async" />
            </div>
            <p className="text-sm font-medium mt-2 truncate">{item.name}</p>
            <p className="text-xs text-gray-500 truncate">
              {item.publishTime ? `${new Date(item.publishTime).getFullYear()} · ` : ''}{item.size ? `${item.size}首` : ''}
            </p>
          </div>
        ))}
      </div>
      {placeholderHeight > 0 && <div style={{ height: placeholderHeight }} className="flex items-center justify-center"><span className="text-sm text-gray-400">↓ 继续下滑</span></div>}
      <div ref={prSentinel} className="h-1" />
      <div ref={sentinelRef} className="h-1" />
      <LoadMore loading={list.loading && !list.initialLoading} hasMore={list.hasMore} error={list.error} onLoadMore={list.loadMore} onRetry={list.refresh} />
    </>
  )
}

/** MV tab — 分页 + 渐进渲染 */
function MvTab({ artistId }: { artistId: number }) {
  const params = useMemo(() => ({ id: artistId }), [artistId])
  const fetcher = useCallback(async (p: typeof params & { offset: number; limit: number }) => {
    const res = await getArtistMv({ id: p.id, limit: 30, offset: p.offset })
    const data = res?.data?.mvs
    return Array.isArray(data) ? data : []
  }, [])

  const list = usePaginatedList<any, typeof params>({ fetcher, params, pageSize: 30 })
  const sentinelRef = useInfiniteScroll(list.loadMore, list.hasMore, list.loading)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { renderedItems, placeholderHeight, sentinelRef: prSentinel }
    = useProgressiveRender<any>({ items: list.items, itemHeight: 240, initialCount: 4, batchSize: 4, resetKey: artistId })

  useEffect(() => { list.refresh() }, [artistId])

  return list.initialLoading ? (
    <div className="flex justify-center py-8"><Loader className="w-6 h-6 animate-spin text-[#e60026]" /></div>
  ) : list.items.length === 0 ? (
    <p className="text-center text-gray-400 py-8">暂无 MV</p>
  ) : (
    <>
      <div className="grid grid-cols-2 gap-4">
        {renderedItems.map((item: any) => (
          <div key={String(item.id)} className="cursor-pointer group rounded-xl overflow-hidden bg-gray-100 dark:bg-white/5 hover:shadow-lg hover:-translate-y-0.5 transition-transform">
            <div className="relative aspect-video bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <img src={coverUrl(item.imgurl || item.cover || item.picUrl)} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" loading="lazy" decoding="async" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm"><Play className="w-6 h-6 text-white ml-0.5" /></div>
              </div>
            </div>
            <div className="p-3"><p className="text-sm font-medium truncate">{item.name}</p>{item.artistName && <p className="text-xs text-gray-500 truncate mt-0.5">{item.artistName}</p>}</div>
          </div>
        ))}
      </div>
      {placeholderHeight > 0 && <div style={{ height: placeholderHeight }} className="flex items-center justify-center"><span className="text-sm text-gray-400">↓ 继续下滑</span></div>}
      <div ref={prSentinel} className="h-1" />
      <div ref={sentinelRef} className="h-1" />
      <LoadMore loading={list.loading && !list.initialLoading} hasMore={list.hasMore} error={list.error} onLoadMore={list.loadMore} onRetry={list.refresh} />
    </>
  )
}


// ═══════════════════ Main ArtistPage ═══════════════════

const TABS: { key: ArtistTabType; label: string; icon: React.ElementType }[] = [
  { key: 'hot', label: '热门', icon: Music },
  { key: 'all', label: '全部', icon: Disc },
  { key: 'album', label: '专辑', icon: Disc },
  { key: 'mv', label: 'MV', icon: Film },
]

export default function ArtistPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)

  // ★ 只订阅 action，不订阅 state — 播放状态变化不会触发重渲染
  const setPlayList = usePlaylistStore((s) => s.setPlayList)
  const setPlayListIndex = usePlaylistStore((s) => s.setPlayListIndex)
  const addToNextPlay = usePlaylistStore((s) => s.addToNextPlay)

  const artistId = Number(id) || 0

  const [artist, setArtist] = useState<ArtistInfo | null>(null)
  const [desc, setDesc] = useState('')
  const [showFullDesc, setShowFullDesc] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [followed, setFollowed] = useState(false)
  const [followCount, setFollowCount] = useState(0)
  const [followLoading, setFollowLoading] = useState(false)

  const [activeTab, setActiveTab] = useState<ArtistTabType>('hot')

  // Hot songs — 加载一次，不参与分页
  const [hotSongs, setHotSongs] = useState<SongResult[]>([])

  // Similar artists
  const [similarArtists, setSimilarArtists] = useState<any[]>([])
  const [retryId, setRetryId] = useState(0)

  // ★ useImageColor 放在 hero 区域的主组件，不拆分（因为它需要和 artist state 联动）
  const rawArtistCover = artist?.cover || artist?.avatar || ''
  const optimizedCover = heroUrl(rawArtistCover)
  // 传优化后的 URL 给 useImageColor，避免二次下载原图
  const { primaryColor } = useImageColor(optimizedCover)

  // ─── Data load ───
  useEffect(() => {
    if (!id) return
    let cancelled = false

    // 缓存先行
    getCache<{ artist: any; hotSongs: SongResult[]; desc: string; similarArtists: any[]; followed: boolean }>('artist', `artist-${id}`).then((cached) => {
      if (cancelled || !cached) return
      if (cached.artist) setArtist(cached.artist)
      if (cached.hotSongs) setHotSongs(cached.hotSongs)
      if (cached.desc) setDesc(cached.desc)
      if (cached.similarArtists) setSimilarArtists(cached.similarArtists)
      if (cached.followed !== undefined) setFollowed(cached.followed)
      setLoading(false)
    }).catch(() => {})

    Promise.resolve().then(() => {
      if (cancelled) return
      setLoading(true); setError(false)
    })

    Promise.all([
      getArtistDetail(Number(id)),
      getArtistTopSongs({ id: Number(id), limit: 50 }),
    ]).then(([detailRes, songsRes]) => {
      if (cancelled) return
      const artistData = detailRes?.data?.data?.artist
      let currentArtist: ArtistInfo | null = null
      if (artistData) {
        currentArtist = {
          cover: artistData.cover || artistData.picUrl || artistData.avatar || '',
          avatar: artistData.avatar || artistData.picUrl || artistData.cover || '',
          name: artistData.name || '',
          briefDesc: artistData.briefDesc || '',
          albumSize: artistData.albumSize || 0,
          musicSize: artistData.musicSize || 0,
          mvSize: artistData.mvSize || 0,
          alias: (artistData.alias || []).map((a: any) => (typeof a === 'string' ? a : a?.txt || a?.ti || '')),
          followed: !!artistData.followed,
        }
        setArtist(currentArtist)
        setFollowed(!!artistData.followed)
      }
      const songsData = songsRes?.data?.songs
      let currentSongs: SongResult[] = []
      if (Array.isArray(songsData)) { currentSongs = songsData.map(mapSong); setHotSongs(currentSongs) }

      // ★ 背景数据：放同一个 finally 写入，用 setTimeout 延迟触发避免连续 setState
      const backgroundFetches = Promise.allSettled([
        getArtistFollowCount(Number(id)).then((res) => {
          if (cancelled) return
          const c = res?.data?.data?.followCount
          if (c !== undefined) setFollowCount(c)
        }).catch(() => {}),
        getArtistDesc(Number(id)).then((res) => {
          if (cancelled) return
          const d = res?.data; const intro = d?.introduction
          let txt = ''
          if (Array.isArray(intro)) txt = intro.map((s: any) => (typeof s === 'string' ? s : s?.txt || '')).filter(Boolean).join('\n\n')
          else if (typeof intro === 'string') txt = intro
          if (!txt) txt = (typeof d?.briefDesc === 'string' ? d.briefDesc : '') || ''
          if (txt) setDesc(txt.trim())
        }).catch(() => {}),
        getSimiArtist(Number(id)).then((res) => {
          if (cancelled) return
          const data = res?.data?.artists
          if (Array.isArray(data)) setSimilarArtists(data.slice(0, 8))
        }).catch(() => {}),
      ])

      backgroundFetches.finally(() => {
        setTimeout(() => {
          if (cancelled) return
          setCache('artist', `artist-${id}`, {
            artist: currentArtist, hotSongs: currentSongs, desc: desc || '',
            similarArtists: similarArtists || [], followed: !!artistData?.followed,
          }, 5).catch(() => {})
          setLoading(false)
        }, 300)
      })
    }).catch(() => {
      if (!cancelled) setError(true)
    })

    return () => { cancelled = true }
  }, [id, retryId])

  // ─── Follow ───
  const handleFollow = useCallback(async () => {
    if (!isLoggedIn) { navigate('/login'); return }
    if (!id) return
    setFollowLoading(true)
    try {
      await subscribeArtist(Number(id), followed ? 2 : 1)
      setFollowed(!followed)
      setFollowCount((c) => followed ? Math.max(0, c - 1) : c + 1)
      showToast(followed ? '已取消关注' : '已关注', artist?.name || '')
    } catch { /* ignore */ } finally { setFollowLoading(false) }
  }, [id, followed, isLoggedIn, navigate, artist])

  // ─── Play helpers ───
  const handlePlayAll = useCallback((songList: SongResult[]) => {
    if (songList.length === 0) return
    setPlayList(songList); setPlayListIndex(0); playSong(songList[0])
  }, [setPlayList, setPlayListIndex])

  const handlePlayOne = useCallback((song: SongResult, idx: number, songList: SongResult[]) => {
    setPlayList(songList); setPlayListIndex(idx); playSong(song)
  }, [setPlayList, setPlayListIndex])

  const handleAddToNext = useCallback((song: SongResult) => { addToNextPlay(song) }, [addToNextPlay])

  const handleToggleFav = useCallback((song: SongResult) => {
    const added = toggleFavorite(song)
    showToast(added ? '已收藏' : '已取消收藏', song.name)
  }, [])

  // ─── Render ───
  if (loading) return (
    <div className="flex items-center justify-center py-20"><Loader className="w-8 h-8 animate-spin text-[#e60026]" /></div>
  )
  if (error) return (
    <div className="text-center text-gray-400 py-20">
      <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>加载失败</p>
      <button onClick={() => setRetryId((v) => v + 1)}
        className="mt-4 inline-flex items-center gap-1.5 px-5 py-2 bg-[#e60026] text-white rounded-full text-sm font-medium hover:bg-[#c4001f] transition-colors">
        <RefreshCw className="w-4 h-4" />重试
      </button>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* ─── Cover Hero ─── */}
      <div className="relative rounded-2xl overflow-hidden" style={{ transform: 'translateZ(0)' }}>
        {rawArtistCover ? (
          <img
            src={optimizedCover}
            alt=""
            className="w-full h-56 object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-56 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800" />
        )}
        <div className="absolute inset-0" style={{ background: `linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.4) 40%, ${primaryColor}33 100%)` }} />
        <button onClick={() => navigate(-1)}
          className="absolute top-4 left-4 p-2 rounded-full bg-black/30 hover:bg-black/60 text-white transition-colors backdrop-blur-sm">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <h1 className="text-3xl font-bold text-white drop-shadow-lg">{artist?.name}</h1>
          {artist?.alias?.length ? <p className="text-sm text-white/70 mt-1">{artist.alias.join(' / ')}</p> : null}
          <div className="flex items-center gap-4 mt-3 text-white/80 text-sm">
            <span className="flex items-center gap-1"><Music className="w-4 h-4" />{artist?.musicSize || 0} 首</span>
            <span className="flex items-center gap-1"><Disc className="w-4 h-4" />{artist?.albumSize || 0} 专辑</span>
            {followCount > 0 && <span className="flex items-center gap-1"><Users className="w-4 h-4" />{followCount} 关注</span>}
            <button onClick={handleFollow} disabled={followLoading}
              className={`ml-2 flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition-colors ${followed ? 'bg-white/20 text-white border border-white/30' : 'bg-[#e60026] text-white hover:bg-[#c4001f]'}`}>
              {followed ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}{followed ? '已关注' : '+ 关注'}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Description ─── */}
      {(desc || artist?.briefDesc) ? (
        <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-4">
          <h3 className="text-sm font-bold mb-2">简介</h3>
          <p className={`text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line ${!showFullDesc ? 'line-clamp-3' : ''}`}
            onClick={() => setShowFullDesc(!showFullDesc)}>{desc || artist?.briefDesc}</p>
          {((desc.length > 120 || (artist?.briefDesc || '').length > 120)) && (
            <button onClick={() => setShowFullDesc(!showFullDesc)} className="text-xs text-[#e60026] mt-2 hover:underline">{showFullDesc ? '收起' : '展开'}</button>
          )}
        </div>
      ) : null}

      {/* ─── Similar Artists ─── */}
      {similarArtists.length > 0 && (
        <div>
          <h3 className="text-sm font-bold mb-3">相似歌手</h3>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {similarArtists.map((item) => (
              <div key={item.id} className="flex flex-col items-center flex-shrink-0 w-[80px] cursor-pointer group" onClick={() => navigate(`/artist/${item.id}`)}>
                <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 mb-1.5 shadow-md group-hover:shadow-lg transition-transform ring-2 ring-transparent group-hover:ring-[#22c55e]/30">
                  <img src={avatarUrl(item.picUrl || item.img1v1Url)} alt={item.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                </div>
                <p className="text-xs font-medium truncate w-full text-center">{item.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Tab Bar ─── */}
      <div className="flex gap-2">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${isActive ? 'bg-[#e60026] text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'}`}>
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          )
        })}
      </div>

      {/* ─── Tab Content — Tab 级 KeepAlive，切 tab 不销毁组件 ─── */}
      <TabCache active={activeTab === 'hot'}>
        <HotSongsTab artistId={id} hotSongs={hotSongs}
          handlePlayOne={handlePlayOne} handlePlayAll={handlePlayAll}
          handleAddToNext={handleAddToNext} handleToggleFav={handleToggleFav}
          onNavigate={(path) => navigate(path)} />
      </TabCache>
      <TabCache active={activeTab === 'all'}>
        <AllSongsTab artistId={artistId}
          handlePlayOne={handlePlayOne} handlePlayAll={handlePlayAll}
          handleAddToNext={handleAddToNext} handleToggleFav={handleToggleFav}
          onNavigate={(path) => navigate(path)} />
      </TabCache>
      <TabCache active={activeTab === 'album'}>
        <AlbumTab artistId={artistId} onNavigate={(path) => navigate(path)} />
      </TabCache>
      <TabCache active={activeTab === 'mv'}>
        <MvTab artistId={artistId} />
      </TabCache>
    </div>
  )
}
