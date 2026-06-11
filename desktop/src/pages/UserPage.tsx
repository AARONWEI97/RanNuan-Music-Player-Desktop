import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  getUserDetail, getUserPlaylist, getUserAlbumSublist, getArtistSublist,
  getUserSubcount, getUserLevel, getUserRecord, getRecentSongs,
  followUser, checkMutualFollow,
  getUserEvent, getDjSublist,
  type SongResult,
} from '@shared'
import { playSong } from '@/services/audioService'
import { useAuthStore } from '@/store/authStore'
import SongRow from '@/components/common/SongRow'
import LoadMore from '@/components/common/LoadMore'
import PlaylistEditModal from '@/components/common/PlaylistEditModal'
import FollowListModal from '@/components/common/FollowListModal'
import { usePaginatedList } from '@/hooks/usePaginatedList'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { useProgressiveRender } from '@/hooks/useProgressiveRender'
import { TabCache } from '@/components/layout/KeepAlive'
import { coverUrl, avatarUrl } from '@/utils/image'
import { showToast } from '@/utils/toast'
import {
  ArrowLeft, Play, Loader, ListMusic, Disc3, MicVocal, Heart,
  User, FolderOpen, Settings, History,
  MessageCircle, TrendingUp, Download, Import, MoreHorizontal,
  Music, Crown, UserPlus, UserCheck,
  Radio, Clock, MessageSquare,
} from 'lucide-react'

/* ═══════════════════════════════════════════════════
   UserPage — 参考移动端 UserScreen 设计
   · Hero 渐变背景 + 背景图
   · 7 入口快速菜单（水平滚动）
   · Tab: 创建/收藏/专辑/歌手/动态/电台
   · 听歌排行 + 播放历史
   ═══════════════════════════════════════════════════ */

interface PlaylistItem {
  id: number; name: string; coverImgUrl: string; trackCount: number
  userId?: number; subscribed?: boolean
  creator?: { nickname: string; userId?: number }
}
interface AlbumItem {
  id: number; name: string; picUrl: string; size?: number
  artist?: { name: string }; publishTime?: number
}
interface ArtistItem {
  id: number; name: string; picUrl?: string; img1v1Url?: string
  musicSize?: number; albumSize?: number
}
interface DjItem {
  id: number; name: string; picUrl: string
  programCount?: number; subCount?: number; playCount?: number
  dj?: { nickname: string }
}
interface EventItem {
  id: number; eventTime: number; type: number
  info?: { actName?: string; comment?: any; thread?: any; name?: string }
  json?: string
  user: { userId: number; nickname: string; avatarUrl: string }
}
type UTab = 'created' | 'collected' | 'albums' | 'artists' | 'events' | 'dj'

function fmt(n: number) {
  if (n >= 1e8) return `${(n / 1e8).toFixed(1)}亿`
  if (n >= 1e4) return `${(n / 1e4).toFixed(1)}万`
  return `${n}`
}

/* ───────────── Quick Menu (7 items, matching mobile exactly) ───────────── */
const QM = [
  { key: 'favorite', icon: Heart,          label: '我喜欢的音乐', color: '#ef4444', to: '/favorites' },
  { key: 'recent',   icon: History,        label: '播放历史',    color: '#06b6d4', to: '/history' },
  { key: 'comment',  icon: MessageCircle,  label: '评论历史',    color: '#a855f7', to: '/comment-history' },
  { key: 'local',    icon: FolderOpen,     label: '本地音乐',    color: '#f59e0b', to: '/local' },
  { key: 'heatmap',  icon: TrendingUp,     label: '听歌热力图',   color: '#8b5cf6', to: '/heatmap' },
  { key: 'download', icon: Download,       label: '下载管理',    color: '#22c55e', to: '/download' },
  { key: 'import',   icon: Import,         label: '歌单导入',    color: '#ec4899', to: '/playlist-import' },
] as const

/* ───────────── Components ───────────── */
function LvBar({ l, p }: { l?: number; p?: number }) {
  if (!l) return null
  return (
    <div className="flex items-center gap-2 mt-1">
      <span className="text-[11px] font-bold text-white/80 bg-white/10 px-1.5 py-0.5 rounded">Lv.{l}</span>
      <div className="w-20 h-1.5 rounded-full bg-white/15 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-300" style={{ width: `${Math.min(100, Math.max(0, p || 0))}%` }} />
      </div>
    </div>
  )
}
const Sk = ({ c }: { c?: string }) => <div className={`rounded bg-gray-200 dark:bg-gray-700 animate-pulse ${c || ''}`} />

