let _cachedPath: string | null = null

/**
 * 获取下载文件夹完整路径（通过 Tauri 命令）
 */
export async function getDownloadsPath(): Promise<string> {
  if (_cachedPath) return _cachedPath
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    const path: string = await invoke('get_downloads_path')
    _cachedPath = path
    return path
  } catch {
    // 非 Tauri 环境降级
    return '~/Downloads'
  }
}

/** 同步获取（优先缓存，无缓存时返回降级值） */
export function getDownloadsPathSync(): string {
  return _cachedPath || '~/Downloads'
}

/**
 * 通过 Tauri 命令打开下载文件夹
 */
export async function openDownloadsFolder(): Promise<void> {
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('open_downloads_folder')
  } catch (e) {
    console.warn('[Shell] Cannot open folder:', e)
  }
}
