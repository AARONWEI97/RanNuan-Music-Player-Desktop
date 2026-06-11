import { useState, useCallback } from 'react'
import { Minus, Square, X, Maximize2 } from 'lucide-react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import pkg from '../../../package.json'

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)
  const appWindow = getCurrentWindow()

  const handleMinimize = useCallback(() => {
    appWindow.minimize()
  }, [appWindow])

  const handleToggleMaximize = useCallback(async () => {
    const maximized = await appWindow.isMaximized()
    if (maximized) {
      await appWindow.unmaximize()
      setIsMaximized(false)
    } else {
      await appWindow.maximize()
      setIsMaximized(true)
    }
  }, [appWindow])

  // ★ 关闭 → 最小化到托盘（类似 QQ音乐/网易云行为）
  const handleClose = useCallback(() => {
    appWindow.hide()
  }, [appWindow])

  return (
    <div
      className="h-9 flex items-center justify-between bg-white dark:bg-neutral-950 border-b border-gray-200 dark:border-white/[0.06] select-none"
      data-tauri-drag-region
    >
      {/* ── Left: brand ── */}
      <div className="flex items-center gap-2 pl-3 select-none" data-tauri-drag-region>
        <img src="/logo.png" className="w-4.5 h-4.5 rounded-md object-cover flex-shrink-0" alt="" data-tauri-drag-region />
        <span className="text-[12px] font-semibold text-gray-700 dark:text-gray-300 tracking-tight" data-tauri-drag-region>
          RanNuan Music
        </span>
        <span className="text-[10px] text-gray-400 dark:text-gray-600 bg-gray-100 dark:bg-white/[0.04] px-1.5 py-px rounded-md font-mono" data-tauri-drag-region>
          v{pkg.version || '1.0.0'}
        </span>
      </div>

      {/* ── Right: window controls ── */}
      <div className="flex items-center h-full ml-auto" data-tauri-drag-region="false">
        <button
          onClick={handleMinimize}
          className="h-full w-11 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
          data-tauri-drag-region="false"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleToggleMaximize}
          className="h-full w-11 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
          data-tauri-drag-region="false"
        >
          {isMaximized ? <Maximize2 className="w-3 h-3" /> : <Square className="w-3 h-3" />}
        </button>
        <button
          onClick={handleClose}
          title="最小化到托盘"
          className="h-full w-11 flex items-center justify-center text-gray-400 hover:bg-red-500 hover:text-white transition-colors"
          data-tauri-drag-region="false"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
