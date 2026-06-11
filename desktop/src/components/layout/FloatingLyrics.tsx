import { useState, useEffect, useRef } from 'react'
import { usePlayerStore } from '@shared'
import { X, Pin } from 'lucide-react'

export default function FloatingLyrics() {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState(() => ({ x: window.innerWidth / 2 - 300, y: window.innerHeight - 120 }))
  const [dragging, setDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const { playMusic, currentProgress } = usePlayerStore()
  const activeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'd' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setShow((prev) => !prev)
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

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true)
    setDragOffset({ x: e.clientX - pos.x, y: e.clientY - pos.y })
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging) return
      setPos({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y })
    }
    const handleMouseUp = () => setDragging(false)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragging, dragOffset])

  if (!show) return null

  return (
    <div
      className="fixed z-[90] w-[600px] bg-black/40 backdrop-blur-sm rounded-xl overflow-hidden select-none"
      style={{ left: pos.x, top: pos.y }}
    >
      <div
        className="flex items-center justify-between px-3 h-8 cursor-move"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-1.5">
          <Pin className="w-3 h-3 text-white/60" />
          <span className="text-[10px] text-white/60">桌面歌词</span>
        </div>
        <button onClick={() => setShow(false)} className="p-1 text-white/60 hover:text-white">
          <X className="w-3 h-3" />
        </button>
      </div>
      <div className="h-[60px] overflow-hidden px-4 pb-3 text-center">
        {lyric?.lrcArray?.length ? (
          <div className="space-y-1">
            {lyric.lrcArray.map((line, idx) => (
              <div
                key={idx}
                ref={idx === activeIndex ? activeRef : undefined}
                className={`transition-all duration-300 ${
                  idx === activeIndex
                    ? 'text-white font-medium text-lg'
                    : 'text-white/40 text-sm'
                }`}
              >
                {line.text}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-white/40 text-sm py-2">暂无歌词</p>
        )}
      </div>
    </div>
  )
}
