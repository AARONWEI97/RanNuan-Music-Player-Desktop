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
import UserEditModal from '@/components/common/UserEditModal'
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
  Radio, Clock, MessageSquare, BadgeCheck, PenLine,
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
  picUrl?: string; playCount?: number
  userId?: number; subscribed?: boolean
  creator?: { nickname: string; userId?: number }
}
interface AlbumItem {
  id: number; name: string; picUrl: string; coverImgUrl?: string; size?: number
  artists?: { name: string }[]
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
  info?: { actName?: string; comment?: unknown; thread?: unknown; name?: string }
  json?: string
  user: { userId: number; nickname: string; avatarUrl: string }
}
interface UserProfile {
  nickname: string
  avatarUrl: string
  backgroundUrl: string
  signature: string
  gender: number
  birthday: number
  province: number
  city: number
  userType?: number
  follows: number
  followeds: number
  eventCount: number
  playlistCount: number
  artistCount: number
  mvCount: number
  djRadioCount: number
  programCount: number
  level?: number
  levelProgress?: number
}
type UTab = 'created' | 'collected' | 'albums' | 'artists' | 'events' | 'dj'
type EmptyParams = Record<string, never>

function getRouteUid(id: string | undefined, pathname: string) {
  const fromParam = Number(id)
  if (fromParam) return fromParam
  const match = pathname.match(/^\/user\/(\d+)/)
  return match ? Number(match[1]) : 0
}

function pickFollowed(res: unknown) {
  const root = res as { data?: { data?: { followed?: boolean }; followed?: boolean } }
  return Boolean(root?.data?.data?.followed || root?.data?.followed)
}

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

function TabPill({ tab, setTab, c, isOwnPage }: { tab: UTab; setTab: (t: UTab) => void; c: Record<string, number>; isOwnPage: boolean }) {
  const allItems: { k: UTab; l: string; ownOnly?: boolean }[] = [
    { k: 'created', l: `创建 ${c.created}` },
    { k: 'collected', l: `收藏 ${c.collected}` },
    { k: 'albums', l: `专辑 ${c.albums}`, ownOnly: true },
    { k: 'artists', l: `歌手 ${c.artists}`, ownOnly: true },
    { k: 'events', l: `动态 ${c.events ?? '...'}` },
    { k: 'dj', l: `电台 ${c.dj ?? '...'}`, ownOnly: true },
  ]
  const items = allItems.filter(item => isOwnPage || !item.ownOnly)
  return (
    <div className="flex gap-1 overflow-x-auto scrollbar-none">
      {items.map(t => (
        <button key={t.k} onClick={() => setTab(t.k)}
          className={`whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold transition-all duration-200 ${
            tab === t.k ? 'bg-[#e60026] text-white shadow-lg shadow-[#e60026]/20' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-white/[0.05] dark:text-gray-400 dark:hover:bg-white/[0.08]'
          }`}>{t.l}</button>
      ))}
    </div>
  )
}

function SectionHead({ title, desc, right }: { title: string; desc?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-lg font-bold text-gray-950 dark:text-white">{title}</h2>
        {desc && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{desc}</p>}
      </div>
      {right}
    </div>
  )
}

