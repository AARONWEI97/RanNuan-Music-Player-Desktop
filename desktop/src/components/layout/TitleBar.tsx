import { useState, useCallback } from 'react'
import { Minus, Square, X, Maximize2, Bone, PawPrint, Heart } from 'lucide-react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useSettingsStore } from '@shared'
import pkg from '../../../package.json'

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)
  const appWindow = getCurrentWindow()
  const theme = useSettingsStore((s) => s.theme)
  const isDogTheme = theme === 'dog-light' || theme === 'dog-dark'

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
      className="dog-titlebar relative h-9 flex items-center justify-between bg-white dark:bg-neutral-950 border-b border-gray-200 dark:border-white/[0.06] select-none"
      data-tauri-drag-region
    >
      {/* ── Left: brand ── */}
      <div className="flex items-center gap-2 pl-3 select-none min-w-0" data-tauri-drag-region>
        <img src="/logo.png" className="w-4.5 h-4.5 rounded-md object-cover flex-shrink-0" alt="" data-tauri-drag-region />
        <span className="text-[12px] font-semibold text-gray-700 dark:text-gray-300 tracking-tight" data-tauri-drag-region>
          RanNuan Music
        </span>
        <span
          className={`dog-version-chip text-[10px] px-1.5 py-px font-mono ${
            isDogTheme
              ? ''
              : 'text-gray-400 dark:text-gray-600 bg-gray-100 dark:bg-white/[0.04] rounded-md'
          }`}
          data-tauri-drag-region
        >
          v{pkg.version || '1.0.0'}
        </span>
        {isDogTheme && (
          <span className="dog-title-chip" data-tauri-drag-region>
            <PawPrint className="w-3 h-3" />
            汪汪电台
          </span>
        )}
      </div>

      {/* ── Center: skin stickers (dog theme only) ── */}
      {isDogTheme && (
        <div className="dog-title-stickers pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2.5" data-tauri-drag-region>
          <span className="dog-sticker dog-sticker-paw" style={{ ['--r' as string]: '-12deg' }}>
            <PawPrint className="w-3.5 h-3.5" />
          </span>
          <span className="dog-sticker dog-sticker-logo">
            <img src="/logo.png" alt="" />
          </span>
          <span className="dog-sticker dog-sticker-bone" style={{ ['--r' as string]: '8deg' }}>
            <Bone className="w-3.5 h-3.5" />
          </span>
          <span className="dog-sticker dog-sticker-heart" style={{ ['--r' as string]: '-6deg' }}>
            <Heart className="w-3 h-3 fill-current" />
          </span>
          <span className="dog-sticker dog-sticker-paw dog-sticker-soft" style={{ ['--r' as string]: '14deg' }}>
            <PawPrint className="w-3 h-3" />
          </span>
        </div>
      )}

      {/* ── Right: window controls ── */}
      <div className="dog-win-controls flex items-center h-full ml-auto relative z-[1]" data-tauri-drag-region="false">
        <button
          onClick={handleMinimize}
          className="dog-win-btn h-full w-11 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
          data-tauri-drag-region="false"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleToggleMaximize}
          className="dog-win-btn h-full w-11 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
          data-tauri-drag-region="false"
        >
          {isMaximized ? <Maximize2 className="w-3 h-3" /> : <Square className="w-3 h-3" />}
        </button>
        <button
          onClick={handleClose}
          title="最小化到托盘"
          className="dog-win-btn dog-win-close h-full w-11 flex items-center justify-center text-gray-400 hover:bg-red-500 hover:text-white transition-colors"
          data-tauri-drag-region="false"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
