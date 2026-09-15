import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMusicPlayer } from '../../services/musicPlayer';

const StarField: React.FC = memo(() => {
  const stars = useMemo(() =>
    Array.from({ length: 200 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      opacity: Math.random() * 0.8 + 0.2,
      duration: 2 + Math.random() * 3
    }))
  , []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {stars.map(star => (
        <motion.div
          key={star.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
          }}
          animate={{
            opacity: [star.opacity * 0.5, star.opacity, star.opacity * 0.5],
            scale: [1, 1.2, 1]
          }}
          transition={{
            duration: star.duration,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
      ))}
    </div>
  );
});

StarField.displayName = 'StarField';

const DataStream: React.FC = memo(() => {
  const particles = useMemo(() => {
    const items: Array<{
      id: number;
      startXPct: number;
      startYPct: number;
      endXPct: number;
      endYPct: number;
      duration: number;
      delay: number;
      size: number;
      trailLength: number;
      rotation: number;
    }> = [];
    for (let i = 0; i < 60; i++) {
      const edge = i % 4;
      let startXPct: number, startYPct: number;
      switch (edge) {
        case 0: startXPct = Math.random() * 100; startYPct = -5; break;
        case 1: startXPct = Math.random() * 100; startYPct = 105; break;
        case 2: startXPct = -5; startYPct = Math.random() * 100; break;
        default: startXPct = 105; startYPct = Math.random() * 100; break;
      }
      const endXPct = 50 + (Math.random() - 0.5) * 4;
      const endYPct = 50 + (Math.random() - 0.5) * 4;
      const angle = Math.atan2(endYPct - startYPct, endXPct - startXPct) * (180 / Math.PI);
      items.push({
        id: i,
        startXPct,
        startYPct,
        endXPct,
        endYPct,
        duration: 1 + Math.random() * 0.8,
        delay: Math.random() * 0.8,
        size: 2 + Math.random() * 2,
        trailLength: 20 + Math.random() * 30,
        rotation: angle - 90,
      });
    }
    return items;
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{ left: `${p.startXPct}%`, top: `${p.startYPct}%`, opacity: 0 }}
          animate={{
            left: [`${p.startXPct}%`, `${p.endXPct}%`],
            top: [`${p.startYPct}%`, `${p.endYPct}%`],
            opacity: [0, 1, 1, 0],
          }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
          className="absolute"
          style={{ marginLeft: -p.size / 2, marginTop: -p.trailLength }}
        >
          <div
            style={{
              width: p.size,
              height: p.trailLength,
              background: 'linear-gradient(to bottom, transparent, rgba(0,200,255,0.4), rgba(0,255,255,0.9))',
              transform: `rotate(${p.rotation}deg)`,
              transformOrigin: 'center bottom',
              borderRadius: '50%',
              filter: 'blur(0.5px)',
            }}
          />
        </motion.div>
      ))}
    </div>
  );
});

DataStream.displayName = 'DataStream';

const HUDScanLines: React.FC = memo(() => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      {Array.from({ length: 6 }, (_, i) => (
        <motion.div
          key={i}
          initial={{ top: '-2%', opacity: 0 }}
          animate={{
            top: ['-2%', '102%'],
            opacity: [0, 0.6 - i * 0.08, 0],
          }}
          transition={{
            duration: 1.5,
            delay: i * 0.25,
            ease: 'linear',
          }}
          className="absolute left-0 right-0"
          style={{
            height: '2px',
            background: `linear-gradient(90deg, transparent 0%, rgba(0,255,255,${0.4 - i * 0.05}) 20%, rgba(255,255,255,${0.3 - i * 0.04}) 50%, rgba(0,255,255,${0.4 - i * 0.05}) 80%, transparent 100%)`,
            boxShadow: `0 0 15px rgba(0,255,255,${0.3 - i * 0.04}), 0 0 30px rgba(0,200,255,${0.15 - i * 0.02})`,
          }}
        />
      ))}
    </div>
  );
});

HUDScanLines.displayName = 'HUDScanLines';

