import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { getMotionPreset, type TransitionEffect } from '../../utils/motionPresets';

interface PageTransitionProps {
  children: ReactNode;
  variant?: TransitionEffect | 'scale';
}

function PageTransition({ children, variant = 'slide' }: PageTransitionProps) {
  const variantConfig = getMotionPreset(variant === 'scale' ? 'zoom' : variant);

  return (
    <motion.div
      initial={variantConfig.initial}
      animate={variantConfig.animate}
      exit={variantConfig.exit}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  );
}

export default PageTransition;
