import { useEffect, useRef, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlaylistStore } from '@shared'
import { X, Play, Music, Trash2, ListPlus, Heart, MoreHorizontal, User, DiscAlbum, Info, MessageCircle } from 'lucide-react'
import { playSong } from '@/services/audioService'
import { thumbUrl } from '@/utils/image'
import { isFavorite, toggleFavorite } from '@/store/favoritesStore'
import { showToast } from '@/utils/toast'

export default function PlaylistDrawer() {
  const navigate = useNavigate()
  const {
    playList, playListIndex, playNextQueue,
    showPlaylistDrawer, setShowPlaylistDrawer,
    removeFromPlayList, setPlayListIndex, addToNextPlay,
    clearPlayAll,
  } = usePlaylistStore()

  const listRef = useRef<HTMLDivElement>(null)
  const [favoriteVersion, setFavoriteVersion] = useState(0)
  const [activeMenuKey, setActiveMenuKey] = useState<string | null>(null)

  // ★ 合并列表：playNextQueue 的歌插入到当前播放位置之后
  const displayList = useMemo(() => {
    const result = [...playList]
    for (let i = playNextQueue.length - 1; i >= 0; i--) {
      result.splice(playListIndex + 1, 0, playNextQueue[i])
    }
    return result
  }, [playList, playListIndex, playNextQueue])

  // ★ Escape 关闭
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowPlaylistDrawer(false)
    }
    if (showPlaylistDrawer) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showPlaylistDrawer, setShowPlaylistDrawer])

  // ★ 打开时自动滚动到当前播放歌曲
  useEffect(() => {
    if (showPlaylistDrawer && listRef.current) {
      requestAnimationFrame(() => {
        const current = listRef.current?.querySelector('[data-current-song]')
        current?.scrollIntoView({ block: 'center', behavior: 'instant' })
      })
    }
  }, [showPlaylistDrawer])

  useEffect(() => {
    if (!showPlaylistDrawer || !activeMenuKey) return
    const close = () => setActiveMenuKey(null)
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [showPlaylistDrawer, activeMenuKey])

  const totalCount = displayList.length

  const getImgUrl = (song: any) =>
    thumbUrl(song.picUrl || song.al?.picUrl || song.album?.picUrl)

  const playQueueItem = useCallback((song: any, vi: number, isNextQueue: boolean, realIdx: number) => {
    setActiveMenuKey(null)
    if (isNextQueue) {
      const qi = vi - playListIndex - 1
      const newQueue = playNextQueue.filter((_, i) => i !== qi)
      const newList = [...playList]
      newList.splice(playListIndex + 1, 0, song)
      usePlaylistStore.setState({
        playList: newList,
        playNextQueue: newQueue,
        playListIndex: playListIndex + 1,
      })
      playSong(song)
    } else {
      setPlayListIndex(realIdx)
      playSong(song)
    }
  }, [playList, playListIndex, playNextQueue, setPlayListIndex])

  const removeQueueItem = useCallback((song: any, vi: number, isNextQueue: boolean) => {
    if (isNextQueue) {
      const qi = vi - playListIndex - 1
      usePlaylistStore.setState({ playNextQueue: playNextQueue.filter((_, i) => i !== qi) })
    } else {
      removeFromPlayList(song.id)
    }
  }, [playListIndex, playNextQueue, removeFromPlayList])

  const toggleSongFavorite = useCallback((song: any) => {
    const added = toggleFavorite(song)
    setFavoriteVersion(v => v + 1)
    showToast(added ? '已收藏' : '已取消收藏', song.name)
  }, [])

  if (!showPlaylistDrawer) return null

  return (
    <>
      {/* 遮罩 */}
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
        onClick={() => setShowPlaylistDrawer(false)} />

      {/* 抽屉 */}
      <div className="fixed right-0 top-8 bottom-16 w-80 bg-white dark:bg-[#1a1a1a] border-l border-gray-200 dark:border-gray-800 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-gray-200 dark:border-gray-800 flex-shrink-0 bg-white/80 dark:bg-[#1a1a1a]/80 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-[#e60026]" />
            <h3 className="font-medium text-sm">播放队列</h3>
            <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded-full">
              {totalCount}
            </span>
          </div>
          <div className="flex items-center gap-0.5">
            {totalCount > 0 && (
              <button onClick={clearPlayAll}
                className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-400 hover:text-[#e60026] transition-colors"
                title="清空队列"><Trash2 className="w-4 h-4" /></button>
            )}
            <button onClick={() => setShowPlaylistDrawer(false)}
              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-400 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* List */}
        <div ref={listRef} className="flex-1 overflow-y-auto" onScroll={() => setActiveMenuKey(null)}>
          {totalCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Music className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-xs">播放队列为空</p>
              <p className="text-[10px] mt-1 opacity-50">从歌曲列表中添加音乐</p>
            </div>
          ) : (
            displayList.map((song: any, vi: number) => {
              const isCurrent = vi === playListIndex
              const isNextQueue = vi > playListIndex && vi <= playListIndex + playNextQueue.length
              // 在 playList 中的真实索引
              const realIdx = vi <= playListIndex ? vi : vi - playNextQueue.length
              const fav = isFavorite(song.id)
              const menuKey = `${song.id}-${vi}`
              void favoriteVersion

              return (
                <div
                  key={`${song.id}-${vi}`}
                  data-current-song={isCurrent ? '' : undefined}
                  className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors group ${
                    isCurrent ? 'bg-[#e60026]/8' : 'hover:bg-gray-100 dark:hover:bg-white/5'
                  }`}
                  onClick={() => {
                    playQueueItem(song, vi, isNextQueue, realIdx)
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setActiveMenuKey(menuKey)
                  }}
                >
                  {/* 序号 */}
                  <span className={`w-5 text-center text-[11px] font-medium flex-shrink-0 ${
                    isCurrent ? 'text-[#e60026]' : 'text-gray-400'
                  }`}>
                    {isCurrent ? <Play className="w-3.5 h-3.5 fill-current" /> : realIdx + 1}
                  </span>

                  {/* 封面 */}
                  <div className="w-10 h-10 rounded-md bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
                    <img src={getImgUrl(song)} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </div>

                  {/* 信息 */}
                  <div className="flex-1 min-w-0">
                    <div className={`text-[13px] truncate ${
                      isCurrent ? 'text-[#e60026] font-semibold' : isNextQueue ? 'text-[#e60026]' : ''
                    }`}>
                      {isNextQueue && (
                        <span className="text-[10px] bg-[#e60026]/10 text-[#e60026] px-1.5 py-0.5 rounded mr-1.5 align-middle">
                          下一首
                        </span>
                      )}
                      {song.name}
                    </div>
                    <div className="text-[11px] text-gray-500 truncate">
                      {song.ar?.map((a: any) => a.name).join(' / ')}
                    </div>
                  </div>

                  <div className="relative flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleSongFavorite(song)
                      }}
                      className={`p-1.5 rounded transition-colors hover:bg-gray-200 dark:hover:bg-white/10 ${fav ? 'text-[#e60026]' : 'text-gray-400 hover:text-[#e60026]'}`}
                      title={fav ? '取消收藏' : '收藏'}
                    >
                      <Heart className={`w-3.5 h-3.5 ${fav ? 'fill-current' : ''}`} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeQueueItem(song, vi, isNextQueue)
                      }}
                      className="p-1.5 rounded text-gray-400 transition-colors hover:bg-gray-200 hover:text-[#e60026] dark:hover:bg-white/10"
                      title="移除"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveMenuKey(activeMenuKey === menuKey ? null : menuKey)
                      }}
                      className={`p-1.5 rounded transition-colors hover:bg-gray-200 hover:text-[#e60026] dark:hover:bg-white/10 ${
                        activeMenuKey === menuKey ? 'bg-gray-200 text-[#e60026] dark:bg-white/10' : 'text-gray-400'
                      }`}
                      title="更多操作"
                    >
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>
                    {activeMenuKey === menuKey && (
                      <div
                        onPointerDown={(e) => e.stopPropagation()}
                        className="absolute right-0 top-full z-[60] mt-1 w-40 overflow-hidden rounded-lg border border-gray-100 bg-white py-1 shadow-xl shadow-black/10 dark:border-white/[0.08] dark:bg-[#242424]"
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            addToNextPlay(song)
                            setActiveMenuKey(null)
                            showToast('已添加到播放队列', '下一首播放')
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-600 transition-colors hover:bg-gray-50 hover:text-[#e60026] dark:text-gray-300 dark:hover:bg-white/[0.06]"
                        >
                          <ListPlus className="w-3.5 h-3.5" /> 下一首播放
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveMenuKey(null)
                            navigate(`/song/${song.id}`)
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-600 transition-colors hover:bg-gray-50 hover:text-[#e60026] dark:text-gray-300 dark:hover:bg-white/[0.06]"
                        >
                          <Info className="w-3.5 h-3.5" /> 歌曲详情
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveMenuKey(null)
                            navigate(`/song/${song.id}/comments`)
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-600 transition-colors hover:bg-gray-50 hover:text-[#e60026] dark:text-gray-300 dark:hover:bg-white/[0.06]"
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> 查看评论
                        </button>
                        {song.ar?.[0]?.id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setActiveMenuKey(null)
                              navigate(`/artist/${song.ar[0].id}`)
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-600 transition-colors hover:bg-gray-50 hover:text-[#e60026] dark:text-gray-300 dark:hover:bg-white/[0.06]"
                          >
                            <User className="w-3.5 h-3.5" /> 歌手页
                          </button>
                        )}
                        {(song.al?.id || song.album?.id) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setActiveMenuKey(null)
                              navigate(`/album/${song.al?.id || song.album?.id}`)
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-600 transition-colors hover:bg-gray-50 hover:text-[#e60026] dark:text-gray-300 dark:hover:bg-white/[0.06]"
                          >
                            <DiscAlbum className="w-3.5 h-3.5" /> 专辑页
                          </button>
                        )}
                        <div className="my-1 h-px bg-gray-100 dark:bg-white/[0.06]" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeQueueItem(song, vi, isNextQueue)
                            setActiveMenuKey(null)
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> {isNextQueue ? '移出下一首' : '移出队列'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}
