import { useCallback, useEffect, useRef, useState } from 'react'
import { attachUniverseBridge, detachUniverseBridge } from '@/services/universeBridge'

export default function UniversePage() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [frameKey, setFrameKey] = useState(0)
  const [frameError, setFrameError] = useState(false)
  const [frameReady, setFrameReady] = useState(false)

  const bindFrame = useCallback(() => {
    attachUniverseBridge(iframeRef.current?.contentWindow ?? null)
  }, [])

  useEffect(() => {
    return () => {
      detachUniverseBridge()
    }
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
          ref={iframeRef}
          key={frameKey}
          src={`/ranran/index.html?build=20260915d-${frameKey}`}
          title="宇宙相册"
          onLoad={() => {
            setFrameError(false)
            bindFrame()
          }}
          onError={() => setFrameError(true)}
          className="w-full h-full border-0"
          allow="autoplay; fullscreen"
        />
      )}
      {frameError && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#050508]">
          <div className="rounded-xl border border-[#e60026]/20 bg-black/40 px-6 py-5 text-center text-gray-300 shadow-xl">
            <p className="text-sm">宇宙相册资源加载失败</p>
            <button
              type="button"
              onClick={() => {
                setFrameError(false)
                setFrameKey((value) => value + 1)
              }}
              className="mt-3 rounded-lg bg-[#e60026]/15 px-3 py-1.5 text-xs text-[#e60026] hover:bg-[#e60026]/25"
            >
              重新加载
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
