import { request } from '@shared'
import type { ApiRequestConfig } from '@shared/api/request'

export interface MusicConnectionResult {
  state: 'available' | 'unavailable' | 'unexpected'
  elapsedMs: number
  checkedAt: Date
}

export async function checkMusicConnection(): Promise<MusicConnectionResult> {
  const started = performance.now()
  let state: MusicConnectionResult['state']
  try {
    const options: ApiRequestConfig = {
      params: { type: 0 },
      timeout: 5000,
      noRetry: true,
      silent: true,
      skipAuthCookie: true,
      preserveAuthCookie: true,
      withCredentials: false,
    }
    const response = await request.get<{ code?: number; banners?: unknown }>('/banner', options)
    state = response.data?.code === 200 && Array.isArray(response.data.banners) ? 'available' : 'unexpected'
  } catch {
    state = 'unavailable'
  }
  return { state, elapsedMs: Math.round(performance.now() - started), checkedAt: new Date() }
}
