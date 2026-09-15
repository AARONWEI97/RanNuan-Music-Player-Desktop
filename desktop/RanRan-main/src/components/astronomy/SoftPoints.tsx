import { useMemo, useEffect, memo } from 'react';
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
  // opacity/sizeScale 进 deps：变化时重建材质而非在 effect 里改 hook 值（react-hooks/immutability）
  const material = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending,
    toneMapped: false,
    vertexColors: true,
    uniforms: {
      uOpacity: { value: opacity },
      uScale: { value: sizeScale },
    },
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      varying vec3 vColor;
      uniform float uScale;
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = clamp(size * uScale * (220.0 / max(1.0, -mvPosition.z)), 1.2, 64.0);
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
  }), [blending, opacity, sizeScale]);

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