function TabPill({ tab, setTab, c }: { tab: UTab; setTab: (t: UTab) => void; c: Record<string, number> }) {
  const items: { k: UTab; l: string }[] = [
    { k: 'created',   l: `创建 (${c.created})` },
    { k: 'collected', l: `收藏 (${c.collected})` },
    { k: 'albums',    l: `专辑 (${c.albums})` },
    { k: 'artists',   l: `歌手 (${c.artists})` },
    { k: 'events',    l: `动态 (${c.events ?? '...'})` },
    { k: 'dj',        l: `电台 (${c.dj ?? '...'})` },
  ]
  return (
    <div className="inline-flex p-1 rounded-full bg-gray-100 dark:bg-white/[0.06] overflow-x-auto scrollbar-none">
      {items.map(t => (
        <button key={t.k} onClick={() => setTab(t.k)}
          className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
            tab === t.k ? 'bg-white dark:bg-gray-700 text-[#e60026] shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}>{t.l}</button>
      ))}
    </div>
  )
}

function Card({ item, nav, onEdit, editMode }: { item: PlaylistItem | AlbumItem; nav: (p: string) => void; onEdit?: (item: PlaylistItem, mode: 'created' | 'collected') => void; editMode?: 'created' | 'collected' }) {
  // ★ 移动端兼容方式：封面 picUrl || coverImgUrl；类型用 subscribed/creator 判断
  const isAlbum = !('subscribed' in item) && !('creator' in item)
  const imgUrl = (item as any).picUrl || (item as any).coverImgUrl || ''
  const url = coverUrl(imgUrl)
  const pid = item.id
  const count = isAlbum ? (item as AlbumItem).size : (item as PlaylistItem).trackCount
  const artistName = isAlbum
    ? (item as any).artists?.[0]?.name || (item as AlbumItem).artist?.name || ''
    : (item as PlaylistItem).creator?.nickname || ''
  return (
    <div className="group cursor-pointer relative">
      <div onClick={() => nav(isAlbum ? `/album/${pid}` : `/playlist/${pid}`)} className="relative aspect-square bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden shadow-sm group-hover:shadow-lg transition-all duration-200 group-hover:-translate-y-1">
        {imgUrl ? <img src={url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" decoding="async" /> : <div className="w-full h-full flex items-center justify-center text-gray-400"><Disc3 className="w-8 h-8" /></div>}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="w-10 h-10 rounded-full bg-white/95 flex items-center justify-center shadow-lg translate-y-2 group-hover:translate-y-0 transition-transform duration-200">
            <Play className="w-5 h-5 text-[#e60026] ml-0.5" />
          </div>
        </div>
        <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded-md">{count != null ? `${count} 首` : ''}</div>
      </div>
      <p className="mt-2 text-sm font-medium truncate text-gray-900 dark:text-gray-100">{item.name}</p>
      {artistName && <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{artistName}</p>}

      {/* 歌单编辑按钮 */}
      {onEdit && !isAlbum && (
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(item as PlaylistItem, editMode!) }}
          className="absolute top-0 right-0 w-6 h-6 rounded-full bg-white/90 dark:bg-gray-800/90 opacity-0 group-hover:opacity-100 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-all shadow-sm z-10"
          title={editMode === 'created' ? '编辑歌单' : '歌单操作'}
        >
          <MoreHorizontal className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
        </button>
      )}
    </div>
  )
}

