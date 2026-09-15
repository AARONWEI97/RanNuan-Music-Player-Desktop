import { motion, AnimatePresence } from 'framer-motion';
import { usePhotoStore } from '../../store/usePhotoStore';
import { useUiStore } from '../../store/modules/uiStore';
import { getMotionPreset } from '../../utils/motionPresets';
import { X, ChevronLeft, ChevronRight, RotateCw, Download, Trash2, Maximize2, Minimize2, Tag, Edit3, Check, Music } from 'lucide-react';
import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import localforage from 'localforage';
import type { Photo } from '../../types';
import { useTouchGestures } from '../../hooks/useTouchGestures';

interface HolographicViewerProps {
  isOpen: boolean;
  photoId: string | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onFindMusic?: (keywords: string) => void;
}

const HologramScanLines: React.FC = memo(() => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    {[...Array(30)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute left-0 right-0 h-px"
        style={{ 
          top: `${i * 3.33}%`,
          background: `linear-gradient(90deg, transparent 0%, rgba(0,255,255,${0.1 + (i % 3) * 0.1}) 20%, rgba(0,255,255,${0.2 + (i % 3) * 0.1}) 50%, rgba(0,255,255,${0.1 + (i % 3) * 0.1}) 80%, transparent 100%)`
        }}
        animate={{
          x: ['-100%', '100%'],
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{
          x: { duration: 8 + i * 0.2, repeat: Infinity, ease: 'linear' },
          opacity: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
        }}
      />
    ))}
    <motion.div
      className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent"
      animate={{ top: ['0%', '100%'] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
    />
  </div>
));

HologramScanLines.displayName = 'HologramScanLines';

const HologramGlitch: React.FC = memo(() => (
  <>
    <motion.div
      className="absolute inset-0 pointer-events-none"
      animate={{
        opacity: [0, 0.15, 0, 0.1, 0],
        x: [0, -3, 3, -1, 0],
        skewX: [0, 0.5, -0.5, 0]
      }}
      transition={{
        duration: 0.3,
        repeat: Infinity,
        repeatDelay: 4
      }}
      style={{
        background: 'linear-gradient(90deg, transparent, rgba(0,255,255,0.2), transparent)',
      }}
    />
    <motion.div
      className="absolute inset-0 pointer-events-none"
      animate={{
        opacity: [0, 0.1, 0, 0.08, 0],
        x: [0, 2, -2, 1, 0]
      }}
      transition={{
        duration: 0.2,
        repeat: Infinity,
        repeatDelay: 6
      }}
      style={{
        background: 'linear-gradient(90deg, transparent, rgba(255,0,255,0.15), transparent)',
      }}
    />
    <motion.div
      className="absolute inset-0 pointer-events-none"
      animate={{
        opacity: [0, 0.2, 0],
        scaleY: [1, 1.01, 1]
      }}
      transition={{
        duration: 0.1,
        repeat: Infinity,
        repeatDelay: 8
      }}
      style={{
        background: 'rgba(255,255,255,0.1)',
        clipPath: 'inset(40% 0 50% 0)'
      }}
    />
  </>
));

HologramGlitch.displayName = 'HologramGlitch';

const FloatingParticles: React.FC = memo(() => {
  const particles = useMemo(() => 
    Array.from({ length: 80 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 0.5 + Math.random() * 2,
      duration: 4 + Math.random() * 6,
      delay: Math.random() * 3,
      hue: Math.random() > 0.5 ? 180 : 280
    }))
  , []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: `hsl(${p.hue}, 100%, 70%)`,
            boxShadow: `0 0 ${p.size * 4}px hsl(${p.hue}, 100%, 60%), 0 0 ${p.size * 8}px hsl(${p.hue}, 100%, 50%)`
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0],
            y: [0, -30 - Math.random() * 20],
            x: [0, (Math.random() - 0.5) * 20]
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeOut'
          }}
        />
      ))}
    </div>
  );
});

FloatingParticles.displayName = 'FloatingParticles';

