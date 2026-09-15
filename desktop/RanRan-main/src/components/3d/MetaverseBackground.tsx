import { useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Points, PointMaterial, Float, Stars, Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useUiStore } from '../../store/modules/uiStore';
import { getPerformanceConfig } from '../../utils/performance';

function ParticleField({ count = 2000, color = '#00f5ff' }) {
  const ref = useRef<THREE.Points>(null);
  const { mouse } = useThree();
  
  const [positions] = useState(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 50;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 50;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }
    return pos;
  });

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = state.clock.elapsedTime * 0.05;
      ref.current.rotation.y = state.clock.elapsedTime * 0.03;
      
      ref.current.rotation.x += (mouse.y * 0.1 - ref.current.rotation.x) * 0.1;
      ref.current.rotation.y += (mouse.x * 0.1 - ref.current.rotation.y) * 0.1;
    }
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color={color}
        size={0.08}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        opacity={0.6}
      />
    </Points>
  );
}

function FloatingRing({ position, rotation, color, scale = 1, speed = 1 }: { 
  position: [number, number, number]; 
  rotation: [number, number, number];
  color: string;
  scale?: number;
  speed?: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = state.clock.elapsedTime * 0.2 * speed + rotation[0];
      ref.current.rotation.y = state.clock.elapsedTime * 0.3 * speed + rotation[1];
    }
  });

  return (
    <Float speed={2 * speed} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={ref} position={position} scale={scale}>
        <torusGeometry args={[1, 0.02, 32, 100]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} />
      </mesh>
    </Float>
  );
}

function Scene() {
  const settings = useUiStore((s) => s.settings);
  const theme = settings?.theme || { primaryColor: '#ff2d75', secondaryColor: '#00f5ff', particleColor: '#b829dd', backgroundColor: '#050508' };
  const { primaryColor, secondaryColor, particleColor, backgroundColor } = theme;
  const perf = getPerformanceConfig();
  const intensity = Math.max(0, Math.min(2, settings?.particleIntensity ?? 1));
  const particleCount = Math.round(perf.particleCount * intensity);

  return (
    <>
      <color attach="background" args={[backgroundColor || '#050508']} />
      <fog attach="fog" args={[backgroundColor || '#050508', 10, 40]} />
      
      <ambientLight intensity={0.2} />
      
      <Stars
        radius={100}
        depth={50}
        count={Math.min(3000, perf.starCount)}
        factor={4}
        saturation={0}
        fade
        speed={0.5}
      />
      
      {intensity > 0 && (
        <Sparkles 
          count={Math.max(20, Math.round(perf.particleCount * 0.25 * intensity))}
          scale={20}
          size={4}
          speed={0.4}
          opacity={0.5}
          color={secondaryColor}
        />
      )}
      
      {perf.enableParticles && intensity > 0 && <ParticleField count={particleCount} color={particleColor} />}
      
      <FloatingRing position={[-5, 2, -10]} rotation={[0, 0, 0]} color={primaryColor} scale={3} speed={0.5} />
      <FloatingRing position={[5, -2, -15]} rotation={[Math.PI / 4, 0, 0]} color={secondaryColor} scale={2} speed={0.7} />
      <FloatingRing position={[0, 0, -20]} rotation={[Math.PI / 2, 0, 0]} color={particleColor} scale={5} speed={0.3} />
      
      {settings?.showGrid !== false && (
        <group position={[0, -8, -10]} rotation={[0.1, 0, 0]}>
          <gridHelper args={[100, 40, primaryColor, '#1a1a2e']} position={[0, 0, 0]} />
        </group>
      )}

      {perf.enablePostProcessing && <EffectComposer enableNormalPass={false}>
        <Bloom 
          luminanceThreshold={0.2} 
          mipmapBlur 
          intensity={1.5} 
          radius={0.6}
        />
        <Vignette eskil={false} offset={0.1} darkness={0.5} />
        <Noise opacity={0.05} />
      </EffectComposer>}
    </>
  );
}

export default function MetaverseBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 10], fov: 60 }}
        gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
        dpr={[1, getPerformanceConfig().maxDpr]}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
