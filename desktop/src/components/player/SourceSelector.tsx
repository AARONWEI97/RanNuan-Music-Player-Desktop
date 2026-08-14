import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { AVAILABLE_SOURCES, usePlayerStore } from '@shared'
import { reparseWithSource } from '@/services/audioService'
import { RefreshCw, ChevronDown, Antenna, Music, Disc3, Cloud, Globe, Loader, Check } from 'lucide-react'

// map AVAILABLE_SOURCES icon names to lucide components
const ICON_MAP: Record<string, typeof Antenna> = {
  radio: Antenna,
  'music-circle': Disc3,
  'music-note': Music,
  cloud: Cloud,
  google: Globe,
}

interface SourceSelectorProps {
  className?: string
}

export default function SourceSelector({ className }: SourceSelectorProps) {
  const [show, setShow] = useState(false)
  const [reparsing, setReparsing] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const ref = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const isLoading = usePlayerStore(s => s.isLoading)
  // 优先读独立字段 activeSource；兼容旧会话里挂在歌曲上的 musicSource
  const currentSource = usePlayerStore(s => s.activeSource || s.playMusic?.musicSource || null)
  const currentLabel = AVAILABLE_SOURCES.find(s => s.key === currentSource)?.label

  const updateMenuPosition = useCallback(() => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const width = 208
    const left = Math.max(8, Math.min(window.innerWidth - width - 8, rect.right - width))
    const top = Math.max(8, rect.top - 8)
    setMenuPos({ top, left })
  }, [])

  // click outside to close
  useEffect(() => {
    if (!show) return
    updateMenuPosition()
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (ref.current?.contains(target) || menuRef.current?.contains(target)) return
      setShow(false)
    }
    const handleReposition = () => updateMenuPosition()
    window.addEventListener('mousedown', handler)
    window.addEventListener('resize', handleReposition)
    window.addEventListener('scroll', handleReposition, true)
    return () => {
      window.removeEventListener('mousedown', handler)
      window.removeEventListener('resize', handleReposition)
      window.removeEventListener('scroll', handleReposition, true)
    }
  }, [show, updateMenuPosition])

  const handleSelect = useCallback(async (source: string) => {
    setShow(false)
    setReparsing(source)
    await reparseWithSource(source)
    setReparsing(null)
  }, [])

  return (
    <div ref={ref} className={`relative ${className || ''}`}>
      <button
        onClick={() => setShow(!show)}
        className="flex items-center gap-1 p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06]"
        title={currentLabel ? `当前音源：${currentLabel}` : '切换音源'}
      >
        <RefreshCw className={`w-4 h-4 ${isLoading || reparsing ? 'animate-spin text-[#e60026]' : ''}`} />
        <ChevronDown className={`w-2.5 h-2.5 ml-0.5 transition-transform ${show ? 'rotate-180' : ''}`} />
      </button>

      {show && createPortal(
        <div
          ref={menuRef}
          className="fixed w-52 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-white/[0.08] overflow-hidden z-[9999] animate-fade-in"
          style={{ left: menuPos.left, top: menuPos.top, transform: 'translateY(-100%)' }}
        >
          <div className="px-3 py-2 border-b border-gray-100 dark:border-white/[0.04]">
            <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
              选择音源
            </span>
            {currentLabel ? (
              <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400 truncate">
                当前：{currentLabel}
              </p>
            ) : (
              <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500 truncate">
                尚未记录音源，播放后自动识别
              </p>
            )}
          </div>
          <div className="py-1 max-h-64 overflow-y-auto">
            {AVAILABLE_SOURCES.map(s => {
              const IconComp = ICON_MAP[s.icon] || Music
              const isParsing = reparsing === s.key
              const isCurrent = currentSource === s.key
              return (
                <button
                  key={s.key}
                  onClick={() => handleSelect(s.key)}
                  disabled={isParsing}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors disabled:opacity-60 ${
                    isCurrent
                      ? 'bg-[#e60026]/[0.06] text-[#e60026] dark:bg-[#e60026]/[0.12] dark:text-[#ff6b81]'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/[0.04]'
                  }`}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${s.color}18`, color: s.color }}
                  >
                    {isParsing ? (
                      <Loader className="w-3.5 h-3.5 animate-spin" style={{ color: s.color }} />
                    ) : (
                      <IconComp className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <span className="flex-1 text-left truncate">{s.label}</span>
                  {isParsing ? (
                    <span className="text-[10px] text-gray-400">解析中</span>
                  ) : isCurrent ? (
                    <Check className="w-4 h-4 flex-shrink-0 text-[#e60026]" strokeWidth={2.5} />
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
