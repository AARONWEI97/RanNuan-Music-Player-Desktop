import { useState, useEffect, useRef } from 'react'
import { getSearch } from '@shared'
import type { SongResult } from '@shared'
import { playSong } from '@/services/audioService'
import { Search, X } from 'lucide-react'
import SongRow from '@/components/common/SongRow'
import { readSearchShortcut, useDesktopPreferences } from '@/store/desktopPreferences'

export default function GlobalSearch() {
  const [show, setShow] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<SongResult[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return
      if (e.key === 'Escape' && show) {
        setShow(false)
        return
      }
      const shortcut = readSearchShortcut(e)
      const { openSearchShortcut, toggleSearchShortcut } = useDesktopPreferences.getState()
      if (shortcut === toggleSearchShortcut) {
        e.preventDefault()
        if (!e.repeat) setShow(prev => !prev)
        return
      }
      if (shortcut === openSearchShortcut) {
        e.preventDefault()
        setShow(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [show])

  useEffect(() => {
    if (show) {
      inputRef.current?.focus()
    }
  }, [show])

  const handleSearch = async () => {
    if (!keyword.trim()) return
    const res = await getSearch({ keywords: keyword, type: 1, limit: 20 })
    setResults(res?.data?.result?.songs || [])
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-start justify-center pt-[15vh]" onClick={() => setShow(false)}>
      <div
        className="bg-white dark:bg-[#1a1a1a] rounded-xl w-[600px] max-h-[70vh] shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 h-14 border-b border-gray-200 dark:border-gray-800">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="搜索歌曲、歌手、专辑..."
            className="flex-1 bg-transparent outline-none text-sm"
          />
          <button onClick={() => setShow(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {results.length === 0 ? (
            <div className="text-center text-gray-400 py-8 text-sm">
              {keyword ? '未找到结果' : '输入关键词搜索'}
            </div>
          ) : (
            results.map((song, idx) => (
              <SongRow key={song.id} song={song} index={idx} onPlay={() => { playSong(song); setShow(false) }} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
