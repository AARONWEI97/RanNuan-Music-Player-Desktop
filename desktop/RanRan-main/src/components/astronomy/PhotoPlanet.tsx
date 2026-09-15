import { useRef, useMemo, useState, memo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Photo } from '../../types';
import { usePlanetTexture } from '../../hooks/usePlanetTexture';
import { ORBIT_CONFIG, PLANET_COLORS } from './constants';
import { createPlanetOrbit, orbitPosition } from './kepler';
import { getOrbitTimeScale } from '../../bridge/universeHost';
import PlanetRing from './PlanetRing';
import PlanetInfoCard from './PlanetInfoCard';

interface PhotoPlanetProps {
  photo: Photo;
  index: number;
  totalPhotos: number;
  isSelected: boolean;
  onSelect: () => void;
  isDark: boolean;
}

const PhotoPlanet: React.FC<PhotoPlanetProps> = memo(({
  photo,
  index,
  totalPhotos,
  isSelected,
  onSelect,
  isDark,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const elapsedRef = useRef(0);
  const worldPos = useRef(new THREE.Vector3());
  const scaleVec = useRef(new THREE.Vector3(1, 1, 1));
  const [isHovered, setIsHovered] = useState(false);

  const texture = usePlanetTexture(photo);
  const { camera } = useThree();

  const orbit = useMemo(() => createPlanetOrbit(index, totalPhotos), [index, totalPhotos]);
  const startPos = useMemo(() => orbitPosition(orbit, 0, new THREE.Vector3()), [orbit]);
  const planetColor = useMemo(() => PLANET_COLORS[index % PLANET_COLORS.length], [index]);
  const planetSize = useMemo(
    () => 2.05 + orbit.beltIndex * 0.16 + (index % 3) * 0.12,
    [orbit.beltIndex, index]
  );
  const axialTilt = useMemo(() => (index % 5) * 0.06 - 0.08, [index]);
  const hasRing = index % 3 === 0;
  const ringColor = PLANET_COLORS[(index + 2) % PLANET_COLORS.length];

  useFrame((_, delta) => {
    elapsedRef.current += delta * getOrbitTimeScale();
    const pos = orbitPosition(orbit, elapsedRef.current, worldPos.current);
    if (groupRef.current) groupRef.current.position.copy(pos);

    if (meshRef.current) {
      meshRef.current.rotation.y += ORBIT_CONFIG.rotationSpeed * 0.018;
      const scale = isSelected ? 1.28 : isHovered ? 1.12 : 1;
      scaleVec.current.set(scale, scale, scale);
      meshRef.current.scale.lerp(scaleVec.current, 0.1);
    }
    if (glowRef.current) {
      const pulse = 1.16 + Math.sin(elapsedRef.current * 1.4 + index) * 0.03;
      glowRef.current.scale.setScalar(pulse);
    }
  });

  const distance = camera.position.distanceTo(startPos);
  const showExtras = isSelected || isHovered || distance < 90;

  return (
    <group ref={groupRef} position={startPos} rotation={[axialTilt, 0, 0]}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setIsHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setIsHovered(false);
          document.body.style.cursor = 'default';
        }}
      >
        <sphereGeometry args={[planetSize, 48, 48]} />
        {texture ? (
          <meshBasicMaterial key={photo.id} map={texture} toneMapped={false} />
        ) : (
          <meshBasicMaterial key={`${photo.id}-fallback`} color={planetColor} />
        )}
      </mesh>

      <mesh ref={glowRef} scale={[1.16, 1.16, 1.16]}>
        <sphereGeometry args={[planetSize, 24, 24]} />
        <meshBasicMaterial
          color={texture ? '#fff6e8' : planetColor}
          transparent
          opacity={isHovered || isSelected ? 0.22 : 0.12}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {showExtras && hasRing && (
        <PlanetRing
          innerRadius={planetSize * 1.45}
          outerRadius={planetSize * 2.35}
          color={ringColor}
          opacity={0.55}
          tilt={0.36}
          hasAsteroids
        />
      )}

      {(isHovered || isSelected) && (
        <Html position={[0, planetSize + 1.6, 0]} center>
          <PlanetInfoCard photo={photo} isDark={isDark} />
        </Html>
      )}
    </group>
  );
});

PhotoPlanet.displayName = 'PhotoPlanet';

export default PhotoPlanet;
