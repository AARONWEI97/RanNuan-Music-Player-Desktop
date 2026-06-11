import { useState, useEffect, useRef } from 'react'
import { usePlayerStore } from '@shared'
import { X } from 'lucide-react'

export default function LyricsPanel() {
  const [showLyrics, setShowLyrics] = useState(false)
  const { playMusic, currentProgress } = usePlayerStore()
  const activeRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'l' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setShowLyrics((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const lyric = playMusic?.lyric
  let activeIndex = -1
  if (lyric?.lrcTimeArray?.length) {
    for (let i = 0; i < lyric.lrcTimeArray.length; i++) {
      if (currentProgress >= lyric.lrcTimeArray[i]) {
        activeIndex = i
      } else {
        break
      }
    }
  }

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [activeIndex])

  if (!showLyrics) return null

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setShowLyrics(false)}>
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl w-[500px] max-h-[80vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 h-12 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h3 className="font-medium text-sm">{playMusic?.name || '歌词'}</h3>
            <p className="text-[10px] text-gray-500">{playMusic?.ar?.map((a) => a.name).join(' / ')}</p>
          </div>
          <button onClick={() => setShowLyrics(false)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 text-center">
          {lyric?.lrcArray?.length ? (
            <div className="space-y-4">
              {lyric.lrcArray.map((line, idx) => (
                <p
                  key={idx}
                  ref={idx === activeIndex ? activeRef : undefined}
                  className={`text-sm transition-colors duration-300 ${
                    idx === activeIndex
                      ? 'text-[#e60026] font-medium text-base'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {line.text}
                </p>
              ))}
            </div>
          ) : (
            <div className="text-gray-400 py-12">
              <p>暂无歌词</p>
              <p className="text-xs mt-2">播放歌曲后将自动加载</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
