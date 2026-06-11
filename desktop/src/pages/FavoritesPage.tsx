import { useState } from 'react'
import { Heart } from 'lucide-react'
import { getFavorites } from '@/store/favoritesStore'
import { playSong } from '@/services/audioService'
import SongRow from '@/components/common/SongRow'

export default function FavoritesPage() {
  const [favorites] = useState(() => getFavorites())

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">我喜欢的音乐</h1>
      {favorites.filter(Boolean).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Heart className="w-12 h-12 mb-4 opacity-30" />
          <p>暂无收藏歌曲</p>
          <p className="text-sm mt-1">右键歌曲选择收藏</p>
        </div>
      ) : (
        <div className="space-y-1">
          {favorites.filter(Boolean).map((song, idx) => (
            <SongRow key={song?.id ?? idx} song={song} index={idx} showPic={false} onPlay={() => playSong(song)} />
          ))}
        </div>
      )}
    </div>
  )
}
