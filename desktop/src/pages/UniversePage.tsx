import { useCallback, useEffect, useRef, useState } from 'react'
import { attachUniverseBridge, detachUniverseBridge } from '@/services/universeBridge'

export default function UniversePage() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [frameKey, setFrameKey] = useState(0)
  const [frameError, setFrameError] = useState(false)
  const [frameReady, setFrameReady] = useState(false)
  // 临时诊断：多机黑屏排查用，探针跑在与宇宙相册相同的 iframe 环境里
  const [showProbe, setShowProbe] = useState(false)

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
    navigator.serviceWorker.getRegistrations().then(async (registrations) => {
      await Promise.all(
        registrations
          .filter((registration) => registration.scope.includes('/ranran/'))
          .map((registration) => registration.unregister()),
      )
      setFrameReady(true)
    })
  }, [])

  return (
    <div className="universe-page absolute inset-0 overflow-hidden rounded-[18px] bg-[#050508]">
      {frameReady && (
        <iframe
          ref={iframeRef}
          key={frameKey}
          src={`/ranran/index.html?build=20261012b-${frameKey}`}
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
      <button
        type="button"
        onClick={() => setShowProbe((v) => !v)}
        className="absolute bottom-3 right-3 z-20 rounded-lg border border-white/15 bg-black/50 px-3 py-1.5 text-xs text-gray-300 hover:bg-black/70"
      >
        {showProbe ? '关闭诊断' : 'GPU 诊断'}
      </button>
      {showProbe && (
        <iframe
          src="/gpu-probe.html"
          title="GPU 诊断"
          className="absolute inset-4 z-10 h-[calc(100%-2rem)] w-[calc(100%-2rem)] rounded-xl border border-white/20 bg-[#0b0e14]"
        />
      )}
    </div>
  )
}
