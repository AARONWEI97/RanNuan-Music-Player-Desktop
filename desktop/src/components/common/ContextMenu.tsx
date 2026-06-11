import type { MenuItem } from '@/hooks/useContextMenu'
import { hideContextMenu } from '@/hooks/useContextMenu'

interface ContextMenuProps {
  menu: { x: number; y: number; items: MenuItem[]; visible: boolean }
}

export default function ContextMenu({ menu }: ContextMenuProps) {
  if (!menu.visible) return null

  // Clamp position so menu doesn't overflow viewport
  const maxX = window.innerWidth - 180
  const maxY = window.innerHeight - menu.items.length * 36 - 20
  const x = Math.min(menu.x, maxX)
  const y = Math.min(menu.y, maxY)

  return (
    <div
      data-context-menu
      className="fixed z-[100] bg-white dark:bg-[#2a2a2a] rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[160px] animate-in fade-in duration-100"
      style={{ top: y, left: x }}
      onClick={(e) => e.stopPropagation()}
    >
      {menu.items.map((item, idx) => (
        item.divider ? (
          <div key={idx} className="my-1 border-t border-gray-200 dark:border-gray-700" />
        ) : (
          <button
            key={idx}
            onClick={() => {
              hideContextMenu()
              item.onClick()
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            {item.icon && <span className="w-4 h-4">{item.icon}</span>}
            {item.label}
          </button>
        )
      ))}
    </div>
  )
}
