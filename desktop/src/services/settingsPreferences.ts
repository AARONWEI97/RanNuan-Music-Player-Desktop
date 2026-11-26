import { DEFAULT_MUSIC_QUALITY, usePlayerStore, usePlaylistStore, useSettingsStore, type ThemeType } from '@shared'
import { defaultDesktopPreferences, isSearchShortcut, useDesktopPreferences, type DesktopPreferences } from '@/store/desktopPreferences'
import { setPlaybackRate } from './audioService'
import { saveSession } from './sessionManager'

export const themes = [
  { id: 'light', label: '浅色' },
  { id: 'dark', label: '深色' },
  { id: 'system', label: '跟随系统' },
  { id: 'dog-light', label: '狗狗奶油' },
  { id: 'dog-dark', label: '狗狗可可' },
] as const satisfies ReadonlyArray<{ id: ThemeType; label: string }>

export const musicQualities = [
  ['standard', '标准'], ['higher', '较高'], ['exhigh', '极高'], ['lossless', '无损'],
  ['hires', 'Hi-Res'], ['jyeffect', '高清环绕声'], ['sky', '沉浸环绕声'],
  ['dolby', '杜比全景声'], ['jymaster', '超高（Master）'],
] as const

export const playbackModes = [['0', '列表循环'], ['1', '单曲循环'], ['2', '随机']] as const
export const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2] as const

export interface SettingsPreferences extends DesktopPreferences {
  theme: ThemeType
  musicQuality: string
  enableCache: boolean
  playMode: number
  playbackRate: number
}

export const defaultSettingsPreferences: SettingsPreferences = {
  ...defaultDesktopPreferences,
  theme: 'dog-light',
  musicQuality: DEFAULT_MUSIC_QUALITY,
  enableCache: true,
  playMode: 0,
  playbackRate: 1,
}

export function currentSettingsPreferences(): SettingsPreferences {
  const { theme, musicQuality, enableCache } = useSettingsStore.getState()
  const { showSplash, resumePlayback, closeAction, miniPlayerMode, openSearchShortcut, toggleSearchShortcut } = useDesktopPreferences.getState()
  return {
    theme, musicQuality, enableCache, showSplash, resumePlayback, closeAction, miniPlayerMode,
    openSearchShortcut, toggleSearchShortcut,
    playMode: usePlaylistStore.getState().playMode,
    playbackRate: usePlayerStore.getState().playbackRate,
  }
}

export function updatePlaybackRate(rate: number) {
  usePlayerStore.getState().setPlaybackRate(rate)
  setPlaybackRate(rate)
  saveSession()
}

export function applySettingsPreferences(preferences: SettingsPreferences) {
  const { theme, musicQuality, enableCache, playMode, playbackRate, ...desktop } = preferences
  useSettingsStore.setState({ theme, musicQuality, enableCache })
  useDesktopPreferences.setState(desktop)
  usePlaylistStore.getState().setPlayMode(playMode)
  updatePlaybackRate(playbackRate)
}

const backupFormat = 'rannuan-desktop-settings'

export function serializeSettingsPreferences() {
  return JSON.stringify({ format: backupFormat, version: 1, preferences: currentSettingsPreferences() }, null, 2)
}

export function parseSettingsPreferences(raw: string): SettingsPreferences {
  const backup = JSON.parse(raw)
  if (backup?.format !== backupFormat || backup.version !== 1) throw new Error('请选择冉暖设置备份文件')
  const input = backup.preferences
  if (
    !input || !themes.some(({ id }) => id === input.theme) ||
    !musicQualities.some(([id]) => id === input.musicQuality) ||
    typeof input.playMode !== 'number' || !playbackModes.some(([id]) => id === String(input.playMode)) ||
    !playbackRates.some(rate => rate === input.playbackRate) ||
    typeof input.enableCache !== 'boolean' || typeof input.showSplash !== 'boolean' ||
    typeof input.resumePlayback !== 'boolean' || !['tray', 'quit'].includes(input.closeAction) ||
    !['automatic', 'floating'].includes(input.miniPlayerMode) ||
    !isSearchShortcut(input.openSearchShortcut) || !isSearchShortcut(input.toggleSearchShortcut) ||
    input.openSearchShortcut === input.toggleSearchShortcut
  ) {
    throw new Error('备份中的设置值无效')
  }
  const {
    theme, musicQuality, enableCache, playMode, playbackRate, showSplash, resumePlayback, miniPlayerMode,
    closeAction, openSearchShortcut, toggleSearchShortcut,
  } = input
  return {
    theme, musicQuality, enableCache, playMode, playbackRate, showSplash, resumePlayback, miniPlayerMode,
    closeAction, openSearchShortcut, toggleSearchShortcut,
  }
}
