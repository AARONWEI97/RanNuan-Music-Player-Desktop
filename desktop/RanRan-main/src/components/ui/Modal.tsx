import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import Button from './Button';
import { useUiStore } from '../../store/modules/uiStore';
import { getMotionPreset } from '../../utils/motionPresets';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export default function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  const transitionEffect = useUiStore((s) => s.settings.transitionEffect);
  const preset = getMotionPreset(transitionEffect);
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[90vw] max-h-[90vh]',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          <motion.div
            initial={preset.initial}
            animate={preset.animate}
            exit={preset.exit}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full ${sizes[size]}`}
          >
            <div className="cyber-glass rounded-2xl overflow-hidden border border-cyber-blue/20">
              {title && (
                <div className="flex items-center justify-between px-6 py-4 border-b border-cyber-blue/10">
                  <h2 className="text-xl font-cyber cyber-text">{title}</h2>
                  <Button variant="ghost" size="sm" onClick={onClose}>
                    <X size={20} />
                  </Button>
                </div>
              )}
              
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                {children}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
