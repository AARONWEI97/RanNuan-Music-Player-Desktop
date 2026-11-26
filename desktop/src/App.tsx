import { useEffect, useState, useCallback } from 'react'
import AppRouter from './components/layout/AppRouter'
import { usePlayerStore, useSettingsStore, setApiBaseUrl } from '@shared'
import { useAuthStore } from '@/store/authStore'
import Layout from './components/layout/Layout'
import { KeepAliveRoutes } from './components/layout/KeepAlive'
import StartupModals from './components/common/StartupModals'
import { restoreSession } from '@/services/sessionManager'
import { useTrayEvents } from '@/hooks/useTrayEvents'
import { useSystemDark } from '@/hooks/useSystemDark'
import { useDesktopPreferences } from '@/store/desktopPreferences'
import { startPlayerBridge } from '@/services/playerBridge'
import SplashScreen from './components/common/SplashScreen'

function App() {
  const theme = useSettingsStore((s) => s.theme)
  const systemDark = useSystemDark()
  const apiBaseUrl = useSettingsStore((s) => s.apiBaseUrl)
  const checkLoginStatus = useAuthStore((s) => s.checkLoginStatus)

  // ★ 启动动画
  const [showSplash, setShowSplash] = useState(() => useDesktopPreferences.getState().showSplash)
  const handleSplashFinish = useCallback(() => setShowSplash(false), [])

  // ★ 托盘菜单事件监听（播放/暂停、上/下一首）
  useTrayEvents()

  // ★ 向托盘面板 / 桌面歌词副窗口广播播放状态，并接收它们回发的命令
  useEffect(() => { startPlayerBridge() }, [])

  useEffect(() => {
    if (apiBaseUrl) setApiBaseUrl(apiBaseUrl)
  }, [apiBaseUrl])

  useEffect(() => {
    checkLoginStatus()
  }, [checkLoginStatus])

  useEffect(() => {
    const blockNativeContextMenu = (e: MouseEvent) => {
      e.preventDefault()
    }
    document.addEventListener('contextmenu', blockNativeContextMenu)
    return () => document.removeEventListener('contextmenu', blockNativeContextMenu)
  }, [])

  // ★ 启动时恢复上次播放会话（在 splash 期间后台执行）
  useEffect(() => {
    const timer = setTimeout(() => {
      const { isPlay, isLoading } = usePlayerStore.getState()
      if (!isPlay && !isLoading) void restoreSession(useDesktopPreferences.getState().resumePlayback)
    }, 300)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    const dogSkin = theme === 'dog-light' || theme === 'dog-dark'
    const darkTheme = theme === 'dark' || theme === 'dog-dark' ||
      (theme === 'system' && systemDark)
    root.classList.toggle('dark', darkTheme)
    root.classList.toggle('dog-theme', dogSkin)
    root.dataset.theme = theme
  }, [theme, systemDark])

  return (
    <AppRouter>
      {/* Splash 覆盖层 — 后台正常初始化 stores / restore / API */}
      {showSplash && <SplashScreen onFinish={handleSplashFinish} />}

      <StartupModals />
      <Layout>
        <KeepAliveRoutes />
      </Layout>
    </AppRouter>
  )
}

export default App
