import { useMemo, useEffect, useRef, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// 设计决策：2026-09-15 方案A 第一期
// 装饰性随机流星：银蓝白、斜向划过远景天球，与歌词流星（HTML 层、金色发光字）刻意区分。
// 用点串拖尾（14 个圆点沿轨迹历史排开）而非 Line——WebGL 线宽恒为 1 且点串各向可见，
// 不需要圆柱 billboard 计算。

const TRAIL_POINTS = 14;
const TRAIL_STEP = 0.022; // 相邻尾点的时间间隔（秒）

interface MeteorState {
  active: boolean;
  startAt: number;
  nextSpawnAt: number;
  duration: number;
  start: THREE.Vector3;
  velocity: THREE.Vector3;
}

interface ShootingStarsProps {
  slots?: number;      // 同时存活的流星上限（性能档控制）
  intensity?: number;  // 粒子强度，缩放重生间隔
  isDark: boolean;
}

function spawnMeteor(m: MeteorState, now: number) {
  m.active = true;
  m.startAt = now;
  m.duration = 1.1 + Math.random() * 0.9;

  // 起点：远景天球上半球偏多，半径 260~420
  const theta = Math.random() * Math.PI * 2;
  const y = 0.15 + Math.random() * 0.8;
  const r = 260 + Math.random() * 160;
  const horiz = Math.sqrt(Math.max(0, 1 - y * y));
  m.start.set(Math.cos(theta) * horiz * r, y * r, Math.sin(theta) * horiz * r);

  // 方向：大致水平切向 + 明显下坠分量
  const tangent = new THREE.Vector3(-Math.sin(theta), 0, Math.cos(theta));
  if (Math.random() > 0.5) tangent.negate();
  const speed = 90 + Math.random() * 60;
  m.velocity.copy(tangent).multiplyScalar(speed);
  m.velocity.y = -(0.25 + Math.random() * 0.4) * speed;
}

const ShootingStars: React.FC<ShootingStarsProps> = memo(({
  slots = 3,
  intensity = 1,
  isDark,
}) => {
  const meteors = useRef<MeteorState[]>(
    Array.from({ length: Math.max(1, slots) }, (_, i) => ({
      active: false,
      startAt: 0,
      nextSpawnAt: 2 + i * 3.5 + Math.random() * 4, // 初始错峰
      duration: 1,
      start: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
    }))
  );

  const material = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    uniforms: {
      uColor: { value: new THREE.Color('#dfe9ff') },
      uOpacity: { value: 1 },
    },
    vertexShader: `
      attribute float size;
      attribute float fade;
      varying float vFade;
      void main() {
        vFade = fade;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        float pointSize = size * 26.0 * (220.0 / max(1.0, -mvPosition.z));
        gl_PointSize = clamp(pointSize, 1.0, 40.0);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying float vFade;
      uniform vec3 uColor;
      uniform float uOpacity;
      void main() {
        vec2 p = gl_PointCoord * 2.0 - 1.0;
        float d = dot(p, p);
        if (d > 1.0) discard;
        float core = exp(-d * 4.0);
        float halo = exp(-d * 1.3) * 0.4;
        float alpha = (core + halo) * vFade * uOpacity;
        gl_FragColor = vec4(uColor * (0.7 + core * 0.9), alpha);
      }
    `,
  }), []);

  const geometries = useMemo(() =>
    meteors.current.map(() => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL_POINTS * 3), 3));
      geo.setAttribute('size', new THREE.BufferAttribute(new Float32Array(TRAIL_POINTS), 1));
      geo.setAttribute('fade', new THREE.BufferAttribute(new Float32Array(TRAIL_POINTS), 1));
      return geo;
    }),
  // 几何体数量只跟 slots 上限走，slots 变化时重建
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [slots]);

  useEffect(() => () => {
    material.dispose();
    geometries.forEach((g) => g.dispose());
  }, [material, geometries]);

  useFrame(({ clock }) => {
    const now = clock.getElapsedTime();
    const spawnBase = 5 + (1 / Math.max(0.2, intensity)) * 8; // intensity 高 → 间隔短

    meteors.current.forEach((m, idx) => {
      const geo = geometries[idx];
      if (!geo) return;
      const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
      const sizeAttr = geo.getAttribute('size') as THREE.BufferAttribute;
      const fadeAttr = geo.getAttribute('fade') as THREE.BufferAttribute;

      if (!m.active) {
        if (now >= m.nextSpawnAt) spawnMeteor(m, now);
        else {
          // 隐藏：全部塌缩到远处零点
          for (let j = 0; j < TRAIL_POINTS; j++) fadeAttr.setX(j, 0);
          fadeAttr.needsUpdate = true;
          return;
        }
      }

      const age = now - m.startAt;
      if (age > m.duration) {
        m.active = false;
        m.nextSpawnAt = now + spawnBase * (0.5 + Math.random());
        for (let j = 0; j < TRAIL_POINTS; j++) fadeAttr.setX(j, 0);
        fadeAttr.needsUpdate = true;
        return;
      }

      // 整体亮度包络：快进慢出
      const envelope = Math.min(age / 0.12, 1) * Math.pow(1 - age / m.duration, 0.7);

      for (let j = 0; j < TRAIL_POINTS; j++) {
        const tj = Math.max(0, age - j * TRAIL_STEP);
        const px = m.start.x + m.velocity.x * tj;
        const py = m.start.y + m.velocity.y * tj;
        const pz = m.start.z + m.velocity.z * tj;
        posAttr.setXYZ(j, px, py, pz);

        const headFade = 1 - j / TRAIL_POINTS;
        fadeAttr.setX(j, headFade * headFade * envelope);
        sizeAttr.setX(j, (j === 0 ? 2.6 : 1.1 + headFade * 1.2));
      }
      posAttr.needsUpdate = true;
      sizeAttr.needsUpdate = true;
      fadeAttr.needsUpdate = true;
    });
  });

  return (
    <group>
      {geometries.map((geo, i) => (
        <points
          key={i}
          geometry={geo}
          material={material}
          frustumCulled={false}
          raycast={() => {}}
          visible={isDark}
        />
      ))}
    </group>
  );
});

ShootingStars.displayName = 'ShootingStars';

export default ShootingStars;
