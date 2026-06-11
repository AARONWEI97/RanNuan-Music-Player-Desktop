import { Loader } from 'lucide-react'

interface LoadMoreProps {
  loading: boolean
  hasMore: boolean
  error: boolean
  onLoadMore: () => void
  onRetry?: () => void
  /** Custom empty-end text (default "已加载全部") */
  endText?: string
}

export default function LoadMore({
  loading,
  hasMore,
  error,
  onLoadMore,
  onRetry,
  endText = '已加载全部',
}: LoadMoreProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader className="w-5 h-5 animate-spin text-[#e60026]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center py-3">
        <button
          onClick={onRetry || onLoadMore}
          className="text-sm text-[#e60026] hover:underline"
        >
          加载失败，点击重试
        </button>
      </div>
    )
  }

  if (hasMore) {
    return (
      <div className="flex justify-center py-3">
        <button
          onClick={onLoadMore}
          className="text-sm text-[#e60026] hover:underline"
        >
          加载更多
        </button>
      </div>
    )
  }

  return (
    <p className="text-center text-xs text-gray-400 py-4">— {endText} —</p>
  )
}
