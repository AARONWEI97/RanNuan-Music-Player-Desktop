import { useMemo, useEffect, useRef, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SUN_CONFIG } from './constants';
import { getBeatEnergy } from '../../services/beatEnergy';

// 设计决策：2026-09-15 方案A 第一期
// 太阳体积光用「径向渐变面片扇」近似，不用 postprocessing GodRays——
// 后者需要光源 ref + 额外 pass，WebView2 上成本高且兼容性未知。
// 10 片穿过太阳中心的长面片绕 Y 轴缓慢旋转，白嫖现有 Bloom 即可获得光束感。
// 随机配置与逐帧 uniform 更新放模块作用域（react-hooks/purity、immutability 合规）。

const RAY_COUNT = 10;

interface SunRaysProps {
  isDark: boolean;
}

interface RayConfig {
  angle: number;
  length: number;
  width: number;
  tilt: number;
}

function buildRayConfigs(): RayConfig[] {
  return Array.from({ length: RAY_COUNT }, (_, i) => ({
    angle: (i / RAY_COUNT) * Math.PI + Math.random() * 0.2,
    length: (60 + Math.random() * 80) * (SUN_CONFIG.radius / 5),
    width: 5 + Math.random() * 6,
    tilt: (Math.random() - 0.5) * 0.5, // 少量倾角，不全躺在黄道面
  }));
}

function createRayMaterial(isDark: boolean): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#ffd9a0') },
      uOpacity: { value: isDark ? 0.16 : 0.08 },
      uBeat: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uBeat;
      void main() {
        // 径向：中心最亮，向两端衰减；横向：中线亮，边缘羽化
        float radial = pow(max(0.0, 1.0 - abs(vUv.x * 2.0 - 1.0)), 1.9);
        float edge = smoothstep(1.0, 0.1, abs(vUv.y * 2.0 - 1.0));
        float breathe = (0.75 + 0.25 * sin(uTime * 0.6 + vUv.x * 4.0)) * (1.0 + uBeat * 0.8);
        float alpha = radial * edge * breathe * uOpacity;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
  });
}

function tickRayMaterial(material: THREE.ShaderMaterial, time: number, beat: number) {
  material.uniforms.uTime.value = time;
  material.uniforms.uBeat.value = beat;
}

const SunRays: React.FC<SunRaysProps> = memo(({ isDark }) => {
  const groupRef = useRef<THREE.Group>(null);
  const rays = useMemo(() => buildRayConfigs(), []);
  const material = useMemo(() => createRayMaterial(isDark), [isDark]);

  useEffect(() => () => material.dispose(), [material]);

  useFrame(({ clock }, delta) => {
    tickRayMaterial(material, clock.getElapsedTime(), getBeatEnergy());
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      {rays.map((ray, i) => (
        <mesh
          key={i}
          material={material}
          rotation={[ray.tilt, ray.angle, 0]}
          raycast={() => {}}
        >
          <planeGeometry args={[ray.length, ray.width]} />
        </mesh>
      ))}
    </group>
  );
});

SunRays.displayName = 'SunRays';

export default SunRays;