function Card({ item, nav, onEdit, editMode }: { item: PlaylistItem | AlbumItem; nav: (p: string) => void; onEdit?: (item: PlaylistItem, mode: 'created' | 'collected') => void; editMode?: 'created' | 'collected' }) {
  const isAlbum = !('subscribed' in item) && !('creator' in item)
  const imgUrl = item.picUrl || item.coverImgUrl || ''
  const url = coverUrl(imgUrl)
  const pid = item.id
  const album = isAlbum ? item as AlbumItem : null
  const playlist = isAlbum ? null : item as PlaylistItem
  const count = album ? album.size : playlist?.trackCount
  const playCount = playlist?.playCount
  const artistName = album
    ? album.artists?.[0]?.name || album.artist?.name || ''
    : playlist?.creator?.nickname || ''
  return (
    <div className="group relative min-w-0">
      <div onClick={() => nav(isAlbum ? `/album/${pid}` : `/playlist/${pid}`)} className="relative aspect-square cursor-pointer overflow-hidden rounded-xl bg-gray-200 shadow-sm transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lg dark:bg-gray-700">
        {imgUrl ? <img src={url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" decoding="async" /> : <div className="w-full h-full flex items-center justify-center text-gray-400"><Disc3 className="w-8 h-8" /></div>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/0 to-black/15 opacity-80" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="w-10 h-10 rounded-full bg-white/95 flex items-center justify-center shadow-lg translate-y-2 group-hover:translate-y-0 transition-transform duration-200">
            <Play className="w-5 h-5 text-[#e60026] ml-0.5" />
          </div>
        </div>
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2">
          <span className="rounded-md bg-black/45 px-1.5 py-0.5 text-[10px] text-white backdrop-blur-sm">{count != null ? `${count} 首` : '专辑'}</span>
          {playCount ? <span className="rounded-md bg-black/45 px-1.5 py-0.5 text-[10px] text-white backdrop-blur-sm">{fmt(playCount)} 播放</span> : null}
        </div>
        {onEdit && !isAlbum && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(item as PlaylistItem, editMode!) }}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/45 opacity-0 shadow-sm backdrop-blur-sm transition-all hover:bg-black/60 group-hover:opacity-100"
            title={editMode === 'created' ? '编辑歌单' : '歌单操作'}
          >
            <MoreHorizontal className="w-4 h-4 text-white" />
          </button>
        )}
      </div>
      <p className="mt-2 truncate px-0.5 text-sm font-semibold text-gray-900 dark:text-gray-100">{item.name}</p>
      {artistName && <p className="truncate px-0.5 text-[11px] text-gray-500 dark:text-gray-400">{artistName}</p>}
    </div>
  )
}

