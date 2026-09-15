import { useState, useEffect, useRef } from 'react';
import localforage from 'localforage';
import type { Photo } from '../types';

const blobStorage = localforage.createInstance({
  name: 'RanRan',
  storeName: 'photos_blob',
});

export function usePhotoUrl(photo: Photo | null): string {
  const [url, setUrl] = useState<string>('');
  // 跟踪当前 active 的 object URL，用于清理
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!photo) {
      setUrl('');
      return;
    }

    let isMounted = true;

    const loadUrl = async () => {
      // 1. 已有 data: / blob: URL → 直接使用
      if (photo.url && (photo.url.startsWith('data:') || photo.url.startsWith('blob:'))) {
        if (isMounted) setUrl(photo.url);
        return;
      }

      try {
        // 2. 从 blobStorage 读取 Blob（新格式）
        const blob = await blobStorage.getItem<Blob>(photo.id);
        if (blob && isMounted) {
          // 清理旧的 object URL
          if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
          }
          const objectUrl = URL.createObjectURL(blob);
          objectUrlRef.current = objectUrl;
          setUrl(objectUrl);
          return;
        }
      } catch {
        // blobStorage 可能存了旧格式的 base64 字符串
        try {
          const legacyBase64 = await blobStorage.getItem<string>(photo.id);
          if (legacyBase64 && typeof legacyBase64 === 'string' && 
              (legacyBase64.startsWith('data:') || legacyBase64.startsWith('blob:'))) {
            if (isMounted) setUrl(legacyBase64);
            return;
          }
        } catch {}
      }

      // 3. 兼容旧格式 localforage（photo.id）
      try {
        const legacyUrl = await localforage.getItem<string>(photo.id);
        if (legacyUrl && isMounted) {
          setUrl(legacyUrl);
          return;
        }
      } catch {}

      // 4. 兼容旧格式 localforage（photo_前缀）
      try {
        const legacyUrl2 = await localforage.getItem<string>(`photo_${photo.id}`);
        if (legacyUrl2 && isMounted) {
          setUrl(legacyUrl2);
          return;
        }
      } catch {}

      // 5. 最终降级到缩略图
      if (photo.thumbnail && isMounted) {
        setUrl(photo.thumbnail);
      }
    };

    loadUrl();

    return () => {
      isMounted = false;
      // 组件卸载时清理 object URL
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [photo?.id, photo?.url, photo?.thumbnail]);

  return url;
}

export { blobStorage };
