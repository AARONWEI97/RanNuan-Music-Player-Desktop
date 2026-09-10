import { useEffect, useState } from 'react'
import { getSearch, type SongResult } from '@shared'
import { playSong } from '@/services/audioService'
import { usePlaylistStore } from '@shared'

interface SearchResponse {
  result?: {
    songs?: SongResult[]
  }
  songs?: SongResult[]
}

export default function UniversePage() {
  const [frameKey, setFrameKey] = useState(0)
  const [frameError, setFrameError] = useState(false)
  const [frameReady, setFrameReady] = useState(false)
  useEffect(() => {
    const onMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.type !== 'ranran:search-play') return
      const title = String(event.data.title || '').trim()
      const artist = String(event.data.artist || '').trim()
      if (!title) return
      try {
        const response = await getSearch({ keywords: `${title} ${artist}`, type: 1, limit: 10, offset: 0 })
        const data = response.data as SearchResponse
        const songs = data.result?.songs ?? data.songs ?? []
        const song = songs[0]
        if (!song) return
        const playlist = usePlaylistStore.getState()
        playlist.setPlayList(songs)
        playlist.setPlayListIndex(0)
        await playSong(song)
      } catch (error) {
        console.warn('[universe] bridge playback failed', error)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      setFrameReady(true)
      return
    }
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations
        .filter((registration) => registration.scope.includes('/ranran/'))
        .forEach((registration) => registration.unregister())
      setFrameReady(true)
    })
  }, [])

  return (
    <div className="universe-page absolute inset-0 overflow-hidden rounded-[18px] bg-[#050508]">
      {frameReady && (
        <iframe
          key={frameKey}
          src={`/ranran/index.html?build=20260909-${frameKey}`}
          title="宇宙相册"
          onLoad={() => setFrameError(false)}
          onError={() => setFrameError(true)}
          className="w-full h-full border-0"
        />
      )}
      {frameError && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#050508]">
          <div className="rounded-xl border border-[#e60026]/20 bg-black/40 px-6 py-5 text-center text-gray-300 shadow-xl">
            <p className="text-sm">宇宙相册资源加载失败</p>
            <button
              type="button"
              onClick={() => { setFrameError(false); setFrameKey(value => value + 1) }}
              className="mt-3 rounded-lg bg-[#e60026]/15 px-3 py-1.5 text-xs text-[#e60026] hover:bg-[#e60026]/25"
            >
              重新加载
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
