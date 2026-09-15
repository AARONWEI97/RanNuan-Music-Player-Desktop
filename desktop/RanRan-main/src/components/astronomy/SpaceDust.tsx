import { useMemo, useEffect, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// 设计决策：2026-09-15 方案A 第一期
// 近景空间尘埃：尘埃分布在相机活动空域（绕行半径 30~140 的扁盘），相机推拉/绕行时
// 近处尘埃相对远景产生自然视差，营造「漂浮在宇宙里」的包裹感。
// 不跟随相机——跟随相机意味着尘埃与镜头相对静止，反而没有视差。
// 随机生成与逐帧 uniform 更新放模块作用域（react-hooks/purity、immutability 合规）。

interface SpaceDustProps {
  count?: number;
  isDark: boolean;
}

interface DustField {
  pos: Float32Array;
  siz: Float32Array;
  phase: Float32Array;
}

function buildDustField(count: number): DustField {
  const pos = new Float32Array(count * 3);
  const siz = new Float32Array(count);
  const phase = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    // 相机活动空域：绕行半径 30~140 的扁盘（OrbitControls minDistance 18 / maxDistance 340）
    const r = 30 + Math.random() * 110;
    const theta = Math.random() * Math.PI * 2;
    pos[i3] = r * Math.cos(theta);
    pos[i3 + 1] = -20 + Math.random() * 70;
    pos[i3 + 2] = r * Math.sin(theta);
    siz[i] = 0.12 + Math.random() * 0.3;
    phase[i] = Math.random() * Math.PI * 2;
  }

  return { pos, siz, phase };
}

function createDustMaterial(isDark: boolean): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: isDark ? 0.5 : 0.25 },
    },
    vertexShader: `
      attribute float size;
      attribute float phase;
      varying float vAlpha;
      uniform float uTime;
      void main() {
        // 缓慢漂移：每颗粒子绕自己的小轨道浮动
        vec3 p = position;
        p.x += sin(uTime * 0.11 + phase) * 1.6;
        p.y += cos(uTime * 0.07 + phase * 1.7) * 1.1;
        p.z += sin(uTime * 0.09 + phase * 2.3) * 1.6;
        vAlpha = 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * 0.5 + phase * 3.0));
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        float pointSize = size * 46.0 * (220.0 / max(1.0, -mvPosition.z));
        gl_PointSize = clamp(pointSize, 0.8, 10.0);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      uniform float uOpacity;
      void main() {
        vec2 p = gl_PointCoord * 2.0 - 1.0;
        float d = dot(p, p);
        if (d > 1.0) discard;
        float core = exp(-d * 3.2);
        float alpha = core * vAlpha * uOpacity;
        gl_FragColor = vec4(vec3(0.75, 0.85, 1.0) * (0.5 + core * 0.6), alpha);
      }
    `,
  });
}

function tickDustMaterial(material: THREE.ShaderMaterial, time: number) {
  material.uniforms.uTime.value = time;
}

const SpaceDust: React.FC<SpaceDustProps> = memo(({ count = 260, isDark }) => {
  const field = useMemo(() => buildDustField(count), [count]);
  const material = useMemo(() => createDustMaterial(isDark), [isDark]);

  useEffect(() => () => material.dispose(), [material]);

  useFrame(({ clock }) => {
    tickDustMaterial(material, clock.getElapsedTime());
  });

  return (
    <points frustumCulled={false} raycast={() => {}}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[field.pos, 3]} />
        <bufferAttribute attach="attributes-size" args={[field.siz, 1]} />
        <bufferAttribute attach="attributes-phase" args={[field.phase, 1]} />
      </bufferGeometry>
      <primitive object={material} attach="material" />
    </points>
  );
});

SpaceDust.displayName = 'SpaceDust';

export default SpaceDust;
