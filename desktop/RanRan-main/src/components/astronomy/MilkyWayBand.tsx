import { useMemo, memo } from 'react';
import * as THREE from 'three';
import SoftPoints from './SoftPoints';

interface MilkyWayBandProps {
  isDark: boolean;
  particleCount?: number;
}

interface MilkyWayField {
  pos: Float32Array;
  col: Float32Array;
  siz: Float32Array;
  dustPos: Float32Array;
  dustCol: Float32Array;
  dustSiz: Float32Array;
}

// 生成逻辑放模块作用域：Math.random 不进 React 渲染域（react-hooks/purity），
// 同时保证 StrictMode 双渲染下场数据稳定一致。
function buildMilkyWayField(particleCount: number): MilkyWayField {
  const pos = new Float32Array(particleCount * 3);
  const col = new Float32Array(particleCount * 3);
  const siz = new Float32Array(particleCount);

  // 暗尘带粒子：沿银道面、偏向银心方向分布，用 NormalBlending 吸光遮挡亮带
  const dustCount = Math.floor(particleCount * 0.22);
  const dustPos = new Float32Array(dustCount * 3);
  const dustCol = new Float32Array(dustCount * 3);
  const dustSiz = new Float32Array(dustCount);

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;
    const lon = Math.random() * Math.PI * 2;
    const towardCore = (Math.cos(lon) + 1) * 0.5;
    const lat =
      (Math.random() + Math.random() + Math.random() - 1.5) *
      (0.16 - towardCore * 0.07);
    const radius = 130 + Math.random() * 170;

    pos[i3] = Math.cos(lat) * Math.cos(lon) * radius;
    pos[i3 + 1] = Math.sin(lat) * radius;
    pos[i3 + 2] = Math.cos(lat) * Math.sin(lon) * radius;

    const inDustLane = Math.abs(lat) < 0.028 && towardCore > 0.5 && Math.random() > 0.4;
    if (inDustLane) {
      col[i3] = 0.18;
      col[i3 + 1] = 0.12;
      col[i3 + 2] = 0.09;
      siz[i] = 2.1 + Math.random() * 1.6;
    } else if (towardCore > 0.72) {
      const warm = 0.8 + Math.random() * 0.2;
      col[i3] = 1.0 * warm;
      col[i3 + 1] = 0.78 * warm;
      col[i3 + 2] = 0.48 * warm;
      siz[i] = 0.9 + Math.random() * 1.3;
    } else if (Math.random() > 0.82) {
      col[i3] = 1.0;
      col[i3 + 1] = 0.95;
      col[i3 + 2] = 0.75;
      siz[i] = 1.1 + Math.random();
    } else {
      const cool = 0.6 + Math.random() * 0.4;
      col[i3] = 0.7 * cool;
      col[i3 + 1] = 0.82 * cool;
      col[i3 + 2] = 1.0 * cool;
      siz[i] = 0.4 + Math.random() * 0.75;
    }
  }

  for (let i = 0; i < dustCount; i++) {
    const i3 = i * 3;
    // 尘带集中在银心方向的长弧上，纬度更窄
    const lon = Math.PI + (Math.random() + Math.random() + Math.random() - 1.5) * 1.15;
    const towardCore = (Math.cos(lon) + 1) * 0.5;
    const lat =
      (Math.random() + Math.random() - 1) *
      (0.035 + towardCore * 0.02);
    const radius = 132 + Math.random() * 165;

    dustPos[i3] = Math.cos(lat) * Math.cos(lon) * radius;
    dustPos[i3 + 1] = Math.sin(lat) * radius;
    dustPos[i3 + 2] = Math.cos(lat) * Math.sin(lon) * radius;

    // 冷褐黑色，NormalBlending 下压暗背后的亮星带
    const shade = 0.02 + Math.random() * 0.05;
    dustCol[i3] = shade * 1.15;
    dustCol[i3 + 1] = shade * 0.95;
    dustCol[i3 + 2] = shade * 0.8;
    dustSiz[i] = 3.2 + Math.random() * 4.6;
  }

  return { pos, col, siz, dustPos, dustCol, dustSiz };
}

const MilkyWayBand: React.FC<MilkyWayBandProps> = memo(({ isDark, particleCount = 9000 }) => {
  const field = useMemo(() => buildMilkyWayField(particleCount), [particleCount]);

  return (
    <group rotation={[0.82, 0.28, 0.34]}>
      <SoftPoints
        positions={field.pos}
        colors={field.col}
        sizes={field.siz}
        opacity={isDark ? 0.94 : 0.5}
        sizeScale={28}
        renderOrder={1}
      />
      <SoftPoints
        positions={field.dustPos}
        colors={field.dustCol}
        sizes={field.dustSiz}
        opacity={isDark ? 0.78 : 0.4}
        sizeScale={30}
        blending={THREE.NormalBlending}
        renderOrder={2}
      />
    </group>
  );
});

MilkyWayBand.displayName = 'MilkyWayBand';

export default MilkyWayBand;