const HologramBase: React.FC = memo(() => (
  <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 pointer-events-none">
    <motion.div
      className="relative"
      animate={{ opacity: [0.3, 0.6, 0.3] }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <div 
        className="w-64 h-8 rounded-full"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(0,255,255,0.4) 0%, rgba(0,200,255,0.2) 40%, transparent 70%)',
          filter: 'blur(8px)'
        }}
      />
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(0,255,255,0.6) 0%, transparent 60%)',
        }}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
    </motion.div>
    <motion.div
      className="absolute top-full left-1/2 -translate-x-1/2 w-48 h-32"
      style={{
        background: 'linear-gradient(to bottom, rgba(0,255,255,0.15), transparent)',
        filter: 'blur(10px)',
        transform: 'translateX(-50%) perspective(100px) rotateX(60deg)'
      }}
      animate={{ opacity: [0.3, 0.5, 0.3] }}
      transition={{ duration: 2, repeat: Infinity }}
    />
  </div>
));

HologramBase.displayName = 'HologramBase';

const HologramReflection: React.FC<{ imageHeight: number }> = memo(({ imageHeight }) => (
  <motion.div
    className="absolute left-0 right-0 pointer-events-none overflow-hidden"
    style={{
      top: '100%',
      height: imageHeight * 0.4
    }}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.5 }}
  >
    <div
      className="w-full h-full"
      style={{
        background: 'linear-gradient(to bottom, rgba(0,255,255,0.1), transparent)',
        transform: 'scaleY(-1)',
        filter: 'blur(2px)',
        maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.3), transparent)',
        WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.3), transparent)'
      }}
    />
  </motion.div>
));

HologramReflection.displayName = 'HologramReflection';

const HologramFrame: React.FC<{ children: React.ReactNode; intensity?: number }> = memo(({ children, intensity = 1 }) => (
  <div className="relative">
    <motion.div
      className="absolute -inset-8 rounded-2xl"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(0,255,255,0.15) 0%, rgba(138,43,226,0.1) 50%, transparent 70%)',
        filter: 'blur(30px)'
      }}
      animate={{
        opacity: [0.4, 0.7, 0.4],
        scale: [1, 1.02, 1]
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: 'easeInOut'
      }}
    />
    
    <motion.div
      className="absolute -inset-4 rounded-xl"
      style={{
        background: 'linear-gradient(135deg, rgba(0,255,255,0.1) 0%, rgba(138,43,226,0.1) 50%, rgba(0,255,255,0.1) 100%)',
        filter: 'blur(15px)'
      }}
      animate={{
        opacity: [0.5, 0.8, 0.5]
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut'
      }}
    />

    <div className="absolute -inset-2 rounded-lg overflow-hidden">
      <motion.div
        className="absolute inset-0"
        style={{
          border: '2px solid',
          borderImage: 'linear-gradient(135deg, #00ffff, #8a2be2, #00ffff) 1',
          borderRadius: '8px'
        }}
        animate={{
          opacity: [0.6, 1, 0.6]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      />
    </div>

    <motion.div
      className="absolute -inset-1 rounded-lg"
      style={{
        boxShadow: `
          0 0 20px rgba(0,255,255,${0.3 * intensity}),
          0 0 40px rgba(0,255,255,${0.2 * intensity}),
          0 0 60px rgba(138,43,226,${0.15 * intensity}),
          inset 0 0 20px rgba(0,255,255,${0.1 * intensity})
        `
      }}
      animate={{
        boxShadow: [
          `0 0 20px rgba(0,255,255,${0.3 * intensity}), 0 0 40px rgba(0,255,255,${0.2 * intensity}), 0 0 60px rgba(138,43,226,${0.15 * intensity}), inset 0 0 20px rgba(0,255,255,${0.1 * intensity})`,
          `0 0 30px rgba(0,255,255,${0.4 * intensity}), 0 0 60px rgba(0,255,255,${0.3 * intensity}), 0 0 90px rgba(138,43,226,${0.2 * intensity}), inset 0 0 30px rgba(0,255,255,${0.15 * intensity})`,
          `0 0 20px rgba(0,255,255,${0.3 * intensity}), 0 0 40px rgba(0,255,255,${0.2 * intensity}), 0 0 60px rgba(138,43,226,${0.15 * intensity}), inset 0 0 20px rgba(0,255,255,${0.1 * intensity})`
        ]
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut'
      }}
    />
    
    <div className="relative z-10">
      {children}
    </div>
    
    <HologramScanLines />
    <HologramGlitch />
  </div>
));

HologramFrame.displayName = 'HologramFrame';