const EnergyPulse: React.FC = memo(() => {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-10">
      {[0, 1, 2, 3].map(i => (
        <motion.div
          key={i}
          initial={{ scale: 0, opacity: 0.8 }}
          animate={{
            scale: [0, 3 + i * 0.5],
            opacity: [0.8, 0],
          }}
          transition={{
            duration: 1.5,
            delay: i * 0.3,
            ease: 'easeOut',
          }}
          className="absolute rounded-full"
          style={{
            width: 100,
            height: 100,
            border: `2px solid rgba(0,${200 + i * 15},255,${0.8 - i * 0.15})`,
            boxShadow: `0 0 20px rgba(0,200,255,${0.4 - i * 0.08}), inset 0 0 20px rgba(0,255,255,${0.2 - i * 0.04})`,
          }}
        />
      ))}
    </div>
  );
});

EnergyPulse.displayName = 'EnergyPulse';

const SystemBootText: React.FC = memo(() => {
  const [currentLine, setCurrentLine] = useState(0);
  const [currentChar, setCurrentChar] = useState(0);

  const lines = useMemo(() => [
    'INITIALIZING QUANTUM MATRIX...',
    'LOADING STELLAR DATABASE...',
    'ESTABLISHING NEURAL LINK...',
    'SYSTEM READY',
  ], []);

  useEffect(() => {
    if (currentLine >= lines.length) return;
    const line = lines[currentLine];
    if (currentChar < line.length) {
      const timer = setTimeout(() => setCurrentChar(c => c + 1), 30);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setCurrentLine(l => l + 1);
        setCurrentChar(0);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [currentLine, currentChar, lines]);

  return (
    <div className="absolute bottom-16 left-8 sm:left-16 pointer-events-none z-40">
      <div className="font-mono text-xs sm:text-sm tracking-wider">
        {lines.slice(0, Math.min(currentLine + 1, lines.length)).map((line, i) => (
          <div key={i} className="mb-1">
            <span style={{ color: i === lines.length - 1 && currentLine >= lines.length - 1 ? 'rgba(0,255,200,0.9)' : 'rgba(0,200,255,0.7)' }}>
              {i < currentLine ? line : line.slice(0, currentChar)}
            </span>
            {i === currentLine && currentChar < line.length && (
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                style={{ color: 'rgba(0,255,255,0.9)' }}
              >
                █
              </motion.span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

SystemBootText.displayName = 'SystemBootText';

interface GlitchTextProps {
  text: string;
  isActive: boolean;
}

const GlitchText: React.FC<GlitchTextProps> = memo(({ text, isActive }) => {
  return (
    <div className="relative">
      <motion.h1
        animate={isActive ? {
          x: [0, -2, 2, -1, 1, 0],
          textShadow: [
            '0 0 20px rgba(0,245,255,0.5)',
            '-2px 0 #ff00ff, 2px 0 #00ffff',
            '2px 0 #ff00ff, -2px 0 #00ffff',
            '-1px 0 #ff00ff, 1px 0 #00ffff',
            '0 0 20px rgba(0,245,255,0.5)'
          ]
        } : {}}
        transition={{ duration: 0.3, repeat: isActive ? Infinity : 0, repeatDelay: 3 }}
        className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-cyber text-transparent bg-clip-text bg-gradient-to-r from-cyber-blue via-white to-purple-400 tracking-[0.2em]"
        style={{
          backgroundSize: '200% 200%',
          WebkitBackgroundClip: 'text',
          filter: 'drop-shadow(0 0 30px rgba(0,245,255,0.5))'
        }}
      >
        {text}
      </motion.h1>

      {isActive && (
        <>
          <motion.div
            animate={{ opacity: [0, 0.5, 0], x: [0, 2, 0] }}
            transition={{ duration: 0.1, repeat: Infinity, repeatDelay: 2 }}
            className="absolute inset-0 text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-cyber text-cyan-400 tracking-[0.2em] pointer-events-none"
            style={{ clipPath: 'inset(40% 0 60% 0)' }}
          >
            {text}
          </motion.div>
          <motion.div
            animate={{ opacity: [0, 0.5, 0], x: [0, -2, 0] }}
            transition={{ duration: 0.1, repeat: Infinity, repeatDelay: 2.5 }}
            className="absolute inset-0 text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-cyber text-pink-400 tracking-[0.2em] pointer-events-none"
            style={{ clipPath: 'inset(80% 0 20% 0)' }}
          >
            {text}
          </motion.div>
        </>
      )}
    </div>
  );
});

GlitchText.displayName = 'GlitchText';

interface IntroTextProps {
  onEnter: () => void;
  isActive: boolean;
}

const IntroText: React.FC<IntroTextProps> = memo(({ onEnter, isActive }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: isActive ? 0 : 1, scale: isActive ? 1.5 : 1 }}
      transition={{ duration: 1.5, ease: 'easeOut' }}
      className="relative z-20 text-center cursor-pointer select-none"
      onClick={onEnter}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        animate={{
          scale: isHovered ? 1.1 : 1,
        }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative"
      >
        <GlitchText text="点击进入你的星辰大海" isActive={isHovered || isActive} />

        <motion.div
          animate={{
            opacity: [0.3, 0.8, 0.3],
            letterSpacing: ['0.1em', '0.3em', '0.1em']
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          className="mt-6 sm:mt-8 text-gray-400 text-sm sm:text-base md:text-lg tracking-[0.2em] uppercase"
        >
          ✦ Click to Enter Your Universe ✦
        </motion.div>

        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: isHovered ? 1 : 0.5 }}
          transition={{ duration: 0.5 }}
          className="h-[1px] mx-auto mt-6 sm:mt-8 bg-gradient-to-r from-transparent via-cyber-blue to-transparent"
          style={{ width: '80%' }}
        />
      </motion.div>

      <motion.div
        animate={{
          y: [0, 15, 0],
          opacity: [0.4, 1, 0.4]
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
        className="mt-10 sm:mt-12"
      >
        <div className="w-10 h-16 sm:w-12 sm:h-20 mx-auto rounded-full border-2 border-cyber-blue/40 flex justify-center pt-2 sm:pt-3">
          <motion.div
            animate={{ y: [0, 20, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-1.5 h-4 sm:w-2 sm:h-5 rounded-full bg-gradient-to-b from-cyber-blue to-purple-400"
          />
        </div>
        <motion.p
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="mt-3 text-gray-500 text-xs tracking-widest"
        >
          SCROLL OR CLICK
        </motion.p>
      </motion.div>
    </motion.div>
  );
});

IntroText.displayName = 'IntroText';

const Wormhole: React.FC<{ phase: 'idle' | 'activating' | 'entering' | 'traveling' | 'complete' }> = memo(({ phase }) => {
  const isActive = phase !== 'idle';
  const isTraveling = phase === 'traveling';

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={isActive ? {
          scale: isTraveling ? [1, 3, 20] : [0, 1],
          opacity: isTraveling ? [1, 1, 1] : [0, 1]
        } : {}}
        transition={{
          duration: isTraveling ? 3 : 1.5,
          ease: isTraveling ? [0.16, 1, 0.3, 1] : 'easeOut'
        }}
        className="relative"
        style={{ width: 'min(90vw, 90vh)', height: 'min(90vw, 90vh)' }}
      >
        <motion.div
          animate={isActive ? { rotate: 360 } : {}}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0"
          style={{
            background: `
              conic-gradient(from 0deg,
                transparent 0%,
                rgba(0,200,255,0.15) 5%,
                transparent 10%,
                rgba(0,255,255,0.2) 15%,
                transparent 20%,
                rgba(0,200,255,0.15) 25%,
                transparent 30%,
                rgba(0,255,255,0.2) 35%,
                transparent 40%,
                rgba(0,200,255,0.15) 45%,
                transparent 50%,
                rgba(0,255,255,0.2) 55%,
                transparent 60%,
                rgba(0,200,255,0.15) 65%,
                transparent 70%,
                rgba(0,255,255,0.2) 75%,
                transparent 80%,
                rgba(0,200,255,0.15) 85%,
                transparent 90%,
                rgba(0,255,255,0.2) 95%,
                transparent 100%
              )
            `,
            borderRadius: '50%',
            filter: 'blur(8px)'
          }}
        />

        <motion.div
          animate={isActive ? { rotate: -360 } : {}}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-[5%]"
          style={{
            background: `
              conic-gradient(from 45deg,
                transparent 0%,
                rgba(0,220,255,0.25) 10%,
                transparent 20%,
                rgba(100,255,255,0.3) 30%,
                transparent 40%,
                rgba(0,220,255,0.25) 50%,
                transparent 60%,
                rgba(100,255,255,0.3) 70%,
                transparent 80%,
                rgba(0,220,255,0.25) 90%,
                transparent 100%
              )
            `,
            borderRadius: '50%',
            filter: 'blur(5px)'
          }}
        />

        <motion.div
          animate={isActive ? { rotate: 360 } : {}}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-[10%]"
          style={{
            background: `
              conic-gradient(from 90deg,
                transparent 0%,
                rgba(0,255,255,0.35) 8%,
                transparent 16%,
                rgba(150,255,255,0.4) 24%,
                transparent 32%,
                rgba(0,255,255,0.35) 40%,
                transparent 48%,
                rgba(150,255,255,0.4) 56%,
                transparent 64%,
                rgba(0,255,255,0.35) 72%,
                transparent 80%,
                rgba(150,255,255,0.4) 88%,
                transparent 100%
              )
            `,
            borderRadius: '50%',
            filter: 'blur(3px)'
          }}
        />

        <motion.div
          animate={isActive ? {
            boxShadow: [
              '0 0 80px rgba(0,200,255,0.6), inset 0 0 80px rgba(0,220,255,0.3)',
              '0 0 120px rgba(0,255,255,0.7), inset 0 0 100px rgba(100,255,255,0.4)',
              '0 0 80px rgba(0,200,255,0.6), inset 0 0 80px rgba(0,220,255,0.3)'
            ]
          } : {}}
          transition={{ duration: 3, repeat: Infinity }}
          className="absolute inset-[15%] rounded-full"
          style={{
            background: 'radial-gradient(circle at center, rgba(0,0,0,0.95) 0%, rgba(0,5,20,0.98) 50%, rgba(0,10,30,1) 100%)',
            boxShadow: '0 0 80px rgba(0,200,255,0.6), inset 0 0 80px rgba(0,220,255,0.3)'
          }}
        />

        <motion.div
          animate={isActive ? {
            opacity: [0.3, 0.8, 0.3],
            scale: [1, 1.05, 1]
          } : {}}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-[18%] rounded-full"
          style={{
            background: 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.5) 70%, rgba(0,220,255,0.2) 100%)',
            border: '1px solid rgba(0,255,255,0.3)'
          }}
        />

        <motion.div
          animate={isActive ? { opacity: [0.2, 0.5, 0.2] } : {}}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute inset-[25%] rounded-full"
          style={{
            background: 'radial-gradient(circle at center, rgba(0,150,255,0.1) 0%, transparent 60%)',
          }}
        />

        {[...Array(5)].map((_, i) => (
          <motion.div
            key={`ring-${i}`}
            animate={isActive ? {
              rotate: i % 2 === 0 ? 360 : -360,
              opacity: [0.2, 0.5, 0.2]
            } : {}}
            transition={{
              rotate: { duration: 25 + i * 10, repeat: Infinity, ease: 'linear' },
              opacity: { duration: 3 + i, repeat: Infinity }
            }}
            className="absolute rounded-full"
            style={{
              inset: `${20 + i * 8}%`,
              border: `1px solid rgba(0,${200 + i * 15},255,${0.15 - i * 0.02})`,
              boxShadow: `0 0 ${10 + i * 5}px rgba(0,${200 + i * 10},255,${0.1})`
            }}
          />
        ))}

        {isActive && Array.from({ length: 24 }, (_, i) => {
          const angle = (i / 24) * Math.PI * 2;
          return (
            <div
              key={`speed-${i}`}
              className="absolute left-1/2 top-1/2"
              style={{
                transform: `rotate(${angle}rad)`,
                transformOrigin: 'center top',
                marginLeft: -0.5,
              }}
            >
              <motion.div
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{
                  opacity: [0, 0.5, 0],
                  scaleY: [0.3, 1, 1.5],
                }}
                transition={{
                  duration: 2,
                  delay: i * 0.04,
                  repeat: Infinity,
                  ease: 'easeOut',
                }}
                style={{
                  width: 1,
                  height: '35%',
                  background: 'linear-gradient(to bottom, rgba(0,200,255,0.6), rgba(0,255,255,0.2), transparent)',
                  transformOrigin: 'center top',
                }}
              />
            </div>
          );
        })}

        <motion.div
          animate={isActive ? {
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5]
          } : {}}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="absolute inset-[45%] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(200,220,255,0.6) 30%, transparent 70%)',
            filter: 'blur(2px)'
          }}
        />

        <motion.div
          animate={isActive ? { opacity: [0, 0.8, 0] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-[48%] rounded-full"
          style={{
            background: 'radial-gradient(circle, #fff 0%, transparent 60%)',
            filter: 'blur(1px)'
          }}
        />
      </motion.div>

      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.3, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 20%, rgba(0,200,255,0.1) 40%, transparent 60%)',
            filter: 'blur(30px)'
          }}
        />
      )}
    </div>
  );
});

Wormhole.displayName = 'Wormhole';

const HyperspaceTunnel: React.FC<{ isActive: boolean; progress: number }> = memo(({ isActive, progress }) => {
  const lines = useMemo(() =>
    Array.from({ length: 200 }, (_, i) => ({
      id: i,
      angle: (i / 200) * Math.PI * 2,
      length: 30 + Math.random() * 70,
      speed: 0.5 + Math.random() * 0.5,
      hue: 190 + Math.random() * 30
    }))
  , []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={isActive ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ perspective: '500px' }}
    >
      <div
        className="absolute inset-0"
        style={{
          transform: `translateZ(${progress * 100}px)`,
          transformStyle: 'preserve-3d'
        }}
      >
        {lines.map(line => (
          <motion.div
            key={line.id}
            initial={{
              opacity: 0,
              scale: 0,
              y: 0
            }}
            animate={isActive ? {
              opacity: [0, 1, 1, 0],
              scale: [0, 1, 1, 0],
              y: [0, -50 * line.speed * progress]
            } : {}}
            transition={{
              duration: 2,
              delay: line.id * 0.005,
              repeat: Infinity,
              ease: 'linear'
            }}
            className="absolute left-1/2 top-1/2 origin-center"
            style={{
              width: '2px',
              height: `${line.length}px`,
              background: `linear-gradient(to top, transparent, hsla(${line.hue}, 100%, 70%, 0.8), hsla(${line.hue}, 100%, 90%, 1))`,
              transform: `rotate(${line.angle}rad) translateY(-50%)`,
              boxShadow: `0 0 10px hsla(${line.hue}, 100%, 70%, 0.5)`
            }}
          />
        ))}
      </div>

      <motion.div
        animate={isActive ? { scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] } : {}}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, transparent 15%, rgba(0,150,255,0.08) 35%, rgba(0,100,255,0.2) 60%, rgba(0,80,255,0.3) 75%, transparent 100%)'
        }}
      />

      <motion.div
        animate={isActive ? { opacity: [0.1, 0.3, 0.1] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,180,255,0.15) 60%, rgba(0,120,255,0.25) 80%, transparent 100%)'
        }}
      />
    </motion.div>
  );
});

