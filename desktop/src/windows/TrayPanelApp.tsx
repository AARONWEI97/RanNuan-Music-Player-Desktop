import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Play, Pause, SkipBack, SkipForward, Heart, Repeat, Repeat1, Shuffle,
  ListMusic, Mic2, AppWindow, X, Music,
} from 'lucide-react'
import { formatTime, hideSelf, invokeMain, resizeSelf, sendCmd, usePlayerSnapshot } from '@/services/panelClient'

/** 面板基础高度（队列收起）。与 lib.rs 的 PANEL_H_BASE 保持一致。 */
const PANEL_H_BASE = 380
/** 队列展开后的高度。与 lib.rs 的 PANEL_H_EXPANDED 保持一致。 */
const PANEL_H_EXPANDED = 500

const MODE_META = [
  { icon: Repeat, label: '列表循环' },
  { icon: Repeat1, label: '单曲循环' },
  { icon: Shuffle, label: '随机播放' },
] as const

/** 马卡龙流体 blob —— 配色与 SplashScreen 一致，构成品牌记忆点 */
const BLOBS = [
  { css: 'rgba(255,175,145,0.55)', size: 260, blur: 60, anim: 'blobFloat1 9s ease-in-out infinite', top: '-18%', left: '-12%' },
  { css: 'rgba(255,185,200,0.5)', size: 220, blur: 55, anim: 'blobFloat2 11s ease-in-out infinite', top: '30%', right: '-18%' },
  { css: 'rgba(195,175,255,0.42)', size: 200, blur: 50, anim: 'blobFloat3 13s ease-in-out infinite', bottom: '-14%', left: '18%' },
]

