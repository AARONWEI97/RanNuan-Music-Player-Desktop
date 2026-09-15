import { useRef, useMemo, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import SoftPoints from './SoftPoints';

interface SpiralGalaxyProps {
  isDark: boolean;
  particleMultiplier?: number;
}

const ARM_COUNT = 4;
const PITCH = 0.23;
const INNER = 72;
const OUTER = 280;

const SpiralGalaxy: React.FC<SpiralGalaxyProps> = memo(({ isDark, particleMultiplier = 1.0 }) => {
  const groupRef = useRef<THREE.Group>(null);

  const arms = useMemo(() => {
    const count = Math.floor(14000 * particleMultiplier);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const arm = i % ARM_COUNT;
      const t = Math.pow(Math.random(), 0.72);
      const radius = INNER + t * (OUTER - INNER);
      const scatter = (Math.random() - 0.5) * (6 + radius * 0.045);
      const theta =
        (arm * Math.PI * 0.5) +
        Math.log(radius / INNER) / PITCH +
        scatter * 0.012;
      const height = (Math.random() - 0.5) * (9 * Math.exp(-(radius - INNER) / 90));

      positions[i3] = Math.cos(theta) * radius + scatter * 0.35;
      positions[i3 + 1] = height;
      positions[i3 + 2] = Math.sin(theta) * radius + scatter * 0.35;

      const along = (radius - INNER) / (OUTER - INNER);
      const hii = Math.random() > 0.94;
      const dust = Math.random() > 0.9;
      if (hii) {
        colors[i3] = 1.0;
        colors[i3 + 1] = 0.42 + Math.random() * 0.2;
        colors[i3 + 2] = 0.72;
        sizes[i] = 1.6 + Math.random();
      } else if (dust) {
        colors[i3] = 0.55;
        colors[i3 + 1] = 0.38;
        colors[i3 + 2] = 0.28;
        sizes[i] = 1.4 + Math.random();
      } else if (along < 0.22) {
        const w = 0.85 + Math.random() * 0.15;
        colors[i3] = 1.0 * w;
        colors[i3 + 1] = 0.84 * w;
        colors[i3 + 2] = 0.52 * w;
        sizes[i] = 0.7 + Math.random() * 0.7;
      } else if (Math.random() > 0.45) {
        colors[i3] = 0.55 + Math.random() * 0.15;
        colors[i3 + 1] = 0.78 + Math.random() * 0.12;
        colors[i3 + 2] = 1.0;
        sizes[i] = 0.45 + Math.random() * 0.7;
      } else {
        colors[i3] = 0.92;
        colors[i3 + 1] = 0.95;
        colors[i3 + 2] = 1.0;
        sizes[i] = 0.35 + Math.random() * 0.5;
      }
    }

    return { positions, colors, sizes };
  }, [particleMultiplier]);

  const dust = useMemo(() => {
    const count = Math.floor(4200 * particleMultiplier);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const arm = i % ARM_COUNT;
      const radius = INNER + 8 + Math.random() * 160;
      const theta = (arm * Math.PI * 0.5) + Math.log(radius / INNER) / PITCH - 0.14;
      positions[i3] = Math.cos(theta) * radius + (Math.random() - 0.5) * 10;
      positions[i3 + 1] = (Math.random() - 0.5) * 2.2;
      positions[i3 + 2] = Math.sin(theta) * radius + (Math.random() - 0.5) * 10;
      colors[i3] = 0.22;
      colors[i3 + 1] = 0.14;
      colors[i3 + 2] = 0.1;
      sizes[i] = 2.2 + Math.random() * 2.4;
    }

    return { positions, colors, sizes };
  }, [particleMultiplier]);

  const halo = useMemo(() => {
    const count = Math.floor(2800 * particleMultiplier);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const radius = INNER + Math.pow(Math.random(), 0.55) * 240;
      const theta = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.5) * 70 * Math.pow(Math.random(), 1.4);
      positions[i3] = Math.cos(theta) * radius;
      positions[i3 + 1] = height;
      positions[i3 + 2] = Math.sin(theta) * radius;
      const cool = 0.7 + Math.random() * 0.3;
      colors[i3] = 0.7 * cool;
      colors[i3 + 1] = 0.8 * cool;
      colors[i3 + 2] = 1.0 * cool;
      sizes[i] = 0.25 + Math.random() * 0.4;
    }
    return { positions, colors, sizes };
  }, [particleMultiplier]);

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.0035;
  });

  return (
    <group ref={groupRef} rotation={[-1.02, 0.42, 0.1]}>
      <SoftPoints
        positions={arms.positions}
        colors={arms.colors}
        sizes={arms.sizes}
        opacity={isDark ? 0.95 : 0.58}
        sizeScale={22}
      />
      <SoftPoints
        positions={dust.positions}
        colors={dust.colors}
        sizes={dust.sizes}
        opacity={isDark ? 0.32 : 0.16}
        sizeScale={22}
        blending={THREE.NormalBlending}
      />
      <SoftPoints
        positions={halo.positions}
        colors={halo.colors}
        sizes={halo.sizes}
        opacity={isDark ? 0.55 : 0.28}
        sizeScale={12}
      />
    </group>
  );
});

SpiralGalaxy.displayName = 'SpiralGalaxy';

export default SpiralGalaxy;
