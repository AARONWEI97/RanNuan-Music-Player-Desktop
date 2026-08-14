import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SongResult } from '../types';
import { lazyStorageAdapter } from '../storageAdapter';

interface PlayerState {
  playMusic: SongResult | null;
  playMusicUrl: string;
  /** 当前播放实际命中的音源 key（与 AVAILABLE_SOURCES 对齐），供音源选择器打勾 */
  activeSource: string | null;
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
  setActiveSource: (source: string | null) => void;
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
      activeSource: null,
      isPlay: false,
      isLoading: false,
      duration: 0,
      currentProgress: 0,
      volume: 0.5,
      isMuted: false,
      playbackRate: 1,

      setPlayMusic: (music) => set({ playMusic: music }),
      setPlayMusicUrl: (url) => set({ playMusicUrl: url }),
      setActiveSource: (source) => set({ activeSource: source }),
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
          activeSource: null,
          isPlay: false,
          isLoading: false,
          duration: 0,
          currentProgress: 0,
        }),
    }),
    {
      name: 'player-state',
      storage: createJSONStorage(() => lazyStorageAdapter),
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
          musicSource: state.playMusic.musicSource,
          playMusicUrl: state.playMusicUrl,
        } : null,
        playMusicUrl: state.playMusicUrl,
        activeSource: state.activeSource,
        currentProgress: state.currentProgress,
        isPlay: false,
        volume: state.volume,
        isMuted: state.isMuted,
        playbackRate: state.playbackRate,
      }),
    }
  )
);