function ArCard({ item, nav }: { item: ArtistItem; nav: (p: string) => void }) {
  return (
    <div onClick={() => nav(`/artist/${item.id}`)} className="group flex flex-col items-center cursor-pointer">
      <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 shadow-sm group-hover:shadow-md transition-all group-hover:scale-105 ring-2 ring-transparent group-hover:ring-[#e60026]/20">
        <img src={avatarUrl(item.picUrl || item.img1v1Url)} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
      </div>
      <p className="mt-2 text-sm font-medium truncate w-full text-center text-gray-900 dark:text-gray-100">{item.name}</p>
      {item.musicSize !== undefined && <p className="text-[10px] text-gray-500 dark:text-gray-400">{item.musicSize} 首{item.albumSize ? ` · ${item.albumSize} 专辑` : ''}</p>}
    </div>
  )
}

function Empty({ icon: I, t }: { icon: typeof Play; t: string }) {
  return <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500"><I className="w-10 h-10 mb-2 opacity-30" /><p className="text-sm">{t}</p></div>
}

/* ═══════════════════════════════ MAIN ═══════════════════════════════ */
export default function UserPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const currentUid = Number(id) || (() => { const m = location.pathname.match(/^\/user\/(\d+)/); return m ? Number(m[1]) : 0 })()
  const storedUid = useRef(currentUid)
  useEffect(() => { if (currentUid) storedUid.current = currentUid }, [currentUid])
  const uid = currentUid || storedUid.current
  const navigate = useNavigate()

  const [profile, setProfile] = useState<Record<string, any> | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<UTab>('created')

  // ── Playlist edit modal ──
  const [editModal, setEditModal] = useState<{ playlist: PlaylistItem; mode: 'created' | 'collected' } | null>(null)

  // ── Follow state ──
  const authProfile = useAuthStore(s => s.profile)
  const selfUid = authProfile?.userId || 0
  const isOwnPage = selfUid === uid
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)

  // 检查是否已关注
  useEffect(() => {
    if (!uid || isOwnPage) return
    checkMutualFollow(uid).then((res: any) => {
      setIsFollowing(res?.data?.data?.followed || res?.data?.followed || false)
    }).catch(() => {})
  }, [uid, isOwnPage])

  const handleFollow = async () => {
    setFollowLoading(true)
    try {
      await followUser(uid, isFollowing ? 0 : 1) // t=1 关注, t=0 取消关注
      setIsFollowing(!isFollowing)
      showToast(isFollowing ? '已取消关注' : '已关注')
    } catch (e: any) {
      showToast('操作失败', e?.message || '未知错误')
    } finally {
      setFollowLoading(false)
    }
  }

  // ── Follow list modal ──
  const [flModal, setFlModal] = useState<'follows' | 'followers' | null>(null)

  // ── Data ──
  const plHook = usePaginatedList<PlaylistItem, { uid: number }>({
    fetcher: async (p) => {
      const res: any = await getUserPlaylist(p.uid, 1000, 0)
      const list = (res?.data || res)?.playlist || []
      return Array.isArray(list) ? list : []
    }, params: { uid }, pageSize: 1000,
  })
  const all = plHook.items
  const created = useMemo(() => all.filter((p: any) => !p.subscribed && (p.userId === uid || p.creator?.userId === uid)), [all, uid])
  const collected = useMemo(() => all.filter((p: any) => p.subscribed && !(p.userId === uid || p.creator?.userId === uid)), [all, uid])

  const alHook = usePaginatedList<AlbumItem, {}>({
    fetcher: async (p) => {
      const res: any = await getUserAlbumSublist({ limit: 30, offset: p.offset })
      // 专辑 API 返回多种结构：data.data / data / data.data.data
      const d = res?.data
      const raw = d?.data ?? d?.albums ?? d
      return Array.isArray(raw) ? raw : []
    },
    params: {}, pageSize: 30,
  })
  const arHook = usePaginatedList<ArtistItem, {}>({
    fetcher: async (p) => {
      const res: any = await getArtistSublist({ limit: 30, offset: p.offset })
      const d = res?.data
      const raw = d?.data ?? d?.artists ?? d
      return Array.isArray(raw) ? raw : []
    },
    params: {}, pageSize: 30,
  })
  const evHook = usePaginatedList<EventItem, {}>({
    fetcher: async (p) => { const res: any = await getUserEvent({ uid, limit: 20, lasttime: p.offset > 0 ? undefined : -1 }); return Array.isArray(res?.data?.data?.events || res?.data?.events) ? (res?.data?.data?.events || res?.data?.events) : [] },
    params: {}, pageSize: 20,
  })
  const djHook = usePaginatedList<DjItem, {}>({
    fetcher: async (p) => { const res: any = await getDjSublist({ limit: 30, offset: p.offset }); return Array.isArray(res?.data?.data?.djRadios || res?.data?.djRadios) ? (res?.data?.data?.djRadios || res?.data?.djRadios) : [] },
    params: {}, pageSize: 30,
  })

  // ── Listening records ──
  const [records, setRecords] = useState<SongResult[]>([])
  const [history, setHistory] = useState<SongResult[]>([])

  const alS = useInfiniteScroll(alHook.loadMore, alHook.hasMore, alHook.loading)
  const arS = useInfiniteScroll(arHook.loadMore, arHook.hasMore, arHook.loading)

  const { renderedItems: rC, placeholderHeight: cH, sentinelRef: cS } = useProgressiveRender({ items: created, itemHeight: 270, initialCount: 10, batchSize: 10, resetKey: uid })
  const { renderedItems: rL, placeholderHeight: lH, sentinelRef: lS } = useProgressiveRender({ items: collected, itemHeight: 270, initialCount: 10, batchSize: 10, resetKey: uid })
  const { renderedItems: rA, placeholderHeight: aH, sentinelRef: aSS } = useProgressiveRender({ items: alHook.items, itemHeight: 270, initialCount: 10, batchSize: 10, resetKey: uid })
  const { renderedItems: rR, placeholderHeight: rH, sentinelRef: rSS } = useProgressiveRender({ items: arHook.items, itemHeight: 140, initialCount: 12, batchSize: 12, resetKey: uid })

  // 初次加载 + uid 变化 + 从其他页面返回时都刷新
  useEffect(() => { if (!uid) return; plHook.refresh(); alHook.refresh(); arHook.refresh(); evHook.refresh(); djHook.refresh() }, [uid, location.key])

  useEffect(() => {
    if (!uid) return
    setLoading(true)
    Promise.all([getUserDetail(uid), getUserSubcount(), getUserLevel(), getUserRecord(uid, 0), getRecentSongs(10)])
      .then(([dr, sr, lr, rr, hr]) => {
        const d = dr?.data || dr; const s = sr?.data || sr; const l = lr?.data || lr
        const p = d?.profile || d
        setProfile({
          nickname: p?.nickname || '', avatarUrl: p?.avatarUrl || '',
          backgroundUrl: p?.backgroundUrl || '', signature: p?.signature || '',
          userType: p?.userType, follows: p?.follows || d?.follows || 0,
          followeds: p?.followeds || d?.followeds || 0, eventCount: p?.eventCount || d?.eventCount || 0,
          playlistCount: s?.createdPlaylistCount ?? 0, artistCount: s?.artistCount ?? 0,
          mvCount: s?.mvCount ?? 0, djRadioCount: s?.djRadioCount ?? 0, programCount: s?.programCount ?? 0,
          level: l?.data?.level ?? l?.level, levelProgress: l?.data?.progress ?? l?.progress,
        })
        // ★ /user/record 返回 { playCount: N, song: SongResult }[] → 解包 song
        const rd = (rr?.data?.allData || rr?.data?.weekData) || []
        setRecords(Array.isArray(rd) ? rd.map((e: any) => e.song).filter(Boolean).slice(0, 10) : [])
        // ★ /record/recent/song 返回 { data: SongResult, playTime: N }[] → 解包 data
        const hd = (hr?.data?.data?.list || hr?.data?.list || hr?.data || [])
        setHistory(Array.isArray(hd) ? hd.map((e: any) => e.data || e).filter(Boolean).slice(0, 10) : [])
      }).catch(() => {}).finally(() => setLoading(false))
  }, [uid])

  const nav = useCallback((p: string) => navigate(p), [navigate])

  const handlePlaySong = (song: SongResult) => { playSong(song) }

  const tabCounts = { created: created.length, collected: collected.length, albums: alHook.items.length, artists: arHook.items.length, events: evHook.items.length, dj: djHook.items.length }
  const isArtist = profile?.userType === 4 || profile?.userType === 2
  // ★ 背景图缓存：记住上次加载的背景图，避免切 Tab 时闪烁
  const bgCacheRef = useRef<string | null>(null)
  if (profile?.backgroundUrl) bgCacheRef.current = profile.backgroundUrl
  const bgImg = profile?.backgroundUrl || bgCacheRef.current

  // ═══════════════ RENDER ═══════════════
  return (
    <div className="-mx-6 -mt-6">
      {/* ═══ HERO ═══ */}
      <div className="relative h-[280px] overflow-hidden">
        {bgImg ? (
          <>
            <img src={bgImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-white dark:to-neutral-900" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#d4183a] via-[#b91530] to-[#1a1a2e]" />
        )}
        <div className="relative z-10 px-6 pt-5 h-full flex flex-col justify-end pb-6">
          <div className="flex justify-between mb-auto">
            <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors"><ArrowLeft className="w-4 h-4" /> 返回</button>
            <div className="flex items-center gap-2">
              {!isOwnPage && (
                <button
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    isFollowing
                      ? 'bg-white/10 hover:bg-white/20 text-white/70'
                      : 'bg-[#e60026] hover:bg-[#c50020] text-white shadow-sm'
                  } disabled:opacity-50`}
                >
                  {followLoading ? (
                    <Loader className="w-3.5 h-3.5 animate-spin" />
                  ) : isFollowing ? (
                    <UserCheck className="w-3.5 h-3.5" />
                  ) : (
                    <UserPlus className="w-3.5 h-3.5" />
                  )}
                  {isFollowing ? '已关注' : '关注'}
                </button>
              )}
              <button onClick={() => navigate('/settings')} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"><Settings className="w-4 h-4 text-white/70" /></button>
            </div>
          </div>
          {loading ? (
            <div className="flex items-end gap-4"><Sk c="w-16 h-16 rounded-full" /><div className="space-y-2"><Sk c="w-32 h-6" /><Sk c="w-48 h-12" /></div></div>
          ) : (
            <div className="flex items-end gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden ring-[3px] ring-white/30 shadow-xl flex-shrink-0">
                {profile?.avatarUrl ? <img src={avatarUrl(profile.avatarUrl)} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-white/10"><User className="w-7 h-7 text-white/50" /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-white" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>{profile?.nickname || '未知用户'}</h1>
                  {isArtist && <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#e60026]/20 text-[#e60026] text-[10px] font-medium">🎵 音乐人</span>}
                </div>
                {profile?.signature && <p className="text-xs text-white/50 mt-0.5">{profile.signature}</p>}
                <div className="flex items-center gap-4 mt-2">
                  {[
                    { l: '关注', v: fmt(profile?.follows || 0), emit: 'follows' as const },
                    { l: '粉丝', v: fmt(profile?.followeds || 0), emit: 'followers' as const },
                    { l: '动态', v: profile?.eventCount || 0, emit: null },
                    { l: '歌单', v: profile?.playlistCount || 0, emit: null },
                  ].map(s => (
                    <div key={s.l}
                      onClick={() => s.emit && setFlModal(s.emit)}
                      className={`text-center ${s.emit ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                    >
                      <div className="text-base font-bold text-white tabular-nums" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>{s.v}</div>
                      <div className="text-[10px] text-white/50 mt-0.5">{s.l}</div>
                    </div>
                  ))}
                </div>
                <LvBar l={profile?.level} p={profile?.levelProgress} />
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/10">
                  {[{ l: '歌手', v: profile?.artistCount }, { l: 'MV', v: profile?.mvCount }, { l: '电台', v: profile?.djRadioCount }, { l: '节目', v: profile?.programCount }].filter(x => x.v !== undefined).map(x => (
                    <span key={x.l} className="text-[11px]"><span className="text-white/70 font-medium">{x.v}</span><span className="text-white/40 ml-1">{x.l}</span></span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ QUICK MENU (7 items, matching mobile) ═══ */}
      <div className="px-6 pt-4 pb-1">
        <div className="flex gap-3 overflow-x-auto scrollbar-none">
          {QM.map(q => (
            <div key={q.key} className={`flex flex-col items-center gap-1 min-w-[72px] ${q.to ? '' : 'opacity-50 cursor-not-allowed'}`}>
              <button
                onClick={q.to ? () => nav(q.to) : undefined}
                className="w-10 h-10 rounded-lg flex items-center justify-center transition-transform hover:scale-110"
                style={{ backgroundColor: `${q.color}18` }}
                disabled={!q.to}
              >
                <q.icon className="w-5 h-5" style={{ color: q.color }} />
              </button>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 whitespace-nowrap text-center">{q.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ STICKY TAB ═══ */}
      <div className="sticky top-0 z-20 px-6 py-3 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
        <TabPill tab={tab} setTab={setTab} c={tabCounts} />
      </div>

      {/* ═══ CONTENT ═══ */}
      <div className="px-6 pt-5 pb-24">
        <TabCache active={tab === 'created'}>
          {plHook.initialLoading ? <div className="flex justify-center py-16"><Loader className="w-6 h-6 animate-spin text-[#e60026]" /></div>
          : created.length === 0 ? <Empty icon={ListMusic} t="暂无创建的歌单" />
          : <><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">{rC.map(p => <Card key={p.id} item={p} nav={nav} onEdit={(item) => setEditModal({ playlist: item, mode: 'created' })} editMode="created" />)}</div>{cH > 0 && <div style={{ height: cH }} />}<div ref={cS} className="h-1" /></>}
        </TabCache>

        <TabCache active={tab === 'collected'}>
          {plHook.initialLoading ? <div className="flex justify-center py-16"><Loader className="w-6 h-6 animate-spin text-[#e60026]" /></div>
          : collected.length === 0 ? <Empty icon={Heart} t="暂无收藏的歌单" />
          : <><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">{rL.map(p => <Card key={p.id} item={p} nav={nav} onEdit={(item) => setEditModal({ playlist: item, mode: 'collected' })} editMode="collected" />)}</div>{lH > 0 && <div style={{ height: lH }} />}<div ref={lS} className="h-1" /></>}
        </TabCache>

        <TabCache active={tab === 'albums'}>
          {alHook.initialLoading ? <div className="flex justify-center py-16"><Loader className="w-6 h-6 animate-spin text-[#e60026]" /></div>
          : alHook.items.length === 0 ? <Empty icon={Disc3} t="暂无收藏的专辑" />
          : <><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">{rA.map(a => <Card key={a.id} item={a} nav={nav} />)}</div>{aH > 0 && <div style={{ height: aH }} />}<div ref={aSS} className="h-1" /><div ref={alS} className="h-1" /><LoadMore loading={alHook.loading && !alHook.initialLoading} hasMore={alHook.hasMore && alHook.items.length > 0} error={alHook.error} onLoadMore={alHook.loadMore} onRetry={alHook.refresh} /></>}
        </TabCache>

        <TabCache active={tab === 'artists'}>
          {arHook.initialLoading ? <div className="flex justify-center py-16"><Loader className="w-6 h-6 animate-spin text-[#e60026]" /></div>
          : arHook.items.length === 0 ? <Empty icon={MicVocal} t="暂无关注的歌手" />
          : <><div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-5">{rR.map(a => <ArCard key={a.id} item={a} nav={nav} />)}</div>{rH > 0 && <div style={{ height: rH }} />}<div ref={rSS} className="h-1" /><div ref={arS} className="h-1" /><LoadMore loading={arHook.loading && !arHook.initialLoading} hasMore={arHook.hasMore && arHook.items.length > 0} error={arHook.error} onLoadMore={arHook.loadMore} onRetry={arHook.refresh} /></>}
        </TabCache>

        {/* ═══ 动态 ═══ */}
        <TabCache active={tab === 'events'}>
          {evHook.initialLoading ? <div className="flex justify-center py-16"><Loader className="w-6 h-6 animate-spin text-[#e60026]" /></div>
          : evHook.items.length === 0 ? <Empty icon={MessageSquare} t="暂无动态" />
          : <div className="space-y-3">
            {evHook.items.map(ev => {
              const info = ev.info
              const json = ev.json ? (() => { try { return JSON.parse(ev.json) } catch { return null } })() : null
              const songName = json?.song?.name || info?.actName || info?.name || '分享了一首歌'
              const evType = ev.type === 18 ? '分享单曲' : ev.type === 17 ? '分享歌单' : ev.type === 13 ? '分享专辑' : ev.type === 39 ? '发布视频' : '分享了'
              return (
                <div key={ev.id} className="flex items-start gap-3 px-2 py-2 hover:bg-gray-50 dark:hover:bg-white/[0.03] rounded-lg transition-colors">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                    {ev.user.avatarUrl ? <img src={avatarUrl(ev.user.avatarUrl)} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><User className="w-4 h-4 text-gray-400" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-900 dark:text-white line-clamp-2">
                      <span className="font-medium">{ev.user.nickname}</span>
                      <span className="text-gray-400 dark:text-gray-500 mx-1">{evType}</span>
                      <span className="text-gray-500 dark:text-gray-400">{songName}</span>
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(ev.eventTime).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )
            })}
            <LoadMore loading={evHook.loading && !evHook.initialLoading} hasMore={evHook.hasMore} error={evHook.error} onLoadMore={evHook.loadMore} onRetry={evHook.refresh} />
          </div>}
        </TabCache>

        {/* ═══ 电台 ═══ */}
        <TabCache active={tab === 'dj'}>
          {djHook.initialLoading ? <div className="flex justify-center py-16"><Loader className="w-6 h-6 animate-spin text-[#e60026]" /></div>
          : djHook.items.length === 0 ? <Empty icon={Radio} t="暂无收藏的电台" />
          : <><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {djHook.items.map(d => (
              <div key={d.id} onClick={() => nav(`/dj/${d.id}`)} className="group cursor-pointer relative">
                <div className="relative aspect-square bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden shadow-sm group-hover:shadow-lg transition-all duration-200 group-hover:-translate-y-1">
                  <img src={coverUrl(d.picUrl)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" decoding="async" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="w-10 h-10 rounded-full bg-white/95 flex items-center justify-center shadow-lg translate-y-2 group-hover:translate-y-0 transition-transform duration-200">
                      <Play className="w-5 h-5 text-[#e60026] ml-0.5" />
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded-md">{d.programCount || 0} 期</div>
                </div>
                <p className="mt-2 text-sm font-medium truncate text-gray-900 dark:text-gray-100">{d.name}</p>
                {d.dj?.nickname && <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{d.dj.nickname}</p>}
              </div>
            ))}
          </div>
          <LoadMore loading={djHook.loading && !djHook.initialLoading} hasMore={djHook.hasMore} error={djHook.error} onLoadMore={djHook.loadMore} onRetry={djHook.refresh} />
          </>}
        </TabCache>

        {/* ═══ 听歌排行 + 播放历史 ═══ */}
        <div className="mt-10 pt-6 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 rounded bg-amber-500" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">听歌排行</h3>
          </div>
          {records.length === 0 ? (
            <Empty icon={Music} t="暂无听歌记录" />
          ) : (
            <div className="space-y-0.5">
              {records.map((song, i) => {
                const crowns = [
                  { color: '#f59e0b', shadow: '0 0 10px rgba(245,158,11,0.45)' },
                  { color: '#94a3b8', shadow: '0 0 10px rgba(148,163,184,0.35)' },
                  { color: '#d97706', shadow: '0 0 8px rgba(217,119,6,0.3)' },
                ]
                const rank = i < 3 ? crowns[i] : null
                return (
                  <div key={song.id} className="flex items-center gap-3 px-2 py-2 hover:bg-gray-50 dark:hover:bg-white/[0.03] rounded-lg transition-colors cursor-pointer" onClick={() => handlePlaySong(song)}>
                    {rank ? (
                      <div className="w-7 flex items-center justify-center">
                        <Crown className="w-4 h-4" style={{ color: rank.color, filter: `drop-shadow(${rank.shadow})` }} />
                      </div>
                    ) : (
                      <span className="w-7 text-center text-xs font-bold text-gray-400 dark:text-gray-500 tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                    )}
                    <SongRow song={song} index={i} showPic showIndex={false} onPlay={() => {}} />
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 rounded bg-cyan-500" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">播放历史</h3>
          </div>
          {history.length === 0 ? (
            <Empty icon={History} t="暂无播放历史" />
          ) : (
            <div className="space-y-0.5">
              {history.map((song, i) => (
                <SongRow key={`h-${song.id}-${i}`} song={song} index={i} showPic onPlay={() => handlePlaySong(song)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══ 歌单编辑弹窗 ═══ */}
      {editModal && (
        <PlaylistEditModal
          open={!!editModal}
          playlist={editModal.playlist}
          mode={editModal.mode}
          onClose={() => setEditModal(null)}
          onUpdated={() => {
            plHook.refresh()
            setEditModal(null)
          }}
        />
      )}

      {/* ═══ 关注/粉丝列表弹窗 ═══ */}
      {flModal && (
        <FollowListModal
          open={!!flModal}
          uid={uid}
          initialTab={flModal}
          onClose={() => setFlModal(null)}
        />
      )}
    </div>
  )
}
