import { useEffect, useRef, useMemo } from 'react'
import { usePlaylistStore } from '@shared'
import { X, Play, Music, Trash2 } from 'lucide-react'
import { playSong } from '@/services/audioService'
import { thumbUrl } from '@/utils/image'

export default function PlaylistDrawer() {
  const {
    playList, playListIndex, playNextQueue,
    showPlaylistDrawer, setShowPlaylistDrawer,
    removeFromPlayList, setPlayListIndex,
    clearPlayAll,
  } = usePlaylistStore()

  const listRef = useRef<HTMLDivElement>(null)

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

  if (!showPlaylistDrawer) return null

  const totalCount = displayList.length

  const getImgUrl = (song: any) =>
    thumbUrl(song.picUrl || song.al?.picUrl || song.album?.picUrl)

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
        <div ref={listRef} className="flex-1 overflow-y-auto">
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

              return (
                <div
                  key={`${song.id}-${vi}`}
                  data-current-song={isCurrent ? '' : undefined}
                  className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors group ${
                    isCurrent ? 'bg-[#e60026]/8' : 'hover:bg-gray-100 dark:hover:bg-white/5'
                  }`}
                  onClick={() => {
                    if (isNextQueue) {
                      // 从 nextQueue 取出 → 插入 playList → 播放
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

                  {/* 删除 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (isNextQueue) {
                        const qi = vi - playListIndex - 1
                        usePlaylistStore.setState({ playNextQueue: playNextQueue.filter((_, i) => i !== qi) })
                      } else {
                        removeFromPlayList(song.id)
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-400 hover:text-[#e60026] transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}
