import { useMemo, memo } from 'react';
import { createBeltGuide, orbitCurvePoints } from './kepler';

interface OrbitRingProps {
  beltIndex: number;
  isDark: boolean;
  color?: string;
}

const OrbitRing: React.FC<OrbitRingProps> = memo(({ beltIndex, isDark, color }) => {
  const points = useMemo(() => orbitCurvePoints(createBeltGuide(beltIndex), 220), [beltIndex]);

  return (
    <group>
      <line>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[points, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          color={color || (isDark ? '#7ec8ff' : '#8aa0b8')}
          transparent
          opacity={isDark ? 0.38 : 0.22}
        />
      </line>
      <line>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[points, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          color={isDark ? '#3aa0ff' : '#6f8eaa'}
          transparent
          opacity={0.12}
        />
      </line>
    </group>
  );
});

OrbitRing.displayName = 'OrbitRing';

export default OrbitRing;
