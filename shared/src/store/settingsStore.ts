import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getStorageAdapter } from '../storageAdapter';
import { setApiBaseUrl as setRequestApiBaseUrl } from '../api/request';
import type { ThemeType } from '../constants';

interface SettingsState {
  theme: ThemeType;
  language: string;
  apiBaseUrl: string;
  musicQuality: string;
  customApiUrl: string;
  unblockServiceUrl: string;
  lxmusicApiUrl: string;
  enableCache: boolean;
  autoPlay: boolean;
}

interface SettingsActions {
  setTheme: (theme: ThemeType) => void;
  setLanguage: (lang: string) => void;
  setApiBaseUrl: (url: string) => void;
  setMusicQuality: (quality: string) => void;
  setCustomApiUrl: (url: string) => void;
  setUnblockServiceUrl: (url: string) => void;
  setLxmusicApiUrl: (url: string) => void;
  setEnableCache: (enable: boolean) => void;
  setAutoPlay: (auto: boolean) => void;
}

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set) => ({
      theme: 'light',
      language: 'zh-CN',
      apiBaseUrl: 'http://139.9.223.233:3000',
      musicQuality: 'exhigh',
      customApiUrl: '',
      unblockServiceUrl: '',
      lxmusicApiUrl: '',
      enableCache: true,
      autoPlay: true,

      setTheme: (theme) => set({ theme }),
      setLanguage: (lang) => set({ language: lang }),
      setApiBaseUrl: (url) => {
        setRequestApiBaseUrl(url);
        set({ apiBaseUrl: url });
      },
      setMusicQuality: (quality) => set({ musicQuality: quality }),
      setCustomApiUrl: (url) => set({ customApiUrl: url }),
      setUnblockServiceUrl: (url) => set({ unblockServiceUrl: url }),
      setLxmusicApiUrl: (url) => set({ lxmusicApiUrl: url }),
      setEnableCache: (enable) => set({ enableCache: enable }),
      setAutoPlay: (auto) => set({ autoPlay: auto }),
    }),
    {
      name: 'settings-store',
      storage: createJSONStorage(() => getStorageAdapter()),
    }
  )
);
