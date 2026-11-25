import { ArtistLinks } from '@/components/common/MusicLinks'
import { useParams } from 'react-router-dom'
import { useBackNavigation } from '@/hooks/useBackNavigation'
import { showToast } from '@/utils/toast'
import { useEffect, useState } from 'react'
import { getAlbumDetail, usePlaylistStore } from '@shared'
import type { SongResult } from '@shared'
import { playSong } from '@/services/audioService'
import SongRow from '@/components/common/SongRow'
import { useProgressiveRender } from '@/hooks/useProgressiveRender'
import { coverUrl } from '@/utils/image'
import { ArrowLeft, Disc, Play, ChevronDown, ChevronUp } from 'lucide-react'

export default function AlbumPage() {
  const { id } = useParams<{ id: string }>()
  const handleBack = useBackNavigation()
  const [album, setAlbum] = useState<{ name?: string; picUrl?: string; artist?: { id: number; name: string }; artists?: { id: number; name: string }[]; description?: string } | null>(null)
  const [songs, setSongs] = useState<SongResult[]>([])
  const [descExpanded, setDescExpanded] = useState(false)
  const { setPlayList, setPlayListIndex } = usePlaylistStore()

  const handlePlayAll = () => {
    if (songs.length === 0) return
    setPlayList(songs)
    setPlayListIndex(0)
    playSong(songs[0])
  }

  const handlePlayOne = (song: SongResult) => {
    setPlayList(songs)
    setPlayListIndex(songs.indexOf(song))
    playSong(song)
  }

  // 渐进式渲染（专辑可能有几十首歌）
  const {
    renderedItems: renderedSongs,
    placeholderHeight: songsPlaceholder,
    sentinelRef: songsSentinelRef,
  } = useProgressiveRender<SongResult>({
    items: songs,
    itemHeight: 50,
    initialCount: 30,
    batchSize: 30,
    resetKey: id,
  })

  useEffect(() => {
    if (!id) return
    let cancelled = false
    getAlbumDetail(Number(id)).then((res) => {
      if (cancelled) return
      setAlbum(res?.data?.album)
      const albumData = res?.data?.album
      setSongs((res?.data?.songs || []).map((song: SongResult) => ({
        ...song,
        al: song.al?.id ? song.al : { id: Number(id), name: albumData?.name || '', picUrl: albumData?.picUrl },
        ar: song.ar?.length ? song.ar : song.artists?.length ? song.artists : albumData?.artists || (albumData?.artist ? [albumData.artist] : []),
      })))
    }).catch(() => { if (!cancelled) showToast('专辑加载失败', '请稍后重试') })
    return () => { cancelled = true }
  }, [id])

  return (
    <div>
      {/* Back button */}
      <button
        onClick={handleBack}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#e60026] transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        返回
      </button>

      <div className="flex gap-6 mb-8">
        <div className="w-40 h-40 rounded-lg bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
          {album?.picUrl ? (
            <img src={coverUrl(album.picUrl)} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <Disc className="w-12 h-12" />
            </div>
          )}
        </div>
        <div className="flex flex-col justify-center flex-1">
          <h1 className="text-2xl font-bold">{album?.name}</h1>
          <div className="text-sm text-[#e60026] mt-2 text-left">
            <ArtistLinks artists={album?.artists?.length ? album.artists : album?.artist ? [album.artist] : []} />
          </div>
          {album?.description && (
            <div className="mt-2">
              <p className={`text-sm text-gray-500 ${descExpanded ? '' : 'line-clamp-2'}`}>
                {album.description}
              </p>
              {album.description.length > 80 && (
                <button
                  onClick={() => setDescExpanded(!descExpanded)}
                  className="text-xs text-[#e60026] hover:underline mt-1 flex items-center gap-1"
                >
                  {descExpanded ? (
                    <>
                      收起 <ChevronUp className="w-3 h-3" />
                    </>
                  ) : (
                    <>
                      展开 <ChevronDown className="w-3 h-3" />
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">专辑歌曲</h2>
        <button
          onClick={handlePlayAll}
          disabled={songs.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-[#e60026] text-white rounded-full hover:bg-[#c5001f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play className="w-4 h-4" fill="currentColor" />
          播放全部
        </button>
      </div>
      <div className="space-y-1">
        {renderedSongs.map((song, idx) => (
          <SongRow key={song.id} song={song} index={idx} showPic={false} onPlay={() => handlePlayOne(song)} />
        ))}
      </div>
      {songsPlaceholder > 0 && (
        <div style={{ height: songsPlaceholder }} className="flex items-center justify-center">
          <span className="text-sm text-gray-400">↓ 继续下滑加载剩余歌曲</span>
        </div>
      )}
      <div ref={songsSentinelRef} className="h-1" />
    </div>
  )
}
