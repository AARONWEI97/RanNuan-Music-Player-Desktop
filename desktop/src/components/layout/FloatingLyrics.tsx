import { useEffect } from 'react'
import { isLyricsWindowOpen, setLyricsWindow } from '@/services/playerBridge'

/**
 * 桌面歌词的 `Ctrl+D` 触发器。
 *
 * 这个组件不再自己渲染浮层 —— 之前它是主窗口内的一个 fixed div，
 * 主窗口 hide() 到托盘后歌词会一起消失。现在歌词由独立的置顶透明系统窗口
 * （`windows/LyricsWindowApp.tsx`）承载，关到托盘后依然显示。
 *
 * 这里只保留快捷键，实际开关走 playerBridge → Rust 的
 * open_lyrics_window / close_lyrics_window。
 */
export default function FloatingLyrics() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'd' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setLyricsWindow(!isLyricsWindowOpen())
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return null
}
