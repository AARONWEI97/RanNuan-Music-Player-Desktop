import { memo, useCallback, useState } from 'react'
import type { SongResult } from '@shared'
import { thumbUrl } from '@/utils/image'
import { usePlaylistStore } from '@shared'
import { toggleFavorite } from '@/store/favoritesStore'
import { useIsFavorite } from '@/hooks/useFavorites'
import { useSongMenu } from '@/hooks/useSongMenu'
import { playSong } from '@/services/audioService'
import { SongMetadata } from './MusicLinks'
import { showToast } from '@/utils/toast'
import { ListPlus, Heart, MoreHorizontal } from 'lucide-react'

interface SongRowProps {
  song: SongResult
  index: number
  showIndex?: boolean
  showPic?: boolean
  showAlbum?: boolean
  showDuration?: boolean
  onPlay?: () => void
  onAddToNext?: () => void
  onToggleFavorite?: () => void
  // ── 新增：歌单上下文 / 音源重解析 ──
  inOwnPlaylist?: boolean
  playlistId?: number
  onRemoveFromPlaylist?: (song: SongResult) => void | Promise<void>
  onReparse?: (song: SongResult) => void
}

const SongRow = memo(function SongRow({
  song,
  index,
  showIndex = true,
  showPic = true,
  showAlbum = true,
  showDuration = true,
  onPlay,
  onAddToNext,
  onToggleFavorite,
  inOwnPlaylist,
  onRemoveFromPlaylist,
  onReparse,
}: SongRowProps) {
  const addToNextPlay = usePlaylistStore((s) => s.addToNextPlay)
  const fav = useIsFavorite(song?.id)
  const openSongMenu = useSongMenu()

  // ★ 菜单打开时保持高亮
  const [menuOpen, setMenuOpen] = useState(false)

  // ─── Handler ───
  const handleAddToNext = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (onAddToNext) { onAddToNext(); return }
    addToNextPlay(song)
    showToast('已添加到播放队列', '下一首播放')
  }, [onAddToNext, addToNextPlay, song])

  const handleToggleFav = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (onToggleFavorite) {
      onToggleFavorite()
      return
    }
    const added = toggleFavorite(song)
    showToast(added ? '已收藏' : '已取消收藏', song.name)
  }, [onToggleFavorite, song])

  const openMenu = (event: React.MouseEvent) => {
    openSongMenu(event, song, {
      onPlay: onPlay || (() => { void playSong(song) }),
      onAddToNext,
      onToggleFavorite: onToggleFavorite || (() => {
        const added = toggleFavorite(song)
        showToast(added ? '已收藏' : '已取消收藏', song.name)
      }),
      onRemoveFromPlaylist: inOwnPlaylist && onRemoveFromPlaylist ? () => onRemoveFromPlaylist(song) : undefined,
      onReparse: onReparse ? () => onReparse(song) : undefined,
      onClose: () => setMenuOpen(false),
    })
    setMenuOpen(true)
  }

  if (!song || typeof song.id === 'undefined') return null

  const isRowHighlighted = menuOpen

  return (
    <div
      className={`song-row-item flex items-center gap-3 p-2 rounded-lg cursor-pointer group transition-colors ${
        isRowHighlighted
          ? 'bg-gray-100 dark:bg-white/[0.08] ring-1 ring-[#e60026]/20'
          : 'hover:bg-gray-100 dark:hover:bg-white/5'
      }`}
      onClick={onPlay || (() => { void playSong(song) })}
      onContextMenu={openMenu}
    >
      {showIndex && (
        <span className="text-xs text-gray-400 w-5 text-center select-none">{index + 1}</span>
      )}
      {showPic && (
        <div className="w-10 h-10 rounded bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
          <img src={thumbUrl(song.picUrl || song.al?.picUrl || song.album?.picUrl || '')} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
        </div>
      )}
      <div className="flex-1 min-w-0 select-none">
        <div className="text-sm font-medium truncate">{song.name}</div>
        <div className="text-xs text-gray-500 truncate">
          <SongMetadata song={song} showAlbum={showAlbum} />
        </div>
      </div>

      {/* ─── 操作按钮：菜单打开时保持显示 ─── */}
      <div
        className={`flex items-center gap-0.5 transition-opacity duration-150 ${
          menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
        }`}
      >
        <button
          onClick={handleAddToNext}
          className="p-1.5 rounded-md text-gray-400 hover:text-[#e60026] hover:bg-[#e60026]/8 dark:hover:bg-[#e60026]/15 transition-colors active:scale-90"
          title="下一首播放"
        >
          <ListPlus className="w-[18px] h-[18px]" />
        </button>
        <button
          onClick={handleToggleFav}
          className={`p-1.5 rounded-md transition-colors active:scale-90 ${
            fav
              ? 'text-[#e60026] hover:bg-[#e60026]/8'
              : 'text-gray-400 hover:text-[#e60026] hover:bg-[#e60026]/8 dark:hover:bg-[#e60026]/15'
          }`}
          title={fav ? '取消收藏' : '收藏'}
        >
          <Heart className={`w-[18px] h-[18px] ${fav ? 'fill-current' : ''}`} />
        </button>
        <button
          onClick={openMenu}
          className={`p-1.5 rounded-md transition-colors active:scale-90 ${
            menuOpen
              ? 'text-[#e60026] bg-[#e60026]/8'
              : 'text-gray-400 hover:text-[#e60026] hover:bg-gray-200 dark:hover:bg-white/10'
          }`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          title="更多操作"
        >
          <MoreHorizontal className="w-[18px] h-[18px]" />
        </button>
      </div>

      {showDuration && song.dt ? (
        <span className="text-xs text-gray-400 w-10 text-right select-none tabular-nums">
          {Math.floor(song.dt / 60000)}:{String(Math.floor((song.dt % 60000) / 1000)).padStart(2, '0')}
        </span>
      ) : null}
    </div>
  )
})

export default SongRow
