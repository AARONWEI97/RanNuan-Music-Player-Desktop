import { useMemo, useEffect, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getBeatEnergy } from '../../services/beatEnergy';

interface TwinklingStarsProps {
  count?: number;
  radius?: number;
  depth?: number;
  isDark: boolean;
}

interface StarField {
  pos: Float32Array;
  col: Float32Array;
  siz: Float32Array;
  phase: Float32Array;
  speed: Float32Array;
}

// 设计决策：2026-09-15 方案A 第一期
// 用自定义 shader 星点替换 drei Stars：每颗星带 phase/speed 属性，亮度与尺寸随时间脉动，
// 解决「星空是死的」这一单调根因。着色器结构与 SoftPoints 保持一致（圆点、加法混合、白嫖 Bloom）。
//
// 随机生成与逐帧 uniform 更新都放模块作用域函数：
// Math.random 不进 React 渲染域（react-hooks/purity），
// 对材质的命令式修改不进 hook 域（react-hooks/immutability）。
function buildStarField(count: number, radius: number, depth: number): StarField {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const siz = new Float32Array(count);
  const phase = new Float32Array(count);
  const speed = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    // 球壳分布，与 drei Stars 一致：radius - random*depth 的壳层
    const r = radius - Math.random() * depth;
    const u = Math.random() * 2 - 1;
    const theta = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    pos[i3] = r * s * Math.cos(theta);
    pos[i3 + 1] = r * u;
    pos[i3 + 2] = r * s * Math.sin(theta);

    // 星色：大部分冷白/暖白，少量蓝星与红巨星
    const roll = Math.random();
    if (roll > 0.94) {
      col[i3] = 1.0; col[i3 + 1] = 0.62; col[i3 + 2] = 0.42; // 红巨星
    } else if (roll > 0.82) {
      col[i3] = 0.62; col[i3 + 1] = 0.78; col[i3 + 2] = 1.0; // 蓝星
    } else if (roll > 0.62) {
      const w = 0.75 + Math.random() * 0.25;
      col[i3] = 1.0 * w; col[i3 + 1] = 0.92 * w; col[i3 + 2] = 0.72 * w; // 暖白
    } else {
      const c = 0.7 + Math.random() * 0.3;
      col[i3] = 0.85 * c; col[i3 + 1] = 0.9 * c; col[i3 + 2] = 1.0 * c; // 冷白
    }

    const bright = Math.random();
    siz[i] = bright > 0.97 ? 1.6 + Math.random() * 1.2 : 0.5 + Math.random() * 0.9;
    phase[i] = Math.random() * Math.PI * 2;
    // 闪烁频率分层：少数快闪，多数慢呼吸
    speed[i] = bright > 0.9 ? 1.6 + Math.random() * 1.8 : 0.3 + Math.random() * 0.9;
  }

  return { pos, col, siz, phase, speed };
}

function createStarMaterial(isDark: boolean): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    vertexColors: true,
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: isDark ? 1 : 0.55 },
      uBeat: { value: 0 },
    },
    vertexShader: `
      attribute float size;
      attribute float phase;
      attribute float twinkleSpeed;
      attribute vec3 color;
      varying vec3 vColor;
      varying float vTwinkle;
      uniform float uTime;
      uniform float uBeat;
      void main() {
        vColor = color;
        // 亮度脉动：基础 0.55；振幅随节拍能量放大（0.45 → 0.85）
        float amp = 0.45 + uBeat * 0.4;
        float tw = max(0.08, 0.55 + amp * sin(uTime * twinkleSpeed + phase));
        vTwinkle = tw;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        float pointSize = size * (0.8 + 0.5 * tw) * 30.0 * (220.0 / max(1.0, -mvPosition.z));
        gl_PointSize = clamp(pointSize, 1.0, 22.0);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vTwinkle;
      uniform float uOpacity;
      void main() {
        vec2 p = gl_PointCoord * 2.0 - 1.0;
        float d = dot(p, p);
        if (d > 1.0) discard;
        float core = exp(-d * 4.5);
        float halo = exp(-d * 1.6) * 0.3;
        float alpha = (core + halo) * vTwinkle * uOpacity;
        gl_FragColor = vec4(vColor * (0.6 + core * 0.8) * (0.5 + vTwinkle * 0.7), alpha);
      }
    `,
  });
}

function tickStarMaterial(material: THREE.ShaderMaterial, time: number, beat: number) {
  material.uniforms.uTime.value = time;
  material.uniforms.uBeat.value = beat;
}

const TwinklingStars: React.FC<TwinklingStarsProps> = memo(({
  count = 8000,
  radius = 480,
  depth = 90,
  isDark,
}) => {
  const field = useMemo(() => buildStarField(count, radius, depth), [count, radius, depth]);
  // isDark 进 deps：主题切换时重建材质（代价可忽略），避免在 effect 里改 hook 值
  const material = useMemo(() => createStarMaterial(isDark), [isDark]);

  useEffect(() => () => material.dispose(), [material]);

  useFrame(({ clock }) => {
    tickStarMaterial(material, clock.getElapsedTime(), getBeatEnergy());
  });

  return (
    <points frustumCulled={false} raycast={() => {}}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[field.pos, 3]} />
        <bufferAttribute attach="attributes-color" args={[field.col, 3]} />
        <bufferAttribute attach="attributes-size" args={[field.siz, 1]} />
        <bufferAttribute attach="attributes-phase" args={[field.phase, 1]} />
        <bufferAttribute attach="attributes-twinkleSpeed" args={[field.speed, 1]} />
      </bufferGeometry>
      <primitive object={material} attach="material" />
    </points>
  );
});

TwinklingStars.displayName = 'TwinklingStars';

export default TwinklingStars;
