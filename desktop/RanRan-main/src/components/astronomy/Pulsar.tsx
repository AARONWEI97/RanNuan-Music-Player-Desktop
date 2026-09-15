import { useMemo, useEffect, useRef, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// 设计决策：2026-09-15 方案A 第二期
// 远景脉冲星：亮核 + 两极反向灯塔光束，绕倾斜自转轴快速扫过。
// 与黑洞分处天球两侧（r≈340），一橙一蓝形成色彩对比。
// 光束用渐变面片（同 SunRays 思路，白嫖 Bloom），不用真体积光。

const BEAM_LENGTH = 30;
const BEAM_WIDTH = 3.2;
const SPIN_SPEED = 0.9; // rad/s，脉冲星自转

function createBeamMaterial(): THREE.ShaderMaterial {
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
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime;
      void main() {
        // vUv.y=0 在星体端，1 在末端；沿长度快速衰减，横向羽化
        float len = pow(max(0.0, 1.0 - vUv.y), 1.7);
        float edge = smoothstep(1.0, 0.15, abs(vUv.x * 2.0 - 1.0));
        float flicker = 0.85 + 0.15 * sin(uTime * 13.0 + vUv.y * 20.0);
        vec3 color = vec3(0.55, 0.85, 1.6) * (0.8 + len * 0.8);
        gl_FragColor = vec4(color, len * edge * flicker * 0.85);
      }
    `,
  });
}

function buildBeamGeometry(): THREE.PlaneGeometry {
  // 几何原点平移到光束根部（y: -L/2..L/2 → 0..L），uv.y=0 对齐星体端
  const geo = new THREE.PlaneGeometry(BEAM_WIDTH, BEAM_LENGTH);
  geo.translate(0, BEAM_LENGTH / 2, 0);
  return geo;
}

function tickPulsar(material: THREE.ShaderMaterial, core: THREE.MeshBasicMaterial, time: number) {
  material.uniforms.uTime.value = time;
  // 亮核随自转闪动（束扫过视线方向时最亮的简化模拟）
  const pulse = 0.5 + 0.5 * Math.sin(time * SPIN_SPEED * 2);
  core.color.setRGB(1.6 + pulse * 1.2, 1.9 + pulse * 1.2, 2.4 + pulse * 1.4);
}

const Pulsar: React.FC = memo(() => {
  const spinRef = useRef<THREE.Group>(null);
  const coreMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const beamMaterial = useMemo(() => createBeamMaterial(), []);
  const beamGeometry = useMemo(() => buildBeamGeometry(), []);

  useEffect(() => () => {
    beamMaterial.dispose();
    beamGeometry.dispose();
  }, [beamMaterial, beamGeometry]);

  useFrame(({ clock }, delta) => {
    if (coreMatRef.current) {
      tickPulsar(beamMaterial, coreMatRef.current, clock.getElapsedTime());
    }
    if (spinRef.current) {
      spinRef.current.rotation.y += delta * SPIN_SPEED;
    }
  });

  return (
    <group position={[204, -61, 265]} rotation={[0.5, 0, 0.62]}>
      {/* 亮核 */}
      <mesh raycast={() => {}}>
        <sphereGeometry args={[1.2, 16, 16]} />
        <meshBasicMaterial
          ref={coreMatRef}
          color={new THREE.Color(2.2, 2.6, 3.2)}
          toneMapped={false}
        />
      </mesh>
      {/* 自转盘：两极反向光束，各由两片正交面片组成增强立体感 */}
      <group ref={spinRef}>
        {[1, -1].map((pole) =>
          [0, Math.PI / 2].map((roll) => (
            <mesh
              key={`${pole}-${roll}`}
              geometry={beamGeometry}
              material={beamMaterial}
              position={[0, pole * 0.8, 0]}
              rotation={[pole > 0 ? 0 : Math.PI, roll, 0]}
              raycast={() => {}}
            />
          ))
        )}
      </group>
    </group>
  );
});

Pulsar.displayName = 'Pulsar';

export default Pulsar;
