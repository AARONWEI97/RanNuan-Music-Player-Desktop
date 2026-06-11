/**
 * 图片 URL 优化 (借鉴 AlgerMusicPlayer)
 * 网易云 CDN 支持 ?param=XyY 参数实现服务端缩放，
 * 不同场景用不同分辨率，大幅减少带宽和内存。
 */
export function optimizeImgUrl(url: string | undefined, size: string = '100y100'): string {
  if (!url) return ''
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('local://')) return url
  // 如果已有 param 参数则替换，否则追加
  if (url.includes('?param=')) {
    return url.replace(/(\?param=)[^&]+/, `$1${size}`)
  }
  return `${url}?param=${size}`
}

/** 歌单列表缩略图（40px 容器用 100px 够 2x retina） */
export function thumbUrl(url: string | undefined): string {
  return optimizeImgUrl(url, '100y100')
}

/** 歌手头像（80px 圆形用 200px） */
export function avatarUrl(url: string | undefined): string {
  return optimizeImgUrl(url, '200y200')
}

/** 专辑/歌单封面 (网格 ~200px 用 500px) */
export function coverUrl(url: string | undefined): string {
  return optimizeImgUrl(url, '500y500')
}

/** 英雄区大图 */
export function heroUrl(url: string | undefined): string {
  return optimizeImgUrl(url, '800y800')
}
