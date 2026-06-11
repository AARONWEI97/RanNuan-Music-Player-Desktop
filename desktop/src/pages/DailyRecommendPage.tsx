import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDayRecommend, getHistoryRecommendDates, getHistoryRecommendSongs, type SongResult, usePlaylistStore } from '@shared'
import { playSong } from '@/services/audioService'
import SongRow from '@/components/common/SongRow'
import { useProgressiveRender } from '@/hooks/useProgressiveRender'
import { coverUrl } from '@/utils/image'
import { Play, ChevronLeft, ChevronDown, ChevronUp, Calendar, Music2 } from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSong(song: any): SongResult {
  return {
    id: song.id,
    name: song.name,
    ar: song.ar || [],
    al: song.al || { name: '', id: 0, picUrl: '' },
    dt: song.dt || 0,
    picUrl: song.al?.picUrl || '',
    count: 0,
  }
}

export default function DailyRecommendPage() {
  const navigate = useNavigate()
  const { setPlayList, setPlayListIndex } = usePlaylistStore()
  const [songs, setSongs] = useState<SongResult[]>([])

  // 渐进式渲染
  const { renderedItems: renderedSongs, placeholderHeight: songsPlaceholder, sentinelRef: songsPrSentinel }
    = useProgressiveRender<SongResult>({ items: songs, itemHeight: 50, initialCount: 20, batchSize: 20 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [historyDates, setHistoryDates] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  const fetchSongs = useCallback(async (date?: string) => {
    setLoading(true)
    setError(false)
    try {
      let res
      if (date) {
        res = await getHistoryRecommendSongs(date)
      } else {
        res = await getDayRecommend()
      }
      const inner = res?.data?.data || res?.data
      const data = inner?.dailySongs || inner?.songs || inner?.data?.dailySongs || []
      if (!Array.isArray(data) || data.length === 0) {
        setError(true)
        setLoading(false)
        return
      }
      setSongs(data.map(mapSong))
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      setError(false)
      try {
        const res = await getDayRecommend()
        const inner = res?.data?.data || res?.data
        const data = inner?.dailySongs || inner?.songs || inner?.data?.dailySongs || []
        if (!mounted) return
        if (!Array.isArray(data) || data.length === 0) {
          setError(true)
          setLoading(false)
          return
        }
        setSongs(data.map(mapSong))
      } catch {
        if (mounted) setError(true)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    getHistoryRecommendDates()
      .then((res) => {
        const dates: string[] = res?.data?.data?.dates || []
        if (mounted && Array.isArray(dates)) setHistoryDates(dates)
      })
      .catch(() => {})
    return () => { mounted = false }
  }, [])

  const today = `${new Date().getFullYear()}/${new Date().getMonth() + 1}/${new Date().getDate()}`
  const dailyCover = songs[0]?.picUrl || songs[0]?.al?.picUrl

  const handlePlayAll = () => {
    if (songs.length === 0) return
    setPlayList(songs)
    setPlayListIndex(0)
    playSong(songs[0])
  }

  const handlePlayOne = (song: SongResult, idx: number) => {
    setPlayList(songs)
    setPlayListIndex(idx)
    playSong(song)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-[#e60026] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-gray-400 py-20">
        <Music2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>加载失败</p>
        <button
          onClick={() => fetchSongs(selectedDate || undefined)}
          className="mt-3 px-5 py-2 bg-[#e60026] text-white rounded-full text-sm font-medium hover:bg-[#c4001f] transition-colors"
        >
          重试
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#e60026] transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        返回
      </button>

      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#e60026]/20 via-[#e60026]/5 to-transparent p-6">
        <div className="flex gap-6 items-start">
          {/* Cover */}
          <div className="relative w-40 h-40 rounded-xl bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0 shadow-lg">
            {dailyCover ? (
              <img src={coverUrl(dailyCover)} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <Calendar className="w-12 h-12" />
              </div>
            )}
            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] font-bold">
              {selectedDate || today}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 pt-2">
            <h1 className="text-2xl font-bold mb-2">{selectedDate ? '历史日推' : '每日推荐'}</h1>
            <p className="text-sm text-gray-500 mb-4">
              根据你的音乐口味，为你推荐 {songs.length} 首歌曲
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-5">
              <Music2 className="w-3.5 h-3.5" />
              {songs.length} 首歌曲
            </div>
            {selectedDate && (
              <button
                onClick={() => { setSelectedDate(null); fetchSongs(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#e60026]/10 text-[#e60026] text-xs font-medium hover:bg-[#e60026]/20 transition-colors mb-3"
              >
                <Calendar className="w-3.5 h-3.5" />
                回到今日推荐
              </button>
            )}
            <button
              onClick={handlePlayAll}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#e60026] text-white rounded-full text-sm font-semibold hover:bg-[#c4001f] hover:shadow-lg hover:shadow-[#e60026]/20 transition-all"
            >
              <Play className="w-4 h-4" />
              播放全部
            </button>
          </div>
        </div>
      </div>

      {/* History */}
      {historyDates.length > 0 && (
        <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-4">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 w-full"
          >
            <Calendar className="w-4 h-4 text-[#e60026]" />
            <span className="flex-1 text-left">历史日推 ({historyDates.length} 天可用)</span>
            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showHistory && (
            <div className="flex flex-wrap gap-2 mt-3">
              {historyDates.slice(0, 20).map((date) => (
                <button
                  key={date}
                  onClick={() => { setSelectedDate(date); setShowHistory(false); fetchSongs(date); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    selectedDate === date
                      ? 'bg-[#e60026]/10 border-[#e60026] text-[#e60026]'
                      : 'bg-white dark:bg-white/5 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-[#e60026]'
                  }`}
                >
                  {date}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Track list */}
      <div className="space-y-0.5">
        {renderedSongs.map((song, idx) => (
          <SongRow
            key={String(song.id)}
            song={song}
            index={idx}
            onPlay={() => handlePlayOne(song, idx)}
          />
        ))}
      </div>
      {songsPlaceholder > 0 && (
        <div style={{ height: songsPlaceholder }} className="flex items-center justify-center">
          <span className="text-sm text-gray-400">↓ 继续下滑加载更多</span>
        </div>
      )}
      <div ref={songsPrSentinel} className="h-1" />
    </div>
  )
}
