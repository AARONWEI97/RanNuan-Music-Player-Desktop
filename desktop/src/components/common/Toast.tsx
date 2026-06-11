import { useToast } from '@/utils/toast'
import { Music } from 'lucide-react'

export default function ToastContainer() {
  const items = useToast()

  return (
    <div className="fixed top-12 right-4 z-[70] space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-[#2a2a2a] rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 animate-in slide-in-from-right"
        >
          <Music className="w-4 h-4 text-[#e60026] flex-shrink-0" />
          <div>
            <p className="text-sm font-medium">{item.message}</p>
            {item.subMessage && <p className="text-xs text-gray-500">{item.subMessage}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}
