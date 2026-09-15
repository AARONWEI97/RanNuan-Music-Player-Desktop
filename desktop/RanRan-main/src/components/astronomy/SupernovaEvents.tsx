import { useEffect, useMemo, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// 设计决策：2026-09-15 方案A 第二期
// 超新星随机爆发事件：远景天球上随机位置，一颗星骤亮（快起 ~0.4s）→ 缓慢平复（~7s），
// 伴随一圈扩散冲击波。彩蛋型天象，周期性上演让宇宙「有事件在发生」。
// three 对象全部在模块作用域工厂里命令式创建（JSX 只挂 primitive），
// 调度与逐帧更新也在模块函数里——react-hooks 编译器规则合规，且不碰 JSX ref 泛型。

const FLASH_DURATION = 7.5;   // 总时长（秒）
const FLASH_ATTACK = 0.4;     // 亮度爬升
const RING_MAX_RADIUS = 42;   // 冲击波最大半径

interface SupernovaSlot {
  group: THREE.Group;
  points: THREE.Points;
  ring: THREE.Mesh;
  flashMaterial: THREE.ShaderMaterial;
  ringMaterial: THREE.MeshBasicMaterial;
  active: boolean;
  startAt: number;
  nextSpawnAt: number;
}

interface SupernovaEventsProps {
  slots?: number;
  isDark: boolean;
}

function createFlashMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    uniforms: {
      uSize: { value: 0 },
      uAlpha: { value: 0 },
      uColor: { value: new THREE.Color('#ffffff') },
    },
    vertexShader: `
      uniform float uSize;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = clamp(uSize * 26.0 * (220.0 / max(1.0, -mvPosition.z)), 1.0, 260.0);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float uAlpha;
      uniform vec3 uColor;
      void main() {
        vec2 p = gl_PointCoord * 2.0 - 1.0;
        float d = dot(p, p);
        if (d > 1.0) discard;
        float core = exp(-d * 5.0);
        float halo = exp(-d * 1.2) * 0.45;
        gl_FragColor = vec4(uColor * (1.2 + core * 1.6), (core + halo) * uAlpha);
      }
    `,
  });
}

function createSlot(index: number): SupernovaSlot {
  const flashGeometry = new THREE.BufferGeometry();
  flashGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3));
  const flashMaterial = createFlashMaterial();
  const points = new THREE.Points(flashGeometry, flashMaterial);
  points.frustumCulled = false;
  points.raycast = () => {};

  const ringMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(1.4, 1.2, 0.9),
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.94, 1, 64), ringMaterial);
  ring.frustumCulled = false;
  ring.raycast = () => {};

  const group = new THREE.Group();
  group.add(points, ring);

  return {
    group,
    points,
    ring,
    flashMaterial,
    ringMaterial,
    active: false,
    startAt: 0,
    nextSpawnAt: 6 + index * 9 + Math.random() * 6, // 首颗较快出现，彩蛋感
  };
}

function spawnSupernova(slot: SupernovaSlot, now: number) {
  slot.active = true;
  slot.startAt = now;
  // 天球壳层 350~430，避开黄道面附近（|y| 偏高更有「远方事件」感）
  const theta = Math.random() * Math.PI * 2;
  const y = (Math.random() - 0.35) * 1.2;
  const r = 350 + Math.random() * 80;
  const horiz = Math.sqrt(Math.max(0.05, 1 - y * y));
  slot.group.position.set(Math.cos(theta) * horiz * r, y * r, Math.sin(theta) * horiz * r);
}

function tickSupernova(slot: SupernovaSlot, now: number, camera: THREE.Camera) {
  if (!slot.active) return;
  const age = now - slot.startAt;
  if (age > FLASH_DURATION) {
    slot.active = false;
    slot.nextSpawnAt = now + 18 + Math.random() * 30; // 18~48s 后下一颗
    slot.flashMaterial.uniforms.uAlpha.value = 0;
    slot.flashMaterial.uniforms.uSize.value = 0;
    slot.ringMaterial.opacity = 0;
    return;
  }

  // 闪光包络：快起慢落；颜色由白蓝 → 暖黄 → 暗红
  const attack = Math.min(age / FLASH_ATTACK, 1);
  const decay = Math.pow(1 - age / FLASH_DURATION, 1.6);
  const envelope = attack * decay;
  const t = age / FLASH_DURATION;
  const color = slot.flashMaterial.uniforms.uColor.value as THREE.Color;
  if (t < 0.15) color.setRGB(1.0, 1.0, 1.0);
  else if (t < 0.45) color.setRGB(1.0, 0.85, 0.55);
  else color.setRGB(0.95, 0.45, 0.2);

  slot.flashMaterial.uniforms.uAlpha.value = envelope;
  slot.flashMaterial.uniforms.uSize.value = 6 + (1 - decay) * 26;

  // 冲击波：面向相机、随时间扩散并减淡
  slot.ring.quaternion.copy(camera.quaternion);
  const rt = Math.min(1, age / (FLASH_DURATION * 0.85));
  slot.ring.scale.setScalar(2 + rt * RING_MAX_RADIUS);
  slot.ringMaterial.opacity = (1 - rt) * (1 - rt) * 0.4 * attack;
}

function disposeSlot(slot: SupernovaSlot) {
  slot.points.geometry.dispose();
  slot.flashMaterial.dispose();
  (slot.ring.geometry as THREE.BufferGeometry).dispose();
  slot.ringMaterial.dispose();
}

const SupernovaEvents: React.FC<SupernovaEventsProps> = memo(({ slots = 2, isDark }) => {
  const slotList = useMemo(() => Array.from({ length: slots }, (_, i) => createSlot(i)), [slots]);

  useEffect(() => () => slotList.forEach(disposeSlot), [slotList]);

  useFrame(({ clock, camera }) => {
    const now = clock.getElapsedTime();
    slotList.forEach((slot) => {
      if (!slot.active && now >= slot.nextSpawnAt) spawnSupernova(slot, now);
      tickSupernova(slot, now, camera);
    });
  });

  return (
    <group visible={isDark}>
      {slotList.map((slot, i) => (
        <primitive key={i} object={slot.group} />
      ))}
    </group>
  );
});

SupernovaEvents.displayName = 'SupernovaEvents';

export default SupernovaEvents;
