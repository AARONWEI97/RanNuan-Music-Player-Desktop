import { useEffect, useRef } from 'react'

/**
 * 无限滚动 hook — 监听哨兵元素进入视口时自动触发 loadMore
 *
 * v2: 使用 ref 持有最新回调引用，避免 loadMore/hasMore/loading 引用变化
 * 导致 IntersectionObserver 频繁销毁/重建。
 */
export function useInfiniteScroll(
  loadMore: () => void,
  hasMore: boolean,
  loading: boolean
) {
  const sentinelRef = useRef<HTMLDivElement>(null)

  // 用 ref 持有最新值，避免 effect 依赖变化
  const loadMoreRef = useRef(loadMore)
  loadMoreRef.current = loadMore
  const hasMoreRef = useRef(hasMore)
  hasMoreRef.current = hasMore
  const loadingRef = useRef(loading)
  loadingRef.current = loading

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreRef.current && !loadingRef.current) {
          loadMoreRef.current()
        }
      },
      { rootMargin: '200px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, []) // ★ 只创建一次 observer，用 ref 取最新值

  return sentinelRef
}
