import { useMemo, useEffect, memo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface SoftPointsProps {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  opacity?: number;
  sizeScale?: number;
  blending?: THREE.Blending;
  renderOrder?: number;
}

const SoftPoints: React.FC<SoftPointsProps> = memo(({
  positions,
  colors,
  sizes,
  opacity = 0.85,
  sizeScale = 18,
  blending = THREE.AdditiveBlending,
  renderOrder = 0,
}) => {
  const pixelRatio = useThree((state) => state.viewport.dpr);
  // opacity/sizeScale 进 deps：变化时重建材质而非在 effect 里改 hook 值（react-hooks/immutability）
  const material = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending,
    toneMapped: false,
    vertexColors: true,
    uniforms: {
      // Dense galaxy/nebula layers share this material. Budget their additive
      // contribution; normal-blended dust must retain its occluding opacity.
      uOpacity: { value: opacity * (blending === THREE.AdditiveBlending ? 0.35 : 1) },
      uScale: { value: sizeScale },
      uPixelRatio: { value: pixelRatio },
    },
    vertexShader: `
      attribute float size;
      // 注意：vertexColors:true 时 three 会自动注入 color 属性声明，手写会重复定义导致编译失败
      varying vec3 vColor;
      uniform float uScale;
      uniform float uPixelRatio;
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        // Keep distant stars a few CSS pixels wide. The previous 220 factor
        // produced overlapping 30-64px discs and saturated the base image.
        gl_PointSize = clamp(size * uScale * (12.0 / max(1.0, -mvPosition.z)), 0.7, 8.0) * uPixelRatio;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      uniform float uOpacity;
      void main() {
        vec2 p = gl_PointCoord * 2.0 - 1.0;
        float d = dot(p, p);
        if (d > 1.0) discard;
        float core = exp(-d * 4.2);
        float halo = exp(-d * 1.4) * 0.35;
        float alpha = (core + halo) * uOpacity;
        gl_FragColor = vec4(vColor * (0.65 + core * 0.7), alpha);
      }
    `,
  }), [blending, opacity, sizeScale, pixelRatio]);

  useEffect(() => () => material.dispose(), [material]);

  return (
    <points frustumCulled={false} renderOrder={renderOrder}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <primitive object={material} attach="material" />
    </points>
  );
});

SoftPoints.displayName = 'SoftPoints';

export default SoftPoints;
