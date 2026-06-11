import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToplist } from '@shared'
import { coverUrl } from '@/utils/image'
import { Trophy, Play } from 'lucide-react'

interface ToplistItem {
  id: number
  name: string
  coverImgUrl: string
  description?: string
  updateFrequency?: string
  tracks?: { first: string; second: string }[]
}

export default function TopListPage() {
  const navigate = useNavigate()
  const [lists, setLists] = useState<ToplistItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getToplist().then((res) => {
      setLists(res?.data?.list || [])
    }).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-[#e60026] border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="w-6 h-6 text-[#e60026]" />
        <h1 className="text-2xl font-bold">排行榜</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {lists.map((item) => (
          <div
            key={item.id}
            className="bg-white dark:bg-[#222] rounded-xl p-4 hover:shadow-lg transition-shadow cursor-pointer group"
            onClick={() => navigate(`/playlist/${item.id}`)}
          >
            <div className="flex gap-4">
              <div className="w-24 h-24 rounded-lg bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0 relative">
                <img src={coverUrl(item.coverImgUrl)} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Play className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate">{item.name}</h3>
                <p className="text-xs text-gray-400 mt-1">{item.updateFrequency}</p>
                <div className="mt-2 space-y-0.5">
                  {item.tracks?.slice(0, 3).map((t, i) => (
                    <p key={i} className="text-xs text-gray-500 truncate">
                      <span className="text-gray-400 mr-1">{i + 1}.</span>
                      {t.first} - {t.second}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
