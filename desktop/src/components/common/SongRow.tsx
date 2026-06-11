import { memo, useCallback, useState, useEffect } from 'react'
import type { SongResult } from '@shared'
import { thumbUrl } from '@/utils/image'
import { usePlaylistStore } from '@shared'
import { isFavorite as checkIsFavorite, toggleFavorite } from '@/store/favoritesStore'
import { showToast } from '@/utils/toast'
import { showContextMenu } from '@/hooks/useContextMenu'
import { useNavigate } from 'react-router-dom'
import { Play, ListPlus, Heart, MoreHorizontal, User, DiscAlbum, Download, Info, Music, MessageCircle, Trash2, RefreshCw } from 'lucide-react'

interface SongRowProps {
  song: SongResult
  index: number
  showIndex?: boolean
  showPic?: boolean
  showAlbum?: boolean
  showDuration?: boolean
  isFavorite?: boolean
  onPlay?: () => void
  onAddToNext?: () => void
  onToggleFavorite?: () => void
  onMore?: (e: React.MouseEvent) => void
  // ── 新增：歌单上下文 / 音源重解析 ──
  inOwnPlaylist?: boolean
  playlistId?: number
  onRemoveFromPlaylist?: (song: SongResult) => void
  onReparse?: (song: SongResult) => void
}

