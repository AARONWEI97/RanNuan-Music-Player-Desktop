import localforage from 'localforage';
import type { Album, AppSettings, Photo, Tag } from '../types';
import { mergeAppSettings } from '../types';
import type { GradientName } from '../styles/theme';
import { usePhotoStore } from '../store/usePhotoStore';
import { useUiStore } from '../store/modules/uiStore';

const blobStorage = localforage.createInstance({
  name: 'RanRan',
  storeName: 'photos_blob',
});

export interface ExportData {
  version: string;
  exportDate: string;
  photos: Photo[];
  albums: Album[];
  tags: Tag[];
  blobs: Record<string, string>;
  settings?: AppSettings;
  currentGradient?: GradientName;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('读取文件失败'));
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, body] = dataUrl.split(',');
  const mime = header.match(/data:(.*?);/)?.[1] || 'application/octet-stream';
  const binary = atob(body || '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

async function serializeBlob(value: unknown): Promise<string | null> {
  if (!value) return null;
  if (typeof value === 'string') {
    return value.startsWith('data:') || value.startsWith('blob:') ? value : null;
  }
  if (value instanceof Blob) {
    return blobToDataUrl(value);
  }
  return null;
}

export async function exportAllData(): Promise<ExportData> {
  const { photos, albums, tags } = usePhotoStore.getState();
  const { settings, currentGradient } = useUiStore.getState();
  const blobs: Record<string, string> = {};

  for (const photo of photos) {
    try {
      const stored = await blobStorage.getItem(photo.id);
      const encoded = await serializeBlob(stored);
      if (encoded) {
        blobs[photo.id] = encoded;
      } else if (photo.thumbnail?.startsWith('data:')) {
        blobs[photo.id] = photo.thumbnail;
      }
    } catch {
      if (photo.thumbnail?.startsWith('data:')) {
        blobs[photo.id] = photo.thumbnail;
      }
    }
  }

  return {
    version: '2.0.0',
    exportDate: new Date().toISOString(),
    photos: photos.map(({ url: _url, ...rest }) => rest as Photo),
    albums,
    tags,
    blobs,
    settings,
    currentGradient,
  };
}

export async function importData(data: ExportData): Promise<{
  importedPhotos: number;
  importedAlbums: number;
  importedTags: number;
  importedBlobs: number;
}> {
  if (!data || !Array.isArray(data.photos)) {
    throw new Error('无效的备份文件格式');
  }

  let importedBlobs = 0;
  if (data.blobs) {
    for (const [key, value] of Object.entries(data.blobs)) {
      try {
        const payload = typeof value === 'string' && value.startsWith('data:')
          ? dataUrlToBlob(value)
          : value;
        await blobStorage.setItem(key, payload);
        importedBlobs += 1;
      } catch {
        // 单张失败不阻断整包导入
      }
    }
  }

  usePhotoStore.getState().importLibrary(
    data.photos,
    data.albums || [],
    data.tags || [],
  );

  if (data.settings) {
    const settings = mergeAppSettings(data.settings);
    useUiStore.getState().updateSettings(settings);
    if (data.currentGradient !== undefined) {
      useUiStore.getState().setGradient(data.currentGradient);
    }
  }

  return {
    importedPhotos: data.photos.length,
    importedAlbums: data.albums?.length || 0,
    importedTags: data.tags?.length || 0,
    importedBlobs,
  };
}

export function downloadAsJson(data: ExportData, filename?: string): void {
  const json = JSON.stringify(data);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `ranran-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function readJsonFile(file: File): Promise<ExportData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(String(e.target?.result || ''));
        if (!data || !Array.isArray(data.photos)) {
          reject(new Error('无效的备份文件格式'));
          return;
        }
        resolve(data as ExportData);
      } catch {
        reject(new Error('无法解析备份文件'));
      }
    };
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsText(file);
  });
}
