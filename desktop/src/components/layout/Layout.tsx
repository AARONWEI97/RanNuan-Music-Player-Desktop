import type { ReactNode } from 'react'
import { useEffect, useState, useCallback, useRef } from 'react'
import { isTauri } from '@tauri-apps/api/core'
import { getCurrentWindow, LogicalSize, LogicalPosition } from '@tauri-apps/api/window'
import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts'
import { togglePlay } from '@/services/audioService'
import { useContextMenu } from '@/hooks/useContextMenu'
import Sidebar from './Sidebar'
import PlayerBar from './PlayerBar'
import TitleBar from './TitleBar'
import PlaylistDrawer from './PlaylistDrawer'
import LyricsPanel from './LyricsPanel'
import GlobalSearch from './GlobalSearch'
import MiniPlayer from './MiniPlayer'
import FloatingLyrics from './FloatingLyrics'
import ToastContainer from '@/components/common/Toast'
import ContextMenu from '@/components/common/ContextMenu'
import DownloadProgressToast from '@/components/common/DownloadProgressToast'

const MINI_WIDTH = 360
const MINI_HEIGHT = 72
const MINI_EXPANDED_HEIGHT = 400

interface SavedWindowState {
  width: number
  height: number
  x: number
  y: number
  isMaximized: boolean
}

export default function Layout({ children }: { children: ReactNode }) {
  useGlobalShortcuts()
  const { menu } = useContextMenu()
  const [isMiniPlayer, setIsMiniPlayer] = useState(false)
  const savedWindowState = useRef<SavedWindowState | null>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault()
        togglePlay()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // 进入迷你模式：缩小窗口
  const enterMiniMode = useCallback(async () => {
    if (!isTauri()) {
      setIsMiniPlayer(true)
      return
    }
    const appWindow = getCurrentWindow()
    try {
      // 保存当前窗口状态
      const isMaximized = await appWindow.isMaximized()
      let outerPos = await appWindow.outerPosition()
      let outerSize = await appWindow.outerSize()

      // 如果最大化，先取消最大化以获取真实位置
      if (isMaximized) {
        await appWindow.unmaximize()
        // 等待窗口状态更新
        await new Promise((r) => setTimeout(r, 50))
        outerPos = await appWindow.outerPosition()
        outerSize = await appWindow.outerSize()
      }

      savedWindowState.current = {
        width: outerSize.width,
        height: outerSize.height,
        x: outerPos.x,
        y: outerPos.y,
        isMaximized
      }

      // 取消最小尺寸限制
      await appWindow.setMinSize(new LogicalSize(1, 1))
      // 设置最大尺寸限制为迷你尺寸（防止用户拖拽调整大小）
      await appWindow.setMaxSize(new LogicalSize(MINI_WIDTH, MINI_HEIGHT))
      // 设置为不可调整大小
      await appWindow.setResizable(false)
      // 取消最大化（如果还是的话）
      if (await appWindow.isMaximized()) {
        await appWindow.unmaximize()
      }
      // 缩小窗口到迷你尺寸
      await appWindow.setSize(new LogicalSize(MINI_WIDTH, MINI_HEIGHT))
      // 置顶
      await appWindow.setAlwaysOnTop(true)

      setIsMiniPlayer(true)
    } catch (err) {
      console.error('进入迷你模式失败:', err)
      setIsMiniPlayer(true)
    }
  }, [])

  // 退出迷你模式：恢复窗口
  const exitMiniMode = useCallback(async () => {
    if (!isTauri()) {
      setIsMiniPlayer(false)
      return
    }
    const appWindow = getCurrentWindow()
    try {
      const saved = savedWindowState.current
      // 恢复可调整大小
      await appWindow.setResizable(true)
      // 取消最大尺寸限制
      await appWindow.setMaxSize(null)
      // 取消置顶
      await appWindow.setAlwaysOnTop(false)

      if (saved) {
        // 恢复最小尺寸
        await appWindow.setMinSize(new LogicalSize(900, 600))
        // 先设置位置再设置大小
        await appWindow.setPosition(new LogicalPosition(saved.x, saved.y))
        // 恢复窗口大小（限制不超过当前默认最大尺寸，防止旧缓存数据过大）
        const restoreWidth = Math.min(saved.width, 1100)
        const restoreHeight = Math.min(saved.height, 720)
        await appWindow.setSize(new LogicalSize(restoreWidth, restoreHeight))
        // 如果之前是最大化，恢复最大化
        if (saved.isMaximized) {
          await appWindow.maximize()
        }
      } else {
        // 没有保存的状态，使用默认值
        await appWindow.setMinSize(new LogicalSize(900, 600))
        await appWindow.setSize(new LogicalSize(1100, 720))
        await appWindow.center()
      }

      setIsMiniPlayer(false)
    } catch (err) {
      console.error('退出迷你模式失败:', err)
      setIsMiniPlayer(false)
    }
  }, [])

  // 迷你模式下播放列表展开/收起时调整窗口高度
  const handlePlaylistToggle = useCallback(async (open: boolean) => {
    if (!isTauri()) return
    const appWindow = getCurrentWindow()
    try {
      const height = open ? MINI_EXPANDED_HEIGHT : MINI_HEIGHT
      await appWindow.setMaxSize(new LogicalSize(MINI_WIDTH, height))
      await appWindow.setSize(new LogicalSize(MINI_WIDTH, height))
    } catch (err) {
      console.error('调整迷你窗口高度失败:', err)
    }
  }, [])

  if (isMiniPlayer) {
    return (
      <div className="w-full h-full bg-transparent overflow-hidden">
        <MiniPlayer onRestore={exitMiniMode} onPlaylistToggle={handlePlaylistToggle} />
        <LyricsPanel />
        <FloatingLyrics />
        <ContextMenu menu={menu} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6 pb-24">
          {children}
        </main>
      </div>
      <PlaylistDrawer />
      <LyricsPanel />
      <GlobalSearch />
      <PlayerBar onMiniMode={enterMiniMode} />
      <FloatingLyrics />
      <ToastContainer />
      <DownloadProgressToast />
      <ContextMenu menu={menu} />
    </div>
  )
}
