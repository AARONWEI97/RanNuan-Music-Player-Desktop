import { useState, useEffect } from 'react'

interface ToastItem {
  id: number
  message: string
  subMessage?: string
}

let toastId = 0
const listeners: Set<(items: ToastItem[]) => void> = new Set()
let currentItems: ToastItem[] = []

function notify() {
  listeners.forEach((fn) => fn([...currentItems]))
}

export function showToast(message: string, subMessage?: string) {
  const id = ++toastId
  currentItems = [...currentItems, { id, message, subMessage }]
  notify()
  setTimeout(() => {
    currentItems = currentItems.filter((t) => t.id !== id)
    notify()
  }, 3000)
}

export function useToast() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    listeners.add(setItems)
    return () => { listeners.delete(setItems) }
  }, [])

  return items
}
