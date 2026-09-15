import { useMemo, useEffect, useRef, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// 设计决策：2026-09-15 方案A 第二期
// 远景黑洞：事件视界（纯黑球，靠 depthWrite 遮挡背后星光）+ 吸积盘 swirl shader
//（内白→金→橙红温度渐变，内圈转得比外圈快）+ 光子环。
// 固定放置在银河带外侧 (r≈340)，避免与行星轨道/银河带打架。
// 随机性/逐帧 uniform 修改都在模块作用域函数里（react-hooks 编译器规则合规）。

const DISK_INNER = 4.6;
const DISK_OUTER = 14;

function createDiskMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    uniforms: {
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vPos;
      uniform float uTime;
      void main() {
        float r = length(vPos.xy);
        float t = clamp((r - ${DISK_INNER.toFixed(2)}) / ${(DISK_OUTER - DISK_INNER).toFixed(2)}, 0.0, 1.0);
        float theta = atan(vPos.y, vPos.x);
        // 较差自转：内圈角速度大，外圈慢
        float swirl = theta + uTime * (1.8 / max(0.35, r * 0.28));
        float bands = 0.78 + 0.22 * sin(swirl * 6.0 + r * 1.6);
        vec3 hot = vec3(1.6, 1.5, 1.35);
        vec3 mid = vec3(1.5, 0.9, 0.4);
        vec3 cool = vec3(0.9, 0.22, 0.05);
        vec3 color = mix(hot, mid, smoothstep(0.0, 0.45, t));
        color = mix(color, cool, smoothstep(0.45, 1.0, t));
        float edge = smoothstep(0.0, 0.1, t) * (1.0 - smoothstep(0.72, 1.0, t));
        gl_FragColor = vec4(color * bands, edge * bands * 0.9);
      }
    `,
  });
}

function tickBlackHole(disk: THREE.ShaderMaterial, ring: THREE.MeshBasicMaterial, time: number) {
  disk.uniforms.uTime.value = time;
  // 光子环呼吸
  ring.opacity = 0.75 + 0.25 * Math.sin(time * 1.7);
}

const BlackHole: React.FC = memo(() => {
  const groupRef = useRef<THREE.Group>(null);
  const ringMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const diskMaterial = useMemo(() => createDiskMaterial(), []);

  useEffect(() => () => diskMaterial.dispose(), [diskMaterial]);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    if (ringMatRef.current) {
      tickBlackHole(diskMaterial, ringMatRef.current, time);
    }
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.0004; // 缓慢进动
    }
  });

  return (
    <group
      ref={groupRef}
      position={[-187, 143, -211]}
      rotation={[0.9, 0.3, 0.35]}
    >
      {/* 事件视界：纯黑球体，靠不透明+写深度遮挡背后星光 */}
      <mesh raycast={() => {}}>
        <sphereGeometry args={[4.2, 32, 32]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      {/* 光子环 */}
      <mesh raycast={() => {}} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[4.55, 0.14, 8, 64]} />
        <meshBasicMaterial
          ref={ringMatRef}
          color={new THREE.Color(2.2, 2.0, 1.7)}
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* 吸积盘 */}
      <mesh material={diskMaterial} raycast={() => {}} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[DISK_INNER, DISK_OUTER, 96, 1]} />
      </mesh>
    </group>
  );
});

BlackHole.displayName = 'BlackHole';

export default BlackHole;
