import { useEffect, useState, useCallback } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { useSettingsStore, setApiBaseUrl } from '@shared'
import { useAuthStore } from '@/store/authStore'
import Layout from './components/layout/Layout'
import { KeepAliveRoutes } from './components/layout/KeepAlive'
import StartupModals from './components/common/StartupModals'
import { restoreSession } from '@/services/sessionManager'
import { useTrayEvents } from '@/hooks/useTrayEvents'
import SplashScreen from './components/common/SplashScreen'

function App() {
  const theme = useSettingsStore((s) => s.theme)
  const apiBaseUrl = useSettingsStore((s) => s.apiBaseUrl)
  const checkLoginStatus = useAuthStore((s) => s.checkLoginStatus)

  // ★ 启动动画
  const [showSplash, setShowSplash] = useState(true)
  const handleSplashFinish = useCallback(() => setShowSplash(false), [])

  // ★ 托盘菜单事件监听（播放/暂停、上/下一首）
  useTrayEvents()

  useEffect(() => {
    if (apiBaseUrl) setApiBaseUrl(apiBaseUrl)
  }, [apiBaseUrl])

  useEffect(() => {
    checkLoginStatus()
  }, [checkLoginStatus])

  // ★ 启动时恢复上次播放会话（在 splash 期间后台执行）
  useEffect(() => {
    let retries = 0
    const maxRetries = 5
    const tryRestore = () => {
      restoreSession().then((ok) => {
        if (!ok && retries < maxRetries) {
          retries++
          setTimeout(tryRestore, 500)
        }
      })
    }
    const timer = setTimeout(tryRestore, 300)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  return (
    <BrowserRouter>
      {/* Splash 覆盖层 — 后台正常初始化 stores / restore / API */}
      {showSplash && <SplashScreen onFinish={handleSplashFinish} />}

      <StartupModals />
      <Layout>
        <KeepAliveRoutes />
      </Layout>
    </BrowserRouter>
  )
}

export default App
