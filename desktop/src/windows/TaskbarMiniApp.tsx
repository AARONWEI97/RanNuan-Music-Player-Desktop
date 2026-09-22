import { useEffect, useId, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode, type WheelEvent } from 'react'
import { Heart, Loader2, Pause, Play, SkipBack, SkipForward, X } from 'lucide-react'
import { useSettingsStore } from '@shared'
import { sendTaskbarCommand, toggleMainWindow, usePlayerSnapshot } from '@/services/panelClient'

interface Chrome {
  light: boolean
  edge: string
}

const FONT = '"Segoe UI Variable Text", "Segoe UI Variable", "Segoe UI", system-ui, sans-serif'

function wavePath(phase = 0) {
  const points: string[] = []
  for (let x = 0; x <= 100; x += 4) {
    const y = 8 + Math.sin((x / 100) * Math.PI * 3.4 + phase) * 2.2
    points.push(`${x},${y.toFixed(2)}`)
  }
  return `M 0,8 ${points.slice(1).map((point) => `L ${point}`).join(' ')}`
}

function formatTime(ms: number) {
  if (!ms || ms < 0 || !isFinite(ms)) return '0:00'
  const total = Math.floor(ms / 1000)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

/**
 * 嵌在系统任务栏里的迷你播放条。
 * 没有自己的音频，只渲染主窗口广播的快照，控制命令经 Rust 转回主窗口。
 */
export default function TaskbarMiniApp() {
  const s = usePlayerSnapshot()
  const theme = useSettingsStore((state) => state.theme)
  const [chrome, setChrome] = useState<Chrome | null>(null)
  const [coverFailed, setCoverFailed] = useState(false)
  const [hot, setHot] = useState(false)
  const [seeking, setSeeking] = useState(false)
  const [playOverride, setPlayOverride] = useState<boolean | null>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const lastToggle = useRef(0)
  const playOverrideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const waveInstanceId = useId()
  const waveClipId = `taskbar-wave-clip-${waveInstanceId.replace(/:/g, '')}`

  useEffect(() => { setCoverFailed(false) }, [s.song?.picUrl])

  useEffect(() => {
    if (playOverride !== null && s.isPlay === playOverride) {
      if (playOverrideTimer.current) clearTimeout(playOverrideTimer.current)
      playOverrideTimer.current = null
      setPlayOverride(null)
    }
  }, [s.isPlay, playOverride])

  useEffect(() => () => {
    if (playOverrideTimer.current) clearTimeout(playOverrideTimer.current)
  }, [])

  useEffect(() => {
    const block = (e: MouseEvent) => e.preventDefault()
    document.addEventListener('contextmenu', block)
    return () => document.removeEventListener('contextmenu', block)
  }, [])

  useEffect(() => {
    let unlisten: (() => void) | undefined
    let disposed = false

    import('@tauri-apps/api/core').then(({ invoke }) => {
      invoke<Chrome>('taskbar_mini_chrome')
        .then((next) => { if (!disposed && next) setChrome(next) })
        .catch(() => {})
    })
    import('@tauri-apps/api/event').then(({ listen }) => {
      listen<Chrome>('taskbar-mini:chrome', (event) => {
        if (event.payload) setChrome(event.payload)
      }).then((fn) => {
        if (disposed) fn()
        else unlisten = fn
      })
    })

    return () => {
      disposed = true
      unlisten?.()
    }
  }, [])

  const toggleMain = () => {
    const now = Date.now()
    // 双击会连切两次，等于没点。短时间只认第一次。
    if (now - lastToggle.current < 320) return
    lastToggle.current = now
    toggleMainWindow()
  }

  const seekFromClientX = (clientX: number) => {
    const el = barRef.current
    if (!el || s.duration <= 0) return
    const rect = el.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    sendTaskbarCommand({ type: 'seek', ms: pct * s.duration }).catch(() => {})
  }

  const onProgressPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    setSeeking(true)
    e.currentTarget.setPointerCapture(e.pointerId)
    seekFromClientX(e.clientX)
  }

  const onProgressPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (seeking) seekFromClientX(e.clientX)
  }

  const onProgressPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    setSeeking(false)
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
  }

  const onWheel = (e: WheelEvent) => {
    const base = s.isMuted ? 0 : s.volume
    const next = Math.max(0, Math.min(1, base + (e.deltaY > 0 ? -0.05 : 0.05)))
    sendTaskbarCommand({ type: 'set-volume', volume: next }).catch(() => {})
  }

  if (!chrome) {
    return <div className="w-full h-full" />
  }

  const light = chrome.light
  const vertical = chrome.edge === 'left' || chrome.edge === 'right'
  const skinLight = theme === 'dog-light' || (theme !== 'dog-dark' && theme !== 'dark' && (theme !== 'system' || light))
  const isPlay = playOverride ?? s.isPlay
  const playing = isPlay && !s.isLoading
  const ink = skinLight ? '#5b4a43' : '#ffe8d7'
  const sub = skinLight ? 'rgba(146,125,112,0.72)' : 'rgba(198,166,150,0.74)'
  const plate = hot
    ? (skinLight ? 'rgba(255,243,230,0.96)' : 'rgba(59,44,37,0.96)')
    : (skinLight ? 'rgba(255,246,236,0.94)' : 'rgba(36,25,21,0.92)')
  const hoverBg = skinLight ? 'rgba(184,111,88,0.13)' : 'rgba(225,154,125,0.16)'
  const pct = s.duration > 0 ? Math.min(100, (s.currentProgress / s.duration) * 100) : 0
  const title = s.song?.name || '未在播放'
  const artist = s.song?.artist || '准备好下一首音乐'
  const coverSize = vertical ? 24 : 30
  // Match the main player's persisted dog-light/dog-dark accent palette.
  const accent = skinLight ? '#b86f58' : '#e19a7d'
  const accentStrong = skinLight ? '#965441' : '#f1b297'
  const atmosphereStyle = { '--taskbar-accent': accent } as CSSProperties

  const iconBtn = (label: string, onClick: () => void, icon: ReactNode, muted = false, primary = false) => (
    <button
      type="button"
      title={label}
      aria-label={label}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={`taskbar-icon-btn shrink-0 ${primary ? 'is-primary' : ''}`}
      style={{ color: muted ? sub : ink, '--taskbar-hover': hoverBg } as CSSProperties}
      onMouseEnter={(e) => { e.currentTarget.style.background = hoverBg }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
    >
      {icon}
    </button>
  )

  const cover = (
    <span
      className={`taskbar-cover shrink-0 ${playing ? 'is-playing' : ''}`}
      style={{ width: coverSize, height: coverSize, background: skinLight ? 'rgba(184,111,88,0.12)' : 'rgba(225,154,125,0.13)' }}
    >
      {s.song?.picUrl && !coverFailed ? (
        <img
          src={s.song.picUrl}
          alt=""
          draggable={false}
          className="w-full h-full object-cover"
          onError={() => setCoverFailed(true)}
        />
      ) : (
        <span className="w-full h-full flex items-center justify-center" style={{ color: sub }}>
          <Play className="w-3 h-3" />
        </span>
      )}
    </span>
  )

  const transport = (
    <div className={`taskbar-transport flex items-center shrink-0 ${vertical ? 'flex-col gap-0.5' : ''}`} onPointerDown={(e) => e.stopPropagation()}>
      {!vertical && iconBtn('上一首', () => { sendTaskbarCommand({ type: 'prev' }).catch(() => {}) }, <SkipBack className="w-3 h-3" strokeWidth={2} />)}
      {iconBtn(
        isPlay ? '暂停' : '播放',
        () => {
          const next = !isPlay
          setPlayOverride(next)
          if (playOverrideTimer.current) clearTimeout(playOverrideTimer.current)
          playOverrideTimer.current = setTimeout(() => setPlayOverride(null), 1200)
          sendTaskbarCommand({ type: 'toggle-play' }).catch(() => setPlayOverride(null))
        },
        s.isLoading
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} />
          : isPlay
            ? <Pause className="w-3.5 h-3.5" strokeWidth={2} />
            : <Play className="w-3.5 h-3.5" strokeWidth={2} />,
        false,
        true,
      )}
      {iconBtn('下一首', () => { sendTaskbarCommand({ type: 'next' }).catch(() => {}) }, <SkipForward className="w-3 h-3" strokeWidth={2} />)}
      {!vertical && iconBtn(
        s.isFav ? '取消收藏' : '收藏',
        () => { sendTaskbarCommand({ type: 'toggle-fav' }).catch(() => {}) },
        <Heart className="w-3 h-3" strokeWidth={2} style={{ color: s.isFav ? accentStrong : undefined, fill: s.isFav ? accentStrong : 'none' }} />,
      )}
      {iconBtn('从任务栏移除', () => {
        import('@tauri-apps/api/core').then(({ invoke }) => invoke('toggle_taskbar_mini')).catch(() => {})
      }, <X className="w-3 h-3" strokeWidth={2} />, true)}
    </div>
  )

  const quietRing = skinLight ? 'rgba(184,111,88,0.30)' : 'rgba(225,154,125,0.34)'
  const track = skinLight ? 'rgba(91,74,67,0.18)' : 'rgba(255,232,215,0.20)'

  return (
    <div
      className="w-full h-full select-none overflow-hidden outline-none"
      style={{ background: 'transparent', color: ink, fontFamily: FONT, padding: 2 }}
      onWheel={onWheel}
    >
      <div
        className={`taskbar-chip relative w-full h-full overflow-hidden cursor-pointer ${playing ? 'is-playing' : ''} ${vertical ? 'is-vertical' : ''}`}
        title="显示或隐藏主窗口"
        style={{
          background: plate,
          border: `1px solid ${playing ? (skinLight ? 'rgba(184,111,88,0.62)' : 'rgba(225,154,125,0.65)') : quietRing}`,
          '--taskbar-track': track,
          ...atmosphereStyle,
        } as CSSProperties}
        onClick={toggleMain}
        onMouseEnter={() => setHot(true)}
        onMouseLeave={() => setHot(false)}
      >
        <div className="taskbar-atmosphere" aria-hidden="true" />
        {vertical ? (
          <div className="h-full w-full flex flex-col items-center justify-center gap-1 px-0.5 pb-2">
            {cover}
            <div className="taskbar-mini-bars" aria-hidden="true">{[0, 1, 2, 3, 4].map((i) => <i key={i} style={{ animationDelay: `${i * 90}ms` }} />)}</div>
            {transport}
          </div>
        ) : (
          <div className="h-full w-full flex items-center gap-1.5 pl-1.5 pr-1 pb-2.5">
            {cover}
            <div className="min-w-0 flex-1 text-left leading-none self-center">
              <div className="taskbar-title text-[12px] font-semibold truncate">{title}</div>
              <div className="taskbar-artist text-[10px] truncate mt-1" style={{ color: sub }}>{artist}</div>
            </div>
            <div className="taskbar-time shrink-0" style={{ color: sub }}>{formatTime(s.currentProgress)}</div>
            {transport}
          </div>
        )}

        <div
          ref={barRef}
          className={`taskbar-wave absolute left-2 right-2 bottom-0 ${seeking ? 'is-seeking' : ''}`}
          onPointerDown={onProgressPointerDown}
          onPointerMove={onProgressPointerMove}
          onPointerUp={onProgressPointerUp}
          onPointerCancel={() => setSeeking(false)}
          onClick={(e) => e.stopPropagation()}
          title="跳转进度"
        >
          <svg viewBox="0 0 100 16" preserveAspectRatio="none" aria-hidden="true">
            <path d={wavePath()} className="taskbar-wave-track" style={{ stroke: track }} />
            <g clipPath={`url(#${waveClipId})`}>
              <path d={wavePath()} className="taskbar-wave-fill" />
              {playing && <path d={wavePath(Math.PI)} className="taskbar-wave-glint" />}
            </g>
            <clipPath id={waveClipId}><rect x="0" y="0" width={pct} height="16" /></clipPath>
            <circle cx={pct} cy="8" r={seeking ? 3 : 2.2} className="taskbar-wave-dot" />
          </svg>
          <span className="taskbar-wave-caption" style={{ color: sub }}>{formatTime(s.duration)}</span>
        </div>
      </div>
    </div>
  )
}
