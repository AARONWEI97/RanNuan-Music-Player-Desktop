import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePlaylistStore, getMusicDetail } from '@shared'
import { playSong } from '@/services/audioService'
import { ArrowLeft, Play, Music, User } from 'lucide-react'
import CommentSection from '@/components/common/CommentSection'
import { coverUrl, thumbUrl } from '@/utils/image'

interface SongMeta {
  id: number
  name: string
  picUrl?: string
  ar?: { id: number; name: string }[]
  al?: { id: number; name: string; picUrl?: string }
}

export default function SongCommentPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const songId = Number(id)
  const [song, setSong] = useState<SongMeta | null>(null)
  const [commentTotal, setCommentTotal] = useState(0)

  useEffect(() => {
    if (!songId) return
    getMusicDetail([songId]).then((res: any) => {
      const list = res?.data?.songs || res?.data?.data?.songs || []
      if (list[0]) {
        const s = list[0]
        setSong({
          id: s.id, name: s.name,
          picUrl: s.al?.picUrl || '',
          ar: s.ar?.map((a: any) => ({ id: a.id, name: a.name })) || [],
          al: s.al || { id: 0, name: '', picUrl: '' },
        })
      }
    }).catch(() => {})
  }, [songId])

  const handlePlay = () => {
    if (!song) return
    const store = usePlaylistStore.getState()
    const songObj = {
      id: song.id, name: song.name,
      picUrl: song.picUrl || '',
      ar: song.ar || [],
      al: song.al || { id: 0, name: '', picUrl: '' },
      count: 0,
    }
    store.setPlayList([...store.playList, songObj as any])
    store.setPlayListIndex(store.playList.length)
    playSong(songObj as any)
  }

  return (
    <div>
      {/* header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">歌曲评论</h1>
      </div>

      {/* song info card */}
      {song && (
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.06] mb-5">
          <div className="w-16 h-16 rounded-xl bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0 shadow-sm">
            {song.picUrl ? (
              <img src={thumbUrl(song.picUrl)} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400"><Music className="w-6 h-6" /></div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-gray-900 dark:text-white truncate">{song.name}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {song.ar?.map(a => a.name).join(' / ') || '未知歌手'}
              {song.al?.name ? ` · ${song.al.name}` : ''}
            </p>
          </div>
          <button onClick={handlePlay}
            className="w-10 h-10 rounded-full bg-[#e60026] text-white flex items-center justify-center hover:bg-[#c4001f] shadow-sm flex-shrink-0 transition-colors">
            <Play className="w-4 h-4 ml-0.5" />
          </button>
        </div>
      )}

      {/* stats */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-5 rounded-full bg-[#e60026]" />
        <h2 className="text-sm font-bold text-gray-900 dark:text-white">评论</h2>
        {commentTotal > 0 && <span className="text-[11px] text-gray-400 ml-auto">{commentTotal} 条</span>}
      </div>

      {/* comments */}
      {songId > 0 ? (
        <CommentSection resourceId={songId} resourceType="song" onTotalChange={setCommentTotal} />
      ) : (
        <div className="text-center py-12 text-sm text-gray-400">歌曲不存在</div>
      )}
    </div>
  )
}
