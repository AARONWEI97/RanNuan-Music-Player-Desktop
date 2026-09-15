import { create } from 'zustand'
import {
  EMPTY_UNIVERSE_SNAPSHOT,
  UNIVERSE_CHANNEL,
  UNIVERSE_CMD,
  UNIVERSE_READY,
  UNIVERSE_SEARCH_RESULT,
  UNIVERSE_STATE,
  isEmbedded,
  type UniverseCommand,
  type UniverseHostMessage,
  type UniverseSearchResult,
  type UniverseSnapshot,
  type UniverseSong,
} from './protocol'

export { isEmbedded }

interface UniverseHostState {
  embedded: boolean
  snapshot: UniverseSnapshot
  search: UniverseSearchResult | null
  searching: boolean
}

interface UniverseHostActions {
  setSnapshot: (snapshot: UniverseSnapshot) => void
  setSearch: (search: UniverseSearchResult | null) => void
  setSearching: (searching: boolean) => void
}

export const useUniverseHostStore = create<UniverseHostState & UniverseHostActions>((set) => ({
  embedded: isEmbedded,
  snapshot: EMPTY_UNIVERSE_SNAPSHOT,
  search: null,
  searching: false,
  setSnapshot: (snapshot) => set({ snapshot }),
  setSearch: (search) => set({ search, searching: false }),
  setSearching: (searching) => set({ searching }),
}))

export function getOrbitTimeScale(): number {
  const { embedded, snapshot } = useUniverseHostStore.getState()
  if (!embedded) return 1
  if (!snapshot.song) return 0.45
  return snapshot.isPlay ? 1 : 0.22
}

export function getSunPulseScale(): number {
  const { embedded, snapshot } = useUniverseHostStore.getState()
  if (!embedded) return 1
  if (!snapshot.song) return 0.55
  return snapshot.isPlay ? 1 : 0.35
}

function targetOrigin(): string {
  try {
    return window.location.origin
  } catch {
    return '*'
  }
}

export function sendUniverseCmd(cmd: UniverseCommand) {
  if (!isEmbedded) return
  window.parent.postMessage(
    { channel: UNIVERSE_CHANNEL, type: UNIVERSE_CMD, cmd },
    targetOrigin()
  )
}

export function requestUniverseSearch(keywords: string): string {
  const requestId = `u-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  useUniverseHostStore.setState({ search: null, searching: true })
  sendUniverseCmd({ type: 'search', requestId, keywords })
  return requestId
}

export function playUniverseSong(song: UniverseSong) {
  sendUniverseCmd({ type: 'play-song', song })
}

export function toggleHostPlayback() {
  sendUniverseCmd({ type: 'toggle-play' })
}

export function initUniverseHost(): () => void {
  if (!isEmbedded) return () => {}

  const onMessage = (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return
    const data = event.data as UniverseHostMessage
    if (!data || data.channel !== UNIVERSE_CHANNEL) return

    if (data.type === UNIVERSE_STATE && data.snapshot) {
      useUniverseHostStore.getState().setSnapshot(data.snapshot)
    }
    if (data.type === UNIVERSE_SEARCH_RESULT && data.search) {
      useUniverseHostStore.getState().setSearch(data.search)
    }
  }

  window.addEventListener('message', onMessage)
  window.parent.postMessage(
    { channel: UNIVERSE_CHANNEL, type: UNIVERSE_READY },
    targetOrigin()
  )

  return () => {
    window.removeEventListener('message', onMessage)
  }
}
