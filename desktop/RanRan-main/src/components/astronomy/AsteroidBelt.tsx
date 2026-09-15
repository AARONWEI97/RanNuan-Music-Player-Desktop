import { useRef, useMemo, useEffect, useCallback, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface AsteroidBeltProps {
  innerRadius: number;
  outerRadius: number;
  count?: number;
  isDark: boolean;
}

const AsteroidBelt: React.FC<AsteroidBeltProps> = memo(({ 
  innerRadius, 
  outerRadius, 
  count = 300,
  isDark 
}) => {
  const beltRef = useRef<THREE.Group>(null);
  const instancedRef = useRef<THREE.InstancedMesh>(null);
  
  const { positions, scales, rotations, particlePositions } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const scl = new Float32Array(count);
    const rot = new Float32Array(count * 3);
    const particlePos = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = innerRadius + Math.random() * (outerRadius - innerRadius);
      const height = (Math.random() - 0.5) * 3;
      
      pos[i * 3] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = height;
      pos[i * 3 + 2] = Math.sin(angle) * radius;
      
      scl[i] = 0.1 + Math.random() * 0.4;
      
      rot[i * 3] = Math.random() * Math.PI;
      rot[i * 3 + 1] = Math.random() * Math.PI;
      rot[i * 3 + 2] = Math.random() * Math.PI;
      
      particlePos[i * 3] = pos[i * 3];
      particlePos[i * 3 + 1] = pos[i * 3 + 1];
      particlePos[i * 3 + 2] = pos[i * 3 + 2];
    }
    
    return { positions: pos, scales: scl, rotations: rot, particlePositions: particlePos };
  }, [innerRadius, outerRadius, count]);

  const asteroidGeometry = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(1, 0);
    const posAttr = geo.getAttribute('position');
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const z = posAttr.getZ(i);
      const noise = 0.7 + Math.random() * 0.6;
      posAttr.setXYZ(i, x * noise, y * noise, z * noise);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  const instanceCount = Math.min(count, 80);

  const updateInstances = useCallback(() => {
    if (!instancedRef.current) return;
    
    const dummy = new THREE.Object3D();
    
    for (let i = 0; i < instanceCount; i++) {
      dummy.position.set(
        positions[i * 3],
        positions[i * 3 + 1],
        positions[i * 3 + 2]
      );
      dummy.rotation.set(
        rotations[i * 3],
        rotations[i * 3 + 1],
        rotations[i * 3 + 2]
      );
      const s = scales[i];
      dummy.scale.set(s, s * 0.7, s);
      dummy.updateMatrix();
      
      instancedRef.current.setMatrixAt(i, dummy.matrix);
    }
    
    instancedRef.current.instanceMatrix.needsUpdate = true;
  }, [positions, scales, rotations, instanceCount]);

  useEffect(() => {
    updateInstances();
  }, [updateInstances]);

  useFrame(({ clock }) => {
    if (beltRef.current) {
      beltRef.current.rotation.y = clock.getElapsedTime() * 0.01;
    }
  });

  return (
    <group ref={beltRef}>
      <instancedMesh
        ref={instancedRef}
        args={[asteroidGeometry, undefined, instanceCount]}
      >
        <meshStandardMaterial
          color={isDark ? '#888888' : '#666666'}
          roughness={0.9}
          metalness={0.1}
          transparent
          opacity={0.7}
        />
      </instancedMesh>
      
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[particlePositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color={isDark ? '#aaaaaa' : '#777777'}
          size={0.15}
          transparent
          opacity={0.5}
          sizeAttenuation
        />
      </points>
    </group>
  );
});

AsteroidBelt.displayName = 'AsteroidBelt';

export default AsteroidBelt;
