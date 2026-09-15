import { useMemo, useEffect, memo } from 'react';
import * as THREE from 'three';

interface PlanetRingProps {
  innerRadius: number;
  outerRadius: number;
  color?: string;
  opacity?: number;
  tilt?: number;
  hasAsteroids?: boolean;
}

const PlanetRing: React.FC<PlanetRingProps> = memo(({ 
  innerRadius = 1.8, 
  outerRadius = 3.2, 
  color = '#88ccff',
  opacity = 0.6,
  tilt = 0.3,
  hasAsteroids = true
}) => {
  const ringTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, 'rgba(255,255,255,0)');
    gradient.addColorStop(0.1, 'rgba(255,255,255,0.3)');
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(0.3, 'rgba(255,255,255,0.2)');
    gradient.addColorStop(0.35, 'rgba(255,255,255,0.6)');
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.1)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.5)');
    gradient.addColorStop(0.6, 'rgba(255,255,255,0.3)');
    gradient.addColorStop(0.65, 'rgba(255,255,255,0.7)');
    gradient.addColorStop(0.75, 'rgba(255,255,255,0.4)');
    gradient.addColorStop(0.85, 'rgba(255,255,255,0.6)');
    gradient.addColorStop(0.95, 'rgba(255,255,255,0.2)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = Math.random() * 2 + 0.5;
      const alpha = Math.random() * 0.3;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillRect(x, y, size, size);
    }
    
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * canvas.width;
      const y = canvas.height / 2 + (Math.random() - 0.5) * 20;
      const radius = Math.random() * 3 + 1;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,220,255,${Math.random() * 0.15})`;
      ctx.fill();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }, []);

  useEffect(() => {
    return () => {
      ringTexture.dispose();
    };
  }, [ringTexture]);

  const asteroidPositions = useMemo(() => {
    if (!hasAsteroids) return null;
    
    const count = 120;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = innerRadius + Math.random() * (outerRadius - innerRadius);
      const height = (Math.random() - 0.5) * 0.4;
      
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      
      sizes[i] = 0.03 + Math.random() * 0.08;
    }
    
    return { positions, sizes };
  }, [innerRadius, outerRadius, hasAsteroids]);

  return (
    <group rotation={[tilt, 0, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[innerRadius, outerRadius, 128]} />
        <meshStandardMaterial
          map={ringTexture}
          color={color}
          transparent
          opacity={opacity}
          side={THREE.DoubleSide}
          roughness={0.8}
          metalness={0.1}
          depthWrite={false}
        />
      </mesh>
      
      {asteroidPositions && (
        <points>
          <bufferGeometry>
            <bufferAttribute 
              attach="attributes-position" 
              args={[asteroidPositions.positions, 3]} 
            />
            <bufferAttribute 
              attach="attributes-size" 
              args={[asteroidPositions.sizes, 1]} 
            />
          </bufferGeometry>
          <pointsMaterial
            color="#aabbcc"
            size={0.08}
            transparent
            opacity={0.7}
            sizeAttenuation
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </points>
      )}
    </group>
  );
});

PlanetRing.displayName = 'PlanetRing';

export default PlanetRing;
