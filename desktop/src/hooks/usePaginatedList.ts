import { useState, useCallback, useRef, useEffect } from 'react'

export interface PaginatedListState<T> {
  items: T[]
  offset: number
  hasMore: boolean
  loading: boolean
  initialLoading: boolean
  error: boolean
}

export interface PaginatedListActions<T> {
  /** Fetch first page (resets list) */
  refresh: () => Promise<void>
  /** Fetch next page (appends) */
  loadMore: () => Promise<void>
  /** Reset to empty, ready for next refresh */
  reset: () => void
  /** Manually set items (e.g. from a different source) */
  setItems: (items: T[]) => void
}

export interface UsePaginatedListOptions<T, P> {
  /** The API call. Receives (params with offset/limit) + extra args. Must return array of items. */
  fetcher: (params: P & { offset: number; limit: number }) => Promise<T[]>
  /** Extra params passed to fetcher (e.g. { id: 123, order: 'hot' }) */
  params: P
  /** Page size (default 30) */
  pageSize?: number
}

export function usePaginatedList<T, P extends Record<string, unknown>>(
  options: UsePaginatedListOptions<T, P>
): PaginatedListState<T> & PaginatedListActions<T> {
  const { fetcher, params, pageSize = 30 } = options

  const [items, setItems] = useState<T[]>([])
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(false)
  const [error, setError] = useState(false)

  // 用 ref 持有最新 fetcher/params，避免内联 fetcher 每帧变化导致 loadMore/refresh 引用抖动
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher
  const paramsRef = useRef(params)
  paramsRef.current = params

  // Use ref to avoid stale closures in loadMore
  const currentItemsRef = useRef<T[]>([])
  useEffect(() => { currentItemsRef.current = items })

  const refresh = useCallback(async () => {
    setLoading(true)
    setInitialLoading(true)
    setError(false)
    try {
      const result = await fetcherRef.current({ ...paramsRef.current, offset: 0, limit: pageSize })
      setItems(result)
      setOffset(result.length)
      setHasMore(result.length >= pageSize)
    } catch {
      setError(true)
      setHasMore(false)
    } finally {
      setLoading(false)
      setInitialLoading(false)
    }
  }, [pageSize])

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)
    setError(false)
    try {
      const currentOffset = offset
      const result = await fetcherRef.current({ ...paramsRef.current, offset: currentOffset, limit: pageSize })
      const newItems = [...currentItemsRef.current, ...result]
      setItems(newItems)
      setOffset(currentOffset + result.length)
      setHasMore(result.length >= pageSize)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [pageSize, offset, hasMore, loading])

  const reset = useCallback(() => {
    setItems([])
    setOffset(0)
    setHasMore(true)
    setError(false)
  }, [])

  const setItemsManual = useCallback((newItems: T[]) => {
    setItems(newItems)
    setOffset(newItems.length)
    setHasMore(newItems.length >= pageSize)
  }, [pageSize])

  return {
    items,
    offset,
    hasMore,
    loading,
    initialLoading,
    error,
    refresh,
    loadMore,
    reset,
    setItems: setItemsManual,
  }
}
