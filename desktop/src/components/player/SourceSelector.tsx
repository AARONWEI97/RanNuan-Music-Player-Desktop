import { useState, useRef, useEffect, useCallback } from 'react'
import { AVAILABLE_SOURCES, usePlayerStore } from '@shared'
import { reparseWithSource } from '@/services/audioService'
import { RefreshCw, ChevronDown, Antenna, Music, Disc3, Cloud, Globe, Loader } from 'lucide-react'

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
  const ref = useRef<HTMLDivElement>(null)
  const isLoading = usePlayerStore(s => s.isLoading)

  // click outside to close
  useEffect(() => {
    if (!show) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShow(false)
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [show])

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
        title="切换音源"
      >
        <RefreshCw className={`w-4 h-4 ${isLoading || reparsing ? 'animate-spin text-[#e60026]' : ''}`} />
        <ChevronDown className={`w-2.5 h-2.5 ml-0.5 transition-transform ${show ? 'rotate-180' : ''}`} />
      </button>

      {show && (
        <div className="absolute bottom-full right-0 mb-2 w-52 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-white/[0.08] overflow-hidden z-[9999] animate-fade-in">
          <div className="px-3 py-2 border-b border-gray-100 dark:border-white/[0.04]">
            <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">选择音源</span>
          </div>
          <div className="py-1 max-h-64 overflow-y-auto">
            {AVAILABLE_SOURCES.map(s => {
              const IconComp = ICON_MAP[s.icon] || Music
              const isActive = reparsing === s.key
              return (
                <button
                  key={s.key}
                  onClick={() => handleSelect(s.key)}
                  disabled={isActive}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors disabled:opacity-60"
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${s.color}18`, color: s.color }}
                  >
                    {isActive ? (
                      <Loader className="w-3.5 h-3.5 animate-spin" style={{ color: s.color }} />
                    ) : (
                      <IconComp className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <span className="flex-1 text-left truncate">{s.label}</span>
                  {isActive && (
                    <span className="text-[10px] text-gray-400">解析中</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
