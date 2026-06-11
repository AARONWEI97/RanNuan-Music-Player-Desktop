import { useState, useEffect, useMemo, useRef } from 'react'

interface UseProgressiveRenderOptions<T> {
  /** 全量数据列表 */
  items: T[]
  /** 每项估算高度（px） */
  itemHeight: number
  /** 初始渲染数量（默认 20） */
  initialCount?: number
  /** 每次追加数量（默认等于 initialCount） */
  batchSize?: number
  /** IntersectionObserver 触发提前量，单位 px（默认 200） */
  rootMargin?: number
  /** 当此 key 变化时重置渲染限制（如歌手ID、排序方式） */
  resetKey?: string | number
  /** 占位区最大高度（px），默认 300。防止列表过大时出现海量空白 */
  maxPlaceholderHeight?: number
}

interface UseProgressiveRenderResult<T> {
  /** 当前应渲染的截断列表 */
  renderedItems: T[]
  /** 未渲染项的占位高度（px），已按 maxPlaceholderHeight 截断 */
  placeholderHeight: number
  /** 哨兵元素 ref，需要挂在列表底部 */
  sentinelRef: React.RefObject<HTMLDivElement | null>
  /** 当前渲染上限 */
  renderLimit: number
  /** 手动重置渲染限制 */
  resetRenderLimit: () => void
}

/**
 * 渐进式渲染 Hook
 *
 * 原理：初始只渲染少量 DOM 节点，滚动到底部哨兵时逐步追加，
 * 同时用 placeholderHeight 保持滚动条长度，避免跳动。
 * 比虚拟滚动简单，不需要精确计算每个 item 的位置。
 *
 * v2：增加 maxPlaceholderHeight，防止大列表产生海量空白区域，
 * 用户只需滚动少量像素即可触发下一批渲染。
 */
export function useProgressiveRender<T>(
  options: UseProgressiveRenderOptions<T>
): UseProgressiveRenderResult<T> {
  const {
    items,
    itemHeight,
    initialCount = 20,
    batchSize = initialCount,
    rootMargin = 200,
    resetKey,
    maxPlaceholderHeight = 300,
  } = options

  const [renderLimit, setRenderLimit] = useState(initialCount)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // resetKey 变化时（如切换歌手、排序方式），重置渲染限制
  useEffect(() => {
    Promise.resolve().then(() => setRenderLimit(initialCount))
  }, [resetKey, initialCount])

  const renderedItems = useMemo(
    () => items.slice(0, renderLimit),
    [items, renderLimit]
  )

  const unrenderedCount = Math.max(0, items.length - renderLimit)
  // 占位高度：取真实高度和最大限制的较小值，避免海量空白
  const rawPlaceholder = unrenderedCount * itemHeight
  const placeholderHeight = Math.min(rawPlaceholder, maxPlaceholderHeight)

  // IntersectionObserver：哨兵进入视口时追加渲染数量
  // 依赖 items.length 确保数据到达后立即建立观察
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || unrenderedCount === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setRenderLimit((prev) => Math.min(prev + batchSize, items.length))
        }
      },
      { rootMargin: `${rootMargin}px 0px` }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [items.length, unrenderedCount, batchSize, rootMargin])

  const resetRenderLimit = () => setRenderLimit(initialCount)

  return {
    renderedItems,
    placeholderHeight,
    sentinelRef,
    renderLimit,
    resetRenderLimit,
  }
}
