import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { getUserPlaylist, updatePlaylistTracks } from '@shared'
import { useAuthStore } from '@/store/authStore'
import { showToast } from '@/utils/toast'
import { closeAddToPlaylistModal, useAddToPlaylistModal } from '@/services/addToPlaylistModal'
import { coverUrl } from '@/utils/image'
import { X, Loader, ListMusic, Check } from 'lucide-react'

interface PlaylistItem {
  id: number
  name: string
  trackCount?: number
  subscribed?: boolean
  userId?: number
  creator?: { userId?: number }
  coverImgUrl?: string
}

export default function AddToPlaylistModal() {
  const { open, song } = useAddToPlaylistModal()
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const profile = useAuthStore((s) => s.profile)
  const userId = profile?.userId
  const [loading, setLoading] = useState(false)
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([])
  const [addingId, setAddingId] = useState<number | null>(null)
  const [addedIds, setAddedIds] = useState<Set<number>>(() => new Set())

  const loadPlaylists = useCallback(async () => {
    if (!userId) {
      setPlaylists([])
      return
    }
    setLoading(true)
    try {
      const res = await getUserPlaylist(userId, 1000, 0) as {
        data?: { playlist?: PlaylistItem[] }
        playlist?: PlaylistItem[]
      }
      const list = (res?.data || res)?.playlist || []
      const created = (Array.isArray(list) ? list : []).filter(
        (p) => !p.subscribed && (p.userId === userId || p.creator?.userId === userId),
      )
      setPlaylists(created)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '加载歌单失败'
      showToast('无法加载歌单', msg)
      setPlaylists([])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!open) {
      setAddedIds(new Set())
      setAddingId(null)
      return
    }
    if (!isLoggedIn || !userId) return
    void loadPlaylists()
  }, [open, isLoggedIn, userId, loadPlaylists])

  const handleAdd = useCallback(async (playlist: PlaylistItem) => {
    if (!song || addingId !== null) return
    setAddingId(playlist.id)
    try {
      await updatePlaylistTracks({
        op: 'add',
        pid: playlist.id,
        tracks: String(song.id),
      })
      setAddedIds((prev) => new Set(prev).add(playlist.id))
      showToast('已添加到歌单', playlist.name)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '添加失败'
      showToast('添加失败', msg)
    } finally {
      setAddingId(null)
    }
  }, [addingId, song])

  const title = useMemo(() => song?.name || '添加到歌单', [song?.name])

  if (!open || !song) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      onClick={closeAddToPlaylistModal}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-white/[0.08] overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/[0.06]">
          <div className="min-w-0 pr-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">添加到歌单</h3>
            <p className="text-xs text-gray-500 truncate mt-0.5">{title}</p>
          </div>
          <button
            onClick={closeAddToPlaylistModal}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06]"
            title="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto py-1">
          {!isLoggedIn ? (
            <div className="px-4 py-10 text-center text-sm text-gray-500">
              请先登录后再添加歌曲到歌单
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Loader className="w-5 h-5 animate-spin mr-2" />
              加载歌单中…
            </div>
          ) : playlists.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-gray-500">
              暂无自建歌单，可在音乐库中创建
            </div>
          ) : (
            playlists.map((playlist) => {
              const isAdding = addingId === playlist.id
              const isAdded = addedIds.has(playlist.id)
              return (
                <button
                  key={playlist.id}
                  onClick={() => void handleAdd(playlist)}
                  disabled={isAdding || isAdded}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors disabled:opacity-70"
                >
                  <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {playlist.coverImgUrl ? (
                      <img src={coverUrl(playlist.coverImgUrl)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ListMusic className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-gray-900 dark:text-gray-100">{playlist.name}</p>
                    <p className="text-xs text-gray-500">{playlist.trackCount ?? 0} 首</p>
                  </div>
                  {isAdding ? (
                    <Loader className="w-4 h-4 animate-spin text-gray-400 flex-shrink-0" />
                  ) : isAdded ? (
                    <Check className="w-4 h-4 text-[#e60026] flex-shrink-0" strokeWidth={2.5} />
                  ) : null}
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
