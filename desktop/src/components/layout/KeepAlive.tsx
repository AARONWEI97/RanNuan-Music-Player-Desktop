import { useState, createContext, useContext, memo, type ReactNode, lazy, Suspense } from 'react'
import { useLocation, useNavigationType, Routes, Route, matchPath, type Location } from 'react-router-dom'

/**
 * KeepAlive 机制（借鉴 AlgerMusicPlayer 的 Vue keep-alive）
 *
 * 被缓存的页面挂载后永不销毁，切走时 display:none，回来时直接显示。
 * 保留组件状态和已加载数据。主内容滚动位置由 usePageScroll 管理。
 */
// ─── Lazy imports ───
const HomePage = lazy(() => import('../../pages/HomePage'))
const SearchPage = lazy(() => import('../../pages/SearchPage'))
const LibraryPage = lazy(() => import('../../pages/LibraryPage'))
const FavoritesPage = lazy(() => import('../../pages/FavoritesPage'))
const HistoryPage = lazy(() => import('../../pages/HistoryPage'))
const SettingsPage = lazy(() => import('../../pages/SettingsPage'))
const LocalMusicPage = lazy(() => import('../../pages/LocalMusicPage'))
const TopListPage = lazy(() => import('../../pages/TopListPage'))
const DailyRecommendPage = lazy(() => import('../../pages/DailyRecommendPage'))
const LoginPage = lazy(() => import('../../pages/LoginPage'))
const CommentHistoryPage = lazy(() => import('../../pages/CommentHistoryPage'))
const HeatmapPage = lazy(() => import('../../pages/HeatmapPage'))
const DownloadPage = lazy(() => import('../../pages/DownloadPage'))
const DonationPage = lazy(() => import('../../pages/DonationPage'))
const PlaylistImportPage = lazy(() => import('../../pages/PlaylistImportPage'))
const UniversePage = lazy(() => import('../../pages/UniversePage'))

// 详情路由
const PlaylistPage = lazy(() => import('../../pages/PlaylistPage'))
const ArtistPage = lazy(() => import('../../pages/ArtistPage'))
const AlbumPage = lazy(() => import('../../pages/AlbumPage'))
const SongDetailPage = lazy(() => import('../../pages/SongDetailPage'))
const SongCommentPage = lazy(() => import('../../pages/SongCommentPage'))
const UserPage = lazy(() => import('../../pages/UserPage'))
const DjPage = lazy(() => import('../../pages/DjPage'))
const MvPage = lazy(() => import('../../pages/MvPage'))
const VideoPage = lazy(() => import('../../pages/VideoPage'))

// ─── 缓存配置 ───
const CACHED_ROUTES: Array<{
  path: string
  component: React.ComponentType
  match: 'exact' | 'prefix'
  keepMounted?: boolean
}> = [
  { path: '/', component: HomePage, match: 'exact' },
  { path: '/search', component: SearchPage, match: 'exact' },
  { path: '/library', component: LibraryPage, match: 'prefix' },
  { path: '/favorites', component: FavoritesPage, match: 'exact' },
  { path: '/history', component: HistoryPage, match: 'exact' },
  { path: '/settings', component: SettingsPage, match: 'exact' },
  { path: '/local', component: LocalMusicPage, match: 'exact' },
  { path: '/toplist', component: TopListPage, match: 'exact' },
  { path: '/daily-recommend', component: DailyRecommendPage, match: 'exact' },
  { path: '/login', component: LoginPage, match: 'exact' },
  { path: '/comment-history', component: CommentHistoryPage, match: 'exact' },
  { path: '/heatmap', component: HeatmapPage, match: 'exact' },
  { path: '/download', component: DownloadPage, match: 'exact' },
  { path: '/playlist-import', component: PlaylistImportPage, match: 'exact' },
  { path: '/donation', component: DonationPage, match: 'exact' },
  // 宇宙相册包含独立 iframe + WebGL/R3F 场景，离开页面时卸载 iframe 释放后台动画和 GPU/内存。
  { path: '/universe', component: UniversePage, match: 'exact', keepMounted: false },
]

// 只缓存最近访问的列表详情。播放器、评论及视频页随路径切换重新挂载。
const DYNAMIC_ROUTES = [
  { path: '/song/:id/comments', component: SongCommentPage },
  { path: '/playlist/:id', component: PlaylistPage, keepRecent: true },
  { path: '/artist/:id', component: ArtistPage, keepRecent: true },
  { path: '/album/:id', component: AlbumPage, keepRecent: true },
  { path: '/user/:id', component: UserPage, keepRecent: true },
  { path: '/dj/:id', component: DjPage },
  { path: '/mv/:id', component: MvPage },
  { path: '/video/:id', component: VideoPage },
  { path: '/song/:id', component: SongDetailPage },
]

