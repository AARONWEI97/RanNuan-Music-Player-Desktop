import { useCallback, useEffect, useRef, useState } from 'react'
import { LogicalSize } from '@tauri-apps/api/dpi'
import { getCurrentWindow } from '@tauri-apps/api/window'
import {
  closeLyricsWindow,
  getLyricsWindowLocked,
  invokeMain,
  sendLyricsPlayerCommand,
  setLyricsWindowHovering,
  setLyricsWindowLocked,
  usePlayerSnapshot,
} from '@/services/panelClient'

/**
 * 独立桌面歌词窗口（默认 700×200 逻辑像素，置顶透明）。
 *
 * 布局：三行歌词（上句 / 当前句 / 下句）+ 歌曲信息。鼠标悬停时展示
 * 控制条，支持播放控制、置顶、显示主窗口、关闭和手动调整窗口大小。
 */
const MIN_WIDTH = 460
const MIN_HEIGHT = 150
const MAX_WIDTH = 1280
const MAX_HEIGHT = 520
const SIZE_STORAGE_KEY = 'rannuan:lyrics-window-size'

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function IconButton({
  label,
  active = false,
  danger = false,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  danger?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      className="lyric-window-button"
      data-active={active || undefined}
      data-danger={danger || undefined}
    >
      {children}
    </button>
  )
}

function SketchIcon({ type }: { type: 'prev' | 'play' | 'pause' | 'next' | 'lock' | 'unlock' | 'app' | 'close' | 'resize' }) {
  return <span className={`sketch-icon sketch-icon-${type}`} aria-hidden />
}

