import { create } from 'zustand';
import { dbService, type BackgroundMusic } from './database';

interface MusicPlayerState {
  musicList: BackgroundMusic[];
  currentMusic: BackgroundMusic | null;
  currentMusicIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  loop: boolean;
  shuffle: boolean;
  isLoading: boolean;
  error: string | null;
}

interface MusicPlayerActions {
  loadMusicList: () => Promise<void>;
  addMusic: (file: File, metadata?: { artist?: string; duration?: number }) => Promise<string>;
  removeMusic: (id: string) => Promise<void>;
  reorderMusic: (musicIds: string[]) => Promise<void>;
  playMusic: (musicId: string) => Promise<void>;
  pauseMusic: () => void;
  resumeMusic: () => Promise<void>;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  seekTo: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleLoop: () => void;
  toggleShuffle: () => void;
  clearPlaylist: () => Promise<void>;
  clearError: () => void;
}

class AudioPlayer {
  private audio: HTMLAudioElement | null = null;
  private onTimeUpdate: ((time: number) => void) | null = null;
  private onEnded: (() => void) | null = null;
  private onError: ((error: Error) => void) | null = null;
  private currentVolume: number = 0.5;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  // TS 5.7+ TypedArray 带泛型：getByteFrequencyData 要求 ArrayBuffer -backed
  private freqData: Uint8Array<ArrayBuffer> | null = null;

  constructor() {
    const embedded = typeof window !== 'undefined' && window.parent !== window;
    if (embedded) {
      this.audio = null;
      return;
    }
    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous';
    this.audio.preload = 'auto';
    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.audio) return;

    this.audio.addEventListener('timeupdate', () => {
      if (this.onTimeUpdate && this.audio) {
        this.onTimeUpdate(this.audio.currentTime);
      }
    });

    this.audio.addEventListener('ended', () => {
      if (this.onEnded) {
        this.onEnded();
      }
    });

    this.audio.addEventListener('error', () => {
      const errorCode = this.audio?.error?.code;
      let errorMessage = 'Unknown audio error';
      
      switch (errorCode) {
        case 1:
          errorMessage = 'Audio loading aborted';
          break;
        case 2:
          errorMessage = 'Network error while loading audio';
          break;
        case 3:
          errorMessage = 'Audio decoding error';
          break;
        case 4:
          errorMessage = 'Audio format not supported';
          break;
      }
      
      if (this.onError) {
        this.onError(new Error(errorMessage));
      }
    });