const MAX_RECENT_DETAILS = 5

// ─── Context: 告知子组件当前是否活跃 ───
const KeepAliveContext = createContext(true)
export function useIsActive(): boolean {
  return useContext(KeepAliveContext)
}

/**
 * Tab 级缓存 — 页面内部 tab 切换用
 * 首次激活后始终挂载，只切 display。hooks、分页状态、滚动位置全保留。
 *
 * @example
 *   <TabCache active={tab === 'hot'}><HotTab /></TabCache>
 *   <TabCache active={tab === 'all'}><AllTab  /></TabCache>
 */
export function TabCache({ active, children }: { active: boolean; children: ReactNode }) {
  const [everMounted, setEverMounted] = useState(active)
  if (active && !everMounted) {
    setEverMounted(true)
  }
  if (!everMounted) return null
  return (
    <KeepAliveContext.Provider value={active}>
      <div style={{ display: active ? undefined : 'none' }}>{children}</div>
    </KeepAliveContext.Provider>
  )
}

// ─── 占位 ───
const PageFallback = () => (
  <div role="status" aria-label="正在打开页面" className="flex items-center justify-center gap-3 py-20 text-sm text-gray-500 dark:text-gray-400">
    <div aria-hidden="true" className="w-6 h-6 border-2 border-[#e60026] border-t-transparent rounded-full animate-spin" />
    正在打开页面…
  </div>
)

// ─── 缓存槽：首次激活后挂载，之后只切换 display ───
const CachedPage = memo(function CachedPage({ component: Component }: { component: React.ComponentType }) {
  return <Suspense fallback={<PageFallback />}><Component /></Suspense>
})

const CachedSlot = memo(function CachedSlot({
  path,
  isActive,
  keepMounted = true,
  component,
}: {
  path: string
  isActive: boolean
  keepMounted?: boolean
  component: React.ComponentType
}) {
  const [everMounted, setEverMounted] = useState(isActive)
  if (isActive && !everMounted) {
    setEverMounted(true)
  }
  if (!isActive && !keepMounted) return null
  if (!everMounted) return null

  return (
    <KeepAliveContext.Provider value={isActive}>
      <div
        className={path === '/universe' ? 'universe-slot' : undefined}
        style={{ display: isActive ? undefined : 'none' }}
      >
        <CachedPage component={component} />
      </div>
    </KeepAliveContext.Provider>
  )
})

// ─── 主组件 ───
export function KeepAliveRoutes() {
  const location = useLocation()

  const fixed = CACHED_ROUTES.find(({ path, match }) => location.pathname === path ||
    (match === 'prefix' && location.pathname.startsWith(`${path}/`)))
  const detail = fixed ? undefined : DYNAMIC_ROUTES.find(route => matchPath(route.path, location.pathname))
  const navigationType = useNavigationType()
  const [cache, setCache] = useState<{ location: Location; recent: { slot: string; location: Location }[] }>(
    () => ({ location, recent: detail?.keepRecent ? [{ slot: location.key, location }] : [] }),
  )
  if (cache.location !== location) {
    let recent = cache.recent
    if (detail?.keepRecent) {
      const replaceInPlace = navigationType === 'REPLACE' && cache.location.pathname === location.pathname
      const previousKey = replaceInPlace ? cache.location.key : location.key
      const slot = recent.find(entry => entry.location.key === previousKey)?.slot ?? location.key
      recent = [{ slot, location }, ...recent.filter(entry => entry.slot !== slot)].slice(0, MAX_RECENT_DETAILS)
    } else if (navigationType === 'REPLACE') {
      recent = recent.filter(entry => entry.location.key !== cache.location.key)
    }
    setCache({ location, recent })
  }

  return (
    <>
      {/* 缓存页面：永不销毁，切换 display */}
      {CACHED_ROUTES.map(({ path, component, keepMounted }) => (
        <CachedSlot key={path} path={path} isActive={fixed?.path === path} component={component} keepMounted={keepMounted} />
      ))}

      {/* Hidden entries retain their own params, query and list pagination. */}
      {cache.recent.map(entry => (
        <div key={entry.slot} hidden={entry.location.key !== location.key}>
          <DetailRoute location={entry.location} />
        </div>
      ))}
      {detail && !detail.keepRecent && <DetailRoute key={location.pathname} location={location} />}
    </>
  )
}

function DetailRoute({ location }: { location: Location }) {
  return (
    <Routes location={location}>
      {DYNAMIC_ROUTES.map(({ path, component: Comp }) => (
        <Route key={path} path={path} element={<Suspense fallback={<PageFallback />}><Comp /></Suspense>} />
      ))}
    </Routes>
  )
}
