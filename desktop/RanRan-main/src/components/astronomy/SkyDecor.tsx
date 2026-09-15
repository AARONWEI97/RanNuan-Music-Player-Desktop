import { useEffect, useMemo, memo } from 'react';
import * as THREE from 'three';

function makeCloudTexture(inner: string, mid: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);
  ctx.clearRect(0, 0, 512, 512);
  const g = ctx.createRadialGradient(256, 256, 12, 256, 256, 250);
  g.addColorStop(0, inner);
  g.addColorStop(0.28, mid);
  g.addColorStop(0.62, 'rgba(20, 24, 48, 0.12)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeGalaxyTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);
  ctx.clearRect(0, 0, 512, 512);
  ctx.translate(256, 256);
  const core = ctx.createRadialGradient(0, 0, 4, 0, 0, 70);
  core.addColorStop(0, 'rgba(255, 236, 200, 0.95)');
  core.addColorStop(0.35, 'rgba(255, 170, 110, 0.55)');
  core.addColorStop(1, 'rgba(80, 40, 90, 0)');
  ctx.fillStyle = core;
  ctx.fillRect(-256, -256, 512, 512);
  for (let arm = 0; arm < 4; arm += 1) {
    ctx.save();
    ctx.rotate((arm * Math.PI) / 2);
    for (let i = 0; i < 180; i += 1) {
      const t = i / 180;
      const r = 28 + t * 210;
      const a = t * 2.6;
      const x = Math.cos(a) * r + (Math.random() - 0.5) * 18;
      const y = Math.sin(a) * r * 0.42 + (Math.random() - 0.5) * 10;
      const alpha = (1 - t) * 0.22;
      ctx.fillStyle = Math.random() > 0.7
        ? `rgba(180, 210, 255, ${alpha})`
        : `rgba(255, 190, 140, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, 1.2 + Math.random() * 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const CLOUDS: Array<{
  position: [number, number, number];
  scale: [number, number, number];
  inner: string;
  mid: string;
  opacity: number;
}> = [
  { position: [0, 42, -96], scale: [180, 70, 1], inner: 'rgba(160, 90, 220, 0.72)', mid: 'rgba(70, 110, 210, 0.38)', opacity: 0.86 },
  { position: [-78, 28, -72], scale: [110, 52, 1], inner: 'rgba(255, 90, 160, 0.62)', mid: 'rgba(110, 40, 180, 0.3)', opacity: 0.78 },
  { position: [82, 32, -78], scale: [120, 54, 1], inner: 'rgba(70, 190, 255, 0.62)', mid: 'rgba(50, 230, 190, 0.26)', opacity: 0.74 },
  { position: [-30, 52, -88], scale: [96, 44, 1], inner: 'rgba(255, 190, 120, 0.5)', mid: 'rgba(180, 80, 220, 0.22)', opacity: 0.62 },
  { position: [36, 18, -108], scale: [140, 48, 1], inner: 'rgba(120, 80, 220, 0.48)', mid: 'rgba(40, 90, 180, 0.2)', opacity: 0.58 },
  { position: [-110, 22, -60], scale: [72, 38, 1], inner: 'rgba(255, 140, 80, 0.45)', mid: 'rgba(180, 50, 90, 0.18)', opacity: 0.5 },
];

const SkyDecor: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const clouds = useMemo(
    () => CLOUDS.map((cloud) => ({ ...cloud, texture: makeCloudTexture(cloud.inner, cloud.mid) })),
    []
  );
  const galaxy = useMemo(() => makeGalaxyTexture(), []);
  const band = useMemo(() => makeCloudTexture('rgba(210, 190, 255, 0.28)', 'rgba(90, 120, 200, 0.14)'), []);

  useEffect(() => {
    return () => {
      clouds.forEach((cloud) => cloud.texture.dispose());
      galaxy.dispose();
      band.dispose();
    };
  }, [clouds, galaxy, band]);

  return (
    <group>
      {clouds.map((cloud, index) => (
        <sprite key={index} position={cloud.position} scale={cloud.scale} raycast={() => {}}>
          <spriteMaterial
            map={cloud.texture}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            opacity={(isDark ? 1 : 0.55) * cloud.opacity}
            toneMapped={false}
          />
        </sprite>
      ))}
      <sprite position={[0, 40, -102]} scale={[320, 86, 1]} raycast={() => {}}>
        <spriteMaterial
          map={band}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={isDark ? 0.72 : 0.34}
          toneMapped={false}
        />
      </sprite>
      <sprite position={[86, 44, -124]} scale={[78, 78, 1]} raycast={() => {}}>
        <spriteMaterial
          map={galaxy}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={isDark ? 0.92 : 0.55}
          toneMapped={false}
        />
      </sprite>
      <sprite position={[-104, 36, -118]} scale={[52, 52, 1]} raycast={() => {}}>
        <spriteMaterial
          map={galaxy}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={isDark ? 0.62 : 0.34}
          toneMapped={false}
        />
      </sprite>
    </group>
  );
};

export default memo(SkyDecor);
