import { useState, useEffect, useRef } from 'react'

export interface ImageColorResult {
  /** 提取的主色 RGB 字符串，如 'rgb(230,0,38)' */
  primaryColor: string
  /** 是否正在提取中 */
  loading: boolean
}

/**
 * 从图片 URL 提取主色调
 *
 * 原理：用 fetch + createImageBitmap 解码到小 canvas 提取平均色。
 * 避免再创建 new Image() 导致同一 URL 下载两遍。
 */
export function useImageColor(imageUrl?: string): ImageColorResult {
  const [primaryColor, setPrimaryColor] = useState<string>('#e60026')
  const [loading, setLoading] = useState(false)
  const lastUrlRef = useRef('')
  // 使用 AbortController 防止竞态
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!imageUrl || imageUrl === lastUrlRef.current) return

    // 中止上一次请求
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    lastUrlRef.current = imageUrl
    setLoading(true)

    // 使用 fetch + ImageBitmap 解码（更高效，避免创建临时 img 元素）
    fetch(imageUrl, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('fetch failed')
        return res.blob()
      })
      .then((blob) => createImageBitmap(blob, { resizeWidth: 10, resizeHeight: 10, resizeQuality: 'low' }))
      .then((bitmap) => {
        const canvas = document.createElement('canvas')
        canvas.width = bitmap.width
        canvas.height = bitmap.height
        const ctx = canvas.getContext('2d')
        if (!ctx) { setLoading(false); return }
        ctx.drawImage(bitmap, 0, 0)
        bitmap.close()

        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
        let r = 0, g = 0, b = 0, count = 0
        for (let i = 0; i < data.length; i += 4) {
          // 忽略接近白色的像素
          if (data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240) continue
          r += data[i]; g += data[i + 1]; b += data[i + 2]
          count++
        }
        if (count === 0) count = Math.max(1, data.length / 4)
        setPrimaryColor(`rgb(${Math.round(r / count)},${Math.round(g / count)},${Math.round(b / count)})`)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })

    return () => { controller.abort() }
  }, [imageUrl])

  return { primaryColor, loading }
}
