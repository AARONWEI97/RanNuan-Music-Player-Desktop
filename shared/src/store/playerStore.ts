import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SongResult } from '../types';
import { getStorageAdapter } from '../storageAdapter';

interface PlayerState {
  playMusic: SongResult | null;
  playMusicUrl: string;
  isPlay: boolean;
  isLoading: boolean;
  duration: number;
  currentProgress: number;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
}

interface PlayerActions {
  setPlayMusic: (music: SongResult | null) => void;
  setPlayMusicUrl: (url: string) => void;
  setIsPlay: (isPlay: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setDuration: (duration: number) => void;
  setCurrentProgress: (progress: number) => void;
  setVolume: (volume: number) => void;
  setIsMuted: (muted: boolean) => void;
  setPlaybackRate: (rate: number) => void;
  togglePlay: () => void;
  resetPlayer: () => void;
}

export const usePlayerStore = create<PlayerState & PlayerActions>()(
  persist(
    (set) => ({
      playMusic: null,
      playMusicUrl: '',
      isPlay: false,
      isLoading: false,
      duration: 0,
      currentProgress: 0,
      volume: 0.5,
      isMuted: false,
      playbackRate: 1,

      setPlayMusic: (music) => set({ playMusic: music }),
      setPlayMusicUrl: (url) => set({ playMusicUrl: url }),
      setIsPlay: (isPlay) => set({ isPlay }),
      setIsLoading: (loading) => set({ isLoading: loading }),
      setDuration: (duration) => set({ duration }),
      setCurrentProgress: (progress) => set({ currentProgress: progress }),
      setVolume: (volume) => set({ volume }),
      setIsMuted: (muted) => set({ isMuted: muted }),
      setPlaybackRate: (rate) => set({ playbackRate: rate }),
      togglePlay: () => set((state) => ({ isPlay: !state.isPlay })),
      resetPlayer: () =>
        set({
          playMusic: null,
          playMusicUrl: '',
          isPlay: false,
          isLoading: false,
          duration: 0,
          currentProgress: 0,
        }),
    }),
    {
      name: 'player-state',
      storage: createJSONStorage(() => getStorageAdapter()),
      partialize: (state) => ({
        playMusic: state.playMusic ? {
          id: state.playMusic.id,
          name: state.playMusic.name,
          picUrl: state.playMusic.picUrl,
          ar: state.playMusic.ar?.map(a => ({ id: a.id, name: a.name })),
          al: state.playMusic.al ? { id: state.playMusic.al.id, name: state.playMusic.al.name, picUrl: state.playMusic.al.picUrl } : undefined,
          dt: state.playMusic.dt,
          duration: state.playMusic.duration,
          source: state.playMusic.source,
          playMusicUrl: state.playMusicUrl, // ★ 保存当前有效的播放 URL
        } : null,
        playMusicUrl: state.playMusicUrl, // ★ 也保存在顶层，恢复时读取
        currentProgress: state.currentProgress,
        isPlay: false,
        volume: state.volume,
        isMuted: state.isMuted,
        playbackRate: state.playbackRate,
      }),
    }
  )
);