const CornerDecorations: React.FC = memo(() => (
  <>
    {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
      <motion.div
        key={i}
        className={`absolute ${pos} w-20 h-20 pointer-events-none`}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 + i * 0.1, type: 'spring' }}
      >
        <svg viewBox="0 0 80 80" className="w-full h-full">
          <defs>
            <linearGradient id={`cornerGrad${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00ffff" />
              <stop offset="100%" stopColor="#8a2be2" />
            </linearGradient>
          </defs>
          <motion.path
            d={i === 0 ? 'M0 40 L0 0 L40 0' : i === 1 ? 'M40 0 L80 0 L80 40' : i === 2 ? 'M0 40 L0 80 L40 80' : 'M40 80 L80 80 L80 40'}
            fill="none"
            stroke={`url(#cornerGrad${i})`}
            strokeWidth="3"
            animate={{
              strokeDasharray: ['0 100', '100 0', '0 100'],
              opacity: [0.6, 1, 0.6]
            }}
            transition={{
              strokeDasharray: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
              opacity: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
            }}
          />
          <motion.circle
            cx={i === 0 || i === 2 ? 10 : 70}
            cy={i === 0 || i === 1 ? 10 : 70}
            r="4"
            fill="none"
            stroke="#00ffff"
            strokeWidth="1.5"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.2
            }}
          />
          <motion.circle
            cx={i === 0 || i === 2 ? 10 : 70}
            cy={i === 0 || i === 1 ? 10 : 70}
            r="8"
            fill="none"
            stroke="#8a2be2"
            strokeWidth="0.5"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              delay: i * 0.15
            }}
          />
        </svg>
      </motion.div>
    ))}
  </>
));

CornerDecorations.displayName = 'CornerDecorations';

