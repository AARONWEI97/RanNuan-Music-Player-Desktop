import { useState, useEffect, useCallback } from 'react';
import { useSpring, useTransform, type MotionValue } from 'framer-motion';

interface SpringOptions {
  stiffness?: number;
  damping?: number;
  mass?: number;
}

interface UseParallaxOptions {
  sensitivity?: number;
  smoothing?: SpringOptions;
  disabled?: boolean;
}

interface ParallaxValues {
  mouseX: number;
  mouseY: number;
  rotateX: MotionValue<number>;
  rotateY: MotionValue<number>;
  offset: { x: number; y: number };
}

export function useParallax(options: UseParallaxOptions = {}): ParallaxValues {
  const { sensitivity = 20, smoothing = { stiffness: 150, damping: 20, mass: 0.5 }, disabled = false } = options;
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (disabled) return;

    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setMousePosition({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [disabled]);

  const springX = useSpring(mousePosition.x * sensitivity, smoothing);
  const springY = useSpring(mousePosition.y * sensitivity, smoothing);

  const rotateX = useTransform(springY, [-sensitivity, sensitivity], [10, -10]);
  const rotateY = useTransform(springX, [-sensitivity, sensitivity], [-10, 10]);

  return {
    mouseX: mousePosition.x,
    mouseY: mousePosition.y,
    rotateX,
    rotateY,
    offset: { x: springX.get(), y: springY.get() },
  };
}

interface UseParallaxLayerOptions {
  depth?: number;
  baseX?: number;
  baseY?: number;
}

export function useParallaxLayer(options: UseParallaxLayerOptions = {}) {
  const { depth = 1, baseX = 0, baseY = 0 } = options;
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setMousePosition({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const springX = useSpring(mousePosition.x, { stiffness: 150, damping: 20, mass: 0.5 });
  const springY = useSpring(mousePosition.y, { stiffness: 150, damping: 20, mass: 0.5 });

  const x = useTransform(springX, [-1, 1], [baseX - depth * 10, baseX + depth * 10]);
  const y = useTransform(springY, [-1, 1], [baseY - depth * 10, baseY + depth * 10]);

  return { x, y };
}

export function useScrollParallax(options: { speed?: number } = {}) {
  const { speed = 0.5 } = options;
  const [scrollY, setScrollY] = useState(0);

  const handleScroll = useCallback(() => {
    setScrollY(window.scrollY * speed);
  }, [speed]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return scrollY;
}
