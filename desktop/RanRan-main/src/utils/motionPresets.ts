import type { AppSettings } from '../types';

export type TransitionEffect = AppSettings['transitionEffect'];

export function getMotionPreset(effect: TransitionEffect = 'fade') {
  switch (effect) {
    case 'slide':
      return {
        initial: { opacity: 0, x: 36 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -36 },
      };
    case 'zoom':
      return {
        initial: { opacity: 0, scale: 0.86 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 1.06 },
      };
    case 'flip':
      return {
        initial: { opacity: 0, rotateY: -55 },
        animate: { opacity: 1, rotateY: 0 },
        exit: { opacity: 0, rotateY: 45 },
      };
    case 'fade':
    default:
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      };
  }
}
