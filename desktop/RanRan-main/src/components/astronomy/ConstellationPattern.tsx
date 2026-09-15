import { useRef, useEffect, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import localforage from 'localforage';
import type { Photo } from '../../types';
import { CONSTELLATIONS, type ConstellationKey } from './constants';

interface ConstellationPatternProps {
  constellation: typeof CONSTELLATIONS[ConstellationKey];
  position: [number, number, number];
  scale: number;
  visible: boolean;
  isDark: boolean;
  photoTexture?: THREE.Texture;
}

const ConstellationPattern: React.FC<ConstellationPatternProps> = memo(({ 
  constellation, 
  position, 
  scale, 
  visible, 
  isDark,
  photoTexture 
}) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.1) * 0.05;
    }
  });

  if (!visible) return null;

  return (
    <group ref={groupRef} position={position} scale={scale}>
      {constellation.stars.map((star, index) => (
        <mesh key={index} position={[star.x * 8, star.y * 8, 0]}>
          <sphereGeometry args={[star.size * 0.8, 16, 16]} />
          <meshBasicMaterial 
            color={isDark ? '#ffffff' : '#888888'}
            transparent
            opacity={0.9}
          />
          <mesh scale={[2, 2, 2]}>
            <sphereGeometry args={[star.size * 0.8, 16, 16]} />
            <meshBasicMaterial 
              color={isDark ? '#88ccff' : '#aaaaaa'}
              transparent
              opacity={0.3}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </mesh>
      ))}
      
      {constellation.lines.map(([start, end], index) => {
        const startPos = constellation.stars[start];
        const endPos = constellation.stars[end];
        if (!startPos || !endPos) return null;
        
        return (
          <line key={`line-${index}`}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[new Float32Array([
                  startPos.x * 8, startPos.y * 8, 0,
                  endPos.x * 8, endPos.y * 8, 0
                ]), 3]}
              />
            </bufferGeometry>
            <lineBasicMaterial 
              color={isDark ? '#4488ff' : '#666666'} 
              transparent 
              opacity={0.4} 
              linewidth={1}
            />
          </line>
        );
      })}
      
      {photoTexture && (
        <mesh position={[
          (constellation.stars.reduce((sum, s) => sum + s.x, 0) / constellation.stars.length) * 8,
          (constellation.stars.reduce((sum, s) => sum + s.y, 0) / constellation.stars.length) * 8,
          -5
        ]}>
          <planeGeometry args={[30, 30]} />
          <meshBasicMaterial 
            map={photoTexture}
            transparent
            opacity={0.15}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
      
      <Html center position={[0, -constellation.stars.reduce((max, s) => Math.max(max, s.y), 0) * 8 - 8, 0]}>
        <div className={`
          px-2 py-1 rounded text-xs font-medium whitespace-nowrap
          ${isDark ? 'bg-black/60 text-white border border-white/20' : 'bg-white/80 text-gray-800 border border-gray-200'}
          backdrop-blur-sm
        `}>
          ✨ {constellation.name}
        </div>
      </Html>
    </group>
  );
});

ConstellationPattern.displayName = 'ConstellationPattern';

interface ConstellationTextureLoaderProps {
  constellationKey: ConstellationKey;
  photo: Photo | null;
  onTextureLoad: (key: ConstellationKey, texture: THREE.Texture | null) => void;
}

const ConstellationTextureLoader: React.FC<ConstellationTextureLoaderProps> = memo(({ constellationKey, photo, onTextureLoad }) => {
  const prevTextureRef = useRef<THREE.Texture | null>(null);

  useEffect(() => {
    if (!photo) {
      if (prevTextureRef.current) {
        prevTextureRef.current.dispose();
        prevTextureRef.current = null;
      }
      onTextureLoad(constellationKey, null);
      return;
    }

    const loader = new THREE.TextureLoader();
    let isMounted = true;
    
    const loadTexture = async () => {
      let imageUrl = photo.url || photo.thumbnail;
      
      if (!imageUrl && photo.id) {
        imageUrl = await localforage.getItem<string>(`photo_${photo.id}`) || '';
      }
      
      if (imageUrl && isMounted) {
        loader.load(imageUrl, (texture) => {
          if (isMounted) {
            texture.colorSpace = THREE.SRGBColorSpace;
            if (prevTextureRef.current) {
              prevTextureRef.current.dispose();
            }
            prevTextureRef.current = texture;
            onTextureLoad(constellationKey, texture);
          } else {
            texture.dispose();
          }
        });
      }
    };
    
    loadTexture();
    
    return () => {
      isMounted = false;
    };
  }, [constellationKey, photo, onTextureLoad]);

  useEffect(() => {
    return () => {
      if (prevTextureRef.current) {
        prevTextureRef.current.dispose();
        prevTextureRef.current = null;
      }
    };
  }, []);
  
  return null;
});

ConstellationTextureLoader.displayName = 'ConstellationTextureLoader';

export { ConstellationPattern, ConstellationTextureLoader };
