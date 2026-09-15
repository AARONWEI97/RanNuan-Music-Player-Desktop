import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';

interface CachedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  data: Blob;
  hash: string;
  createdAt: number;
  lastAccessed: number;
  version: number;
}

interface BackgroundMusic {
  id: string;
  name: string;
  artist?: string;
  duration?: number;
  data: Blob;
  order: number;
  createdAt: number;
  lastPlayed?: number;
}

interface PlaybackState {
  currentMusicId: string | null;
  currentTime: number;
  isPlaying: boolean;
  volume: number;
  loop: boolean;
  shuffle: boolean;
}

interface ConstellationBackground {
  constellationKey: string;
  photoId: string;
  photoData: Blob;
  thumbnail?: string;
  createdAt: number;
  lastAccessed: number;
}

interface CinemaVideo {
  id: string;
  name: string;
  data: Blob;
  thumbnail?: string;
  duration?: number;
  size: number;
  createdAt: number;
  lastAccessed: number;
}

interface RanRanDB extends DBSchema {
  files: {
    key: string;
    value: CachedFile;
    indexes: {
      'by-hash': string;
      'by-type': string;
      'by-created': number;
    };
  };
  music: {
    key: string;
    value: BackgroundMusic;
    indexes: {
      'by-order': number;
      'by-created': number;
    };
  };
  playback: {
    key: 'state';
    value: PlaybackState;
  };
  constellationBackgrounds: {
    key: string;
    value: ConstellationBackground;
  };
  cinemaVideos: {
    key: string;
    value: CinemaVideo;
    indexes: {
      'by-created': number;
    };
  };
}

const DB_NAME = 'RanRanDB';
const DB_VERSION = 3;

class DatabaseService {
  private db: IDBPDatabase<RanRanDB> | null = null;
  private initPromise: Promise<void> | null = null;