function ArCard({ item, nav }: { item: ArtistItem; nav: (p: string) => void }) {
  return (
    <div onClick={() => nav(`/artist/${item.id}`)} className="group flex cursor-pointer flex-col items-center rounded-xl px-2 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.035]">
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
  const routeUid = getRouteUid(id, location.pathname)
  const [cachedUid, setCachedUid] = useState(routeUid)
  if (routeUid && routeUid !== cachedUid) {
    setCachedUid(routeUid)
  }
  const uid = routeUid || cachedUid
  const navigate = useNavigate()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [bgImg, setBgImg] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<UTab>('created')
  const eventLastTimeRef = useRef<number>(-1)

  // ── Playlist edit modal ──
  const [editModal, setEditModal] = useState<{ playlist: PlaylistItem; mode: 'created' | 'collected' } | null>(null)

  // ── Follow state ──
  const authProfile = useAuthStore(s => s.profile)
  const refreshAuthProfile = useAuthStore(s => s.checkLoginStatus)
  const selfUid = authProfile?.userId || 0
  const isOwnPage = selfUid === uid
  const displayTab: UTab = !isOwnPage && (tab === 'albums' || tab === 'artists' || tab === 'dj') ? 'created' : tab
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)

  // 检查是否已关注
  useEffect(() => {
    if (!uid || isOwnPage) return
    checkMutualFollow(uid).then(pickFollowed).then(setIsFollowing).catch(() => {})
  }, [uid, isOwnPage])

  const handleFollow = async () => {
    setFollowLoading(true)
    try {
      await followUser(uid, isFollowing ? 0 : 1) // t=1 关注, t=0 取消关注
      setIsFollowing(!isFollowing)
      showToast(isFollowing ? '已取消关注' : '已关注')
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '未知错误'
      showToast('操作失败', message)
    } finally {
      setFollowLoading(false)
    }
  }

  // ── Follow list modal ──
  const [flModal, setFlModal] = useState<'follows' | 'followers' | null>(null)
  const [profileEditOpen, setProfileEditOpen] = useState(false)

  // ── Data ──
  const plHook = usePaginatedList<PlaylistItem, { uid: number }>({
    fetcher: async (p) => {
      const res = await getUserPlaylist(p.uid, 1000, 0) as { data?: { playlist?: PlaylistItem[] }; playlist?: PlaylistItem[] }
      const list = (res?.data || res)?.playlist || []
      return Array.isArray(list) ? list : []
    }, params: { uid }, pageSize: 1000,
  })
  const all = plHook.items
  const created = useMemo(() => all.filter(p => !p.subscribed && (p.userId === uid || p.creator?.userId === uid)), [all, uid])
  const collected = useMemo(() => all.filter(p => p.subscribed && !(p.userId === uid || p.creator?.userId === uid)), [all, uid])

  const alHook = usePaginatedList<AlbumItem, EmptyParams>({
    fetcher: async (p) => {
      const res = await getUserAlbumSublist({ limit: 30, offset: p.offset }) as { data?: { data?: AlbumItem[]; albums?: AlbumItem[] } & AlbumItem[] }
      const d = res?.data
      const raw = d?.data ?? d?.albums ?? d
      return Array.isArray(raw) ? raw : []
    },
    params: {} as EmptyParams, pageSize: 30,
  })
  const arHook = usePaginatedList<ArtistItem, EmptyParams>({
    fetcher: async (p) => {
      const res = await getArtistSublist({ limit: 30, offset: p.offset }) as { data?: { data?: ArtistItem[]; artists?: ArtistItem[] } & ArtistItem[] }
      const d = res?.data
      const raw = d?.data ?? d?.artists ?? d
      return Array.isArray(raw) ? raw : []
    },
    params: {} as EmptyParams, pageSize: 30,
  })
  const evHook = usePaginatedList<EventItem, EmptyParams>({
    fetcher: async (p) => {
      const lasttime = p.offset > 0 ? eventLastTimeRef.current : -1
      const res = await getUserEvent({ uid, limit: 20, lasttime }) as { data?: { data?: { events?: EventItem[] }; events?: EventItem[] } }
      const list = res?.data?.data?.events || res?.data?.events || []
      const events = Array.isArray(list) ? list : []
      if (events.length > 0) {
        eventLastTimeRef.current = events[events.length - 1]?.eventTime || eventLastTimeRef.current
      }
      return events
    },
    params: {} as EmptyParams, pageSize: 20,
  })
  const djHook = usePaginatedList<DjItem, EmptyParams>({
    fetcher: async (p) => {
      const res = await getDjSublist({ limit: 30, offset: p.offset }) as { data?: { data?: { djRadios?: DjItem[] }; djRadios?: DjItem[] } }
      const list = res?.data?.data?.djRadios || res?.data?.djRadios
      return Array.isArray(list) ? list : []
    },
    params: {} as EmptyParams, pageSize: 30,
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
  useEffect(() => {
    if (!uid) return
    eventLastTimeRef.current = -1
    plHook.refresh()
    evHook.refresh()
    if (isOwnPage) {
      alHook.refresh()
      arHook.refresh()
      djHook.refresh()
    } else {
      alHook.setItems([])
      arHook.setItems([])
      djHook.setItems([])
    }
    // paginated hooks 引用稳定，按 uid/返回场景手动刷新即可
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, location.key, isOwnPage])

  useEffect(() => {
    if (!uid) return
    let cancelled = false

    const loadProfile = async () => {
      setLoading(true)
      try {
        const [dr, sr, lr, rr, hr] = await Promise.all([
          getUserDetail(uid), getUserSubcount(), getUserLevel(), getUserRecord(uid, 0), getRecentSongs(10),
        ])
        if (cancelled) return

        const d = ((dr as { data?: Record<string, unknown> }).data ?? dr) as unknown as Record<string, unknown>
        const s = ((sr as { data?: Record<string, unknown> }).data ?? sr) as unknown as Record<string, unknown>
        const l = ((lr as { data?: Record<string, unknown> }).data ?? lr) as unknown as Record<string, unknown>
        const p = (d?.profile as Record<string, unknown> | undefined) || d
        setProfile({
          nickname: String(p?.nickname || ''),
          avatarUrl: String(p?.avatarUrl || ''),
          backgroundUrl: String(p?.backgroundUrl || ''),
          signature: String(p?.signature || ''),
          gender: Number(p?.gender ?? 0),
          birthday: Number(p?.birthday ?? 0),
          province: Number(p?.province ?? 0),
          city: Number(p?.city ?? 0),
          userType: p?.userType as number | undefined,
          follows: Number(p?.follows || d?.follows || 0),
          followeds: Number(p?.followeds || d?.followeds || 0),
          eventCount: Number(p?.eventCount || d?.eventCount || 0),
          playlistCount: Number(s?.createdPlaylistCount ?? 0),
          artistCount: Number(s?.artistCount ?? 0),
          mvCount: Number(s?.mvCount ?? 0),
          djRadioCount: Number(s?.djRadioCount ?? 0),
          programCount: Number(s?.programCount ?? 0),
          level: Number((l?.data as Record<string, unknown> | undefined)?.level ?? l?.level ?? 0) || undefined,
          levelProgress: Number((l?.data as Record<string, unknown> | undefined)?.progress ?? l?.progress ?? 0) || undefined,
        })
        const backgroundUrl = String(p?.backgroundUrl || '')
        if (backgroundUrl) setBgImg(backgroundUrl)

        const rrData = (rr as { data?: { allData?: { song?: SongResult }[]; weekData?: { song?: SongResult }[] } })?.data
        const rd = rrData?.allData || rrData?.weekData || []
        setRecords(Array.isArray(rd) ? rd.flatMap(e => e.song ? [e.song] : []).slice(0, 10) : [])

        const hrData = hr as { data?: { data?: { list?: Array<{ data?: SongResult } | SongResult> }; list?: Array<{ data?: SongResult } | SongResult> } }
        const hd = hrData?.data?.data?.list || hrData?.data?.list || hrData?.data || []
        setHistory(Array.isArray(hd)
          ? hd.flatMap(e => ('data' in e && e.data) ? [e.data] : [e as SongResult]).slice(0, 10)
          : [])
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadProfile()
    return () => { cancelled = true }
  }, [uid])

  const nav = useCallback((p: string) => navigate(p), [navigate])

  const handlePlaySong = (song: SongResult) => { playSong(song) }

  const tabCounts = { created: created.length, collected: collected.length, albums: alHook.items.length, artists: arHook.items.length, events: evHook.items.length, dj: djHook.items.length }
  const isArtist = profile?.userType === 4 || profile?.userType === 2
  const identityText = isOwnPage ? '我的主页' : isFollowing ? '已关注' : '用户主页'
  const primaryStats = [
    { l: '关注', v: fmt(profile?.follows || 0), emit: 'follows' as const },
    { l: '粉丝', v: fmt(profile?.followeds || 0), emit: 'followers' as const },
    { l: '动态', v: fmt(profile?.eventCount || 0), emit: null },
    { l: '歌单', v: fmt(profile?.playlistCount || 0), emit: null },
  ]
  const creatorStats = [
    { l: '歌手', v: profile?.artistCount },
    { l: 'MV', v: profile?.mvCount },
    { l: '电台', v: profile?.djRadioCount },
    { l: '节目', v: profile?.programCount },
  ].filter(x => x.v !== undefined)

  // ═══════════════ RENDER ═══════════════
  return (
    <div className="-mx-6 -mt-6">
      {/* ═══ HERO ═══ */}
      <div className="relative min-h-[330px] overflow-hidden bg-[#161616]">
        {bgImg ? (
          <>
            <img src={bgImg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70" />
            <img src={bgImg} alt="" className="absolute inset-0 w-full h-full object-cover blur-3xl scale-110 opacity-35" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,.72),rgba(0,0,0,.34),rgba(0,0,0,.62))]" />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-white dark:to-neutral-900" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(230,0,38,.45),transparent_32%),linear-gradient(135deg,#171717,#251015_46%,#111827)]" />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-white dark:to-neutral-900" />
          </>
        )}

        <div className="relative z-10 flex min-h-[330px] flex-col px-6 py-5">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 rounded-full bg-black/20 px-3 py-1.5 text-sm text-white/75 backdrop-blur-md transition-colors hover:text-white">
              <ArrowLeft className="w-4 h-4" /> 返回
            </button>
            {isOwnPage ? (
              <div className="flex items-center gap-2">
                <button onClick={() => setProfileEditOpen(true)} className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-xs font-medium text-white/80 backdrop-blur-md transition-colors hover:bg-white/18 hover:text-white">
                  <PenLine className="w-3.5 h-3.5" /> 编辑资料
                </button>
                <button onClick={() => navigate('/settings')} className="w-9 h-9 rounded-full bg-white/12 backdrop-blur-md hover:bg-white/18 flex items-center justify-center transition-colors">
                  <Settings className="w-4 h-4 text-white/80" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all disabled:opacity-50 ${
                  isFollowing
                    ? 'bg-white/12 hover:bg-white/18 text-white/80 backdrop-blur-md'
                    : 'bg-[#e60026] hover:bg-[#c50020] text-white shadow-lg shadow-[#e60026]/25'
                }`}
              >
                {followLoading ? <Loader className="w-3.5 h-3.5 animate-spin" /> : isFollowing ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                {isFollowing ? '已关注' : '关注'}
              </button>
            )}
          </div>

          <div className="mt-auto grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px] lg:items-end">
            {loading ? (
              <div className="flex items-end gap-4"><Sk c="w-24 h-24 rounded-3xl" /><div className="space-y-2"><Sk c="w-32 h-6" /><Sk c="w-64 h-12" /></div></div>
            ) : (
              <div className="flex min-w-0 items-end gap-5">
                <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-3xl bg-white/10 shadow-2xl ring-1 ring-white/30">
                  {profile?.avatarUrl ? <img src={avatarUrl(profile.avatarUrl)} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-white/10"><User className="w-9 h-9 text-white/50" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-semibold text-white/75 backdrop-blur-md">{identityText}</span>
                    {isArtist && <span className="flex items-center gap-1 rounded-full bg-[#e60026]/18 px-2.5 py-1 text-[11px] font-semibold text-white"><BadgeCheck className="w-3.5 h-3.5 text-[#ff5a76]" /> 音乐人</span>}
                  </div>
                  <h1 className="truncate text-3xl font-bold text-white" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.38)' }}>{profile?.nickname || '未知用户'}</h1>
                  {profile?.signature ? (
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70 line-clamp-2">{profile.signature}</p>
                  ) : (
                    <p className="mt-2 text-sm text-white/45">{isOwnPage ? '还没有填写个人签名' : '这个用户还没有填写个人签名'}</p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <LvBar l={profile?.level} p={profile?.levelProgress} />
                    {creatorStats.map(x => (
                      <span key={x.l} className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-white/62 backdrop-blur-md">
                        <span className="font-semibold text-white/86">{fmt(x.v || 0)}</span><span className="ml-1">{x.l}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {!loading && (
              <div className="grid grid-cols-4 overflow-hidden rounded-2xl border border-white/12 bg-black/22 backdrop-blur-md">
                {primaryStats.map(s => (
                  <button
                    key={s.l}
                    onClick={() => s.emit && setFlModal(s.emit)}
                    disabled={!s.emit}
                    className={`px-3 py-4 text-left transition-colors ${s.emit ? 'hover:bg-white/10' : ''}`}
                  >
                    <div className="text-lg font-bold tabular-nums text-white">{s.v}</div>
                    <div className="mt-0.5 text-[11px] text-white/50">{s.l}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ QUICK MENU (own profile tools) ═══ */}
      {isOwnPage && (
        <div className="px-6 pt-4 pb-1">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">我的工具</h2>
            <span className="text-xs text-gray-400">常用入口</span>
          </div>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-7">
            {QM.map(q => (
              <button
                key={q.key}
                onClick={q.to ? () => nav(q.to) : undefined}
                className="group flex min-w-0 flex-col items-center gap-2 rounded-xl bg-gray-50 px-2 py-3 transition-all hover:-translate-y-0.5 hover:bg-gray-100 dark:bg-white/[0.035] dark:hover:bg-white/[0.06]"
                disabled={!q.to}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-105" style={{ backgroundColor: `${q.color}18` }}>
                  <q.icon className="w-5 h-5" style={{ color: q.color }} />
                </span>
                <span className="max-w-full truncate text-[11px] text-gray-600 dark:text-gray-300">{q.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══ STICKY TAB ═══ */}
      <div className="sticky top-0 z-20 border-b border-gray-100 bg-white/90 px-6 py-3 backdrop-blur-md dark:border-gray-800 dark:bg-neutral-900/90">
        <div className="flex items-center justify-between gap-4">
          <TabPill tab={displayTab} setTab={setTab} c={tabCounts} isOwnPage={isOwnPage} />
          <span className="hidden text-xs text-gray-400 md:block">{isOwnPage ? '个人收藏与创作' : '公开内容'}</span>
        </div>
      </div>

      {/* ═══ CONTENT ═══ */}
      <div className="px-6 pt-5 pb-24">
        <TabCache active={displayTab === 'created'}>
          <SectionHead title="创建的歌单" desc={isOwnPage ? '你创建和管理的歌单' : `${profile?.nickname || '该用户'}公开创建的歌单`} />
          {plHook.initialLoading ? <div className="flex justify-center py-16"><Loader className="w-6 h-6 animate-spin text-[#e60026]" /></div>
          : created.length === 0 ? <Empty icon={ListMusic} t="暂无创建的歌单" />
          : <><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">{rC.map(p => <Card key={p.id} item={p} nav={nav} onEdit={(item) => setEditModal({ playlist: item, mode: 'created' })} editMode="created" />)}</div>{cH > 0 && <div style={{ height: cH }} />}<div ref={cS} className="h-1" /></>}
        </TabCache>

        <TabCache active={displayTab === 'collected'}>
          <SectionHead title="收藏的歌单" desc={isOwnPage ? '你收藏的歌单会显示在这里' : `${profile?.nickname || '该用户'}公开收藏的歌单`} />
          {plHook.initialLoading ? <div className="flex justify-center py-16"><Loader className="w-6 h-6 animate-spin text-[#e60026]" /></div>
          : collected.length === 0 ? <Empty icon={Heart} t="暂无收藏的歌单" />
          : <><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">{rL.map(p => <Card key={p.id} item={p} nav={nav} onEdit={(item) => setEditModal({ playlist: item, mode: 'collected' })} editMode="collected" />)}</div>{lH > 0 && <div style={{ height: lH }} />}<div ref={lS} className="h-1" /></>}
        </TabCache>

        <TabCache active={displayTab === 'albums'}>
          <SectionHead title="收藏的专辑" desc="专辑收藏来自当前登录账号" />
          {alHook.initialLoading ? <div className="flex justify-center py-16"><Loader className="w-6 h-6 animate-spin text-[#e60026]" /></div>
          : alHook.items.length === 0 ? <Empty icon={Disc3} t="暂无收藏的专辑" />
          : <><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">{rA.map(a => <Card key={a.id} item={a} nav={nav} />)}</div>{aH > 0 && <div style={{ height: aH }} />}<div ref={aSS} className="h-1" /><div ref={alS} className="h-1" /><LoadMore loading={alHook.loading && !alHook.initialLoading} hasMore={alHook.hasMore && alHook.items.length > 0} error={alHook.error} onLoadMore={alHook.loadMore} onRetry={alHook.refresh} /></>}
        </TabCache>

        <TabCache active={displayTab === 'artists'}>
          <SectionHead title="关注的歌手" desc="你关注的歌手和音乐人" />
          {arHook.initialLoading ? <div className="flex justify-center py-16"><Loader className="w-6 h-6 animate-spin text-[#e60026]" /></div>
          : arHook.items.length === 0 ? <Empty icon={MicVocal} t="暂无关注的歌手" />
          : <><div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-5">{rR.map(a => <ArCard key={a.id} item={a} nav={nav} />)}</div>{rH > 0 && <div style={{ height: rH }} />}<div ref={rSS} className="h-1" /><div ref={arS} className="h-1" /><LoadMore loading={arHook.loading && !arHook.initialLoading} hasMore={arHook.hasMore && arHook.items.length > 0} error={arHook.error} onLoadMore={arHook.loadMore} onRetry={arHook.refresh} /></>}
        </TabCache>

        {/* ═══ 动态 ═══ */}
        <TabCache active={displayTab === 'events'}>
          <SectionHead title="最近动态" desc="分享、发布和互动内容" />
          {evHook.initialLoading ? <div className="flex justify-center py-16"><Loader className="w-6 h-6 animate-spin text-[#e60026]" /></div>
          : evHook.items.length === 0 ? <Empty icon={MessageSquare} t="暂无动态" />
          : <div className="space-y-3">
            {evHook.items.map(ev => {
              const info = ev.info
              const json = ev.json ? (() => { try { return JSON.parse(ev.json) } catch { return null } })() : null
              const songName = json?.song?.name || info?.actName || info?.name || '分享了一首歌'
              const evType = ev.type === 18 ? '分享单曲' : ev.type === 17 ? '分享歌单' : ev.type === 13 ? '分享专辑' : ev.type === 39 ? '发布视频' : '分享了'
              return (
                <div key={ev.id} className="group flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/70 px-4 py-3 transition-colors hover:bg-gray-100 dark:border-white/[0.04] dark:bg-white/[0.025] dark:hover:bg-white/[0.045]">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0 ring-2 ring-white dark:ring-neutral-900">
                    {ev.user.avatarUrl ? <img src={avatarUrl(ev.user.avatarUrl)} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><User className="w-4 h-4 text-gray-400" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white line-clamp-2">
                      <span className="font-medium">{ev.user.nickname}</span>
                      <span className="text-gray-400 dark:text-gray-500 mx-1">{evType}</span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">{songName}</span>
                    </p>
                    {json?.msg && <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500 dark:text-gray-400">{json.msg}</p>}
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 flex items-center gap-1">
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
        <TabCache active={displayTab === 'dj'}>
          <SectionHead title="收藏的电台" desc="订阅电台与节目列表" />
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
          <SectionHead title="听歌排行" desc="最近常听的歌曲" />
          {records.length === 0 ? (
            <Empty icon={Music} t="暂无听歌记录" />
          ) : (
            <div className="space-y-1">
              {records.map((song, i) => {
                const crowns = [
                  { color: '#f59e0b', shadow: '0 0 10px rgba(245,158,11,0.45)' },
                  { color: '#94a3b8', shadow: '0 0 10px rgba(148,163,184,0.35)' },
                  { color: '#d97706', shadow: '0 0 8px rgba(217,119,6,0.3)' },
                ]
                const rank = i < 3 ? crowns[i] : null
                return (
                  <div key={song.id} className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.035] cursor-pointer" onClick={() => handlePlaySong(song)}>
                    {rank ? (
                      <div className="w-7 flex items-center justify-center">
                        <Crown className="w-4 h-4" style={{ color: rank.color, filter: `drop-shadow(${rank.shadow})` }} />
                      </div>
                    ) : (
                      <span className="w-7 text-center text-xs font-bold text-gray-400 dark:text-gray-500 tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                    )}
                    <div className="h-10 w-10 overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-700">
                      <img src={coverUrl(song.picUrl || song.al?.picUrl || '')} alt="" className="h-full w-full object-cover" loading="lazy" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{song.name}</p>
                      <p className="truncate text-xs text-gray-500">{song.ar?.map(a => a.name).join(' / ') || '未知歌手'}</p>
                    </div>
                    <Play className="h-4 w-4 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 group-hover:text-[#e60026]" />
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="mt-8">
          <SectionHead title="播放历史" desc="最近播放过的歌曲" />
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

      {/* ═══ 编辑资料弹窗 ═══ */}
      {profile && (
        <UserEditModal
          key={profileEditOpen ? `user-edit-${uid}` : 'closed'}
          open={profileEditOpen}
          profile={profile}
          onClose={() => setProfileEditOpen(false)}
          onUpdated={(patch) => {
            setProfile(prev => (prev ? { ...prev, ...patch } as UserProfile : prev))
            refreshAuthProfile()
          }}
        />
      )}
    </div>
  )
}
