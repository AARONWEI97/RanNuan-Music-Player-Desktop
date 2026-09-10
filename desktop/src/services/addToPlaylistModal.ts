import { useEffect, useState } from 'react'
import type { SongResult } from '@shared'

interface AddToPlaylistState {
  open: boolean
  song: SongResult | null
}

const listeners = new Set<(state: AddToPlaylistState) => void>()
let current: AddToPlaylistState = { open: false, song: null }

function notify() {
  listeners.forEach((fn) => fn({ ...current }))
}

export function openAddToPlaylistModal(song: SongResult) {
  current = { open: true, song }
  notify()
}

export function closeAddToPlaylistModal() {
  current = { open: false, song: null }
  notify()
}

export function useAddToPlaylistModal() {
  const [state, setState] = useState<AddToPlaylistState>(current)

  useEffect(() => {
    listeners.add(setState)
    return () => { listeners.delete(setState) }
  }, [])

  return state
}
