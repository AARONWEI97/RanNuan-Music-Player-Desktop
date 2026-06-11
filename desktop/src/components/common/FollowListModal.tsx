import { useState, useEffect, useCallback } from 'react'
import { X, Loader, User, UserPlus, UserCheck } from 'lucide-react'
import { getUserFollows, getUserFollowers, followUser } from '@shared'
import { avatarUrl } from '@/utils/image'
import { showToast } from '@/utils/toast'
import { useAuthStore } from '@/store/authStore'

interface UserItem {
  userId: number
  nickname: string
  avatarUrl: string
  signature?: string
  gender?: number
  followed?: boolean
}

interface FollowListModalProps {
  open: boolean
  uid: number
  initialTab: 'follows' | 'followers'
  onClose: () => void
}

export default function FollowListModal({ open, uid, initialTab, onClose }: FollowListModalProps) {
  const [tab, setTab] = useState<'follows' | 'followers'>(initialTab)
  const [list, setList] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const selfUid = useAuthStore(s => s.profile?.userId || 0)

  const fetch = useCallback(async () => {
    if (!uid) return
    setLoading(true)
    setError('')
    try {
      let users: UserItem[] = []
      if (tab === 'follows') {
        const res: any = await getUserFollows(uid, 100, 0)
        users = res?.data?.follow || res?.data?.data?.follow || []
      } else {
        const res: any = await getUserFollowers(uid, 100, 0)
        users = res?.data?.followeds || res?.data?.data?.followeds || []
      }
      setList(Array.isArray(users) ? users : [])
    } catch (e: any) {
      setError(e?.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [uid, tab])

  useEffect(() => {
    if (open) {
      setTab(initialTab)
      fetch()
    }
  }, [open, initialTab, fetch])

  const handleFollow = async (item: UserItem) => {
    try {
      await followUser(item.userId, item.followed ? 0 : 1)
      setList(prev => prev.map(u =>
        u.userId === item.userId ? { ...u, followed: !u.followed } : u
      ))
      showToast(item.followed ? '已取消关注' : '已关注')
    } catch (e: any) {
      showToast('操作失败', e?.message)
    }
  }

  if (!open) return null

  const tabs: { k: 'follows' | 'followers'; l: string }[] = [
    { k: 'follows', l: '关注' },
    { k: 'followers', l: '粉丝' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}>
        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex gap-1 p-0.5 rounded-full bg-gray-100 dark:bg-white/[0.06]">
            {tabs.map(t => (
              <button key={t.k}
                onClick={() => { setTab(t.k); fetch() }}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  tab === t.k ? 'bg-white dark:bg-gray-700 text-[#e60026] shadow-sm' : 'text-gray-500 dark:text-gray-400'
                }`}>{t.l}</button>
            ))}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader className="w-6 h-6 animate-spin text-[#e60026]" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center py-12 text-gray-400">
              <p className="text-sm">{error}</p>
              <button onClick={fetch} className="mt-2 text-xs text-[#e60026] hover:underline">重试</button>
            </div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-gray-400 dark:text-gray-500">
              <User className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">{tab === 'follows' ? '还没有关注任何人' : '还没有粉丝'}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {list.map(item => (
                <div key={item.userId} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                    {item.avatarUrl ? (
                      <img src={avatarUrl(item.avatarUrl)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><User className="w-5 h-5 text-gray-400" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.nickname}</p>
                    {item.signature && <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate mt-0.5">{item.signature}</p>}
                  </div>
                  {item.userId !== selfUid && (
                    <button
                      onClick={() => handleFollow(item)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        item.followed
                          ? 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/15'
                          : 'bg-[#e60026] text-white hover:bg-[#c50020]'
                      }`}
                    >
                      {item.followed ? (
                        <><UserCheck className="w-3 h-3" /> 已关注</>
                      ) : (
                        <><UserPlus className="w-3 h-3" /> 关注</>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
