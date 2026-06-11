import { useState, useEffect } from 'react'
import { X, Trash2, Save, Loader, HeartOff } from 'lucide-react'
import { updatePlaylistName, deletePlaylist, subscribePlaylist } from '@shared'
import { showToast } from '@/utils/toast'

interface PlaylistEditModalProps {
  open: boolean
  playlist: { id: number; name: string; trackCount?: number; subscribed?: boolean }
  mode: 'created' | 'collected'
  onClose: () => void
  onUpdated: () => void
}

export default function PlaylistEditModal({
  open, playlist, mode, onClose, onUpdated,
}: PlaylistEditModalProps) {
  const [name, setName] = useState(playlist.name)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [unsubscribing, setUnsubscribing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (open) {
      setName(playlist.name)
      setShowDeleteConfirm(false)
    }
  }, [open, playlist.name])

  if (!open) return null

  const handleRename = async () => {
    const trimmed = name.trim()
    if (!trimmed || trimmed === playlist.name) return
    setSaving(true)
    try {
      await updatePlaylistName({ id: playlist.id, name: trimmed })
      showToast('歌单已重命名', trimmed)
      onUpdated()
    } catch (e: any) {
      showToast('重命名失败', e?.message || '未知错误')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deletePlaylist(playlist.id)
      showToast('歌单已删除', playlist.name)
      onUpdated()
      onClose()
    } catch (e: any) {
      showToast('删除失败', e?.message || '未知错误')
    } finally {
      setDeleting(false)
    }
  }

  const handleUnsubscribe = async () => {
    setUnsubscribing(true)
    try {
      await subscribePlaylist({ id: playlist.id, t: 2 }) // t=2 = 取消收藏
      showToast('已取消收藏', playlist.name)
      onUpdated()
      onClose()
    } catch (e: any) {
      showToast('取消收藏失败', e?.message || '未知错误')
    } finally {
      setUnsubscribing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* dialog */}
      <div className="relative bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}>
        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            {mode === 'created' ? '编辑歌单' : '歌单操作'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* playlist info */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-[#e60026]/10 flex items-center justify-center flex-shrink-0">
              <span className="text-[#e60026] font-bold text-xs">{playlist.trackCount ?? '?'}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{playlist.name}</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">{mode === 'created' ? '我创建的' : '我收藏的'}</p>
            </div>
          </div>

          {/* created mode actions */}
          {mode === 'created' && (
            <>
              {/* rename */}
              <div>
                <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">
                  重命名
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleRename()}
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/[0.04] text-sm outline-none focus:ring-2 focus:ring-[#e60026]/20 focus:border-[#e60026]/30 transition-all"
                    placeholder="输入新名称"
                  />
                  <button
                    onClick={handleRename}
                    disabled={saving || !name.trim() || name.trim() === playlist.name}
                    className="px-3 py-2 rounded-lg bg-[#e60026] hover:bg-[#c50020] disabled:opacity-40 text-white text-sm font-medium flex items-center gap-1 transition-colors"
                  >
                    {saving ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    保存
                  </button>
                </div>
              </div>

              {/* delete */}
              <div className="pt-1">
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors border border-red-200 dark:border-red-500/15"
                  >
                    <Trash2 className="w-4 h-4" />
                    删除歌单
                  </button>
                ) : (
                  <div className="rounded-lg border border-red-200 dark:border-red-500/15 bg-red-50 dark:bg-red-500/5 p-3 space-y-2">
                    <p className="text-xs text-red-600 dark:text-red-400">
                      确定要删除「{playlist.name}」吗？此操作不可撤销。
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white flex items-center justify-center gap-1 transition-colors"
                      >
                        {deleting ? <Loader className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        确认删除
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* collected mode: unsubscribe */}
          {mode === 'collected' && (
            <button
              onClick={handleUnsubscribe}
              disabled={unsubscribing}
              className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors border border-rose-200 dark:border-rose-500/15 disabled:opacity-40"
            >
              {unsubscribing ? <Loader className="w-4 h-4 animate-spin" /> : <HeartOff className="w-4 h-4" />}
              取消收藏此歌单
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
