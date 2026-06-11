import { useEffect, useState, useMemo, useCallback, memo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  getArtistList, getTopAlbum, getAllMv, getToplist,
  getPlaylistCategory,
  request,
} from '@shared'
import LoadMore from '@/components/common/LoadMore'
import { usePaginatedList } from '@/hooks/usePaginatedList'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { useProgressiveRender } from '@/hooks/useProgressiveRender'
import { avatarUrl, coverUrl, thumbUrl } from '@/utils/image'
import { TabCache } from '@/components/layout/KeepAlive'
import {
  Search, Disc3, MicVocal, Film, Trophy,
  Play, Loader, Headphones, User,
} from 'lucide-react'

type LibraryTab = 'artist' | 'playlist' | 'album' | 'mv' | 'toplist'

function formatCount(n: number): string {
  if (n >= 1e8) return `${(n / 1e8).toFixed(1)}亿`
  if (n >= 1e4) return `${(n / 1e4).toFixed(1)}万`
  return `${n}`
}

// ─── Filters Constants ───
const ARTIST_TYPES = [
  { value: -1, label: '全部' }, { value: 1, label: '男歌手' }, { value: 2, label: '女歌手' }, { value: 3, label: '乐队' },
]
const ARTIST_AREAS = [
  { value: -1, label: '全部' }, { value: 7, label: '华语' }, { value: 96, label: '欧美' },
  { value: 8, label: '日本' }, { value: 16, label: '韩国' }, { value: 0, label: '其他' },
]
const ARTIST_INITIALS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const ALBUM_AREAS = [
  { value: 'ALL', label: '全部' }, { value: 'ZH', label: '华语' },
  { value: 'EA', label: '欧美' }, { value: 'KR', label: '韩国' }, { value: 'JP', label: '日本' },
]
const MV_AREAS = ['全部', '内地', '港台', '欧美', '日本', '韩国']
const MV_TYPES = ['全部', '官方版', '原生', '现场版', '网易出品']
const MV_ORDERS = ['上升最快', '最热', '最新']