export default function LyricsWindowApp() {
  const s = usePlayerSnapshot()
  const [isLocked, setIsLocked] = useState(true)
  const [acceptingMouse, setAcceptingMouse] = useState(false)
  const resizeState = useRef<{
    pointerId: number
    screenX: number
    screenY: number
    width: number
    height: number
  } | null>(null)

  useEffect(() => {
    getLyricsWindowLocked().then((locked) => {
      setIsLocked(locked)
      setAcceptingMouse(!locked)
    }).catch(() => {})

    let unlistenLock: (() => void) | undefined
    let unlistenMouse: (() => void) | undefined
    import('@tauri-apps/api/event').then(({ listen }) => {
      listen<boolean>('lyrics:lock-state', (event) => {
        setIsLocked(event.payload)
        setAcceptingMouse(!event.payload)
      }).then((fn) => { unlistenLock = fn }).catch(() => {})
      listen<boolean>('lyrics:mouse-passthrough', (event) => {
        setAcceptingMouse(!event.payload)
      }).then((fn) => { unlistenMouse = fn }).catch(() => {})
    })
    return () => {
      unlistenLock?.()
      unlistenMouse?.()
    }
  }, [])

  useEffect(() => {
    const saved = (() => {
      try {
        const value = JSON.parse(localStorage.getItem(SIZE_STORAGE_KEY) ?? '{}')
        if (typeof value.width !== 'number' || typeof value.height !== 'number') return null
        return {
          width: clamp(value.width, MIN_WIDTH, MAX_WIDTH),
          height: clamp(value.height, MIN_HEIGHT, MAX_HEIGHT),
        }
      } catch {
        return null
      }
    })()

    const win = getCurrentWindow()
    if (saved) {
      win.setSize(new LogicalSize(saved.width, saved.height)).catch(() => {})
    }

    let unlisten: (() => void) | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    win.onResized(() => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        localStorage.setItem(SIZE_STORAGE_KEY, JSON.stringify({
          width: window.innerWidth,
          height: window.innerHeight,
        }))
      }, 180)
    }).then((fn) => { unlisten = fn }).catch(() => {})

    return () => {
      unlisten?.()
      if (timer) clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeLyricsWindow()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const toggleLocked = useCallback(() => {
    const nextLocked = !isLocked
    setLyricsWindowLocked(nextLocked)
      .then(setIsLocked)
      .catch((error) => console.error('[lyrics] 切换锁定失败:', error))
  }, [isLocked])

  const releaseLockedHover = useCallback(() => {
    if (!isLocked) return
    setLyricsWindowHovering(false).catch(() => {})
  }, [isLocked])

  const runPlayerCommand = useCallback((type: 'toggle-play' | 'next' | 'prev') => {
    sendLyricsPlayerCommand({ type })
      .catch((error) => console.error('[lyrics] 播放控制失败:', type, error))
  }, [])

  const startDragging = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (isLocked || event.button !== 0) return
    getCurrentWindow().startDragging().catch((error) => {
      console.error('[lyrics] 拖动窗口失败:', error)
    })
  }, [isLocked])

  const startResizing = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (isLocked) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    resizeState.current = {
      pointerId: event.pointerId,
      screenX: event.screenX,
      screenY: event.screenY,
      width: window.innerWidth,
      height: window.innerHeight,
    }
  }, [isLocked])

  const resizeWindow = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    const start = resizeState.current
    if (!start || start.pointerId !== event.pointerId) return

    const width = clamp(start.width + event.screenX - start.screenX, MIN_WIDTH, MAX_WIDTH)
    const height = clamp(start.height + event.screenY - start.screenY, MIN_HEIGHT, MAX_HEIGHT)
    getCurrentWindow().setSize(new LogicalSize(width, height)).catch((error) => {
      console.error('[lyrics] 调整窗口大小失败:', error)
    })
  }, [])

  const finishResizing = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (resizeState.current?.pointerId !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    resizeState.current = null
  }, [])

  const lyricIndex = s.lyric && s.lyric.lines.length > 0
    ? Math.max(0, s.lyric.index)
    : -1
  const prev    = lyricIndex > 0                         ? s.lyric?.lines[lyricIndex - 1] : null
  const current = lyricIndex >= 0                        ? s.lyric?.lines[lyricIndex]     : null
  const next    = lyricIndex >= 0                        ? s.lyric?.lines[lyricIndex + 1] : null

  const hasSong = !!s.song

  return (
    <div className="w-screen h-screen bg-transparent select-none flex items-center justify-center">
      <div
        className={`lyric-window group relative w-full h-full rounded-2xl flex flex-col items-center justify-center overflow-hidden${acceptingMouse ? ' lyric-window-controls-visible' : ''}`}
        data-locked={isLocked || undefined}
        onPointerDown={startDragging}
        onPointerLeave={releaseLockedHover}
        style={{
          background: 'linear-gradient(135deg, rgba(10,10,10,0.82) 0%, rgba(30,10,20,0.78) 100%)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3)',
          backdropFilter: 'blur(2px)',
        }}
      >
        {/* 顶部悬停控制条；空白区域可拖动窗口。 */}
        <div
          className="lyric-window-toolbar absolute top-2 left-2 z-30 flex items-center gap-1"
          onPointerDown={startDragging}
        >
          <div className="lyric-window-drag-hint" aria-hidden />
          <IconButton label="上一首" onClick={() => runPlayerCommand('prev')}>
            <SketchIcon type="prev" />
          </IconButton>
          <IconButton label={s.isPlay ? '暂停' : '播放'} onClick={() => runPlayerCommand('toggle-play')}>
            <SketchIcon type={s.isPlay ? 'pause' : 'play'} />
          </IconButton>
          <IconButton label="下一首" onClick={() => runPlayerCommand('next')}>
            <SketchIcon type="next" />
          </IconButton>
          <span className="lyric-window-divider" aria-hidden />
          <IconButton label={isLocked ? '解锁桌面歌词' : '锁定桌面歌词'} active={isLocked} onClick={toggleLocked}>
            <SketchIcon type={isLocked ? 'lock' : 'unlock'} />
          </IconButton>
          <IconButton label="显示主窗口" onClick={() => invokeMain('show_main_window')}>
            <SketchIcon type="app" />
          </IconButton>
          <IconButton label="关闭桌面歌词" danger onClick={closeLyricsWindow}>
            <SketchIcon type="close" />
          </IconButton>
        </div>

        {/* 封面模糊铺底 */}
        {s.song?.picUrl && (
          <img
            key={s.song.picUrl}
            src={s.song.picUrl}
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover opacity-[0.18]"
            style={{ filter: 'blur(28px) saturate(1.6)', transform: 'scale(1.4)' }}
          />
        )}

        {/* ── 三行歌词区 ── */}
        <div className="relative z-10 w-full flex flex-col items-center gap-[5px] px-14 pt-7">

          {/* 上一句 */}
          <div className="h-[22px] flex items-center">
            {prev?.text ? (
              <p
                key={`prev-${lyricIndex}`}
                className="text-[13px] text-white/38 truncate max-w-full animate-lyric-in"
                style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
              >
                {prev.text}
              </p>
            ) : null}
          </div>

          {/* 当前句 */}
          <div className="flex flex-col items-center min-h-[44px] justify-center">
            {current ? (
              <div key={`cur-${lyricIndex}`} className="animate-lyric-in text-center max-w-full">
                <p
                  className="text-[26px] font-bold leading-tight truncate"
                  style={{
                    background: 'linear-gradient(180deg, #fff 20%, #ffd6e7 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 2px 8px rgba(230,0,38,0.5))',
                  }}
                >
                  {current.text}
                </p>
                {current.sub && (
                  <p className="text-[13px] text-white/70 mt-0.5 truncate"
                     style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
                    {current.sub}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[16px] text-white/55" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
                {hasSong ? `♪ ${s.song!.name} — 暂无歌词` : '♪ RanNuan Music'}
              </p>
            )}
          </div>

          {/* 下一句 */}
          <div className="h-[22px] flex items-center">
            {next?.text ? (
              <p
                key={`next-${lyricIndex}`}
                className="text-[13px] text-white/38 truncate max-w-full"
                style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
              >
                {next.text}
              </p>
            ) : null}
          </div>
        </div>

        {/* ── 左下角：mini 歌曲信息 ── */}
        {hasSong && (
          <div className="absolute bottom-3 left-4 flex items-center gap-2 z-10">
            {s.song!.picUrl && (
              <div className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0 shadow-md">
                <img src={s.song!.picUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-white/75 truncate max-w-[160px]"
                 style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
                {s.song!.name}
              </p>
              <p className="text-[9px] text-white/45 truncate max-w-[160px]">
                {s.song!.artist}
              </p>
            </div>
          </div>
        )}

        {/* ── 右下角：播放状态指示点 ── */}
        <div className="absolute bottom-4 right-4 flex items-center gap-1 z-10">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="block rounded-full"
              style={{
                width: 3, height: s.isPlay ? [10, 16, 8][i] : 4,
                background: s.isPlay ? 'rgba(255,100,140,0.8)' : 'rgba(255,255,255,0.2)',
                transition: 'height 0.3s ease',
              }}
            />
          ))}
        </div>

        <button
          type="button"
          title="拖动调整窗口大小"
          aria-label="拖动调整窗口大小"
          className="lyric-window-resize-handle absolute bottom-2 right-2 z-30"
          onPointerDown={startResizing}
          onPointerMove={resizeWindow}
          onPointerUp={finishResizing}
          onPointerCancel={finishResizing}
        >
          <SketchIcon type="resize" />
        </button>
      </div>
    </div>
  )
}