const SongRow = memo(function SongRow({
  song,
  index,
  showIndex = true,
  showPic = true,
  showAlbum = true,
  showDuration = true,
  isFavorite: isFavoriteProp,
  onPlay,
  onAddToNext,
  onToggleFavorite,
  onMore,
  inOwnPlaylist,
  playlistId: _pid,
  onRemoveFromPlaylist,
  onReparse,
}: SongRowProps) {
  const navigate = useNavigate()
  const addToNextPlay = usePlaylistStore((s) => s.addToNextPlay)

  // ★ 本地收藏状态 — 点击时立即更新 UI，无需刷新页面
  const [fav, setFav] = useState(() =>
    isFavoriteProp !== undefined ? isFavoriteProp : checkIsFavorite(song.id)
  )

  // ★ 同步外部 prop 变化（父组件传的 isFavorite 变了）
  useEffect(() => {
    if (isFavoriteProp !== undefined && isFavoriteProp !== fav) {
      setFav(isFavoriteProp)
    }
  }, [isFavoriteProp])

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
    if (onToggleFavorite) { onToggleFavorite(); return }
    const added = toggleFavorite(song)
    setFav(added) // ★ 立即更新 UI，无需刷新
    showToast(added ? '已收藏' : '已取消收藏', song.name)
  }, [onToggleFavorite, song])

  const openMenu = useCallback((x: number, y: number) => {
    setMenuOpen(true)
    showContextMenu(x, y, [
      {
        label: '播放',
        icon: <Play className="w-4 h-4" />,
        onClick: () => onPlay?.(),
      },
      {
        label: '下一首播放',
        icon: <ListPlus className="w-4 h-4" />,
        onClick: () => {
          addToNextPlay(song)
          showToast('已添加到播放队列', '下一首播放')
        },
      },
      {
        label: fav ? '取消收藏' : '收藏',
        icon: <Heart className={`w-4 h-4 ${fav ? 'fill-[#e60026] text-[#e60026]' : ''}`} />,
        onClick: () => {
          toggleFavorite(song)
          showToast(fav ? '已取消收藏' : '已收藏', song.name)
        },
      },
      { label: '', divider: true, onClick: () => {} },
      {
        label: `歌手: ${song.ar?.map(a => a.name).join('/') || '未知'}`,
        icon: <User className="w-4 h-4" />,
        onClick: () => song.ar?.[0]?.id && navigate(`/artist/${song.ar[0].id}`),
      },
      {
        label: `专辑: ${song.al?.name || '未知'}`,
        icon: <DiscAlbum className="w-4 h-4" />,
        onClick: () => song.al?.id && navigate(`/album/${song.al.id}`),
      },
      { label: '', divider: true, onClick: () => {} },
      {
        label: '歌曲详情',
        icon: <Info className="w-4 h-4" />,
        onClick: () => navigate(`/song/${song.id}`),
      },
      {
        label: '下载',
        icon: <Download className="w-4 h-4" />,
        onClick: async () => {
          const artistName = song.ar?.map((a) => a.name).join(' / ') || undefined
          const meta = { picUrl: song.al?.picUrl, album: song.al?.name }
          
          // 优先使用已有的 URL（避免重复请求）
          if (song.playMusicUrl) {
            import('@/utils/download').then(m => m.downloadSong(song.id as number, song.name, song.playMusicUrl!, artistName, meta))
            return
          }

          // 调用 API 获取下载 URL，不影响播放器
          try {
            showToast('正在获取下载链接...', song.name)
            const { getMusicUrl } = await import('@shared/api/music')
            const res = await getMusicUrl(song.id as number, false)
            const url = res?.data?.data?.[0]?.url
            
            if (!url) {
              showToast('获取下载链接失败', '该歌曲可能无法下载')
              return
            }

            import('@/utils/download').then(m => m.downloadSong(song.id as number, song.name, url, artistName, meta))
          } catch (error: any) {
            console.error('[Download] Failed to fetch URL:', error)
            showToast('获取下载链接失败', error.message || '网络错误')
          }
        },
      },
      { label: '', divider: true, onClick: () => {} },
      // ★ 相似推荐
      {
        label: '相似推荐',
        icon: <Music className="w-4 h-4" />,
        onClick: () => navigate(`/song/${song.id}?tab=similar`),
      },
      // ★ 查看评论
      {
        label: '查看评论',
        icon: <MessageCircle className="w-4 h-4" />,
        onClick: () => navigate(`/song/${song.id}/comments`),
      },
      // ★ 从歌单删除（仅当 inOwnPlaylist && playlistId）
      ...(inOwnPlaylist && onRemoveFromPlaylist ? [{
        label: '从歌单中删除',
        icon: <Trash2 className="w-4 h-4 text-red-500" />,
        onClick: () => onRemoveFromPlaylist(song),
      }] : []),
      // ★ 重新解析音源（仅当 onReparse 存在）
      ...(onReparse ? [{
        label: '选择播放音源',
        icon: <RefreshCw className="w-4 h-4" />,
        onClick: () => onReparse(song),
      }] : []),
    ], { onClose: () => setMenuOpen(false) })
  }, [onPlay, addToNextPlay, song, fav, navigate, inOwnPlaylist, onRemoveFromPlaylist, onReparse])

  const handleMore = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (onMore) { onMore(e); return }
    openMenu(e.clientX, e.clientY)
  }, [onMore, openMenu])

  // ★ 右键 → 显示自定义菜单，阻止浏览器原生菜单
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    openMenu(e.clientX, e.clientY)
  }, [openMenu])

  if (!song || typeof song.id === 'undefined') return null

  const artistName = song.ar?.map((a) => a.name).join(' / ') || '未知歌手'
  const isRowHighlighted = menuOpen

  return (
    <div
      className={`song-row-item flex items-center gap-3 p-2 rounded-lg cursor-pointer group transition-colors ${
        isRowHighlighted
          ? 'bg-gray-100 dark:bg-white/[0.08] ring-1 ring-[#e60026]/20'
          : 'hover:bg-gray-100 dark:hover:bg-white/5'
      }`}
      onClick={onPlay}
      onContextMenu={handleContextMenu}
    >
      {showIndex && (
        <span className="text-xs text-gray-400 w-5 text-center select-none">{index + 1}</span>
      )}
      {showPic && (
        <div className="w-10 h-10 rounded bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
          <img src={thumbUrl(song.picUrl || song.al?.picUrl || '')} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
        </div>
      )}
      <div className="flex-1 min-w-0 select-none">
        <div className="text-sm font-medium truncate">{song.name}</div>
        <div className="text-xs text-gray-500 truncate">
          {artistName}{showAlbum && song.al?.name ? ` · ${song.al.name}` : ''}
        </div>
      </div>

      {/* ─── 操作按钮：菜单打开时保持显示 ─── */}
      <div
        className={`flex items-center gap-0.5 transition-opacity duration-150 ${
          menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
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
          onClick={handleMore}
          className={`p-1.5 rounded-md transition-colors active:scale-90 ${
            menuOpen
              ? 'text-[#e60026] bg-[#e60026]/8'
              : 'text-gray-400 hover:text-[#e60026] hover:bg-gray-200 dark:hover:bg-white/10'
          }`}
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
}, (prev, next) => {
  return prev.song.id === next.song.id
    && prev.index === next.index
    && prev.showIndex === next.showIndex
    && prev.showPic === next.showPic
    && prev.showAlbum === next.showAlbum
    && prev.showDuration === next.showDuration
    && prev.isFavorite === next.isFavorite
})

export default SongRow
