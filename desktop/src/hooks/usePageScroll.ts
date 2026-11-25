import { useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

const MAX_SCROLL_ENTRIES = 96
const RESTORE_TIMEOUT = 3000

/** Browser history tracks the window, while the desktop app scrolls inside <main>. */
export function usePageScroll(minimized: boolean) {
  const mainRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const positions = useRef(new Map<string, number>())
  const previous = useRef<{ key: string; pathname: string } | null>(null)
  const { key, pathname } = useLocation()
  const navigationType = useNavigationType()

  useLayoutEffect(() => {
    const main = mainRef.current
    const content = contentRef.current
    if (minimized || !main || !content) return

    const old = previous.current
    previous.current = { key, pathname }
    const replaceInPlace = old?.pathname === pathname && navigationType === 'REPLACE'
    const target = positions.current.get(key) ?? (replaceInPlace ? positions.current.get(old.key) ?? 0 : 0)
    if (replaceInPlace && old.key !== key) positions.current.delete(old.key)

    const save = (top: number) => {
      const entries = positions.current
      entries.delete(key)
      entries.set(key, top)
      if (entries.size > MAX_SCROLL_ENTRIES) {
        const oldest = entries.keys().next().value
        if (oldest !== undefined) entries.delete(oldest)
      }
    }
    // Keep the original target while a lazy route or its API data is loading.
    save(target)
    let pending = false
    let observer: ResizeObserver | undefined
    let timeout: number | undefined
    const scroll = (top: number) => main.scrollTo({ top, behavior: 'instant' })
    const maxTop = () => main.scrollHeight - main.clientHeight
    const finish = () => {
      pending = false
      observer?.disconnect()
      window.clearTimeout(timeout)
      save(main.scrollTop)
    }
    const cancelOnInput = () => { if (pending) finish() }
    const cancelOnScrollKey = (event: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) cancelOnInput()
    }
    const onScroll = () => { if (!pending) save(main.scrollTop) }

    if (target === 0) {
      scroll(0)
    } else if (target <= maxTop() + 1) {
      scroll(target)
      save(main.scrollTop)
    } else {
      pending = true
      scroll(0)
      observer = new ResizeObserver(() => {
        if (!pending || target > maxTop() + 1) return
        scroll(target)
        finish()
      })
      observer.observe(content)
      observer.observe(main)
      timeout = window.setTimeout(() => {
        scroll(Math.min(target, Math.max(0, maxTop())))
        finish()
      }, RESTORE_TIMEOUT)
    }

    main.addEventListener('scroll', onScroll, { passive: true })
    if (pending) {
      main.addEventListener('wheel', cancelOnInput, { passive: true })
      main.addEventListener('pointerdown', cancelOnInput, { passive: true })
      window.addEventListener('keydown', cancelOnScrollKey)
    }

    return () => {
      observer?.disconnect()
      window.clearTimeout(timeout)
      main.removeEventListener('scroll', onScroll)
      main.removeEventListener('wheel', cancelOnInput)
      main.removeEventListener('pointerdown', cancelOnInput)
      window.removeEventListener('keydown', cancelOnScrollKey)
    }
  }, [key, pathname, navigationType, minimized])

  return { mainRef, contentRef }
}
