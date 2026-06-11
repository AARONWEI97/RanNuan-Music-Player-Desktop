import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SongResult } from '../types';
import { getStorageAdapter } from '../storageAdapter';
import { usePlayerStore } from './playerStore';

type MinifiedSong = Pick<SongResult, 'id' | 'name' | 'picUrl' | 'dt' | 'duration' | 'source'> & {
  ar: { id: number; name: string }[] | undefined;
  al: { id: number; name: string; picUrl?: string } | undefined;
};

const minifySong = (s: SongResult): MinifiedSong => ({
  id: s.id,
  name: s.name,
  picUrl: s.picUrl,
  ar: s.ar?.map((a) => ({ id: a.id, name: a.name })),
  al: s.al ? { id: s.al.id, name: s.al.name, picUrl: s.al.picUrl } : undefined,
  source: s.source,
  dt: s.dt,
  duration: s.duration,
});

const minifySongList = (list: SongResult[]): MinifiedSong[] => list.map(minifySong);

/** Fisher-Yates shuffle returning index array */
function shuffleIndices(length: number, firstIdx = 0): number[] {
  const indices = Array.from({ length }, (_, i) => i);
  for (let i = length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  // Ensure firstIdx is first in the list
  const pos = indices.indexOf(firstIdx);
  if (pos > 0) {
    [indices[0], indices[pos]] = [indices[pos], indices[0]];
  }
  return indices;
}

interface PlaylistState {
  playList: SongResult[];
  playListIndex: number;
  playMode: number; // 0=list loop, 1=single loop, 2=shuffle
  showPlaylistDrawer: boolean;
  playNextQueue: SongResult[];
  originalPlayList: SongResult[]; // P0-1: 保存随机模式前的原始顺序
  consecutiveFailCount: number; // P0-2: 连续播放失败计数
}

const MAX_CONSECUTIVE_FAILS = 5; // P0-2: 最大连续失败次数

interface PlaylistActions {
  setPlayList: (list: SongResult[], keepIndex?: boolean) => void;
  addToNextPlay: (song: SongResult) => void;
  removeFromPlayList: (id: number | string) => void;
  clearPlayAll: () => void;
  togglePlayMode: () => void;
  setPlayMode: (mode: number) => void;
  nextPlay: (autoEnd?: boolean) => void; // P0-3: autoEnd 区分自然结束和手动切歌
  prevPlay: () => void;
  setPlayListIndex: (index: number) => void;
  setShowPlaylistDrawer: (show: boolean) => void;
  getCurrentSong: () => SongResult | undefined;
  getNextSong: () => SongResult | undefined;
  popPlayNextQueue: () => SongResult | undefined;
  restoreOriginalOrder: () => void; // P0-1: 恢复原始顺序
  resetFailCount: () => void; // P0-2: 重置失败计数
  incrementFailCount: () => number; // P0-2: 递增失败计数，返回当前值
}

export const usePlaylistStore = create<PlaylistState & PlaylistActions>()(
  persist(
    (set, get) => ({
      playList: [],
      playListIndex: 0,
      playMode: 0,
      showPlaylistDrawer: false,
      playNextQueue: [],
      originalPlayList: [],
      consecutiveFailCount: 0,

      setPlayList: (list, keepIndex = false) => {
        if (list.length === 0) {
          set({ playList: [], playListIndex: 0, playNextQueue: [], originalPlayList: [] });
          return;
        }
        const playMusic = usePlayerStore.getState().playMusic;

        let nextIndex = 0;
        if (!keepIndex && playMusic) {
          nextIndex = list.findIndex((item) => item.id === playMusic.id);
          if (nextIndex === -1) nextIndex = 0;
        }

        // Pre-shuffle if in shuffle mode
        const { playMode } = get();
        if (playMode === 2) {
          // P0-1: 保存原始顺序（仅在未保存时）
          const { originalPlayList } = get();
          if (originalPlayList.length === 0) {
            set({ originalPlayList: [...list] });
          }
          const _g = globalThis as any;
          _g.__shuffledIndices = shuffleIndices(list.length, nextIndex);
          // Shuffle the actual list
          const shuffledList = _g.__shuffledIndices.map((i: number) => list[i]);
          set({ playList: shuffledList, playListIndex: 0 });
          return;
        }

        // P0-1: 非随机模式清除原始列表
        set({ playList: list, playListIndex: nextIndex, originalPlayList: [] });
      },

      addToNextPlay: (song) => {
        const { playNextQueue } = get();
        // Remove duplicate if exists
        const filtered = playNextQueue.filter((s) => s.id !== song.id);
        set({ playNextQueue: [...filtered, song] });
      },

      removeFromPlayList: (id) => {
        const { playList, playNextQueue } = get();
        const index = playList.findIndex((item) => item.id === id);
        if (index === -1) return;

        if (id === usePlayerStore.getState().playMusic?.id) {
          get().nextPlay();
        }

        const newPlayList = [...playList];
        newPlayList.splice(index, 1);
        const newQueue = playNextQueue.filter((s) => s.id !== id);
        set({ playList: newPlayList, playNextQueue: newQueue });
      },

      clearPlayAll: () => {
        usePlayerStore.setState({ playMusic: null, playMusicUrl: '', isPlay: false, currentProgress: 0, duration: 0 });
        set({ playList: [], playListIndex: 0, playNextQueue: [], originalPlayList: [], consecutiveFailCount: 0 });
        const _g = globalThis as any;
        _g.__shuffledIndices = null;
      },

      togglePlayMode: () => {
        const { playMode, playList, playListIndex } = get();
        const wasShuffle = playMode === 2;
        const newMode = (playMode + 1) % 3;
        const isShuffle = newMode === 2;

        if (isShuffle && playList.length > 0) {
          // P0-1: 进入随机模式，保存原始顺序并打乱列表
          set({ originalPlayList: [...playList] });
          const _g = globalThis as any;
          _g.__shuffledIndices = shuffleIndices(playList.length, playListIndex);
          const shuffledList = _g.__shuffledIndices.map((i: number) => playList[i]);
          // 当前歌曲应在首位
          const currentSong = playList[playListIndex];
          const currentInShuffled = shuffledList.findIndex((s: SongResult) => s.id === currentSong?.id);
          set({ playMode: newMode, playList: shuffledList, playListIndex: currentInShuffled !== -1 ? currentInShuffled : 0 });
        } else if (wasShuffle && !isShuffle) {
          // P0-1: 退出随机模式，恢复原始顺序
          get().restoreOriginalOrder();
          set({ playMode: newMode });
        } else {
          set({ playMode: newMode });
        }
      },

      setPlayMode: (mode: number) => {
        const { playList, playListIndex, playMode } = get();
        const wasShuffle = playMode === 2;
        const isShuffle = mode === 2;

        if (isShuffle && playList.length > 0) {
          set({ originalPlayList: [...playList] });
          const _g = globalThis as any;
          _g.__shuffledIndices = shuffleIndices(playList.length, playListIndex);
          const shuffledList = _g.__shuffledIndices.map((i: number) => playList[i]);
          const currentSong = playList[playListIndex];
          const currentInShuffled = shuffledList.findIndex((s: SongResult) => s.id === currentSong?.id);
          set({ playMode: mode, playList: shuffledList, playListIndex: currentInShuffled !== -1 ? currentInShuffled : 0 });
        } else if (wasShuffle && !isShuffle) {
          get().restoreOriginalOrder();
          set({ playMode: mode });
        } else {
          set({ playMode: mode });
        }
      },

      nextPlay: (autoEnd = false) => {
        // ★ 优先消费 playNextQueue：弹出第一首，插入 playList 当前位置之后
        const nextQueued = get().popPlayNextQueue()
        if (nextQueued) {
          const { playList, playListIndex } = get()
          const newList = [...playList]
          newList.splice(playListIndex + 1, 0, nextQueued)
          set({ playList: newList, playListIndex: playListIndex + 1 })
          return
        }

        const { playList, playListIndex, playMode } = get();
        if (playList.length === 0) return;

        // P0-3: 顺序模式播完最后一首时，autoEnd=true 不循环
        if (autoEnd && playMode === 0 && playListIndex >= playList.length - 1) {
          return;
        }

        let nextIndex: number;
        if (playMode === 2) {
          // Shuffle mode: use pre-shuffled index list
          const _g = globalThis as any;
          const shuffled = _g.__shuffledIndices as number[] | undefined;
          if (shuffled && shuffled.length === playList.length) {
            const currentPos = shuffled.indexOf(playListIndex);
            const nextPos = (currentPos + 1) % shuffled.length;
            nextIndex = shuffled[nextPos];
          } else {
            // Fallback: regenerate
            _g.__shuffledIndices = shuffleIndices(playList.length, playListIndex);
            nextIndex = _g.__shuffledIndices[1] ?? 0;
          }
        } else {
          // Mode 0 (list loop) and mode 1 (single loop) both advance to next
          nextIndex = (playListIndex + 1) % playList.length;
        }

        set({ playListIndex: nextIndex });
      },

      prevPlay: () => {
        const { playList, playListIndex, playMode } = get();
        if (playList.length === 0) return;

        let prevIndex: number;
        if (playMode === 2) {
          const _g = globalThis as any;
          const shuffled = _g.__shuffledIndices as number[] | undefined;
          if (shuffled && shuffled.length === playList.length) {
            const currentPos = shuffled.indexOf(playListIndex);
            const prevPos = (currentPos - 1 + shuffled.length) % shuffled.length;
            prevIndex = shuffled[prevPos];
          } else {
            prevIndex = (playListIndex - 1 + playList.length) % playList.length;
          }
        } else {
          prevIndex = (playListIndex - 1 + playList.length) % playList.length;
        }

        set({ playListIndex: prevIndex });
      },

      setPlayListIndex: (index) => set({ playListIndex: index }),
      setShowPlaylistDrawer: (show) => set({ showPlaylistDrawer: show }),

      getCurrentSong: () => {
        const { playList, playListIndex } = get();
        return playList[playListIndex];
      },

      getNextSong: () => {
        const { playList, playListIndex, playMode, playNextQueue } = get();
        if (playNextQueue.length > 0) {
          return playNextQueue[0];
        }
        if (playList.length === 0) return undefined;
        if (playMode === 2) {
          const _g = globalThis as any;
          const shuffled = _g.__shuffledIndices as number[] | undefined;
          if (shuffled) {
            const currentPos = shuffled.indexOf(playListIndex);
            const nextPos = (currentPos + 1) % shuffled.length;
            return playList[shuffled[nextPos]];
          }
        }
        return playList[(playListIndex + 1) % playList.length];
      },

      popPlayNextQueue: () => {
        const { playNextQueue } = get();
        if (playNextQueue.length === 0) return undefined;
        const [first, ...rest] = playNextQueue;
        set({ playNextQueue: rest });
        return first;
      },

      // P0-1: 恢复随机模式前的原始顺序
      restoreOriginalOrder: () => {
        const { originalPlayList } = get();
        if (originalPlayList.length === 0) return;
        const currentSong = get().getCurrentSong();
        const restored = [...originalPlayList];
        // 当前歌曲在恢复后的列表中定位
        let newIndex = 0;
        if (currentSong) {
          newIndex = restored.findIndex((s) => s.id === currentSong.id);
          if (newIndex === -1) newIndex = 0;
        }
        set({ playList: restored, playListIndex: newIndex, originalPlayList: [] });
        const _g = globalThis as any;
        _g.__shuffledIndices = null;
      },

      // P0-2: 重置连续失败计数
      resetFailCount: () => set({ consecutiveFailCount: 0 }),

      // P0-2: 递增连续失败计数，返回当前值
      incrementFailCount: () => {
        const newCount = get().consecutiveFailCount + 1;
        set({ consecutiveFailCount: newCount });
        return newCount;
      },
    }),
    {
      name: 'playlist-store',
      storage: createJSONStorage(() => getStorageAdapter()),
      partialize: (state) => ({
        playList: minifySongList(state.playList),
        playListIndex: state.playListIndex,
        playMode: state.playMode,
        playNextQueue: minifySongList(state.playNextQueue),
        originalPlayList: minifySongList(state.originalPlayList),
      }),
    }
  )
);
