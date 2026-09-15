import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { Photo } from '../types';
import { usePhotoUrl } from './usePhotoUrl';

function resolveSrc(url: string): string {
  if (!url) return '';
  if (
    url.startsWith('data:') ||
    url.startsWith('blob:') ||
    url.startsWith('http://') ||
    url.startsWith('https://')
  ) {
    return url;
  }
  return `data:image/jpeg;base64,${url}`;
}

/**
 * 把相册照片铺满行星表面。优先缩略图立刻上球，完整图随后替换。
 * 用 Image 解码，避免 TextureLoader 对 blob/data URL 静默失败。
 */
export function usePlanetTexture(photo: Photo): THREE.Texture | null {
  const imageUrl = usePhotoUrl(photo);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const textureRef = useRef<THREE.Texture | null>(null);

  useEffect(() => {
    const url = resolveSrc(imageUrl || photo.thumbnail || '');
    if (!url) return undefined;

    let cancelled = false;
    const img = new Image();
    img.decoding = 'async';
    if (url.startsWith('http')) img.crossOrigin = 'anonymous';

    img.onload = () => {
      if (cancelled) return;
      const next = new THREE.Texture(img);
      next.colorSpace = THREE.SRGBColorSpace;
      next.anisotropy = 8;
      next.minFilter = THREE.LinearMipmapLinearFilter;
      next.magFilter = THREE.LinearFilter;
      next.generateMipmaps = true;
      next.wrapS = THREE.ClampToEdgeWrapping;
      next.wrapT = THREE.ClampToEdgeWrapping;
      next.needsUpdate = true;
      const prev = textureRef.current;
      textureRef.current = next;
      setTexture(next);
      if (prev && prev !== next) prev.dispose();
    };

    img.src = url;

    return () => {
      cancelled = true;
    };
  }, [imageUrl, photo.thumbnail]);

  useEffect(() => () => {
    textureRef.current?.dispose();
    textureRef.current = null;
  }, []);

  return texture;
}
