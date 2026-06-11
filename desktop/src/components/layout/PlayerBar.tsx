import { useNavigate, useLocation } from 'react-router-dom'
import { usePlayerStore, usePlaylistStore } from '@shared'
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat, Shuffle, ListMusic, Mic2, Minimize2, Gauge, Heart } from 'lucide-react'
import { togglePlay, playSong, seekTo, setVolume, setPlaybackRate } from '@/services/audioService'
import { useRef, useCallback, useState } from 'react'
import { toggleFavorite, isFavorite } from '@/store/favoritesStore'
import { thumbUrl } from '@/utils/image'
import { showToast } from '@/utils/toast'
import SourceSelector from '@/components/player/SourceSelector'

function fmtMs(ms: number) {
  if (!ms || ms < 0) return '00:00'
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
}

interface PlayerBarProps { onMiniMode?: () => void }

export default function PlayerBar({ onMiniMode }: PlayerBarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { playMusic, isPlay, currentProgress, duration, volume, isMuted, isLoading, playbackRate } = usePlayerStore()
  const { playMode, setPlayMode, prevPlay, nextPlay, getCurrentSong, setShowPlaylistDrawer, playList } = usePlaylistStore()
  const dragging = useRef(false)

  // ── hover states ──
  const [hoverProgress, setHoverProgress] = useState<number | null>(null)
  const [favPop, setFavPop] = useState(false)

  const fav = playMusic?.id ? isFavorite(playMusic.id) : false

  const handleToggleFavorite = useCallback(() => {
    if (!playMusic) return
    const added = toggleFavorite(playMusic)
    if (added) {
      setFavPop(true)
      setTimeout(() => setFavPop(false), 400)
    }
    showToast(added ? '已收藏' : '已取消收藏', playMusic.name)
  }, [playMusic])

  // ── progress ──
  const progress = duration > 0 ? (currentProgress / duration) * 100 : 0
  const displayPct = hoverProgress ?? progress

  const progressMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    seekTo(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * duration)
    dragging.current = true
    const mover = (ev: MouseEvent) => {
      if (!dragging.current) return
      const bar = document.getElementById('player-progress')
      if (!bar) return
      const r = bar.getBoundingClientRect()
      seekTo(Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)) * duration)
    }
    const up = () => { dragging.current = false; window.removeEventListener('mousemove', mover); window.removeEventListener('mouseup', up) }
    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', up)
  }, [duration])

  const progressMove = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setHoverProgress(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)))
  }, [])

  const progressLeave = () => setHoverProgress(null)

  // ── volume ──
  const handleVolumeClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const v = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    setVolume(v)
    usePlayerStore.getState().setVolume(v)
  }, [])

  const handleVolumeWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const v = Math.max(0, Math.min(1, (volume || 0.5) + (e.deltaY > 0 ? -0.05 : 0.05)))
    setVolume(v)
    usePlayerStore.getState().setVolume(v)
  }, [volume])

  const vol = isMuted ? 0 : (volume ?? 0.5)

  // ── lyrics toggle ──
  const openLyrics = () => {
    // Ctrl+L keyboard event → LyricsPanel listens on window
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'l', ctrlKey: true, bubbles: true }))
  }

  // ═══════════ RENDER ═══════════
  return (
    <div className="h-[64px] flex items-center px-3 gap-2 border-t border-gray-200/80 dark:border-gray-800 bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-sm flex-shrink-0">
      {/* ── LEFT: song info ── */}
      <div className="w-[220px] flex items-center gap-2 overflow-hidden">
        <div
          className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer group"
          onClick={() => {
            if (!playMusic?.id) return
            // 已在 SongDetailPage → 智能返回；否则跳转
            if (location.pathname.startsWith(`/song/${playMusic.id}`)) {
              if (location.key === 'default' || window.history.length <= 2) {
                navigate('/', { replace: true })
              } else {
                navigate(-1)
              }
            } else {
              navigate(`/song/${playMusic.id}`)
            }
          }}
        >
          {/* cover */}
          <div className="relative w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex-shrink-0 overflow-hidden group-hover:ring-2 group-hover:ring-[#e60026]/30 transition-all duration-200">
            {(() => {
              const img = playMusic?.picUrl || playMusic?.al?.picUrl || playMusic?.album?.picUrl
              return img ? (
                <img src={thumbUrl(img)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400"><Play className="w-4 h-4" /></div>
              )
            })()}
            {/* playing spins */}
            {isPlay && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              </div>
            )}
          </div>
          {/* name & artist */}
          <div className="min-w-0">
            <p className="text-[13px] font-semibold truncate text-gray-900 dark:text-gray-100 group-hover:text-[#e60026] transition-colors duration-200">
              {playMusic?.name || '未播放'}
            </p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
              {playMusic?.ar?.map(a => a.name).join(' / ') || '—'}
            </p>
          </div>
        </div>
        {/* fav button */}
        {playMusic?.id && (
          <button onClick={(e) => { e.stopPropagation(); handleToggleFavorite() }}
            className={`p-1.5 rounded-lg transition-all duration-200 ${
              fav ? 'text-[#e60026] scale-110' : 'text-gray-300 dark:text-gray-600 hover:text-[#e60026]'
            } ${favPop ? 'animate-heart-pop' : ''}`}
            title={fav ? '取消收藏' : '收藏'}>
            <Heart className={`w-[18px] h-[18px] ${fav ? 'fill-current' : ''}`} />
          </button>
        )}
      </div>

      {/* ── CENTER: controls + progress ── */}
      <div className="flex-1 flex flex-col items-center justify-center gap-0.5 min-w-0">
        {/* controls row */}
        <div className="flex items-center gap-1.5">
          {/* mode */}
          <button onClick={() => setPlayMode((playMode + 1) % 3)} title={['列表循环','单曲循环','随机'][playMode]}
            className={`p-1.5 rounded-lg transition-all duration-200 ${
              playMode === 0 ? 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300' : 'text-[#e60026]'
            } ${playMode === 2 ? 'rotate-0' : ''}`}>
            {playMode === 1 ? (
              <span className="relative">
                <Repeat className="w-[18px] h-[18px]" />
                <span className="absolute -top-1 -right-1 text-[7px] font-black">1</span>
              </span>
            ) : playMode === 2 ? <Shuffle className="w-[18px] h-[18px]" /> : <Repeat className="w-[18px] h-[18px]" />}
          </button>

          <button onClick={() => { prevPlay(); const s = getCurrentSong(); if (s) playSong(s) }}
            className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-[#e60026] transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.04]">
            <SkipBack className="w-[18px] h-[18px]" />
          </button>

          {/* play/pause with pulse */}
          <div className="relative">
            {isPlay && (
              <div className="absolute inset-0 rounded-full animate-pulse-ring border-2 border-[#e60026]/30" style={{ animation: 'pulse-ring 1.5s ease-out infinite' }} />
            )}
            <button onClick={togglePlay}
              className="relative w-9 h-9 flex items-center justify-center rounded-full bg-[#e60026] text-white hover:bg-[#c4001f] hover:shadow-lg hover:shadow-[#e60026]/25 active:scale-95 transition-all duration-150">
              {isPlay ? <Pause className="w-[15px] h-[15px]" /> : <Play className="w-[15px] h-[15px] ml-0.5" />}
            </button>
          </div>

          <button onClick={() => { nextPlay(); const s = getCurrentSong(); if (s) playSong(s) }}
            className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-[#e60026] transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.04]">
            <SkipForward className="w-[18px] h-[18px]" />
          </button>

          <button onClick={() => setShowPlaylistDrawer(true)} title="播放队列"
            className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.04] relative">
            <ListMusic className="w-[17px] h-[17px]" />
            {playList.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] bg-[#e60026] text-white text-[8px] font-bold rounded-full flex items-center justify-center leading-none">
                {playList.length > 99 ? '99+' : playList.length}
              </span>
            )}
          </button>

          <SourceSelector />

          <button onClick={openLyrics} title="歌词 (Ctrl+L)"
            className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-[#e60026] transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.04]">
            <Mic2 className="w-[17px] h-[17px]" />
          </button>
        </div>

        {/* progress bar with hover time tip */}
        <div className="w-full max-w-[420px] flex items-center gap-2">
          <span className="text-[10px] text-gray-400 dark:text-gray-500 w-8 text-right tabular-nums select-none">{fmtMs(currentProgress)}</span>
          <div id="player-progress"
            className="flex-1 h-1 relative cursor-pointer group"
            onMouseDown={progressMouseDown}
            onMouseMove={progressMove}
            onMouseLeave={progressLeave}
          >
            {/* bg track */}
            <div className="absolute inset-0 rounded-full bg-gray-200 dark:bg-gray-700/80 group-hover:bg-gray-300 dark:group-hover:bg-gray-600 transition-colors" />
            {/* fill */}
            <div
              className="absolute top-0 left-0 h-full rounded-full bg-[#e60026] group-hover:bg-[#ff2a2a] transition-colors"
              style={{ width: `${displayPct}%` }}
            />
            {/* dragging thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-[#e60026] rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-150"
              style={{ left: `calc(${displayPct}% - 6px)` }}
            />
            {/* hover time tip */}
            {hoverProgress !== null && duration > 0 && (
              <div className="absolute -top-7 text-[10px] font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 px-1.5 py-0.5 rounded shadow-md border border-gray-100 dark:border-gray-600 whitespace-nowrap pointer-events-none"
                style={{ left: `${Math.min(100, Math.max(0, hoverProgress))}%`, transform: 'translateX(-50%)' }}>
                {fmtMs((hoverProgress / 100) * duration)}
              </div>
            )}
          </div>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 w-8 tabular-nums select-none">{fmtMs(duration)}</span>
        </div>
      </div>

      {/* ── RIGHT: volume + rate ── */}
      <div className="w-[200px] flex items-center gap-1.5 justify-end">
        {/* rate */}
        <button onClick={() => {
          const rates = [0.5, 0.75, 1, 1.25, 1.5, 2]
          const idx = rates.indexOf(playbackRate)
          const r = rates[(idx + 1) % rates.length]
          setPlaybackRate(r)
          usePlayerStore.getState().setPlaybackRate(r)
        }} title={`速率: ${playbackRate}x`}
          className={`p-1.5 rounded-lg transition-colors ${playbackRate !== 1 ? 'text-[#e60026] bg-[#e60026]/6' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04]'}`}>
          <Gauge className="w-[17px] h-[17px]" />
        </button>
        {playbackRate !== 1 && <span className="text-[10px] text-[#e60026] font-bold tabular-nums">{playbackRate}x</span>}

        {/* mute toggle */}
        <button onClick={() => {
          const s = usePlayerStore.getState()
          s.setIsMuted(!s.isMuted)
          setVolume(s.isMuted ? 0 : (s.volume || 0.5))
        }} title={isMuted ? '取消静音' : '静音'}
          className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.04]">
          {vol === 0 ? <VolumeX className="w-[17px] h-[17px]" /> : <Volume2 className="w-[17px] h-[17px]" />}
        </button>

        {/* volume bar */}
        <div className="relative group flex items-center">
          <div className="w-[72px] h-1 rounded-full bg-gray-200 dark:bg-gray-700/80 cursor-pointer group-hover:bg-gray-300 dark:group-hover:bg-gray-600 transition-colors relative"
            onClick={handleVolumeClick}
            onWheel={handleVolumeWheel}>
            <div className="absolute top-0 left-0 h-full rounded-full bg-gray-400 dark:bg-gray-500 group-hover:bg-[#e60026] transition-colors"
              style={{ width: `${vol * 100}%` }} />
            {/* thumb */}
            <div className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-gray-500 dark:bg-gray-300 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `calc(${vol * 100}% - 5px)` }} />
          </div>
          {/* volume percentage tip */}
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 px-1.5 py-0.5 rounded shadow-md border border-gray-100 dark:border-gray-600 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
            {Math.round(vol * 100)}%
          </div>
        </div>

        {/* mini mode */}
        {onMiniMode && (
          <button onClick={onMiniMode} title="迷你模式"
            className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.04] ml-0.5">
            <Minimize2 className="w-[17px] h-[17px]" />
          </button>
        )}
      </div>

      {/* ═══ CSS animations ═══ */}
      <style>{`
        @keyframes pulse-ring {
          0%   { transform: scale(1);   opacity: 0.5; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes heart-pop {
          0%   { transform: scale(1); }
          30%  { transform: scale(1.35); }
          60%  { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
        .animate-pulse-ring { animation: pulse-ring 1.5s ease-out infinite; }
        .animate-heart-pop   { animation: heart-pop 0.4s ease-out; }
      `}</style>
    </div>
  )
}
