import { useState, useEffect, useCallback, type ReactNode } from 'react'

export interface MenuItem {
  label: string
  icon?: ReactNode
  onClick: () => void
  divider?: boolean
  danger?: boolean
  disabled?: boolean
}

interface ContextMenuState {
  x: number
  y: number
  items: MenuItem[]
  visible: boolean
  onClose?: () => void
}

// ─── Global singleton (same pattern as toast.ts) ───
const listeners: Set<(menu: ContextMenuState) => void> = new Set()
let closeCallbacks: Array<() => void> = []
let currentMenu: ContextMenuState = { x: 0, y: 0, items: [], visible: false }

function notifyAll() {
  listeners.forEach((fn) => fn({ ...currentMenu }))
}

/** options.onClose — 菜单关闭时回调（菜单项点击 / 外部点击 / 滚动） */
export function showContextMenu(
  x: number,
  y: number,
  items: MenuItem[],
  opts?: { onClose?: () => void }
) {
  // ★ 打开新菜单前，先触发旧菜单的关闭回调
  if (closeCallbacks.length > 0) {
    const old = closeCallbacks
    closeCallbacks = []
    old.forEach((cb) => setTimeout(cb, 0))
  }
  closeCallbacks = opts?.onClose ? [opts.onClose] : []
  currentMenu = { x, y, items, visible: true }
  notifyAll()
}

export function hideContextMenu() {
  if (currentMenu.visible) {
    currentMenu = { ...currentMenu, visible: false }
    notifyAll()
    // ─── 触发关闭回调 ───
    const cbs = closeCallbacks
    closeCallbacks = []
    cbs.forEach((cb) => setTimeout(cb, 0))
  }
}

export function useContextMenu() {
  const [menu, setMenu] = useState<ContextMenuState>(currentMenu)

  useEffect(() => {
    listeners.add(setMenu)
    return () => { listeners.delete(setMenu) }
  }, [])

  const showMenu = useCallback(
    (e: React.MouseEvent, items: MenuItem[], opts?: { onClose?: () => void }) => {
      e.preventDefault()
      e.stopPropagation()
      showContextMenu(e.clientX, e.clientY, items, opts)
    },
    []
  )

  const hideMenu = useCallback(() => {
    hideContextMenu()
  }, [])

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // 如果点击的是菜单本身或菜单项，不关闭
      if (target.closest('[data-context-menu]')) return
      hideMenu()
    }
    // ★ 用 mousedown 而不是 click，避免和按钮的 click 冲突
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('scroll', hideMenu, true)
    return () => {
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('scroll', hideMenu, true)
    }
  }, [hideMenu])

  return { menu, showMenu, hideMenu }
}
