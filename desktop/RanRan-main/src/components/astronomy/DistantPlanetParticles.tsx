import { useRef, useMemo, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PLANET_COLORS } from './constants';
import { createPlanetOrbit, orbitPosition } from './kepler';
import { getOrbitTimeScale } from '../../bridge/universeHost';

interface DistantPlanetParticlesProps {
  photos: Array<{
    id: string;
    index: number;
    totalPhotos: number;
  }>;
  onPhotoClick: (id: string) => void;
  isDark: boolean;
}

const DistantPlanetParticles: React.FC<DistantPlanetParticlesProps> = memo(({
  photos,
  isDark,
  onPhotoClick: _onPhotoClick,
}) => {
  const pointsRef = useRef<THREE.Points>(null);
  const elapsedRef = useRef(0);
  const scratch = useRef(new THREE.Vector3());

  const { positions, colors, orbits } = useMemo(() => {
    const pos = new Float32Array(photos.length * 3);
    const col = new Float32Array(photos.length * 3);
    const orbitList = photos.map((item) => createPlanetOrbit(item.index, item.totalPhotos));
    const tmp = new THREE.Vector3();

    for (let i = 0; i < photos.length; i++) {
      orbitPosition(orbitList[i], 0, tmp);
      pos[i * 3] = tmp.x;
      pos[i * 3 + 1] = tmp.y;
      pos[i * 3 + 2] = tmp.z;
      const color = new THREE.Color(PLANET_COLORS[photos[i].index % PLANET_COLORS.length]);
      col[i * 3] = color.r;
      col[i * 3 + 1] = color.g;
      col[i * 3 + 2] = color.b;
    }

    return { positions: pos, colors: col, orbits: orbitList };
  }, [photos]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    elapsedRef.current += delta * getOrbitTimeScale();
    const posAttr = pointsRef.current.geometry.getAttribute('position');
    for (let i = 0; i < orbits.length; i++) {
      orbitPosition(orbits[i], elapsedRef.current, scratch.current);
      posAttr.setXYZ(i, scratch.current.x, scratch.current.y, scratch.current.z);
    }
    posAttr.needsUpdate = true;
  });

  if (photos.length === 0) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={2.4}
        vertexColors
        transparent
        opacity={isDark ? 0.75 : 0.45}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
});

DistantPlanetParticles.displayName = 'DistantPlanetParticles';

export default DistantPlanetParticles;