export default function TrayPanelApp() {
  const s = usePlayerSnapshot()
  const [showQueue, setShowQueue] = useState(false)
  const [dragMs, setDragMs] = useState<number | null>(null)
  // 封面 CDN 可能加载失败（离线 / 图床挂了），失败时退回占位图标而不是留一个破图
  const [coverFailed, setCoverFailed] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)

  // 换歌时重置封面失败标记
  useEffect(() => { setCoverFailed(false) }, [s.song?.picUrl])

  // 队列展开/收起时同步调整窗口高度 —— 收起时窗口就该是内容的高度，
  // 而不是留一块空白等着被填。与 MiniPlayer 的做法一致。
  useEffect(() => {
    const expanded = showQueue && s.queue.length > 0
    resizeSelf(expanded ? PANEL_H_EXPANDED : PANEL_H_BASE)
  }, [showQueue, s.queue.length])

  // Esc 关闭面板
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') hideSelf() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // 队列空了自动收起展开区
  useEffect(() => { if (s.queue.length === 0) setShowQueue(false) }, [s.queue.length])

  // ── 进度条拖拽 ──
  const msFromEvent = useCallback((clientX: number) => {
    const el = barRef.current
    if (!el || s.duration <= 0) return 0
    const r = el.getBoundingClientRect()
    return ((clientX - r.left) / r.width) * s.duration
  }, [s.duration])

  const handlePointerDown = (e: React.PointerEvent) => {
    if (s.duration <= 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragMs(Math.max(0, Math.min(s.duration, msFromEvent(e.clientX))))
  }
  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragMs === null) return
    setDragMs(Math.max(0, Math.min(s.duration, msFromEvent(e.clientX))))
  }
  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragMs === null) return
    e.currentTarget.releasePointerCapture(e.pointerId)
    sendCmd({ type: 'seek', ms: dragMs })
    setDragMs(null)
  }

  const shownMs = dragMs ?? s.currentProgress
  const pct = s.duration > 0 ? Math.min(100, (shownMs / s.duration) * 100) : 0

  const ModeIcon = MODE_META[s.playMode]?.icon ?? Repeat
  const currentLyric = s.lyric && s.lyric.index >= 0 ? s.lyric.lines[s.lyric.index] : null

  return (
    <div className="w-screen h-screen overflow-hidden bg-transparent select-none">
      <div
        className="relative w-full h-full flex flex-col rounded-[22px] overflow-hidden animate-panel-in"
        style={{
          background: 'linear-gradient(160deg,#fef9f0 0%,#fdf2f8 38%,#f0f4ff 72%,#fefce8 100%)',
          boxShadow: '0 18px 50px rgba(190,120,140,0.28), 0 2px 10px rgba(0,0,0,0.08)',
          border: '1px solid rgba(255,255,255,0.7)',
        }}
      >
        {/* ═══ 封面模糊铺底：面板随歌曲呼吸，但保持马卡龙基调 ═══ */}
        {s.song?.picUrl && !coverFailed && (
          <img
            key={s.song.picUrl}
            src={s.song.picUrl}
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover pointer-events-none animate-cover-fade"
            style={{ filter: 'blur(40px) saturate(1.5)', transform: 'scale(1.4)', opacity: 0.32 }}
          />
        )}

        {/* ═══ 马卡龙流体 blob ═══ */}
        {BLOBS.map((b, i) => (
          <div
            key={i}
            aria-hidden
            className="absolute rounded-full pointer-events-none"
            style={{
              width: b.size, height: b.size,
              background: `radial-gradient(circle at 45% 45%, ${b.css}, transparent 70%)`,
              filter: `blur(${b.blur}px)`,
              animation: b.anim,
              top: b.top, left: b.left, right: b.right, bottom: b.bottom,
            }}
          />
        ))}

        {/* 内容压在装饰层之上 */}
        <div className="relative z-10 flex flex-col h-full">

          {/* ── 顶部：可拖动 + 关闭 ── */}
          <div className="flex items-center justify-between px-4 pt-3 pb-1" data-tauri-drag-region>
            <span className="text-[10px] font-semibold tracking-[0.2em] text-gray-500/80 uppercase" data-tauri-drag-region>
              Now Playing
            </span>
            <button
              onClick={hideSelf}
              aria-label="关闭面板"
              className="p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-black/[0.06] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* ── 封面 + 歌曲信息 ── */}
          <div className="flex items-center gap-3 px-4 pt-1 pb-3">
            <div
              className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 bg-white/60"
              style={{ boxShadow: '0 6px 18px rgba(190,120,140,0.3)', animation: 'coverFloat 4s ease-in-out infinite' }}
            >
              {s.song?.picUrl && !coverFailed ? (
                <img
                  src={s.song.picUrl}
                  alt=""
                  onError={() => setCoverFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <Music className="w-6 h-6" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-bold text-gray-800 truncate leading-tight">
                {s.song?.name || '未在播放'}
              </div>
              <div className="text-[11px] text-gray-500 truncate mt-0.5">
                {s.song?.artist || '从主窗口选一首歌开始'}
              </div>
            </div>
          </div>

          {/* ── 当前歌词行 ── */}
          <div className="px-4 h-9 flex items-center justify-center text-center overflow-hidden">
            {currentLyric ? (
              <div key={`${s.song?.id}-${s.lyric?.index}`} className="animate-lyric-in min-w-0">
                <div className="text-[12.5px] font-medium text-gray-700 truncate">{currentLyric.text}</div>
                {currentLyric.sub && (
                  <div className="text-[10px] text-gray-500/90 truncate mt-px">{currentLyric.sub}</div>
                )}
              </div>
            ) : (
              <span className="text-[11px] text-gray-400">
                {s.song ? '♪ 暂无歌词' : ''}
              </span>
            )}
          </div>

          {/* ── 可拖拽进度条 ── */}
          <div className="px-4 pt-1">
            <div
              ref={barRef}
              role="slider"
              aria-label="播放进度"
              aria-valuemin={0}
              aria-valuemax={Math.round(s.duration)}
              aria-valuenow={Math.round(shownMs)}
              tabIndex={0}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="group relative h-4 flex items-center cursor-pointer touch-none"
            >
              <div className="w-full h-[3px] rounded-full bg-black/[0.09] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#ff8fab] to-[#e60026]"
                  style={{ width: `${pct}%`, transition: dragMs === null ? 'width .25s linear' : 'none' }}
                />
              </div>
              <div
                className="absolute w-3 h-3 rounded-full bg-white border-2 border-[#e60026] shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `calc(${pct}% - 6px)`, opacity: dragMs !== null ? 1 : undefined }}
              />
            </div>
            <div className="flex justify-between text-[9.5px] font-mono text-gray-500 -mt-0.5">
              <span>{formatTime(shownMs)}</span>
              <span>{formatTime(s.duration)}</span>
            </div>
          </div>

          {/* ── 主控制 ── */}
          <div className="flex items-center justify-center gap-6 py-2.5">
            <button
              onClick={() => sendCmd({ type: 'prev' })}
              aria-label="上一首"
              className="p-2 rounded-full text-gray-500 hover:text-[#e60026] hover:bg-white/70 transition-colors"
            >
              <SkipBack className="w-[18px] h-[18px]" fill="currentColor" />
            </button>

            <button
              onClick={() => sendCmd({ type: 'toggle-play' })}
              aria-label={s.isPlay ? '暂停' : '播放'}
              className="relative w-12 h-12 rounded-full flex items-center justify-center text-white transition-transform hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(135deg,#ff6b8a 0%,#e60026 100%)',
                boxShadow: '0 6px 20px rgba(230,0,38,0.38)',
              }}
            >
              {s.isPlay && <span className="absolute inset-0 rounded-full animate-pulse-ring" aria-hidden />}
              {s.isPlay
                ? <Pause className="w-5 h-5 relative" fill="currentColor" />
                : <Play className="w-5 h-5 relative ml-0.5" fill="currentColor" />}
            </button>

            <button
              onClick={() => sendCmd({ type: 'next' })}
              aria-label="下一首"
              className="p-2 rounded-full text-gray-500 hover:text-[#e60026] hover:bg-white/70 transition-colors"
            >
              <SkipForward className="w-[18px] h-[18px]" fill="currentColor" />
            </button>
          </div>

          {/* ── 快捷开关 ── */}
          <div className="grid grid-cols-4 gap-1 px-3 pb-2">
            <PillButton
              icon={<Heart className="w-4 h-4" fill={s.isFav ? 'currentColor' : 'none'} />}
              label="收藏"
              active={s.isFav}
              disabled={!s.song}
              onClick={() => sendCmd({ type: 'toggle-fav' })}
            />
            <PillButton
              icon={<ModeIcon className="w-4 h-4" />}
              label={MODE_META[s.playMode]?.label.slice(0, 2) ?? '循环'}
              active={s.playMode !== 0}
              onClick={() => sendCmd({ type: 'cycle-mode' })}
            />
            <PillButton
              icon={<ListMusic className="w-4 h-4" />}
              label="队列"
              badge={s.queueTotal || undefined}
              active={showQueue}
              disabled={s.queue.length === 0}
              onClick={() => setShowQueue((v) => !v)}
            />
            <PillButton
              icon={<Mic2 className="w-4 h-4" />}
              label="歌词"
              active={s.lyricsWindowOpen}
              onClick={() => sendCmd({ type: 'toggle-lyrics' })}
            />
          </div>

          {/* ── 队列预览：仅展开时占位，避免收起时留一大块空白 ── */}
          {showQueue && s.queue.length > 0 && (
            <div className="flex-1 min-h-0 px-3 pb-1">
              <div className="h-full overflow-y-auto scrollbar-thin rounded-xl bg-white/45 border border-white/70 px-1.5 py-1.5 animate-lyric-in">
                <div className="text-[9.5px] font-semibold tracking-wider text-gray-500 uppercase px-1.5 pb-1">
                  接下来播放
                </div>
                {s.queue.map((q, i) => (
                  <button
                    key={`${q.id}-${i}`}
                    onClick={() => sendCmd({ type: 'play-by-id', id: q.id })}
                    className="w-full flex items-center gap-2 px-1.5 py-1 rounded-lg hover:bg-[#e60026]/10 active:bg-[#e60026]/20 transition-colors cursor-pointer text-left group"
                  >
                    <span className="w-3.5 text-[9px] text-gray-400 text-center flex-shrink-0 group-hover:text-[#e60026] transition-colors">{i + 1}</span>
                    <div className="w-6 h-6 rounded-md overflow-hidden bg-white/70 flex-shrink-0 shadow-sm">
                      {q.picUrl
                        ? <img src={q.picUrl} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-gray-300"><Music className="w-3 h-3" /></div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10.5px] text-gray-700 truncate leading-tight group-hover:text-[#e60026] transition-colors">{q.name}</div>
                      <div className="text-[9px] text-gray-400 truncate">{q.artist}</div>
                    </div>
                    <Play className="w-3 h-3 text-[#e60026] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* ── 底部：退出应用的唯一入口，务必保留 ── */}
          <div className="grid grid-cols-2 gap-1.5 px-3 pt-1.5 pb-3 border-t border-black/[0.06] mt-auto">
            <button
              onClick={() => invokeMain('show_main_window')}
              className="flex items-center justify-center gap-1.5 h-8 rounded-xl text-[11px] font-medium text-gray-600 bg-white/60 hover:bg-white/90 transition-colors"
            >
              <AppWindow className="w-3.5 h-3.5" />
              显示主窗口
            </button>
            <button
              onClick={() => invokeMain('quit_app')}
              className="flex items-center justify-center gap-1.5 h-8 rounded-xl text-[11px] font-medium text-gray-500 bg-white/60 hover:bg-[#e60026] hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              退出
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function PillButton({
  icon, label, active, badge, disabled, onClick,
}: {
  icon: React.ReactNode
  label: string
  active?: boolean
  badge?: number
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`relative flex flex-col items-center justify-center gap-0.5 h-12 rounded-xl transition-colors
        ${disabled ? 'opacity-35 cursor-default' : 'hover:bg-white/80'}
        ${active ? 'text-[#e60026] bg-white/70' : 'text-gray-500'}`}
    >
      {icon}
      <span className="text-[9.5px] font-medium">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="absolute top-1 right-2 min-w-[13px] h-[13px] px-[3px] rounded-full bg-[#e60026] text-white text-[8px] font-bold flex items-center justify-center">
          {badge > 99 ? '99' : badge}
        </span>
      )}
    </button>
  )
}