    this.audio.addEventListener('loadedmetadata', () => {
      if (this.audio) {
        this.audio.volume = this.currentVolume;
      }
    });
  }

  async load(url: string): Promise<number> {
    if (!this.audio) return 0;

    return new Promise((resolve) => {
      if (!this.audio) {
        resolve(0);
        return;
      }

      let resolved = false;
      const audioEl = this.audio;

      const done = () => {
        if (!resolved) {
          resolved = true;
          audioEl.removeEventListener('loadedmetadata', onMeta);
          audioEl.removeEventListener('canplay', onCanPlay);
          audioEl.removeEventListener('error', onErr);
          const d = audioEl.duration;
          resolve(d > 0 && isFinite(d) ? d : 0);
        }
      };

      const onMeta = () => {
        const d = audioEl.duration;
        if (d > 0 && isFinite(d)) {
          done();
        }
      };

      const onCanPlay = () => done();

      const onErr = () => {
        console.warn('Audio load error');
        done();
      };

      audioEl.addEventListener('loadedmetadata', onMeta);
      audioEl.addEventListener('canplay', onCanPlay);
      audioEl.addEventListener('error', onErr);

      audioEl.src = url;
      audioEl.load();

      setTimeout(done, 3000);
    });
  }

  // 懒挂 Web Audio 分析器：仅在独立运行态使用（嵌入态不创建 audio）。
  // 本地 blob 音源无 CORS 风险；首次 play 时创建可借用户手势解除 AudioContext 静默限制。
  private ensureAnalyser() {
    if (!this.audio || this.analyser) return;
    try {
      this.audioCtx = this.audioCtx ?? new AudioContext();
      const source = this.audioCtx.createMediaElementSource(this.audio);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.55;
      source.connect(this.analyser);
      this.analyser.connect(this.audioCtx.destination);
      this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
    } catch {
      // 音频元素已被其他节点接管或策略阻止：跳过分析，不影响播放
      this.analyser = null;
    }
  }

  /** 当前音频能量 0~1：低频（鼓点）加权 + 全频平均，供宇宙视图节拍联动 */
  getEnergy(): number {
    if (!this.analyser || !this.freqData || !this.isPlaying()) return 0;
    this.analyser.getByteFrequencyData(this.freqData);
    const bins = this.freqData.length;
    const bassEnd = Math.max(4, Math.floor(bins / 8));
    let bass = 0;
    for (let i = 0; i < bassEnd; i++) bass += this.freqData[i];
    bass /= bassEnd * 255;
    let total = 0;
    for (let i = 0; i < bins; i++) total += this.freqData[i];
    total /= bins * 255;
    return Math.min(1, bass * 1.6 + total * 0.5);
  }

  play(): Promise<void> {
    if (!this.audio) return Promise.resolve();
    this.ensureAnalyser();
    this.audioCtx?.resume().catch(() => {});
    
    return this.audio.play().catch(error => {
      console.warn('Playback might be blocked, but continuing:', error);
      return Promise.resolve();
    });
  }

  pause(): void {
    this.audio?.pause();
  }

  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
  }

  seek(time: number): void {
    if (this.audio && !isNaN(this.audio.duration)) {
      this.audio.currentTime = Math.max(0, Math.min(time, this.audio.duration));
    }
  }

  setVolume(volume: number): void {
    this.currentVolume = Math.max(0, Math.min(1, volume));
    if (this.audio) {
      this.audio.volume = this.currentVolume;
    }
  }

  getCurrentTime(): number {
    return this.audio?.currentTime || 0;
  }

  getDuration(): number {
    return this.audio?.duration || 0;
  }

  isPlaying(): boolean {
    return this.audio ? !this.audio.paused && !this.audio.ended : false;
  }

  setTimeUpdateCallback(callback: (time: number) => void): void {
    this.onTimeUpdate = callback;
  }

  setEndedCallback(callback: () => void): void {
    this.onEnded = callback;
  }

  setErrorCallback(callback: (error: Error) => void): void {
    this.onError = callback;
  }

  destroy(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio.removeAttribute('src');
      this.audio.load();
      this.audio = null;
    }
    this.onTimeUpdate = null;
    this.onEnded = null;
    this.onError = null;
  }
}

let audioPlayerInstance: AudioPlayer | null = null;

const getAudioPlayer = (): AudioPlayer => {
  if (!audioPlayerInstance) {
    audioPlayerInstance = new AudioPlayer();
  }
  return audioPlayerInstance;
};

/** 独立运行态的本地音频能量（0~1）；未播放/无分析器时为 0。嵌入态无 audio，恒 0。 */
export const getLocalAudioEnergy = (): number => audioPlayerInstance?.getEnergy() ?? 0;

