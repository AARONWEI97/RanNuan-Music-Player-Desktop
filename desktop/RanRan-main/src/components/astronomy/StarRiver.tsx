import { useMemo, memo } from 'react';
import SoftPoints from './SoftPoints';

interface StarRiverProps {
  isDark: boolean;
  density?: number;
}

const StarRiver: React.FC<StarRiverProps> = ({ isDark, density = 1 }) => {
  const field = useMemo(() => {
    const count = Math.floor(16000 * density);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i += 1) {
      const i3 = i * 3;
      const t = Math.random();
      const arch = Math.sin(t * Math.PI);
      const spread = 6 + (1 - arch) * 10 + Math.random() * 14;
      const x = (t - 0.5) * 340 + (Math.random() - 0.5) * spread * 1.6;
      const y = 16 + arch * 46 + (Math.random() - 0.5) * spread;
      const z = -42 - arch * 96 + (Math.random() - 0.5) * (18 + spread);

      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;

      const lane = Math.abs(Math.random() - 0.5);
      const core = lane < 0.16;
      const magenta = Math.random() > 0.88;
      const gold = core && Math.random() > 0.35;
      if (magenta) {
        colors[i3] = 1.0;
        colors[i3 + 1] = 0.45 + Math.random() * 0.2;
        colors[i3 + 2] = 0.92;
        sizes[i] = 1.5 + Math.random() * 1.4;
      } else if (gold) {
        colors[i3] = 1.0;
        colors[i3 + 1] = 0.82 + Math.random() * 0.15;
        colors[i3 + 2] = 0.48;
        sizes[i] = 1.1 + Math.random() * 1.2;
      } else if (Math.random() > 0.82) {
        colors[i3] = 1.0;
        colors[i3 + 1] = 0.96;
        colors[i3 + 2] = 0.88;
        sizes[i] = 1.4 + Math.random();
      } else {
        const cool = 0.7 + Math.random() * 0.3;
        colors[i3] = 0.62 * cool;
        colors[i3 + 1] = 0.8 * cool;
        colors[i3 + 2] = 1.0;
        sizes[i] = 0.45 + Math.random() * 0.85;
      }
    }

    return { positions, colors, sizes };
  }, [density]);

  const mist = useMemo(() => {
    const count = Math.floor(2800 * density);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      const i3 = i * 3;
      const t = Math.random();
      const arch = Math.sin(t * Math.PI);
      positions[i3] = (t - 0.5) * 300 + (Math.random() - 0.5) * 24;
      positions[i3 + 1] = 18 + arch * 42 + (Math.random() - 0.5) * 10;
      positions[i3 + 2] = -50 - arch * 88 + (Math.random() - 0.5) * 16;
      colors[i3] = 0.55 + Math.random() * 0.2;
      colors[i3 + 1] = 0.42 + Math.random() * 0.2;
      colors[i3 + 2] = 0.85 + Math.random() * 0.15;
      sizes[i] = 2.4 + Math.random() * 3.2;
    }
    return { positions, colors, sizes };
  }, [density]);

  return (
    <group>
      <SoftPoints
        positions={field.positions}
        colors={field.colors}
        sizes={field.sizes}
        opacity={isDark ? 0.96 : 0.55}
        sizeScale={34}
      />
      <SoftPoints
        positions={mist.positions}
        colors={mist.colors}
        sizes={mist.sizes}
        opacity={isDark ? 0.28 : 0.14}
        sizeScale={48}
      />
    </group>
  );
};

StarRiver.displayName = 'StarRiver';

export default memo(StarRiver);