HyperspaceTunnel.displayName = 'HyperspaceTunnel';

const GravitationalLensing: React.FC<{ intensity: number }> = memo(({ intensity }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: intensity > 0 ? 1 : 0 }}
      className="absolute inset-0 pointer-events-none"
    >
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          animate={{
            scale: [1, 1 + intensity * 0.1, 1],
            opacity: [0.1 * intensity, 0.2 * intensity, 0.1 * intensity]
          }}
          transition={{
            duration: 3 + i * 0.5,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: `${200 + i * 100}px`,
            height: `${200 + i * 100}px`,
            border: `1px solid rgba(0,255,255,${0.1 * intensity})`,
            transform: `translate(-50%, -50%) rotate(${i * 15}deg)`,
            boxShadow: `0 0 ${20 + i * 10}px rgba(0,220,255,${0.05 * intensity})`
          }}
        />
      ))}
    </motion.div>
  );
});

GravitationalLensing.displayName = 'GravitationalLensing';

const SpaceDebris: React.FC<{ isActive: boolean }> = memo(({ isActive }) => {
  const debris = useMemo(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1 + Math.random() * 3,
      duration: 0.5 + Math.random() * 1.5,
      delay: Math.random() * 0.5
    }))
  , []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {debris.map(d => (
        <motion.div
          key={d.id}
          initial={{
            x: `${d.x}vw`,
            y: `${d.y}vh`,
            opacity: 0,
            scale: 0
          }}
          animate={isActive ? {
            x: ['50vw', `${d.x}vw`],
            y: ['50vh', `${d.y}vh`],
            opacity: [0, 1, 0],
            scale: [0, 1, 0.5]
          } : {}}
          transition={{
            duration: d.duration,
            delay: d.delay,
            ease: 'easeOut'
          }}
          className="absolute rounded-sm"
          style={{
            width: d.size,
            height: d.size * 0.6,
            background: 'linear-gradient(135deg, rgba(0,255,255,0.8), rgba(0,180,255,0.6))',
            boxShadow: `0 0 ${d.size * 2}px rgba(0,220,255,0.5)`,
            transform: `rotate(${Math.random() * 360}deg)`
          }}
        />
      ))}
    </div>
  );
});

