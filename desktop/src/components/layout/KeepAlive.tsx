import { useRef, createContext, useContext, type ReactNode, lazy, Suspense } from 'react'
import { useLocation, Routes, Route } from 'react-router-dom'

/**
 * KeepAlive 机制（借鉴 AlgerMusicPlayer 的 Vue keep-alive）
 *
 * 被缓存的页面挂载后永不销毁，切走时 display:none，回来时直接显示。
 * 组件状态、滚动位置、已加载数据全部保留，无需重新请求。
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

// 非缓存路由（每次重新挂载）
const PlaylistPage = lazy(() => import('../../pages/PlaylistPage'))
const ArtistPage = lazy(() => import('../../pages/ArtistPage'))
const AlbumPage = lazy(() => import('../../pages/AlbumPage'))
const SongDetailPage = lazy(() => import('../../pages/SongDetailPage'))
const SongCommentPage = lazy(() => import('../../pages/SongCommentPage'))
const UserPage = lazy(() => import('../../pages/UserPage'))

// ─── 缓存配置 ───
const CACHED_ROUTES: Array<{
  path: string
  component: React.ComponentType<any>
  match: 'exact' | 'prefix' | 'regex'
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
  { path: '^/user/', component: UserPage, match: 'regex' },  // ★ /user/:id 缓存
]

// 非缓存路由（每次都重新挂载，保证数据最新）
const DYNAMIC_ROUTES = [
  { path: '/song/:id/comments', component: SongCommentPage },
  { path: '/playlist/:id', component: PlaylistPage },
  { path: '/artist/:id', component: ArtistPage },
  { path: '/album/:id', component: AlbumPage },
  { path: '/song/:id', component: SongDetailPage },
]

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
  const everMounted = useRef(false)
  if (active) everMounted.current = true
  if (!everMounted.current) return null
  return (
    <KeepAliveContext.Provider value={active}>
      <div style={{ display: active ? undefined : 'none' }}>{children}</div>
    </KeepAliveContext.Provider>
  )
}

// ─── 占位 ───
const PageFallback = () => (
  <div className="flex items-center justify-center py-20">
    <div className="w-6 h-6 border-2 border-[#e60026] border-t-transparent rounded-full animate-spin" />
  </div>
)

// ─── 缓存槽：首次激活后挂载，之后只切换 display ───
function CachedSlot({ cacheKey, match, children }: { cacheKey: string; match: 'exact' | 'prefix' | 'regex'; children: ReactNode }) {
  const location = useLocation()
  let isActive = false
  if (match === 'exact') isActive = location.pathname === cacheKey
  else if (match === 'prefix') isActive = location.pathname.startsWith(cacheKey)
  else if (match === 'regex') {
    // cacheKey is a regex pattern like "^/user/"
    isActive = new RegExp(cacheKey).test(location.pathname)
  }
  const everMounted = useRef(false)
  if (isActive) everMounted.current = true
  if (!everMounted.current) return null

  return (
    <KeepAliveContext.Provider value={isActive}>
      <div style={{ display: isActive ? undefined : 'none' }}>{children}</div>
    </KeepAliveContext.Provider>
  )
}

// ─── 主组件 ───
export function KeepAliveRoutes() {
  const location = useLocation()

  // 当前路径是否命中缓存路由
  const cachedMatch = CACHED_ROUTES.find((r) => {
    if (r.match === 'exact') return location.pathname === r.path
    if (r.match === 'regex') return new RegExp(r.path).test(location.pathname)
    return location.pathname.startsWith(r.path)
  })

  return (
    <>
      {/* 缓存页面：永不销毁，切换 display */}
      {CACHED_ROUTES.map(({ path, component: Comp, match }) => (
        <CachedSlot key={path} cacheKey={path} match={match}>
          <Suspense fallback={<PageFallback />}>
            <Comp />
          </Suspense>
        </CachedSlot>
      ))}

      {/* 动态页面：普通 Routes，每次重新挂载 */}
      <div style={{ display: cachedMatch ? 'none' : undefined }}>
        <Routes>
          {DYNAMIC_ROUTES.map(({ path, component: Comp }) => (
            <Route key={path} path={path} element={<Suspense fallback={<PageFallback />}><Comp /></Suspense>} />
          ))}
        </Routes>
      </div>
    </>
  )
}
