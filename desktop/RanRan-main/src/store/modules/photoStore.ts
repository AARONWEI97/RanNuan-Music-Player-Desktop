import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Photo, Album, Tag } from '../../types';
import { compressImageInWorker } from '../../services/imageWorker';
import { dbService, type LibraryPhotoRecord } from '../../services/database';

// 照片目录以前走 Zustand persist，图片二进制另存在 localforage。
// 启动时 persist 还没读完就会把空目录写回去，退出重进后行星消失。
// 视频能留下，是因为影院把文件和记录放进同一次 IndexedDB 提交。照片现在同样处理。

let libraryBoot: Promise<void> | null = null;
let metaQueue: Promise<void> = Promise.resolve();
let pendingDeleteIds = new Set<string>();
let deleteScheduled = false;

const WRITE_BATCH = 24;
const COMPRESS_CONCURRENCY = 3;

function recountAlbums(albums: Album[], photos: Photo[]): Album[] {
  const counts = new Map<string, number>();
  photos.forEach((photo) => {
    counts.set(photo.albumId, (counts.get(photo.albumId) ?? 0) + 1);
  });
  return albums.map((album) => {
    const photoCount = counts.get(album.id) ?? 0;
    return album.photoCount === photoCount ? album : { ...album, photoCount };
  });
}

interface PhotoState {
  photos: Photo[];
  albums: Album[];
  tags: Tag[];
  currentAlbumId: string | null;
  selectedPhotoId: string | null;
  searchQuery: string;
  isLoading: boolean;
  libraryReady: boolean;
  layoutMode: 'galaxy';
  sortOption: 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc';
  filterTags: string[];
}

interface PhotoActions {
  loadLibrary: () => Promise<void>;
  addPhoto: (file: File, albumId: string, onProgress?: (progress: number) => void) => Promise<Photo>;
  addPhotos: (files: File[], albumId: string, onProgress?: (done: number, total: number) => void) => Promise<{ photos: Photo[]; failed: number[] }>;
  removePhoto: (id: string) => void;
  removePhotos: (ids: string[]) => void;
  movePhotos: (ids: string[], albumId: string) => Promise<void>;
  updatePhoto: (id: string, updates: Partial<Photo>) => void;
  addAlbum: (name: string, description?: string) => Album;
  removeAlbum: (id: string) => void;
  updateAlbum: (id: string, updates: Partial<Album>) => void;
  addTag: (name: string, color: string) => Tag;
  removeTag: (id: string) => void;
  createTag: (name: string) => Tag;
  addTagToPhoto: (photoId: string, tagName: string) => void;
  removeTagFromPhoto: (photoId: string, tagName: string) => void;
  setCurrentAlbum: (albumId: string | null) => void;
  setSelectedPhoto: (photoId: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSortOption: (option: 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc') => void;
  toggleFilterTag: (tag: string) => void;
  clearFilters: () => void;
  getFilteredPhotos: () => Photo[];
  initializeDefaultAlbum: () => Promise<void>;
  importLibrary: (photos: Photo[], albums: Album[], tags: Tag[], blobs?: Record<string, Blob>) => Promise<void>;
}

export type PhotoStore = PhotoState & PhotoActions;

function toPhoto(record: LibraryPhotoRecord): Photo {
  return {
    id: record.id,
    url: undefined as unknown as string,
    thumbnail: record.thumbnail,
    name: record.name,
    description: record.description,
    tags: record.tags ?? [],
    albumId: record.albumId,
    createdAt: record.createdAt,
    width: record.width,
    height: record.height,
  };
}

const compressImage = (file: File, maxWidth: number = 1920): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error('Canvas toBlob failed'));
            },
            'image/jpeg',
            0.7
          );
        } else {
          reject(new Error('Canvas context not available'));
        }
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const createThumbnail = (file: File, size: number = 600): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ratio = Math.max(size / img.width, size / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          reject(new Error('Canvas context not available'));
        }
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