SpaceDebris.displayName = 'SpaceDebris';

const EventHorizon: React.FC<{ progress: number }> = memo(({ progress }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: progress > 0.5 ? 1 : 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 pointer-events-none"
    >
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.8, 1, 0.8]
        }}
        transition={{ duration: 0.5, repeat: Infinity }}
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at center,
            rgba(0,0,0,${0.8 + progress * 0.2}) 0%,
            rgba(0,5,20,${0.6 + progress * 0.3}) 30%,
            rgba(0,10,30,${0.4 + progress * 0.2}) 60%,
            transparent 100%)`
        }}
      />

      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-[30%]"
        style={{
          background: 'conic-gradient(from 0deg, transparent, rgba(0,200,255,0.3), transparent, rgba(0,150,255,0.3), transparent)',
          filter: 'blur(10px)'
        }}
      />

      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-[40%]"
        style={{
          background: 'conic-gradient(from 180deg, transparent, rgba(0,255,255,0.2), transparent, rgba(0,180,255,0.2), transparent)',
          filter: 'blur(8px)'
        }}
      />

      <motion.div
        animate={{
          opacity: [0.5, 1, 0.5],
          scale: [1, 1.2, 1]
        }}
        transition={{ duration: 1, repeat: Infinity }}
        className="absolute inset-[45%] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(200,220,255,0.5) 50%, transparent 100%)',
          filter: 'blur(5px)'
        }}
      />
    </motion.div>
  );
});

EventHorizon.displayName = 'EventHorizon';

const TimelineMarker: React.FC<{ progress: number }> = memo(({ progress }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: progress > 0 ? 1 : 0 }}
      className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none z-50"
    >
      <div className="flex items-center gap-2">
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="text-xs text-cyan-300/80 font-mono tracking-widest"
        >
          INTERSTELLAR TRANSIT
        </motion.div>
      </div>
    </motion.div>
  );
});

TimelineMarker.displayName = 'TimelineMarker';

interface UniverseIntroProps {
  onComplete: () => void;
}

const UniverseIntro: React.FC<UniverseIntroProps> = memo(({ onComplete }) => {
  const [phase, setPhase] = useState<'idle' | 'activating' | 'entering' | 'traveling' | 'complete'>('idle');
  const [showContent, setShowContent] = useState(true);
  const [progress, setProgress] = useState(0);
  const { musicList, playMusic, loadMusicList } = useMusicPlayer();

  const handleEnter = useCallback(async () => {
    if (phase !== 'idle') return;

    setPhase('activating');

    const embedded = typeof window !== 'undefined' && window.parent !== window;
    const { useUiStore } = await import('../../store/modules/uiStore');
    const allowLocalMusic = !embedded && Boolean(useUiStore.getState().settings.backgroundMusic);
    if (allowLocalMusic) {
      await loadMusicList();
      if (musicList.length > 0) {
        playMusic(musicList[0].id);
      }
    }

    setTimeout(() => {
      setPhase('entering');
    }, 1500);

    setTimeout(() => {
      setPhase('traveling');
    }, 3000);
  }, [phase, loadMusicList, musicList, playMusic]);

  useEffect(() => {
    if (phase === 'traveling') {
      const startTime = Date.now();
      const duration = 5000;
      let frameId: number;
      let timeoutId: ReturnType<typeof setTimeout>;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const newProgress = Math.min(elapsed / duration, 1);
        setProgress(newProgress);

        if (newProgress < 1) {
          frameId = requestAnimationFrame(animate);
        } else {
          timeoutId = setTimeout(() => {
            onComplete();
          }, 500);
        }
      };

      frameId = requestAnimationFrame(animate);
      return () => {
        cancelAnimationFrame(frameId);
        clearTimeout(timeoutId);
      };
    }
  }, [phase, onComplete]);

  useEffect(() => {
    if (phase === 'entering') {
      const timer = setTimeout(() => {
        setShowContent(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  const tunnelProgress = phase === 'traveling' ? Math.max(0, (progress - 0.3) / 0.7) : 0;

  return (
    <AnimatePresence>
      {phase !== 'complete' && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="fixed inset-0 z-[100] overflow-hidden"
          style={{
            background: phase === 'traveling'
              ? '#000'
              : 'linear-gradient(180deg, #000003 0%, #020208 50%, #050510 100%)'
          }}
        >
          <div className="absolute inset-0">
            <StarField />
          </div>

          <motion.div
            animate={{ opacity: phase === 'traveling' ? 0 : 0.7 }}
            transition={{ duration: 1 }}
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.9) 100%)'
            }}
          />

          <AnimatePresence>
            {showContent && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 1 }}
                className="absolute inset-0 flex items-center justify-center z-10"
              >
                <IntroText onEnter={handleEnter} isActive={phase !== 'idle'} />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {phase === 'activating' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0"
              >
                <DataStream />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {(phase === 'activating' || phase === 'entering') && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0"
              >
                <HUDScanLines />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {phase === 'entering' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0"
              >
                <EnergyPulse />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {(phase === 'entering' || (phase === 'traveling' && progress < 0.2)) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0"
              >
                <SystemBootText />
              </motion.div>
            )}
          </AnimatePresence>

          <Wormhole phase={phase} />

          <GravitationalLensing intensity={phase === 'activating' ? 0.5 : phase === 'entering' ? 1 : progress} />

          {phase === 'activating' && <SpaceDebris isActive={true} />}

          <HyperspaceTunnel isActive={phase === 'traveling' && progress > 0.3} progress={tunnelProgress} />

          <EventHorizon progress={progress} />

          {phase !== 'idle' && <TimelineMarker progress={progress} />}

          {phase === 'traveling' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.5, 0] }}
              transition={{ duration: 0.3, repeat: Infinity }}
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(0,200,255,0.1), transparent)',
                filter: 'blur(20px)'
              }}
            />
          )}

          <motion.div
            animate={{
              opacity: phase === 'traveling' ? [0, 0.3, 0] : 0
            }}
            transition={{ duration: 0.2, repeat: Infinity }}
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.1) 0%, transparent 50%)'
            }}
          />

          {phase === 'traveling' && progress > 0.9 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, ease: 'easeIn' }}
              className="absolute inset-0 bg-white pointer-events-none z-50"
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
});

UniverseIntro.displayName = 'UniverseIntro';

export default UniverseIntro;
