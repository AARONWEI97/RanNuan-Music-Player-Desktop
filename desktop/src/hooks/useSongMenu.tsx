import type { MouseEvent } from 'react'
import { useNavigateToMusicPage } from '@/hooks/useNavigateToMusicPage'
import { usePlaylistStore, type SongResult } from '@shared'
import { Play, ListPlus, ListMusic, FolderPlus, Heart, User, DiscAlbum, Info, Download, Music, MessageCircle, Trash2, RefreshCw, Film } from 'lucide-react'
import { showContextMenu, type MenuItem } from '@/hooks/useContextMenu'
import { useMusicNavigation } from '@/hooks/useMusicNavigation'
import { isFavorite, toggleFavorite } from '@/store/favoritesStore'
import { useAuthStore } from '@/store/authStore'
import { openAddToPlaylistModal } from '@/services/addToPlaylistModal'
import { playSong } from '@/services/audioService'
import { getSongAlbum, getSongArtists, hasMusicId, isOnlineSong } from '@/utils/songMetadata'
import { showToast } from '@/utils/toast'

export interface SongMenuOptions {
  onPlay?: () => void
  onAddToNext?: () => void
  onToggleFavorite?: () => void
  onRemoveFromPlaylist?: () => void | Promise<void>
  onRemoveFromQueue?: () => void
  queueRemovalLabel?: string
  onReparse?: () => void
  onNavigate?: () => void
  onClose?: () => void
}

const divider = (): MenuItem => ({ label: '', divider: true, onClick: () => {} })

/** 所有歌曲入口共用这一份操作定义；页面只提供播放和场景操作。 */
export function useSongMenu() {
  const navigate = useNavigateToMusicPage()
  const { goToArtist, goToAlbum } = useMusicNavigation()

  return (event: MouseEvent, song: SongResult, options: SongMenuOptions = {}) => {
    event.preventDefault()
    event.stopPropagation()
    const artists = getSongArtists(song)
    const album = getSongAlbum(song)
    const online = isOnlineSong(song)
    const fav = isFavorite(song.id)
    const go = (path: string) => { options.onNavigate?.(); navigate(path) }
    const items: MenuItem[] = [
      { label: '播放', icon: <Play />, onClick: () => options.onPlay ? options.onPlay() : playSong(song) },
      { label: '下一首播放', icon: <ListPlus />, onClick: () => {
        if (options.onAddToNext) options.onAddToNext()
        else usePlaylistStore.getState().addToNextPlay(song)
        showToast('已添加到播放队列', '下一首播放')
      } },
      { label: '添加到歌单', icon: <FolderPlus />, disabled: !online, onClick: () => {
        if (!useAuthStore.getState().isLoggedIn) { showToast('请先登录', '登录后才能添加歌曲到歌单'); return }
        openAddToPlaylistModal(song)
      } },
      { label: fav ? '取消收藏' : '收藏', icon: <Heart className={fav ? 'fill-[#e60026] text-[#e60026]' : ''} />, onClick: () => {
        if (options.onToggleFavorite) { options.onToggleFavorite(); return }
        const added = toggleFavorite(song)
        showToast(added ? '已收藏' : '已取消收藏', song.name)
      } },
      divider(),
      ...(artists.length ? artists.map(artist => ({
        label: `歌手: ${artist.name}`, icon: <User />, onClick: () => goToArtist(artist, options.onNavigate),
      })) : [{ label: '歌手: 未知', icon: <User />, disabled: true, onClick: () => {} }]),
      { label: `专辑: ${album?.name || '未知'}`, icon: <DiscAlbum />, disabled: !album?.name, onClick: () => {
        if (album) return goToAlbum(album, options.onNavigate)
      } },
      divider(),
      { label: '歌曲详情', icon: <Info />, disabled: !online, onClick: () => go(`/song/${song.id}`) },
      { label: '下载', icon: <Download />, disabled: !online, onClick: async () => {
        const { queueSongDownload } = await import('@/utils/download')
        await queueSongDownload(song)
      } },
      divider(),
      { label: '相似推荐', icon: <Music />, disabled: !online, onClick: () => go(`/song/${song.id}?tab=similar`) },
      { label: '查看评论', icon: <MessageCircle />, disabled: !online, onClick: () => go(`/song/${song.id}/comments`) },
    ]
    const mvId = song.mv || song.mvid
    if (online && hasMusicId(mvId)) items.push({ label: '查看 MV', icon: <Film />, onClick: () => go(`/mv/${mvId}`) })
    items.push(divider(),
      { label: '添加到播放队列', icon: <ListMusic />, onClick: () => {
        const state = usePlaylistStore.getState()
        if ([...state.playList, ...state.playNextQueue].some(item => String(item.id) === String(song.id))) {
          showToast('歌曲已在播放队列中', song.name)
          return
        }
        usePlaylistStore.setState({
          playList: [...state.playList, song],
          ...(state.originalPlayList.length ? { originalPlayList: [...state.originalPlayList, song] } : {}),
        })
        showToast('已添加到播放队列末尾', song.name)
      } },
    )
    if (options.onReparse) items.push({ label: '选择播放音源', icon: <RefreshCw />, onClick: options.onReparse })
    if (options.onRemoveFromPlaylist || options.onRemoveFromQueue) items.push(divider())
    if (options.onRemoveFromPlaylist) items.push({ label: '从歌单中删除', icon: <Trash2 />, danger: true, onClick: options.onRemoveFromPlaylist })
    if (options.onRemoveFromQueue) items.push({ label: options.queueRemovalLabel || '移出队列', icon: <Trash2 />, danger: true, onClick: options.onRemoveFromQueue })
    // A keyboard click has no pointer coordinates. Anchor it to the trigger.
    const anchor = event.clientX === 0 && event.clientY === 0 ? event.currentTarget.getBoundingClientRect() : null
    showContextMenu(anchor?.left ?? event.clientX, anchor?.bottom ?? event.clientY, items, { onClose: options.onClose })
  }
}
