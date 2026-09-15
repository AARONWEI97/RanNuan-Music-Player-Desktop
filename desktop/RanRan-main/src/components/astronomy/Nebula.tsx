import { useRef, useMemo, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import SoftPoints from './SoftPoints';

interface NebulaProps {
  position: [number, number, number];
  color1: string;
  color2: string;
  size?: number;
  particleCount?: number;
  isDark: boolean;
}

function mixChannel(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

const Nebula: React.FC<NebulaProps> = memo(({
  position,
  color1,
  color2,
  size = 50,
  particleCount = 2400,
  isDark,
}) => {
  const groupRef = useRef<THREE.Group>(null);

  const field = useMemo(() => {
    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.pow(Math.random(), 0.55) * size;
      positions[i3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.42;
      positions[i3 + 2] = r * Math.cos(phi);
      const t = Math.random();
      colors[i3] = mixChannel(c1[0], c2[0], t);
      colors[i3 + 1] = mixChannel(c1[1], c2[1], t);
      colors[i3 + 2] = mixChannel(c1[2], c2[2], t);
      sizes[i] = 0.8 + Math.random() * 2.2;
    }
    return { positions, colors, sizes };
  }, [color1, color2, particleCount, size]);

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.008;
  });

  return (
    <group ref={groupRef} position={position}>
      <SoftPoints
        positions={field.positions}
        colors={field.colors}
        sizes={field.sizes}
        opacity={isDark ? 0.55 : 0.28}
        sizeScale={26}
      />
    </group>
  );
});

function hexToRgb(hex: string): [number, number, number] {
  const n = hex.replace('#', '');
  const v = parseInt(n, 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
}

Nebula.displayName = 'Nebula';

export default Nebula;
