import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getAlbumDetail } from '@shared'
import type { SongResult } from '@shared'
import { playSong } from '@/services/audioService'
import SongRow from '@/components/common/SongRow'
import { useProgressiveRender } from '@/hooks/useProgressiveRender'
import { coverUrl } from '@/utils/image'
import { ArrowLeft, Disc } from 'lucide-react'

export default function AlbumPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [album, setAlbum] = useState<{ name?: string; picUrl?: string; artist?: { id: number; name: string }; description?: string } | null>(null)
  const [songs, setSongs] = useState<SongResult[]>([])

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
    getAlbumDetail(Number(id)).then((res) => {
      setAlbum(res?.data?.album)
      setSongs(res?.data?.songs || [])
    })
  }, [id])

  return (
    <div>
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
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
        <div className="flex flex-col justify-center">
          <h1 className="text-2xl font-bold">{album?.name}</h1>
          <button
            className="text-sm text-[#e60026] mt-2 hover:underline text-left"
            onClick={() => album?.artist && navigate(`/artist/${album.artist.id}`)}
          >
            {album?.artist?.name}
          </button>
          <p className="text-sm text-gray-500 mt-2 line-clamp-2">{album?.description}</p>
        </div>
      </div>

      <h2 className="text-lg font-bold mb-4">专辑歌曲</h2>
      <div className="space-y-1">
        {renderedSongs.map((song, idx) => (
          <SongRow key={song.id} song={song} index={idx} showPic={false} onPlay={() => playSong(song)} />
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
