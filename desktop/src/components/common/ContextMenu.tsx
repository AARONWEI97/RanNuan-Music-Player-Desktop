import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { hideContextMenu, type ContextMenuState } from '@/hooks/useContextMenu'
import { showToast } from '@/utils/toast'

export default function ContextMenu({ menu }: { menu: ContextMenuState }) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  useLayoutEffect(() => {
    if (!menu.visible || !ref.current) return
    const bounds = ref.current.getBoundingClientRect()
    setPosition({
      x: Math.max(8, Math.min(menu.x, window.innerWidth - bounds.width - 8)),
      y: Math.max(8, Math.min(menu.y, window.innerHeight - bounds.height - 8)),
    })
    const trigger = document.activeElement
    ref.current.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({ preventScroll: true })
    const element = ref.current
    return () => {
      if (trigger instanceof HTMLElement && (element.contains(document.activeElement) || document.activeElement === document.body)) {
        trigger.focus({ preventScroll: true })
      }
    }
  }, [menu.visible, menu.x, menu.y, menu.items])

  if (!menu.visible) return null

  return createPortal(
    <div ref={ref} data-context-menu role="menu" aria-label="歌曲操作"
      className="fixed z-[10000] w-56 max-w-[calc(100vw-16px)] max-h-[calc(100dvh-16px)] overflow-y-auto overscroll-contain rounded-lg border border-gray-200 bg-white py-1 shadow-xl dark:border-gray-700 dark:bg-[#2a2a2a]"
      style={{ top: position.y, left: position.x }}
      onClick={event => event.stopPropagation()}
      onContextMenu={event => event.preventDefault()}
      onKeyDown={event => {
        if (event.key === 'Tab') { hideContextMenu(); return }
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
        event.preventDefault()
        event.stopPropagation()
        const buttons = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') || [])
        const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
          : (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length
        buttons[next]?.focus()
      }}>
      {menu.items.map((item, index) => item.divider ? (
        <div key={index} role="separator" className="my-1 border-t border-gray-200 dark:border-gray-700" />
      ) : (
        <button key={index} type="button" role="menuitem" disabled={item.disabled} title={item.label}
          onClick={() => {
            hideContextMenu()
            void Promise.resolve().then(() => item.onClick()).catch(error => {
              showToast('操作失败', error instanceof Error ? error.message : '请稍后重试')
            })
          }}
          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors focus-visible:bg-gray-100 focus-visible:outline-none dark:focus-visible:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 ${
            item.danger ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10' : 'hover:bg-gray-100 dark:hover:bg-white/10'
          }`}>
          {item.icon && <span className="h-4 w-4 shrink-0 [&>svg]:h-4 [&>svg]:w-4">{item.icon}</span>}
          <span className="truncate">{item.label}</span>
        </button>
      ))}
    </div>, document.body,
  )
}