const useMusicPlayer = create<MusicPlayerState & MusicPlayerActions>((set, get) => {
  const audioPlayer = getAudioPlayer();

  audioPlayer.setTimeUpdateCallback((time) => {
    set({ currentTime: time });
  });

  audioPlayer.setEndedCallback(async () => {
    const { loop, musicList, currentMusicIndex } = get();
    
    if (musicList.length === 0) return;
    
    if (loop) {
      const currentIndex = currentMusicIndex >= 0 ? currentMusicIndex : 0;
      if (currentIndex >= 0 && currentIndex < musicList.length) {
        await get().playMusic(musicList[currentIndex].id);
      }
    } else {
      await get().playNext();
    }
  });

  audioPlayer.setErrorCallback((error) => {
    console.error('Audio playback error:', error.message);
    set({ isLoading: false, error: error.message });
  });

  return {
    musicList: [],
    currentMusic: null,
    currentMusicIndex: -1,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.5,
    loop: false,
    shuffle: false,
    isLoading: false,
    error: null,

    loadMusicList: async () => {
      try {
        const musicList = await dbService.getAllMusic();
        set({ musicList });
        
        const playbackState = await dbService.getPlaybackState();
        
        if (playbackState && playbackState.currentMusicId) {
          const musicIndex = musicList.findIndex(m => m.id === playbackState.currentMusicId);
          const music = musicIndex >= 0 ? musicList[musicIndex] : null;
          
          if (music) {
            set({
              currentMusic: music,
              currentMusicIndex: musicIndex,
              volume: playbackState.volume,
              loop: playbackState.loop,
              shuffle: playbackState.shuffle
            });
            
            audioPlayer.setVolume(playbackState.volume);
          }
        }
      } catch (error) {
        console.error('Failed to load music list:', error);
        set({ error: 'Failed to load music list' });
      }
    },

    addMusic: async (file, metadata) => {
      try {
        set({ isLoading: true, error: null });
        const musicId = await dbService.addMusic(file, metadata);
        await get().loadMusicList();
        set({ isLoading: false });
        return musicId;
      } catch (error) {
        console.error('Failed to add music:', error);
        set({ isLoading: false, error: 'Failed to add music' });
        throw error;
      }
    },

    removeMusic: async (id) => {
      try {
        const { currentMusic, currentMusicIndex } = get();
        
        if (currentMusic?.id === id) {
          audioPlayer.stop();
          set({ 
            currentMusic: null, 
            currentMusicIndex: -1,
            isPlaying: false, 
            currentTime: 0, 
            duration: 0 
          });
        }
        
        await dbService.deleteMusic(id);
        await get().loadMusicList();
        
        if (currentMusicIndex > 0) {
          set({ currentMusicIndex: currentMusicIndex - 1 });
        }
      } catch (error) {
        console.error('Failed to remove music:', error);
        set({ error: 'Failed to remove music' });
        throw error;
      }
    },

    reorderMusic: async (musicIds) => {
      try {
        await dbService.updateMusicOrder(musicIds);
        await get().loadMusicList();
      } catch (error) {
        console.error('Failed to reorder music:', error);
        set({ error: 'Failed to reorder music' });
        throw error;
      }
    },

    playMusic: async (musicId) => {
      const { musicList } = get();
      const musicIndex = musicList.findIndex(m => m.id === musicId);
      const music = musicIndex >= 0 ? musicList[musicIndex] : null;
      
      if (!music) {
        set({ error: 'Music not found' });
        return;
      }

      set({ isLoading: true, error: null });

      const url = URL.createObjectURL(music.data);
      
      try {
        const duration = await audioPlayer.load(url);
        
        set({
          currentMusic: music,
          currentMusicIndex: musicIndex,
          duration: duration > 0 ? duration : audioPlayer.getDuration(),
        });

        await audioPlayer.play();
        
        set({ isPlaying: true, isLoading: false });
        
        dbService.savePlaybackState({
          currentMusicId: musicId,
          currentTime: 0,
          isPlaying: true,
          volume: get().volume,
          loop: get().loop,
          shuffle: get().shuffle
        }).catch(err => console.warn('Failed to save playback state:', err));
      } catch (error) {
        console.warn('Playback error:', error);
        
        set({
          currentMusic: music,
          currentMusicIndex: musicIndex,
          isPlaying: false,
          duration: audioPlayer.getDuration(),
          isLoading: false,
          error: null
        });
      }
    },

    pauseMusic: () => {
      audioPlayer.pause();
      set({ isPlaying: false });
      
      const { currentMusic, volume, loop, shuffle } = get();
      if (currentMusic) {
        dbService.savePlaybackState({
          currentMusicId: currentMusic.id,
          currentTime: audioPlayer.getCurrentTime(),
          isPlaying: false,
          volume,
          loop,
          shuffle
        });
      }
    },

    resumeMusic: async () => {
      try {
        await audioPlayer.play();
        set({ isPlaying: true, error: null });
        
        const { currentMusic, volume, loop, shuffle } = get();
        if (currentMusic) {
          dbService.savePlaybackState({
            currentMusicId: currentMusic.id,
            currentTime: audioPlayer.getCurrentTime(),
            isPlaying: true,
            volume,
            loop,
            shuffle
          }).catch(err => console.warn('Failed to save playback state:', err));
        }
      } catch (error) {
        console.warn('Resume playback error:', error);
        set({ isPlaying: false, error: null });
      }
    },

    playNext: async () => {
      const { musicList, shuffle, currentMusicIndex } = get();
      
      if (musicList.length === 0) return;
      
      let nextIndex = 0;
      
      if (shuffle) {
        do {
          nextIndex = Math.floor(Math.random() * musicList.length);
        } while (nextIndex === currentMusicIndex && musicList.length > 1);
      } else {
        nextIndex = (currentMusicIndex + 1) % musicList.length;
      }
      
      await get().playMusic(musicList[nextIndex].id);
    },

    playPrevious: async () => {
      const { musicList, shuffle, currentMusicIndex } = get();
      
      if (musicList.length === 0) return;
      
      let prevIndex = 0;
      
      if (shuffle) {
        do {
          prevIndex = Math.floor(Math.random() * musicList.length);
        } while (prevIndex === currentMusicIndex && musicList.length > 1);
      } else {
        prevIndex = currentMusicIndex <= 0 ? musicList.length - 1 : currentMusicIndex - 1;
      }
      
      await get().playMusic(musicList[prevIndex].id);
    },

    seekTo: (time) => {
      audioPlayer.seek(time);
      set({ currentTime: time });
      
      const { currentMusic, volume, loop, shuffle, isPlaying } = get();
      if (currentMusic) {
        dbService.savePlaybackState({
          currentMusicId: currentMusic.id,
          currentTime: time,
          isPlaying,
          volume,
          loop,
          shuffle
        });
      }
    },

    setVolume: (volume) => {
      audioPlayer.setVolume(volume);
      set({ volume });
      
      const { currentMusic, currentTime, isPlaying, loop, shuffle } = get();
      if (currentMusic) {
        dbService.savePlaybackState({
          currentMusicId: currentMusic.id,
          currentTime,
          isPlaying,
          volume,
          loop,
          shuffle
        });
      }
    },

    toggleLoop: () => {
      const newLoop = !get().loop;
      set({ loop: newLoop });
      
      const { currentMusic, currentTime, isPlaying, volume, shuffle } = get();
      if (currentMusic) {
        dbService.savePlaybackState({
          currentMusicId: currentMusic.id,
          currentTime,
          isPlaying,
          volume,
          loop: newLoop,
          shuffle
        });
      }
    },

    toggleShuffle: () => {
      const newShuffle = !get().shuffle;
      set({ shuffle: newShuffle });
      
      const { currentMusic, currentTime, isPlaying, volume, loop } = get();
      if (currentMusic) {
        dbService.savePlaybackState({
          currentMusicId: currentMusic.id,
          currentTime,
          isPlaying,
          volume,
          loop,
          shuffle: newShuffle
        });
      }
    },

    clearPlaylist: async () => {
      try {
        audioPlayer.stop();
        
        const musicList = await dbService.getAllMusic();
        for (const music of musicList) {
          await dbService.deleteMusic(music.id);
        }
        
        await dbService.clearPlaybackState();
        
        set({
          musicList: [],
          currentMusic: null,
          currentMusicIndex: -1,
          isPlaying: false,
          currentTime: 0,
          duration: 0,
          error: null
        });
      } catch (error) {
        console.error('Failed to clear playlist:', error);
        set({ error: 'Failed to clear playlist' });
        throw error;
      }
    },

    clearError: () => {
      set({ error: null });
    }
  };
});

export { useMusicPlayer, AudioPlayer };
export type { MusicPlayerState, MusicPlayerActions };
