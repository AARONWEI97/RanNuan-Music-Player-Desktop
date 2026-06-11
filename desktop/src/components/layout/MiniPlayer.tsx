import { useState, useRef } from 'react'
import { usePlayerStore, usePlaylistStore } from '@shared'
import type { SongResult } from '@shared'
import { Play, Pause, SkipBack, SkipForward, Maximize2, Heart, Volume2, VolumeX, ListMusic, X } from 'lucide-react'
import { togglePlay, playSong, seekTo, setVolume } from '@/services/audioService'
import { isFavorite, toggleFavorite } from '@/store/favoritesStore'
import { thumbUrl } from '@/utils/image'
import { showToast } from '@/utils/toast'

function formatTime(ms: number) {
  if (!ms || ms < 0) return '0:00'
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function MiniPlayer({ onRestore, onPlaylistToggle }: { onRestore: () => void; onPlaylistToggle?: (open: boolean) => void }) {
  const { playMusic, isPlay, currentProgress, duration, volume, isMuted } = usePlayerStore()
  const { prevPlay, nextPlay, getCurrentSong, playList, playListIndex, setPlayListIndex, removeFromPlayList } = usePlaylistStore()
  const [showPlaylist, setShowPlaylist] = useState(false)
  const [showVolume, setShowVolume] = useState(false)
  const [hoverProgress, setHoverProgress] = useState<number | null>(null)
  const [favVersion, setFavVersion] = useState(0)
  const progressRef = useRef<HTMLDivElement>(null)

  // 收藏状态 — favVersion 变化时重新计算
  const fav = favVersion >= 0 && playMusic?.id ? isFavorite(playMusic.id) : false

  // 播放控制
  const handlePrev = () => {
    prevPlay()
    const song = getCurrentSong()
    if (song) playSong(song)
  }

  const handleNext = () => {
    nextPlay()
    const song = getCurrentSong()
    if (song) playSong(song)
  }

  // 收藏
  const handleToggleFav = () => {
    if (!playMusic) return
    const added = toggleFavorite(playMusic)
    setFavVersion((v) => v + 1)
    showToast(added ? '已收藏' : '已取消收藏', playMusic.name)
  }

  // 进度条
  const progress = duration > 0 ? (currentProgress / duration) * 100 : 0
  const displayProgress = hoverProgress !== null ? hoverProgress : progress

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    seekTo(pct * duration)
  }

  const handleProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    setHoverProgress(pct * 100)
  }

  // 音量滚轮
  const handleVolumeWheel = (e: React.WheelEvent) => {
    e.stopPropagation()
    const store = usePlayerStore.getState()
    const delta = e.deltaY > 0 ? -0.05 : 0.05
    const newVol = Math.max(0, Math.min(1, store.volume + delta))
    store.setVolume(newVol)
    store.setIsMuted(false)
    setVolume(newVol)
  }

  // 静音切换
  const handleMuteToggle = () => {
    const store = usePlayerStore.getState()
    const newMuted = !store.isMuted
    store.setIsMuted(newMuted)
    setVolume(newMuted ? 0 : (store.volume || 0.5))
  }

  // 播放列表中点击歌曲
  const handlePlayFromList = (song: SongResult, idx: number) => {
    setPlayListIndex(idx)
    playSong(song)
  }

  // 删除歌曲
  const handleDeleteSong = (song: SongResult) => {
    if (song.id === playMusic?.id) {
      nextPlay()
      const nextSong = getCurrentSong()
      if (nextSong) playSong(nextSong)
    }
    removeFromPlayList(song.id as number)
  }

  return (
    <div className="w-full h-full flex flex-col select-none bg-white dark:bg-[#1a1a1a] rounded-lg overflow-hidden" data-tauri-drag-region>
      {/* 主控制栏 */}
      <div className="flex items-center h-[72px] px-3 gap-2.5 flex-shrink-0" data-tauri-drag-region>
        {/* 封面 */}
        <div className="w-11 h-11 rounded-lg bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0 cursor-pointer" onClick={onRestore}>
          {(() => {
            const img = playMusic?.picUrl || playMusic?.al?.picUrl || playMusic?.album?.picUrl
            return img ? (
              <img src={thumbUrl(img)} alt="" className="w-full h-full object-cover" />
            ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <Play className="w-4 h-4" />
            </div>
            )
          })()}
        </div>

        {/* 歌曲信息 */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onRestore} data-tauri-drag-region>
          <div className="text-xs font-medium truncate leading-tight">{playMusic?.name || '未播放'}</div>
          <div className="text-[10px] text-gray-500 truncate leading-tight mt-0.5">
            {playMusic?.ar?.map((a) => a.name).join(' / ') || ''}
          </div>
        </div>

        {/* 控制按钮 */}
        <div className="flex items-center gap-0.5">
          <button onClick={handlePrev} className="p-1.5 text-gray-500 hover:text-[#e60026] transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-white/5">
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button onClick={togglePlay} className="w-7 h-7 flex items-center justify-center rounded-full bg-[#e60026] text-white hover:bg-[#c4001f] transition-colors">
            {isPlay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
          </button>
          <button onClick={handleNext} className="p-1.5 text-gray-500 hover:text-[#e60026] transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-white/5">
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 功能按钮 */}
        <div className="flex items-center gap-0.5 ml-0.5">
          {/* 收藏 */}
          <button onClick={handleToggleFav} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <Heart className={`w-3.5 h-3.5 ${fav ? 'text-[#e60026] fill-[#e60026]' : 'text-gray-400 hover:text-[#e60026]'}`} />
          </button>

          {/* 音量 + hover 百分比 */}
          <div className="relative" onMouseLeave={() => setShowVolume(false)}>
            <button
              onClick={handleMuteToggle}
              onMouseEnter={() => setShowVolume(true)}
              onWheel={handleVolumeWheel}
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-3.5 h-3.5 text-gray-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-gray-400" />
              )}
            </button>
            {showVolume && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 rounded-lg bg-white dark:bg-[#2a2a2a] shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col items-center gap-1"
                onWheel={handleVolumeWheel}>
                <span className="text-[9px] font-bold text-gray-500">{Math.round((isMuted ? 0 : volume) * 100)}%</span>
                <input
                  type="range"
                  min="0" max="1" step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value)
                    usePlayerStore.getState().setVolume(v)
                    usePlayerStore.getState().setIsMuted(false)
                    setVolume(v)
                  }}
                  className="w-20 h-1 accent-[#e60026] cursor-pointer"
                  style={{ writingMode: 'vertical-lr' as unknown as React.CSSProperties['writingMode'], direction: 'rtl' }}
                />
              </div>
            )}
          </div>

          {/* 播放列表 */}
          <button onClick={() => { const next = !showPlaylist; setShowPlaylist(next); onPlaylistToggle?.(next) }} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors relative">
            <ListMusic className="w-3.5 h-3.5 text-gray-400" />
            {playList.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 text-[8px] bg-[#e60026] text-white rounded-full w-3 h-3 flex items-center justify-center">
                {playList.length > 99 ? '99' : playList.length}
              </span>
            )}
          </button>

          {/* 恢复 */}
          <button onClick={onRestore} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <Maximize2 className="w-3.5 h-3.5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* 进度条 */}
      <div
        ref={progressRef}
        className="h-1 cursor-pointer group flex-shrink-0 relative"
        onClick={handleProgressClick}
        onMouseMove={handleProgressHover}
        onMouseLeave={() => setHoverProgress(null)}
      >
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gray-200 dark:bg-gray-700 group-hover:h-1 transition-all" />
        <div
          className="absolute bottom-0 left-0 h-0.5 group-hover:h-1 bg-[#e60026] transition-all"
          style={{ width: `${displayProgress}%` }}
        />
        {hoverProgress !== null && duration > 0 && (
          <div
            className="absolute bottom-1.5 text-[9px] text-gray-500 bg-white dark:bg-[#2a2a2a] px-1 rounded shadow-sm pointer-events-none"
            style={{ left: `${hoverProgress}%`, transform: 'translateX(-50%)' }}
          >
            {formatTime((hoverProgress / 100) * duration)}
          </div>
        )}
      </div>

      {/* 播放列表展开区域 */}
      {showPlaylist && (
        <div className="flex-1 overflow-y-auto bg-white dark:bg-[#1a1a1a] border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-[#1a1a1a]">
            <span className="text-[10px] font-medium text-gray-500">播放队列 ({playList.length})</span>
            <button onClick={() => { setShowPlaylist(false); onPlaylistToggle?.(false) }} className="p-0.5 text-gray-400 hover:text-gray-600">
              <X className="w-3 h-3" />
            </button>
          </div>
          {playList.map((song, idx) => (
            <div
              key={`${song.id}-${idx}`}
              className={`flex items-center gap-2 px-3 py-1 cursor-pointer transition-colors group ${
                idx === playListIndex
                  ? 'bg-[#e60026]/10'
                  : 'hover:bg-gray-50 dark:hover:bg-white/5'
              }`}
              onClick={() => handlePlayFromList(song, idx)}
            >
              <span className={`text-[9px] w-3 text-center flex-shrink-0 ${idx === playListIndex ? 'text-[#e60026]' : 'text-gray-400'}`}>
                {idx === playListIndex ? (
                  <Play className="w-2.5 h-2.5 inline" />
                ) : (
                  idx + 1
                )}
              </span>
              <div className="w-6 h-6 rounded bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                <img src={thumbUrl(song.picUrl || song.al?.picUrl)} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-[10px] truncate ${idx === playListIndex ? 'text-[#e60026] font-medium' : ''}`}>
                  {song.name}
                </div>
                <div className="text-[8px] text-gray-400 truncate">
                  {song.ar?.map((a) => a.name).join(' / ')}
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteSong(song) }}
                className="p-0.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
          {playList.length === 0 && (
            <div className="text-center text-[10px] text-gray-400 py-4">播放队列为空</div>
          )}
        </div>
      )}
    </div>
  )
}
