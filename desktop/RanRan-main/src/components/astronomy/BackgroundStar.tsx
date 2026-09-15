import { useMemo, useState, memo } from 'react';
import { Html, Float } from '@react-three/drei';
import { REAL_STARS } from './constants';

interface BackgroundStarProps {
  star: typeof REAL_STARS[0];
  index: number;
}

const BackgroundStar: React.FC<BackgroundStarProps> = memo(({ star, index }) => {
  const position = useMemo(() => {
    const distance = 150 + index * 10;
    const ra = star.ra * (Math.PI / 180);
    const dec = star.dec * (Math.PI / 180);
    
    const x = distance * Math.cos(dec) * Math.cos(ra);
    const y = distance * Math.sin(dec);
    const z = distance * Math.cos(dec) * Math.sin(ra);
    
    return [x, y, z] as [number, number, number];
  }, [star, index]);

  const size = useMemo(() => {
    return Math.max(0.3, 1.5 - star.magnitude * 0.1);
  }, [star.magnitude]);

  const [isHovered, setIsHovered] = useState(false);

  return (
    <Float speed={1} rotationIntensity={0} floatIntensity={0.3}>
      <mesh 
        position={position}
        onPointerOver={() => setIsHovered(true)}
        onPointerOut={() => setIsHovered(false)}
      >
        <sphereGeometry args={[size, 8, 8]} />
        <meshBasicMaterial 
          color={star.color} 
          transparent 
          opacity={isHovered ? 1 : 0.8}
        />
        
        <mesh scale={[1.5, 1.5, 1.5]}>
          <sphereGeometry args={[size, 8, 8]} />
          <meshBasicMaterial 
            color={star.color} 
            transparent 
            opacity={0.3}
            blending={0}
          />
        </mesh>
        
        {isHovered && (
          <Html center>
            <div className="px-2 py-1 rounded bg-black/80 text-white text-xs border border-white/20 backdrop-blur-sm whitespace-nowrap">
              ⭐ {star.name}
              <span className="text-gray-400 ml-1">({star.distance}光年)</span>
            </div>
          </Html>
        )}
      </mesh>
    </Float>
  );
});

BackgroundStar.displayName = 'BackgroundStar';

export default BackgroundStar;
