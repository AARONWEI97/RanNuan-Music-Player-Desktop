import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { memo, useCallback } from 'react';

interface ParallaxBackgroundProps {
  particles?: Array<{
    id: string;
    size: number;
    x: number;
    y: number;
    depth: number;
    opacity: number;
  }>;
  className?: string;
}

const ParallaxBackground = memo(({ particles, className = '' }: ParallaxBackgroundProps) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { stiffness: 100, damping: 25, mass: 0.5 };
  const mouseXSpring = useSpring(mouseX, springConfig);
  const mouseYSpring = useSpring(mouseY, springConfig);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;
    mouseX.set(x);
    mouseY.set(y);
  }, [mouseX, mouseY]);

  const defaultParticles = particles || Array.from({ length: 50 }, (_, i) => ({
    id: `star-${i}`,
    size: Math.random() * 2 + 1,
    x: Math.random() * 100 - 50,
    y: Math.random() * 100 - 50,
    depth: Math.random() * 0.5 + 0.1,
    opacity: Math.random() * 0.8 + 0.2,
  }));

  return (
    <motion.div
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      onMouseMove={handleMouseMove}
      style={{ willChange: 'transform' }}
    >
      {defaultParticles.map((particle) => {
        const translateX = useTransform(mouseXSpring, [-1, 1], [-particle.depth * 30, particle.depth * 30]);
        const translateY = useTransform(mouseYSpring, [-1, 1], [-particle.depth * 30, particle.depth * 30]);

        return (
          <motion.div
            key={particle.id}
            className="absolute rounded-full bg-white"
            style={{
              width: particle.size,
              height: particle.size,
              left: `${50 + particle.x}%`,
              top: `${50 + particle.y}%`,
              opacity: particle.opacity,
              x: translateX,
              y: translateY,
              willChange: 'transform',
            }}
          />
        );
      })}
    </motion.div>
  );
});

ParallaxBackground.displayName = 'ParallaxBackground';

export default ParallaxBackground;