// ─── Memoized FilterPill (defined outside to keep stable identity) ───
const FilterPill = memo(({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button onClick={onClick}
    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
      active ? 'bg-[#e60026] text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10'
    }`}
  >{children}</button>
))
FilterPill.displayName = 'FilterPill'

// ─── Sub-components for each tab (hooks only run when mounted) ───
function ArtistGrid({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [artistType, setArtistType] = useState(-1)
  const [artistArea, setArtistArea] = useState(-1)
  const [artistInitial, setArtistInitial] = useState<number | string>(-1)

  const params = useMemo(() => ({ type: artistType, area: artistArea, initial: artistInitial }), [artistType, artistArea, artistInitial])

  // ★ useCallback 稳定 fetcher 引用，防止 loadMore/refresh 引用抖动
  const fetcher = useCallback(async (p: typeof params & { offset: number; limit: number }) => {
    const res = await getArtistList({ type: p.type, area: p.area, initial: p.initial, limit: 30, offset: p.offset })
    return res?.data?.artists || []
  }, [])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const list = usePaginatedList<any, typeof params>({ fetcher, params, pageSize: 30 })

  const { renderedItems, placeholderHeight, sentinelRef: prSentinel }
    = useProgressiveRender<any>({ items: list.items, itemHeight: 130, initialCount: 12, batchSize: 12, resetKey: String(artistType) + String(artistArea) + String(artistInitial) })

  // ★ 双 observer 合并：只有全部渲染完才启用无限滚动加载下一页
  const allRendered = renderedItems.length === list.items.length
  const sentinelRef = useInfiniteScroll(
    allRendered ? list.loadMore : () => {},
    allRendered && list.hasMore,
    list.loading
  )

  // ★ 筛选切换：不 reset（不清空旧数据），直接 refresh，旧数据保留到新数据就绪
  useEffect(() => { list.refresh() }, [artistType, artistArea, artistInitial])

  return (
    <div>
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 flex-wrap"><span className="text-xs text-gray-400">类型</span>{ARTIST_TYPES.map(t => <FilterPill key={t.value} active={artistType === t.value} onClick={() => setArtistType(t.value)}>{t.label}</FilterPill>)}</div>
        <div className="flex items-center gap-2 flex-wrap"><span className="text-xs text-gray-400">地区</span>{ARTIST_AREAS.map(a => <FilterPill key={a.value} active={artistArea === a.value} onClick={() => setArtistArea(a.value)}>{a.label}</FilterPill>)}</div>
        <div className="flex items-center gap-2 flex-wrap"><span className="text-xs text-gray-400">首字母</span><FilterPill active={artistInitial === -1} onClick={() => setArtistInitial(-1)}>热门</FilterPill><FilterPill active={artistInitial === 0} onClick={() => setArtistInitial(0)}>#</FilterPill>{ARTIST_INITIALS.map(l => <FilterPill key={l} active={artistInitial === l} onClick={() => setArtistInitial(l)}>{l}</FilterPill>)}</div>
      </div>
      {list.initialLoading ? (
        <div className="flex justify-center py-16"><Loader className="w-6 h-6 animate-spin text-[#e60026]" /></div>
      ) : list.items.length === 0 ? (
        <div className="text-center text-gray-400 py-16"><MicVocal className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>暂无歌手数据</p></div>
      ) : (
        <>
          <div className="grid grid-cols-6 gap-5">
            {renderedItems.map((item: { id: number; name: string; picUrl?: string; img1v1Url?: string; alias?: string[] }) => (
              <div key={item.id} className="artist-grid-card cursor-pointer group flex flex-col items-center" onClick={() => onNavigate(`/artist/${item.id}`)}>
                <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 mb-2 shadow-sm group-hover:shadow-md group-hover:scale-105 transition-transform ring-2 ring-transparent group-hover:ring-[#e60026]/20">
                  {(item.picUrl || item.img1v1Url) ? <img src={avatarUrl(item.picUrl || item.img1v1Url)} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" /> : <div className="w-full h-full flex items-center justify-center text-gray-400"><User className="w-8 h-8" /></div>}
                </div>
                <p className="text-sm font-medium truncate w-full text-center">{item.name}</p>
                {item.alias?.length > 0 && <p className="text-xs text-gray-500 truncate w-full text-center">{item.alias[0]}</p>}
              </div>
            ))}
          </div>
          {placeholderHeight > 0 && <div style={{ height: placeholderHeight }} />}
          <div ref={prSentinel} className="h-1" />
          <div ref={sentinelRef} className="h-1" />
          <LoadMore loading={list.loading && !list.initialLoading} hasMore={list.hasMore} error={list.error} onLoadMore={list.loadMore} onRetry={list.refresh} />
        </>
      )}
    </div>
  )
}

function PlaylistGrid({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [playlistOrder, setPlaylistOrder] = useState<'hot' | 'new'>('hot')
  const [playlistCat, setPlaylistCat] = useState('全部')
  const [playlistCats, setPlaylistCats] = useState<string[]>(['全部', '华语', '欧美', '日语', '韩语', '粤语', '流行', '摇滚', '民谣', '电子', '轻音乐', '说唱'])

  useEffect(() => {
    getPlaylistCategory().then((res) => {
      const cats = res?.data?.categories || res?.data?.sub
      if (cats && Array.isArray(cats)) {
        const names = cats.map((c: { name?: string; text?: string }) => c.name || c.text).filter(Boolean)
        if (names.length > 0) setPlaylistCats(['全部', ...names])
      }
    }).catch(() => {})
  }, [])

  const params = useMemo(() => ({ order: playlistOrder, cat: playlistCat }), [playlistOrder, playlistCat])
  const fetcher = useCallback(async (p: typeof params & { offset: number; limit: number }) => {
    const res = await request.get('/top/playlist', { params: { cat: p.cat, order: p.order, limit: 30, offset: p.offset } })
    return res?.data?.playlists || []
  }, [])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const list = usePaginatedList<any, typeof params>({ fetcher, params, pageSize: 30 })

  const { renderedItems, placeholderHeight, sentinelRef: prSentinel }
    = useProgressiveRender({ items: list.items, itemHeight: 280, initialCount: 10, batchSize: 10, resetKey: playlistOrder + playlistCat })

  const allRendered = renderedItems.length === list.items.length
  const sentinelRef = useInfiniteScroll(allRendered ? list.loadMore : () => {}, allRendered && list.hasMore, list.loading)

  useEffect(() => { list.refresh() }, [playlistOrder, playlistCat])

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex rounded-lg overflow-hidden bg-gray-100 dark:bg-white/5">
          <button onClick={() => setPlaylistOrder('hot')} className={`px-3 py-1.5 text-xs font-medium ${playlistOrder === 'hot' ? 'bg-[#e60026] text-white' : 'text-gray-500'}`}>最热</button>
          <button onClick={() => setPlaylistOrder('new')} className={`px-3 py-1.5 text-xs font-medium ${playlistOrder === 'new' ? 'bg-[#e60026] text-white' : 'text-gray-500'}`}>最新</button>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">{playlistCats.slice(0, 12).map(cat => <FilterPill key={cat} active={playlistCat === cat} onClick={() => setPlaylistCat(cat)}>{cat}</FilterPill>)}</div>
      </div>
      {list.initialLoading ? (
        <div className="flex justify-center py-16"><Loader className="w-6 h-6 animate-spin text-[#e60026]" /></div>
      ) : list.items.length === 0 ? (
        <div className="text-center text-gray-400 py-16"><Disc3 className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>暂无歌单</p></div>
      ) : (
        <>
          <div className="grid grid-cols-5 gap-4">
            {renderedItems.map((pl: { id: number; name: string; coverImgUrl: string; trackCount?: number; totalCount?: number; playCount?: number; creator?: { nickname: string } }) => (
              <div key={pl.id} className="grid-card-item cursor-pointer group" onClick={() => onNavigate(`/playlist/${pl.id}`)}>
                <div className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden relative shadow-sm group-hover:shadow-lg group-hover:-translate-y-1 transition-transform">
                  <img src={coverUrl(pl.coverImgUrl)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" decoding="async" />
                  <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-md backdrop-blur-sm">{pl.trackCount || pl.totalCount || 0} 首</div>
                  {pl.playCount > 0 && <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-md backdrop-blur-sm"><Headphones className="w-2.5 h-2.5" />{formatCount(pl.playCount)}</div>}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Play className="w-8 h-8 text-white fill-white" /></div>
                </div>
                <p className="text-sm font-medium mt-2 truncate">{pl.name}</p>
                {pl.creator && <p className="text-xs text-gray-500 truncate">{pl.creator.nickname}</p>}
              </div>
            ))}
          </div>
          {placeholderHeight > 0 && <div style={{ height: placeholderHeight }} />}
          <div ref={prSentinel} className="h-1" />
          <div ref={sentinelRef} className="h-1" />
          <LoadMore loading={list.loading && !list.initialLoading} hasMore={list.hasMore} error={list.error} onLoadMore={list.loadMore} onRetry={list.refresh} />
        </>
      )}
    </div>
  )
}

function AlbumGrid({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [albumArea, setAlbumArea] = useState('ALL')
  const params = useMemo(() => ({ area: albumArea }), [albumArea])
  const fetcher = useCallback(async (p: typeof params & { offset: number; limit: number }) => {
    const res = await getTopAlbum({ area: p.area, limit: 30, offset: p.offset })
    return res?.data?.albums || res?.data?.monthData || []
  }, [])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const list = usePaginatedList<any, typeof params>({ fetcher, params, pageSize: 30 })

  const { renderedItems, placeholderHeight, sentinelRef: prSentinel }
    = useProgressiveRender({ items: list.items, itemHeight: 280, initialCount: 10, batchSize: 10, resetKey: albumArea })

  const allRendered = renderedItems.length === list.items.length
  const sentinelRef = useInfiniteScroll(allRendered ? list.loadMore : () => {}, allRendered && list.hasMore, list.loading)

  useEffect(() => { list.refresh() }, [albumArea])

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 flex-wrap"><span className="text-xs text-gray-400">地区</span>{ALBUM_AREAS.map(a => <FilterPill key={a.value} active={albumArea === a.value} onClick={() => setAlbumArea(a.value)}>{a.label}</FilterPill>)}</div>
      {list.initialLoading ? (
        <div className="flex justify-center py-16"><Loader className="w-6 h-6 animate-spin text-[#e60026]" /></div>
      ) : list.items.length === 0 ? (
        <div className="text-center text-gray-400 py-16"><Disc3 className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>暂无专辑</p></div>
      ) : (
        <>
          <div className="grid grid-cols-5 gap-4">
            {renderedItems.map((a: { id: number; name: string; picUrl?: string; blurPicUrl?: string; coverImgUrl?: string; size?: number; artist?: { id: number; name: string }; artists?: { name: string }[] }) => (
              <div key={a.id} className="grid-card-item cursor-pointer group" onClick={() => onNavigate(`/album/${a.id}`)}>
                <div className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden relative shadow-sm group-hover:shadow-lg group-hover:-translate-y-1 transition-transform">
                  <img src={coverUrl(a.picUrl || a.blurPicUrl || a.coverImgUrl)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" decoding="async" />
                  {a.size && <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-md backdrop-blur-sm">{a.size} 首</div>}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Play className="w-8 h-8 text-white fill-white" /></div>
                </div>
                <p className="text-sm font-medium mt-2 truncate">{a.name}</p>
                <p className="text-xs text-gray-500 truncate">{a.artist?.name || a.artists?.map(ar => ar.name).join(' / ') || ''}</p>
              </div>
            ))}
          </div>
          {placeholderHeight > 0 && <div style={{ height: placeholderHeight }} />}
          <div ref={prSentinel} className="h-1" />
          <div ref={sentinelRef} className="h-1" />
          <LoadMore loading={list.loading && !list.initialLoading} hasMore={list.hasMore} error={list.error} onLoadMore={list.loadMore} onRetry={list.refresh} />
        </>
      )}
    </div>
  )
}

function MvGrid({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [mvArea, setMvArea] = useState('全部')
  const [mvType, setMvType] = useState('全部')
  const [mvOrder, setMvOrder] = useState('上升最快')
  const params = useMemo(() => ({ area: mvArea, type: mvType, order: mvOrder }), [mvArea, mvType, mvOrder])
  const fetcher = useCallback(async (p: typeof params & { offset: number; limit: number }) => {
    const res = await getAllMv({ area: p.area, type: p.type, order: p.order, limit: 30, offset: p.offset })
    return res?.data?.data || res?.data?.mvs || []
  }, [])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const list = usePaginatedList<any, typeof params>({ fetcher, params, pageSize: 30 })

  const { renderedItems, placeholderHeight, sentinelRef: prSentinel }
    = useProgressiveRender({ items: list.items, itemHeight: 260, initialCount: 4, batchSize: 4, resetKey: mvArea + mvType + mvOrder })

  const allRendered = renderedItems.length === list.items.length
  const sentinelRef = useInfiniteScroll(allRendered ? list.loadMore : () => {}, allRendered && list.hasMore, list.loading)

  useEffect(() => { list.refresh() }, [mvArea, mvType, mvOrder])

  return (
    <div>
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 flex-wrap"><span className="text-xs text-gray-400">地区</span>{MV_AREAS.map(a => <FilterPill key={a} active={mvArea === a} onClick={() => setMvArea(a)}>{a}</FilterPill>)}</div>
        <div className="flex items-center gap-2 flex-wrap"><span className="text-xs text-gray-400">类型</span>{MV_TYPES.map(t => <FilterPill key={t} active={mvType === t} onClick={() => setMvType(t)}>{t}</FilterPill>)}</div>
        <div className="flex items-center gap-2 flex-wrap"><span className="text-xs text-gray-400">排序</span>{MV_ORDERS.map(o => <FilterPill key={o} active={mvOrder === o} onClick={() => setMvOrder(o)}>{o}</FilterPill>)}</div>
      </div>
      {list.initialLoading ? (
        <div className="flex justify-center py-16"><Loader className="w-6 h-6 animate-spin text-[#e60026]" /></div>
      ) : list.items.length === 0 ? (
        <div className="text-center text-gray-400 py-16"><Film className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>暂无 MV</p></div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            {renderedItems.map((mv: { id: number; name: string; imgurl?: string; cover?: string; picUrl?: string; imgurl16v9?: string; playCount?: number; duration?: number; artistName?: string }) => (
              <div key={mv.id} className="grid-card-item cursor-pointer group rounded-xl overflow-hidden bg-gray-100 dark:bg-white/5 hover:shadow-lg hover:-translate-y-0.5 transition-transform">
                <div className="relative aspect-video bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  <img src={coverUrl(mv.imgurl || mv.cover || mv.picUrl || mv.imgurl16v9)} alt={mv.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" decoding="async" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm"><Play className="w-6 h-6 text-white ml-0.5" /></div></div>
                  {mv.playCount > 0 && <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-md backdrop-blur-sm"><Play className="w-2.5 h-2.5" />{formatCount(mv.playCount)}</div>}
                  {mv.duration && <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-md backdrop-blur-sm">{Math.floor(mv.duration / 60000)}:{String(Math.floor((mv.duration % 60000) / 1000)).padStart(2, '0')}</div>}
                </div>
                <div className="p-3"><p className="text-sm font-medium truncate">{mv.name}</p>{mv.artistName && <p className="text-xs text-gray-500 truncate mt-0.5">{mv.artistName}</p>}</div>
              </div>
            ))}
          </div>
          {placeholderHeight > 0 && <div style={{ height: placeholderHeight }} />}
          <div ref={prSentinel} className="h-1" />
          <div ref={sentinelRef} className="h-1" />
          <LoadMore loading={list.loading && !list.initialLoading} hasMore={list.hasMore} error={list.error} onLoadMore={list.loadMore} onRetry={list.refresh} />
        </>
      )}
    </div>
  )
}

function ToplistGrid({ onNavigate }: { onNavigate: (path: string) => void }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any[]>([])

  useEffect(() => {
    getToplist().then((res) => {
      const list = res?.data?.list || []
      setData(Array.isArray(list) ? list : [])
    }).catch(() => {})
  }, [])

  if (data.length === 0) return <div className="flex justify-center py-16"><Loader className="w-6 h-6 animate-spin text-[#e60026]" /></div>

  return (
    <div className="grid grid-cols-5 gap-4">
      {data.map((item: { id: number; name: string; coverImgUrl: string; updateFrequency?: string }) => (
        <div key={item.id} className="cursor-pointer group" onClick={() => onNavigate(`/playlist/${item.id}`)}>
          <div className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden relative shadow-sm group-hover:shadow-lg group-hover:-translate-y-1 transition-transform">
            <img src={item.coverImgUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" decoding="async" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-2 left-2 right-2"><p className="text-white text-xs font-medium truncate">{item.name}</p><p className="text-white/60 text-[10px]">{item.updateFrequency || ''}</p></div>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Play className="w-8 h-8 text-white fill-white" /></div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main LibraryPage ───
export default function LibraryPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // ★ URL 是唯一数据源，tab 直接从 URL 派生（KeepAlive 下绝对可靠）
  const tab: LibraryTab = (searchParams.get('tab') as LibraryTab) || 'playlist'

  const setTab = useCallback((key: LibraryTab) => {
    setSearchParams({ tab: key })
  }, [setSearchParams])

  const handleNavigate = (path: string) => navigate(path)

  const tabs: { key: LibraryTab; label: string; icon: typeof Disc3 }[] = [
    { key: 'playlist', label: '歌单广场', icon: Disc3 },
    { key: 'artist', label: '歌手', icon: MicVocal },
    { key: 'album', label: '新碟上架', icon: Disc3 },
    { key: 'mv', label: 'MV 精选', icon: Film },
    { key: 'toplist', label: '排行榜', icon: Trophy },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">发现音乐</h1>
        <div onClick={() => navigate('/search')}
          className="flex-1 max-w-md flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-400 cursor-pointer hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
        >
          <Search className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">搜索歌曲、歌手、专辑、歌单...</span>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800 pb-1">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors relative ${
              tab === t.key ? 'text-[#e60026]' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
            {tab === t.key && <span className="absolute bottom-[-5px] left-0 right-0 h-0.5 bg-[#e60026] rounded-full" />}
          </button>
        ))}
      </div>

      {/* ★ Tab 级 KeepAlive：切 tab 不销毁子组件，分页/滚动全保留 */}
      <TabCache active={tab === 'artist'}><ArtistGrid onNavigate={handleNavigate} /></TabCache>
      <TabCache active={tab === 'playlist'}><PlaylistGrid onNavigate={handleNavigate} /></TabCache>
      <TabCache active={tab === 'album'}><AlbumGrid onNavigate={handleNavigate} /></TabCache>
      <TabCache active={tab === 'mv'}><MvGrid onNavigate={handleNavigate} /></TabCache>
      <TabCache active={tab === 'toplist'}><ToplistGrid onNavigate={handleNavigate} /></TabCache>
    </div>
  )
}