function dataUrlToBlob(dataUrl: string): Blob | null {
  const comma = dataUrl.indexOf(',');
  if (comma < 0) return null;
  const mime = dataUrl.slice(0, comma).match(/data:(.*?);/)?.[1] || 'application/octet-stream';
  try {
    const binary = atob(dataUrl.slice(comma + 1));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}

export const usePhotoStore = create<PhotoStore>()((set, get) => {
  const enqueueMetaSave = () => {
    metaQueue = metaQueue.then(async () => {
      if (!get().libraryReady) return;
      const { albums, tags, currentAlbumId } = get();
      await dbService.saveLibraryMeta({
        key: 'library',
        albums,
        tags,
        currentAlbumId,
        legacyMigrated: true,
      });
    }).catch((error) => {
      console.error('Failed to persist photo library metadata:', error);
    });
    return metaQueue;
  };

  const persistPhotoFields = (id: string) => {
    const photo = get().photos.find((item) => item.id === id);
    if (!photo) return;
    void dbService.patchLibraryPhoto(id, {
      name: photo.name,
      description: photo.description,
      tags: photo.tags,
      albumId: photo.albumId,
      thumbnail: photo.thumbnail,
      width: photo.width,
      height: photo.height,
      createdAt: photo.createdAt,
    });
  };

  return {
    photos: [],
    albums: [],
    tags: [],
    currentAlbumId: null,
    selectedPhotoId: null,
    searchQuery: '',
    isLoading: true,
    libraryReady: false,
    layoutMode: 'galaxy',
    sortOption: 'date-desc',
    filterTags: [],

    loadLibrary: () => {
      if (!libraryBoot) {
        libraryBoot = (async () => {
          set({ isLoading: true });
          try {
            await dbService.init();
            await dbService.migrateLegacyPhotoLibrary();
            const records = await dbService.getAllLibraryPhotos();
            const meta = await dbService.getLibraryMeta();
            console.info(`宇宙相册照片库: IndexedDB libraryPhotos (${records.length})`);
            set({
              photos: records.map(toPhoto),
              albums: meta?.albums ?? [],
              tags: meta?.tags ?? [],
              currentAlbumId: meta?.currentAlbumId ?? null,
              isLoading: false,
              libraryReady: true,
            });
          } catch (error) {
            libraryBoot = null;
            set({ isLoading: false, libraryReady: true });
            throw error;
          }
        })();
      }
      return libraryBoot;
    },

    addPhoto: async (file: File, albumId: string, onProgress?: (progress: number) => void) => {
      const result = await get().addPhotos([file], albumId, (done, total) => {
        onProgress?.(Math.round((done / Math.max(total, 1)) * 100));
      });
      const photo = result.photos[0];
      if (!photo) throw new Error('图片压缩结果为空');
      return photo;
    },

    addPhotos: async (files, albumId, onProgress) => {
      await get().loadLibrary();
      const total = files.length;
      const started = Date.now();
      const saved: Photo[] = [];
      const failed: number[] = [];
      const pendingRecords: LibraryPhotoRecord[] = [];
      const pendingPhotos: Photo[] = [];
      let cursor = 0;
      let completed = 0;
      let flushChain: Promise<void> = Promise.resolve();

      const prepare = async (file: File, createdAt: number) => {
        let compressedBlob: Blob;
        let thumbnail: string;
        try {
          const result = await compressImageInWorker(file);
          compressedBlob = result.compressed;
          thumbnail = result.thumbnail;
        } catch {
          compressedBlob = await compressImage(file);
          thumbnail = await createThumbnail(file);
        }
        if (!compressedBlob || compressedBlob.size === 0) throw new Error('图片压缩结果为空');
        const photo: Photo = {
          id: uuidv4(),
          url: undefined as unknown as string,
          thumbnail,
          name: file.name.replace(/\.[^/.]+$/, ''),
          tags: [],
          albumId,
          createdAt,
        };
        const record: LibraryPhotoRecord = {
          id: photo.id,
          name: photo.name,
          tags: photo.tags,
          albumId,
          createdAt,
          thumbnail,
          data: compressedBlob,
        };
        return { photo, record };
      };

      const flush = () => {
        flushChain = flushChain.then(async () => {
          if (pendingRecords.length === 0) return;
          const records = pendingRecords.splice(0, pendingRecords.length);
          const batch = pendingPhotos.splice(0, pendingPhotos.length);
          await dbService.putLibraryPhotos(records);
          saved.push(...batch);
        });
        return flushChain;
      };

      const run = async () => {
        while (cursor < files.length) {
          const index = cursor;
          cursor += 1;
          const file = files[index];
          try {
            const prepared = await prepare(file, started + index);
            pendingRecords.push(prepared.record);
            pendingPhotos.push(prepared.photo);
            if (pendingRecords.length >= WRITE_BATCH) await flush();
          } catch (error) {
            failed.push(index);
            console.error(`Failed to import ${file.name}:`, error);
          } finally {
            completed += 1;
            onProgress?.(completed, total);
          }
        }
      };

      const workers = Math.min(COMPRESS_CONCURRENCY, Math.max(files.length, 1));
      await Promise.all(Array.from({ length: workers }, () => run()));
      await flush();
      if (saved.length > 0) {
        set((state) => {
          const photos = [...state.photos, ...saved];
          return { photos, albums: recountAlbums(state.albums, photos) };
        });
        await enqueueMetaSave();
      }
      return { photos: saved, failed };
    },

    removePhotos: (ids: string[]) => {
      ids.forEach((id) => pendingDeleteIds.add(id));
      if (deleteScheduled) return;
      deleteScheduled = true;
      queueMicrotask(() => {
        deleteScheduled = false;
        const batch = [...pendingDeleteIds];
        pendingDeleteIds = new Set();
        if (batch.length === 0) return;
        const idSet = new Set(batch);
        set((state) => {
          const photos = state.photos.filter((photo) => !idSet.has(photo.id));
          return {
            photos,
            albums: recountAlbums(state.albums, photos),
            selectedPhotoId: state.selectedPhotoId && idSet.has(state.selectedPhotoId) ? null : state.selectedPhotoId,
          };
        });
        void (async () => {
          await dbService.deleteLibraryPhotos(batch);
          await enqueueMetaSave();
        })();
      });
    },

    removePhoto: (id: string) => {
      get().removePhotos([id]);
    },

    movePhotos: async (ids, albumId) => {
      const idSet = new Set(ids);
      if (idSet.size === 0) return;
      set((state) => {
        const photos = state.photos.map((photo) => (
          idSet.has(photo.id) ? { ...photo, albumId } : photo
        ));
        return { photos, albums: recountAlbums(state.albums, photos) };
      });
      await dbService.patchLibraryPhotos([...idSet].map((id) => ({ id, patch: { albumId } })));
      await enqueueMetaSave();
    },

    updatePhoto: (id: string, updates: Partial<Photo>) => {
      set((state) => ({
        photos: state.photos.map((photo) =>
          photo.id === id ? { ...photo, ...updates } : photo
        ),
      }));
      persistPhotoFields(id);
    },

    addAlbum: (name: string, description?: string) => {
      const album: Album = {
        id: uuidv4(),
        name,
        description,
        createdAt: Date.now(),
        photoCount: 0,
      };
      set((state) => ({
        albums: [...state.albums, album],
      }));
      void enqueueMetaSave();
      return album;
    },

    removeAlbum: (id: string) => {
      const doomed = get().photos.filter((photo) => photo.albumId === id).map((photo) => photo.id);
      set((state) => ({
        albums: state.albums.filter((album) => album.id !== id),
        photos: state.photos.filter((photo) => photo.albumId !== id),
        currentAlbumId: state.currentAlbumId === id ? null : state.currentAlbumId,
      }));
      void (async () => {
        if (doomed.length > 0) await dbService.deleteLibraryPhotos(doomed);
        await enqueueMetaSave();
      })();
    },

    updateAlbum: (id: string, updates: Partial<Album>) => {
      set((state) => ({
        albums: state.albums.map((album) =>
          album.id === id ? { ...album, ...updates } : album
        ),
      }));
      void enqueueMetaSave();
    },

    addTag: (name: string, color: string) => {
      const tag: Tag = {
        id: uuidv4(),
        name,
        color,
        count: 0,
      };
      set((state) => ({
        tags: [...state.tags, tag],
      }));
      void enqueueMetaSave();
      return tag;
    },

    removeTag: (id: string) => {
      const affected = get().photos.filter((photo) => photo.tags.includes(id));
      set((state) => ({
        tags: state.tags.filter((tag) => tag.id !== id),
        photos: state.photos.map((photo) => ({
          ...photo,
          tags: photo.tags.filter((tagId) => tagId !== id),
        })),
      }));
      void (async () => {
        await dbService.patchLibraryPhotos(affected.map((photo) => ({
          id: photo.id,
          patch: { tags: photo.tags.filter((tagId) => tagId !== id) },
        })));
        await enqueueMetaSave();
      })();
    },

    createTag: (name: string) => {
      const id = uuidv4();
      const colors = ['#00f5ff', '#ff2d75', '#39ff14', '#ff6b35', '#b829dd'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const tag: Tag = { id, name, color, count: 0 };
      set((state) => ({ tags: [...state.tags, tag] }));
      void enqueueMetaSave();
      return tag;
    },

    addTagToPhoto: (photoId: string, tagName: string) => {
      set((state) => ({
        photos: state.photos.map((photo) => {
          if (photo.id !== photoId) return photo;
          if (photo.tags.includes(tagName)) return photo;
          return { ...photo, tags: [...photo.tags, tagName] };
        }),
      }));
      persistPhotoFields(photoId);
    },

    removeTagFromPhoto: (photoId: string, tagName: string) => {
      set((state) => ({
        photos: state.photos.map((photo) => {
          if (photo.id !== photoId) return photo;
          return { ...photo, tags: photo.tags.filter((tag) => tag !== tagName) };
        }),
      }));
      persistPhotoFields(photoId);
    },

    setCurrentAlbum: (albumId: string | null) => {
      set({ currentAlbumId: albumId });
      void enqueueMetaSave();
    },

    setSelectedPhoto: (photoId: string | null) => {
      set({ selectedPhotoId: photoId });
    },

    setSearchQuery: (query: string) => {
      set({ searchQuery: query });
    },

    setSortOption: (option: 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc') => {
      set({ sortOption: option });
    },

    toggleFilterTag: (tag: string) => {
      set((state) => ({
        filterTags: state.filterTags.includes(tag)
          ? state.filterTags.filter((item) => item !== tag)
          : [...state.filterTags, tag],
      }));
    },

    clearFilters: () => {
      set({ filterTags: [], searchQuery: '' });
    },

    getFilteredPhotos: () => {
      const { photos, currentAlbumId, searchQuery, sortOption, filterTags } = get();
      let filtered = photos;

      if (currentAlbumId) {
        filtered = filtered.filter((photo) => photo.albumId === currentAlbumId);
      }

      if (filterTags && filterTags.length > 0) {
        filtered = filtered.filter((photo) =>
          filterTags.every((tag) => photo.tags.includes(tag))
        );
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (photo) =>
            photo.name.toLowerCase().includes(query) ||
            photo.description?.toLowerCase().includes(query) ||
            photo.tags.some((tag) => tag.toLowerCase().includes(query))
        );
      }

      return filtered.sort((a, b) => {
        switch (sortOption) {
          case 'date-asc':
            return a.createdAt - b.createdAt;
          case 'name-asc':
            return a.name.localeCompare(b.name);
          case 'name-desc':
            return b.name.localeCompare(a.name);
          case 'date-desc':
          default:
            return b.createdAt - a.createdAt;
        }
      });
    },

    importLibrary: async (photos, albums, tags, blobs = {}) => {
      await get().loadLibrary();
      const incoming = Array.isArray(photos) ? photos : [];
      const records: LibraryPhotoRecord[] = [];
      for (const photo of incoming) {
        let data: Blob | undefined = blobs[photo.id];
        if ((!data || data.size === 0) && photo.thumbnail?.startsWith('data:')) {
          data = dataUrlToBlob(photo.thumbnail) ?? undefined;
        }
        if (!data || data.size === 0) {
          const existing = await dbService.getLibraryPhoto(photo.id);
          if (existing?.data?.size) data = existing.data;
        }
        if (!data || data.size === 0) continue;
        records.push({
          id: photo.id,
          name: photo.name,
          description: photo.description,
          tags: Array.isArray(photo.tags) ? photo.tags : [],
          albumId: photo.albumId,
          createdAt: photo.createdAt || Date.now(),
          width: photo.width,
          height: photo.height,
          thumbnail: photo.thumbnail,
          data,
        });
      }

      const fallbackAlbum: Album = {
        id: 'default',
        name: '我的狗狗',
        description: '默认相册',
        createdAt: Date.now(),
        photoCount: records.length,
      };
      const nextAlbums = (albums.length ? albums : [fallbackAlbum]).map((album) => ({
        ...album,
        photoCount: records.filter((photo) => photo.albumId === album.id).length,
      }));
      const known = new Set(nextAlbums.map((album) => album.id));
      records.forEach((photo) => {
        if (photo.albumId && !known.has(photo.albumId)) {
          known.add(photo.albumId);
          nextAlbums.push({
            id: photo.albumId,
            name: '导入相册',
            createdAt: Date.now(),
            photoCount: records.filter((item) => item.albumId === photo.albumId).length,
          });
        }
      });
      const nextTags = Array.isArray(tags) ? tags : [];
      await dbService.replaceLibrary(records, {
        key: 'library',
        albums: nextAlbums,
        tags: nextTags,
        currentAlbumId: null,
        legacyMigrated: true,
      });
      set({
        photos: records.map(toPhoto),
        albums: nextAlbums,
        tags: nextTags,
        currentAlbumId: null,
        selectedPhotoId: null,
        searchQuery: '',
        filterTags: [],
        libraryReady: true,
        isLoading: false,
      });
    },

    initializeDefaultAlbum: async () => {
      const { libraryReady, albums, currentAlbumId } = get();
      if (!libraryReady) return;

      if (albums.length === 0) {
        const defaultAlbum: Album = {
          id: 'default',
          name: '我的狗狗',
          description: '默认相册',
          createdAt: Date.now(),
          photoCount: 0,
        };
        set({ albums: [defaultAlbum], currentAlbumId: 'default' });
        await enqueueMetaSave();
      } else if (currentAlbumId && !albums.some((album) => album.id === currentAlbumId)) {
        set({ currentAlbumId: albums[0].id });
        await enqueueMetaSave();
      }
    },
  };
});
