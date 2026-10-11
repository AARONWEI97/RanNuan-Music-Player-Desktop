import { useState, useEffect, useRef } from 'react';
import localforage from 'localforage';
import type { Photo } from '../types';
import { dbService } from '../services/database';

const legacyBlobStorage = localforage.createInstance({
  name: 'RanRan',
  storeName: 'photos_blob',
});

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

async function blobFromUnknown(value: unknown): Promise<Blob | null> {
  if (value instanceof Blob) return value.size > 0 ? value : null;
  if (typeof value === 'string' && value.startsWith('data:')) return dataUrlToBlob(value);
  return null;
}

export async function loadPhotoBlob(photoId: string): Promise<Blob | null> {
  try {
    const record = await dbService.getLibraryPhoto(photoId);
    if (record?.data instanceof Blob && record.data.size > 0) return record.data;
  } catch {
    // 新库还没建好时继续看旧库
  }

  try {
    const stored = await blobFromUnknown(await legacyBlobStorage.getItem(photoId));
    if (stored) return stored;
  } catch {
    // 旧 blob store 不可用
  }

  try {
    const legacy = await blobFromUnknown(await localforage.getItem(photoId));
    if (legacy) return legacy;
    return blobFromUnknown(await localforage.getItem(`photo_${photoId}`));
  } catch {
    return null;
  }
}

export function usePhotoUrl(photo: Photo | null): string {
  const [url, setUrl] = useState<string>('');
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!photo) {
      setUrl('');
      return;
    }

    let isMounted = true;

    const loadUrl = async () => {
      if (photo.url && (photo.url.startsWith('data:') || photo.url.startsWith('blob:'))) {
        if (isMounted) setUrl(photo.url);
        return;
      }

      const blob = await loadPhotoBlob(photo.id);
      if (!isMounted) return;
      if (blob) {
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        const objectUrl = URL.createObjectURL(blob);
        objectUrlRef.current = objectUrl;
        setUrl(objectUrl);
        return;
      }

      if (photo.thumbnail) setUrl(photo.thumbnail);
    };

    void loadUrl();

    return () => {
      isMounted = false;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [photo?.id, photo?.url, photo?.thumbnail]);

  return url;
}