const DataOverlay: React.FC<{ photo: { name: string; createdAt: number }; rotationY: number }> = memo(({ photo, rotationY }) => (
  <motion.div
    initial={{ opacity: 0, x: -30 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: 0.3, type: 'spring' }}
    className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
  >
    <div className="relative">
      <div 
        className="absolute -inset-2 rounded-lg"
        style={{
          background: 'linear-gradient(135deg, rgba(0,255,255,0.1), rgba(138,43,226,0.1))',
          filter: 'blur(10px)'
        }}
      />
      <div className="relative p-3 rounded-lg bg-black/40 border border-cyan-400/20 backdrop-blur-sm">
        <div className="text-cyan-400 font-mono text-xs space-y-1.5" style={{ textShadow: '0 0 10px rgba(0,255,255,0.5)' }}>
          <div className="text-cyan-300/80 text-[10px] tracking-widest mb-2">━━━ HOLOGRAM DATA ━━━</div>
          <div className="flex justify-between gap-4">
            <span className="text-cyan-400/60">FILE:</span>
            <span className="text-cyan-300">{photo.name.slice(0, 12)}...</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-cyan-400/60">DATE:</span>
            <span className="text-cyan-300">{new Date(photo.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-cyan-400/60">ROTATION:</span>
            <span className="text-cyan-300">{Math.round(rotationY)}°</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-cyan-400/60">STATUS:</span>
            <motion.span
              className="text-green-400"
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              ● ACTIVE
            </motion.span>
          </div>
        </div>
        
        <motion.div
          className="mt-3 w-full h-0.5 bg-cyan-400/20 rounded overflow-hidden"
        >
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-400 to-purple-400"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            style={{ width: '40%' }}
          />
        </motion.div>
      </div>
    </div>
  </motion.div>
));

DataOverlay.displayName = 'DataOverlay';

const HologramGrid: React.FC = memo(() => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
    <div 
      className="absolute inset-0"
      style={{
        backgroundImage: `
          linear-gradient(rgba(0,255,255,0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,255,255,0.1) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px'
      }}
    />
  </div>
));

HologramGrid.displayName = 'HologramGrid';

export default function HolographicViewer({ isOpen, photoId, onClose, onPrev, onNext, onFindMusic }: HolographicViewerProps) {
  const { photos, removePhoto } = usePhotoStore();
  const transitionEffect = useUiStore((s) => s.settings.transitionEffect);
  const photoMotion = getMotionPreset(transitionEffect);
  const [rotationY, setRotationY] = useState(0);
  const [rotationX, setRotationX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, rotationY: 0, rotationX: 0 });
  const [fullImageUrl, setFullImageUrl] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const touchGestures = useTouchGestures({
    onSwipeLeft: onNext,
    onSwipeRight: onPrev,
    onSwipeDown: onClose,
    longPressDelay: 600,
  });

  const photo = photos.find((p) => p.id === photoId);
  const currentIndex = photos.findIndex((p) => p.id === photoId);

  useEffect(() => {
    if (isOpen && photoId) {
      setImageLoaded(false);
    }
  }, [isOpen, photoId]);

  useEffect(() => {
    const loadFullImage = async () => {
      if (!photo) return;
      
      if (photo.url && photo.url.startsWith('data:')) {
        setFullImageUrl(photo.url);
      } else {
        try {
          const storedUrl = await localforage.getItem<string>(photo.id);
          if (storedUrl) {
            setFullImageUrl(storedUrl);
          } else {
            setFullImageUrl(photo.thumbnail || '');
          }
        } catch (err) {
          console.error('Failed to load full image:', err);
          setFullImageUrl(photo.thumbnail || '');
        }
      }
    };

    loadFullImage();
  }, [photo]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          onPrev?.();
          break;
        case 'ArrowRight':
          onNext?.();
          break;
        case 'r':
        case 'R':
          setRotationY(r => r + 45);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onPrev, onNext]);

  useEffect(() => {
    setRotationY(0);
    setRotationX(0);
  }, [photoId]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY, rotationY, rotationX });
  }, [rotationY, rotationX]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    setRotationY(dragStart.rotationY + deltaX * 0.5);
    setRotationX(Math.max(-30, Math.min(30, dragStart.rotationX - deltaY * 0.3)));
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDownload = () => {
    if (photo && fullImageUrl) {
      const link = document.createElement('a');
      link.href = fullImageUrl;
      link.download = photo.name;
      link.click();
    }
  };

  const toggleFullscreen = () => {
    console.log('HolographicViewer: Toggling fullscreen', !isFullscreen);
    setIsFullscreen(!isFullscreen);
  };

  if (!photo) return null;

  // 根据全息状态动态调整最大尺寸
  // 横屏图片通常受宽度限制，竖屏图片受高度限制
  // 全屏模式下，我们希望尽可能占满屏幕，但保留一定的内边距以显示全息边框
  const imageSize = isFullscreen 
    ? { width: 'auto', height: 'auto', maxWidth: '90vw', maxHeight: '85vh' } 
    : { width: 'auto', height: 'auto', maxWidth: '60vw', maxHeight: '60vh' }; // 稍微减小默认尺寸，让放大效果更明显

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={`fixed inset-0 z-50 overflow-hidden ${isFullscreen ? '' : 'p-8'}`}
          style={{
            background: 'radial-gradient(ellipse at center, rgba(0,30,50,0.95) 0%, rgba(0,5,15,0.98) 50%, rgba(0,0,0,0.99) 100%)'
          }}
          ref={containerRef}
          role="dialog"
          aria-label="照片查看器"
          aria-modal="true"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={touchGestures.onTouchStart}
          onTouchMove={touchGestures.onTouchMove}
          onTouchEnd={touchGestures.onTouchEnd}
        >
          <HologramGrid />
          <FloatingParticles />

          <CornerDecorations />

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="absolute top-4 left-4 right-4 flex items-center justify-between z-20"
          >
            <div className="flex items-center gap-4">
              <motion.button
                onClick={onClose}
                className="p-2.5 rounded-lg bg-cyan-400/10 border border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/20 transition-colors backdrop-blur-sm"
                whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(0,255,255,0.3)' }}
                whileTap={{ scale: 0.95 }}
              >
                <X size={20} />
              </motion.button>
              <div className="flex items-center gap-2">
                <motion.div
                  className="w-2 h-2 rounded-full bg-green-400"
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <span className="text-cyan-400/80 font-mono text-sm">
                  {String(currentIndex + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <motion.button
                onClick={() => setRotationY(r => r - 45)}
                className="p-2 rounded-lg bg-cyan-400/10 border border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/20 transition-colors backdrop-blur-sm"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <RotateCw size={18} className="transform -scale-x-100" />
              </motion.button>
              <motion.button
                onClick={() => setRotationY(r => r + 45)}
                className="p-2 rounded-lg bg-cyan-400/10 border border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/20 transition-colors backdrop-blur-sm"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <RotateCw size={18} />
              </motion.button>
              <motion.button
                onClick={toggleFullscreen}
                className="p-2 rounded-lg bg-cyan-400/10 border border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/20 transition-colors backdrop-blur-sm"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </motion.button>
              <motion.button
                onClick={handleDownload}
                className="p-2 rounded-lg bg-cyan-400/10 border border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/20 transition-colors backdrop-blur-sm"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Download size={18} />
              </motion.button>
              <motion.button
                onClick={() => {
                  removePhoto(photo.id);
                  onClose();
                }}
                className="p-2 rounded-lg bg-red-400/10 border border-red-400/30 text-red-400 hover:bg-red-400/20 transition-colors backdrop-blur-sm"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Trash2 size={18} />
              </motion.button>
            </div>
          </motion.div>

          <DataOverlay photo={photo} rotationY={rotationY} />

          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              className="relative"
              style={{ perspective: '1500px' }}
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 50 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.div
                className="relative cursor-grab active:cursor-grabbing"
                style={{
                  transformStyle: 'preserve-3d',
                }}
                animate={{
                  rotateY: rotationY,
                  rotateX: rotationX,
                }}
                transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                onMouseDown={handleMouseDown}
              >
                <HologramFrame intensity={imageLoaded ? 1 : 0.5}>
                  <div className="relative flex items-center justify-center transition-all duration-500 ease-in-out">
                    <motion.img
                      key={photo.id}
                      src={fullImageUrl || photo.thumbnail}
                      alt={photo.name}
                      layout="position" // 使用位置布局过渡
                      className="object-contain select-none transition-all duration-500"
                      style={{
                        maxWidth: imageSize.maxWidth,
                        maxHeight: imageSize.maxHeight,
                        width: imageSize.width,
                        height: imageSize.height,
                        filter: `
                          drop-shadow(0 0 20px rgba(0,255,255,0.4)) 
                          drop-shadow(0 0 40px rgba(138,43,226,0.3))
                          drop-shadow(0 10px 30px rgba(0,0,0,0.5))
                        `,
                      }}
                      initial={photoMotion.initial}
                      animate={{
                        ...photoMotion.animate,
                        opacity: imageLoaded ? 1 : 0.5,
                      }}
                      exit={photoMotion.exit}
                      transition={{ duration: 0.4, ease: "easeInOut" }}
                      draggable={false}
                      onLoad={() => setImageLoaded(true)}
                    />
                    <HologramReflection imageHeight={400} />
                  </div>
                </HologramFrame>
                
                <HologramBase />
                
                <motion.div
                  className="absolute -bottom-16 left-0 right-0 text-center"
                  animate={{ opacity: [0.4, 0.8, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-cyan-400/10 border border-cyan-400/30 rounded-full text-cyan-400 text-xs font-mono backdrop-blur-sm">
                    <motion.div
                      className="w-1.5 h-1.5 rounded-full bg-cyan-400"
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                    DRAG TO ROTATE
                    <motion.div
                      className="w-1.5 h-1.5 rounded-full bg-cyan-400"
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0.5 }}
                    />
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>

          {photos.length > 1 && (
            <>
              <motion.button
                className="absolute left-4 top-1/2 -translate-y-1/2 p-4 bg-cyan-400/10 hover:bg-cyan-400/20 rounded-full transition-colors border border-cyan-400/30 backdrop-blur-sm"
                onClick={onPrev}
                whileHover={{ scale: 1.1, x: -5, boxShadow: '0 0 30px rgba(0,255,255,0.3)' }}
                whileTap={{ scale: 0.9 }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <ChevronLeft size={28} className="text-cyan-400" />
              </motion.button>
              
              <motion.button
                className="absolute right-4 top-1/2 -translate-y-1/2 p-4 bg-cyan-400/10 hover:bg-cyan-400/20 rounded-full transition-colors border border-cyan-400/30 backdrop-blur-sm"
                onClick={onNext}
                whileHover={{ scale: 1.1, x: 5, boxShadow: '0 0 30px rgba(0,255,255,0.3)' }}
                whileTap={{ scale: 0.9 }}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <ChevronRight size={28} className="text-cyan-400" />
              </motion.button>
            </>
          )}

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2"
          >
            <div className="relative">
              <div 
                className="absolute -inset-2 rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(0,255,255,0.1), rgba(138,43,226,0.1))',
                  filter: 'blur(10px)'
                }}
              />
              <div className="relative px-8 py-4 bg-black/60 border border-cyan-400/30 rounded-xl backdrop-blur-md">
                <h3 
                  className="text-xl font-cyber text-cyan-300 text-center mb-2" 
                  style={{ textShadow: '0 0 15px rgba(0,255,255,0.6)' }}
                >
                  {photo.name}
                </h3>
                
                <DescriptionEditor photo={photo} />
                
                <TagEditor photo={photo} />

                {onFindMusic && (
                  <button
                    type="button"
                    onClick={() => {
                      const keywords = [
                        photo.name.replace(/\.[^.]+$/, ''),
                        ...(photo.tags || []),
                      ]
                        .filter(Boolean)
                        .join(' ');
                      onFindMusic(keywords || '流行');
                    }}
                    className="mt-3 mx-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-400/30 text-cyan-200 text-xs hover:bg-cyan-400/10"
                  >
                    <Music size={13} />
                    用这张照片找歌
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const TagEditor: React.FC<{ photo: Photo }> = memo(({ photo }) => {
  const { tags, addTagToPhoto, removeTagFromPhoto, createTag } = usePhotoStore();
  const [isEditing, setIsEditing] = useState(false);
  const [newTag, setNewTag] = useState('');

  const handleAddTag = useCallback(() => {
    const trimmed = newTag.trim();
    if (!trimmed) return;
    
    const existingTag = tags.find(t => t.name.toLowerCase() === trimmed.toLowerCase());
    if (!existingTag) {
      createTag(trimmed);
    }
    addTagToPhoto(photo.id, trimmed);
    setNewTag('');
  }, [newTag, tags, photo.id, createTag, addTagToPhoto]);

  const handleRemoveTag = useCallback((tag: string) => {
    removeTagFromPhoto(photo.id, tag);
  }, [photo.id, removeTagFromPhoto]);

  return (
    <div className="mt-2">
      <div className="flex items-center justify-center gap-2 mb-1.5">
        <Tag size={12} className="text-cyan-400/60" />
        <span className="text-xs text-cyan-400/60">标签</span>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="text-xs text-cyan-400/40 hover:text-cyan-400 transition-colors"
        >
          {isEditing ? '完成' : '编辑'}
        </button>
      </div>
      
      {photo.tags.length > 0 && (
        <div className="flex gap-1.5 justify-center flex-wrap mb-1.5">
          {photo.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 bg-cyan-400/20 text-cyan-400 rounded-full border border-cyan-400/30 flex items-center gap-1"
            >
              {tag}
              {isEditing && (
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="text-cyan-400/50 hover:text-red-400 transition-colors"
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      
      {isEditing && (
        <div className="flex gap-1.5 justify-center">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
            placeholder="添加标签..."
            className="text-xs px-2 py-1 bg-black/40 border border-cyan-400/30 rounded-lg text-cyan-300 placeholder-cyan-400/30 focus:outline-none focus:border-cyan-400/60 w-28"
          />
          <button
            onClick={handleAddTag}
            className="text-xs px-2 py-1 bg-cyan-400/20 text-cyan-400 rounded-lg border border-cyan-400/30 hover:bg-cyan-400/30 transition-colors"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
});

TagEditor.displayName = 'TagEditor';

const DescriptionEditor: React.FC<{ photo: Photo }> = memo(({ photo }) => {
  const { updatePhoto } = usePhotoStore();
  const showSuccess = useUiStore(s => s.showSuccess);
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState(photo.description || '');

  useEffect(() => {
    setDescription(photo.description || '');
  }, [photo.description]);

  const handleSave = useCallback(() => {
    updatePhoto(photo.id, { description });
    setIsEditing(false);
    showSuccess('描述已保存');
  }, [photo.id, description, updatePhoto, showSuccess]);

  return (
    <div className="mb-2">
      <div className="flex items-center justify-center gap-2 mb-1">
        <Edit3 size={12} className="text-cyan-400/60" />
        <span className="text-xs text-cyan-400/60">描述</span>
        {isEditing ? (
          <button
            onClick={handleSave}
            className="text-xs text-green-400 hover:text-green-300 transition-colors flex items-center gap-0.5"
          >
            <Check size={10} /> 保存
          </button>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs text-cyan-400/40 hover:text-cyan-400 transition-colors"
          >
            编辑
          </button>
        )}
      </div>
      
      {isEditing ? (
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.ctrlKey) handleSave();
          }}
          placeholder="添加描述..."
          rows={2}
          className="text-xs w-full px-2 py-1 bg-black/40 border border-cyan-400/30 rounded-lg text-cyan-300 placeholder-cyan-400/30 focus:outline-none focus:border-cyan-400/60 resize-none text-center"
        />
      ) : (
        photo.description && (
          <p className="text-xs text-cyan-400/50 text-center">{photo.description}</p>
        )
      )}
    </div>
  );
});

DescriptionEditor.displayName = 'DescriptionEditor';