  async init() {
    if (this.db) return;
    
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        this.db = await openDB<RanRanDB>(DB_NAME, DB_VERSION, {
          upgrade(db) {
            if (!db.objectStoreNames.contains('files')) {
              const fileStore = db.createObjectStore('files', { keyPath: 'id' });
              fileStore.createIndex('by-hash', 'hash', { unique: true });
              fileStore.createIndex('by-type', 'type');
              fileStore.createIndex('by-created', 'createdAt');
            }

            if (!db.objectStoreNames.contains('music')) {
              const musicStore = db.createObjectStore('music', { keyPath: 'id' });
              musicStore.createIndex('by-order', 'order');
              musicStore.createIndex('by-created', 'createdAt');
            }

            if (!db.objectStoreNames.contains('playback')) {
              db.createObjectStore('playback', { keyPath: 'key' });
            }

            if (!db.objectStoreNames.contains('constellationBackgrounds')) {
              db.createObjectStore('constellationBackgrounds', { keyPath: 'constellationKey' });
            }

            if (!db.objectStoreNames.contains('cinemaVideos')) {
              const videoStore = db.createObjectStore('cinemaVideos', { keyPath: 'id' });
              videoStore.createIndex('by-created', 'createdAt');
            }
          }
        });
      } catch (error) {
        console.error('Failed to initialize database:', error);
        throw error;
      }
    })();

    await this.initPromise;
    this.initPromise = null;
  }

  private async ensureInitialized() {
    if (!this.db) {
      await this.init();
    }
  }

  async calculateHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  async cacheFile(file: File, type: 'photo' | 'video' | 'other'): Promise<string> {
    await this.ensureInitialized();

    const hash = await this.calculateHash(file);
    const fileId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const existingFile = await this.db!.getFromIndex('files', 'by-hash', hash);
    
    if (existingFile) {
      await this.db!.put('files', {
        ...existingFile,
        lastAccessed: Date.now(),
        version: existingFile.version + 1
      });
      return existingFile.id;
    }

    const cachedFile: CachedFile = {
      id: fileId,
      name: file.name,
      type,
      size: file.size,
      data: file,
      hash,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      version: 1
    };

    await this.db!.add('files', cachedFile);
    return fileId;
  }

  async getCachedFile(id: string): Promise<CachedFile | undefined> {
    await this.ensureInitialized();

    const file = await this.db!.get('files', id);
    
    if (file) {
      await this.db!.put('files', {
        ...file,
        lastAccessed: Date.now()
      });
    }

    return file;
  }

  async getAllFilesByType(type: 'photo' | 'video' | 'other'): Promise<CachedFile[]> {
    await this.ensureInitialized();

    return await this.db!.getAllFromIndex('files', 'by-type', type);
  }

  async deleteFile(id: string): Promise<void> {
    await this.ensureInitialized();
    await this.db!.delete('files', id);
  }

  async clearOldFiles(daysOld: number = 30): Promise<number> {
    await this.ensureInitialized();

    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    const allFiles = await this.db!.getAll('files');
    const oldFiles = allFiles.filter(f => f.lastAccessed < cutoffTime);

    const tx = this.db!.transaction('files', 'readwrite');
    for (const file of oldFiles) {
      await tx.store.delete(file.id);
    }
    await tx.done;

    return oldFiles.length;
  }

  async getStorageUsage(): Promise<{ files: number; music: number; total: number }> {
    await this.ensureInitialized();

    const files = await this.db!.getAll('files');
    const music = await this.db!.getAll('music');

    const filesSize = files.reduce((sum, f) => sum + f.size, 0);
    const musicSize = music.reduce((sum, m) => sum + m.data.size, 0);

    return {
      files: filesSize,
      music: musicSize,
      total: filesSize + musicSize
    };
  }

  async addMusic(file: File, metadata?: { artist?: string; duration?: number }): Promise<string> {
    await this.ensureInitialized();

    const musicId = `music_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const allMusic = await this.db!.getAll('music');
    const maxOrder = allMusic.length > 0 ? Math.max(...allMusic.map(m => m.order)) : 0;

    const music: BackgroundMusic = {
      id: musicId,
      name: file.name.replace(/\.[^/.]+$/, ''),
      artist: metadata?.artist,
      duration: metadata?.duration,
      data: file,
      order: maxOrder + 1,
      createdAt: Date.now(),
      lastPlayed: undefined
    };

    await this.db!.add('music', music);
    return musicId;
  }

  async getAllMusic(): Promise<BackgroundMusic[]> {
    await this.ensureInitialized();
    return await this.db!.getAllFromIndex('music', 'by-order');
  }

  async getMusic(id: string): Promise<BackgroundMusic | undefined> {
    await this.ensureInitialized();
    return await this.db!.get('music', id);
  }

  async updateMusicOrder(musicIds: string[]): Promise<void> {
    await this.ensureInitialized();

    const tx = this.db!.transaction('music', 'readwrite');
    for (let i = 0; i < musicIds.length; i++) {
      const music = await tx.store.get(musicIds[i]);
      if (music) {
        music.order = i;
        await tx.store.put(music);
      }
    }
    await tx.done;
  }

  async deleteMusic(id: string): Promise<void> {
    await this.ensureInitialized();
    await this.db!.delete('music', id);
  }

  async clearOldMusic(daysOld: number = 30): Promise<number> {
    await this.ensureInitialized();

    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    const allMusic = await this.db!.getAll('music');
    const oldMusic = allMusic.filter(m => {
      const lastPlayed = m.lastPlayed || m.createdAt;
      return lastPlayed < cutoffTime;
    });

    const tx = this.db!.transaction('music', 'readwrite');
    for (const music of oldMusic) {
      await tx.store.delete(music.id);
    }
    await tx.done;

    return oldMusic.length;
  }

  async savePlaybackState(state: PlaybackState): Promise<void> {
    await this.ensureInitialized();
    await this.db!.put('playback', state);
  }

  async getPlaybackState(): Promise<PlaybackState | undefined> {
    await this.ensureInitialized();
    return await this.db!.get('playback', 'state');
  }

  async clearPlaybackState(): Promise<void> {
    await this.ensureInitialized();
    await this.db!.delete('playback', 'state');
  }

  async clearAll(): Promise<void> {
    if (!this.db) return;

    const stores = this.db.objectStoreNames;
    for (const storeName of stores) {
      await this.db!.clear(storeName);
    }
  }

  async saveConstellationBackground(constellationKey: string, photoId: string, photoData: Blob, thumbnail?: string): Promise<void> {
    await this.ensureInitialized();
    
    const background: ConstellationBackground = {
      constellationKey,
      photoId,
      photoData,
      thumbnail,
      createdAt: Date.now(),
      lastAccessed: Date.now()
    };
    
    await this.db!.put('constellationBackgrounds', background);
  }

  async getConstellationBackground(constellationKey: string): Promise<ConstellationBackground | undefined> {
    await this.ensureInitialized();
    
    const background = await this.db!.get('constellationBackgrounds', constellationKey);
    
    if (background) {
      background.lastAccessed = Date.now();
      await this.db!.put('constellationBackgrounds', background);
    }
    
    return background;
  }

  async getAllConstellationBackgrounds(): Promise<ConstellationBackground[]> {
    await this.ensureInitialized();
    return await this.db!.getAll('constellationBackgrounds');
  }

  async deleteConstellationBackground(constellationKey: string): Promise<void> {
    await this.ensureInitialized();
    await this.db!.delete('constellationBackgrounds', constellationKey);
  }

  async clearOldConstellationBackgrounds(daysOld: number = 30): Promise<number> {
    await this.ensureInitialized();
    
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    const allBackgrounds = await this.db!.getAll('constellationBackgrounds');
    const oldBackgrounds = allBackgrounds.filter(b => b.lastAccessed < cutoffTime);
    
    const tx = this.db!.transaction('constellationBackgrounds', 'readwrite');
    for (const background of oldBackgrounds) {
      await tx.store.delete(background.constellationKey);
    }
    await tx.done;
    
    return oldBackgrounds.length;
  }

  async getStats(): Promise<{
    fileCount: number;
    musicCount: number;
    totalSize: string;
    oldestFile: number;
  }> {
    await this.ensureInitialized();

    const files = await this.db!.getAll('files');
    const music = await this.db!.getAll('music');
    const storage = await this.getStorageUsage();

    const oldestFile = files.length > 0 
      ? Math.min(...files.map(f => f.createdAt))
      : Date.now();

    return {
      fileCount: files.length,
      musicCount: music.length,
      totalSize: this.formatBytes(storage.total),
      oldestFile
    };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  async saveCinemaVideo(file: File, thumbnail?: string, duration?: number): Promise<string> {
    await this.ensureInitialized();
    
    const videoId = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const video: CinemaVideo = {
      id: videoId,
      name: file.name,
      data: file,
      thumbnail,
      duration,
      size: file.size,
      createdAt: Date.now(),
      lastAccessed: Date.now()
    };
    
    await this.db!.put('cinemaVideos', video);
    return videoId;
  }

  async getCinemaVideo(id: string): Promise<CinemaVideo | undefined> {
    await this.ensureInitialized();
    
    const video = await this.db!.get('cinemaVideos', id);
    
    if (video) {
      video.lastAccessed = Date.now();
      await this.db!.put('cinemaVideos', video);
    }
    
    return video;
  }

  async getAllCinemaVideos(): Promise<CinemaVideo[]> {
    await this.ensureInitialized();
    return await this.db!.getAll('cinemaVideos');
  }

  async deleteCinemaVideo(id: string): Promise<void> {
    await this.ensureInitialized();
    await this.db!.delete('cinemaVideos', id);
  }

  async getCinemaVideoCount(): Promise<number> {
    await this.ensureInitialized();
    return (await this.db!.getAll('cinemaVideos')).length;
  }

  async clearOldCinemaVideos(daysOld: number = 30): Promise<number> {
    await this.ensureInitialized();
    
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    const allVideos = await this.db!.getAll('cinemaVideos');
    const oldVideos = allVideos.filter(v => v.lastAccessed < cutoffTime);
    
    const tx = this.db!.transaction('cinemaVideos', 'readwrite');
    for (const video of oldVideos) {
      await tx.store.delete(video.id);
    }
    await tx.done;
    
    return oldVideos.length;
  }

  async batchDeleteFiles(ids: string[]): Promise<number> {
    await this.ensureInitialized();
    
    const tx = this.db!.transaction('files', 'readwrite');
    for (const id of ids) {
      await tx.store.delete(id);
    }
    await tx.done;
    
    return ids.length;
  }

  async batchPutFiles(files: CachedFile[]): Promise<number> {
    await this.ensureInitialized();
    
    const tx = this.db!.transaction('files', 'readwrite');
    for (const file of files) {
      await tx.store.put(file);
    }
    await tx.done;
    
    return files.length;
  }

  async batchDeleteMusic(ids: string[]): Promise<number> {
    await this.ensureInitialized();
    
    const tx = this.db!.transaction('music', 'readwrite');
    for (const id of ids) {
      await tx.store.delete(id);
    }
    await tx.done;
    
    return ids.length;
  }

  async batchPutMusic(musicList: BackgroundMusic[]): Promise<number> {
    await this.ensureInitialized();
    
    const tx = this.db!.transaction('music', 'readwrite');
    for (const music of musicList) {
      await tx.store.put(music);
    }
    await tx.done;
    
    return musicList.length;
  }

  async batchUpdateMusicOrder(musicIds: string[]): Promise<void> {
    await this.ensureInitialized();
    
    const tx = this.db!.transaction('music', 'readwrite');
    for (let i = 0; i < musicIds.length; i++) {
      const music = await tx.store.get(musicIds[i]);
      if (music) {
        music.order = i;
        await tx.store.put(music);
      }
    }
    await tx.done;
  }

  async batchClearOldFiles(daysOld: number = 30): Promise<number> {
    await this.ensureInitialized();
    
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    const allFiles = await this.db!.getAll('files');
    const oldFiles = allFiles.filter(f => f.lastAccessed < cutoffTime);
    
    const tx = this.db!.transaction('files', 'readwrite');
    for (const file of oldFiles) {
      await tx.store.delete(file.id);
    }
    await tx.done;
    
    return oldFiles.length;
  }

  async batchClearOldMusic(daysOld: number = 30): Promise<number> {
    await this.ensureInitialized();
    
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    const allMusic = await this.db!.getAll('music');
    const oldMusic = allMusic.filter(m => {
      const lastPlayed = m.lastPlayed || m.createdAt;
      return lastPlayed < cutoffTime;
    });
    
    const tx = this.db!.transaction('music', 'readwrite');
    for (const music of oldMusic) {
      await tx.store.delete(music.id);
    }
    await tx.done;
    
    return oldMusic.length;
  }
}

export const dbService = new DatabaseService();
export type { CachedFile, BackgroundMusic, PlaybackState, ConstellationBackground, CinemaVideo };
