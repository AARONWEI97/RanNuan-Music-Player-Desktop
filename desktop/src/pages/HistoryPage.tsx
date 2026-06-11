import { useState } from 'react'
import { type SongResult } from '@shared'
import { getHistory } from '@/store/historyStore'
import { playSong } from '@/services/audioService'
import SongRow from '@/components/common/SongRow'
import { Clock } from 'lucide-react'

export default function HistoryPage() {
  const [history] = useState<SongResult[]>(() => getHistory())

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">最近播放</h1>
      {history.filter(Boolean).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Clock className="w-12 h-12 mb-4 opacity-30" />
          <p>暂无播放记录</p>
        </div>
      ) : (
        <div className="space-y-1">
          {history.filter(Boolean).map((song, idx) => (
            <SongRow key={`${song?.id ?? idx}-${idx}`} song={song} index={idx} onPlay={() => playSong(song)} />
          ))}
        </div>
      )}
    </div>
  )
}
