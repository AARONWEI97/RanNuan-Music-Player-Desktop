import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { forwardRef, useRef, useCallback, type MouseEvent } from 'react';
import type { HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface MagneticButtonProps extends HTMLMotionProps<'button'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
  magneticStrength?: number;
  showRipple?: boolean;
}

const MagneticButton = forwardRef<HTMLButtonElement, MagneticButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading,
      icon,
      magneticStrength = 30,
      showRipple = true,
      className = '',
      onMouseMove,
      onMouseLeave,
      onClick,
      ...props
    },
    ref
  ) => {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const springConfig = { stiffness: 150, damping: 15, mass: 0.5 };
    const xSpring = useSpring(x, springConfig);
    const ySpring = useSpring(y, springConfig);

    const translateX = useTransform(xSpring, [-magneticStrength, magneticStrength], [-10, 10]);
    const translateY = useTransform(ySpring, [-magneticStrength, magneticStrength], [-10, 10]);

    const handleMouseMove = useCallback(
      (e: MouseEvent<HTMLButtonElement>) => {
        if (!buttonRef.current) return;

        const rect = buttonRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const distanceX = e.clientX - centerX;
        const distanceY = e.clientY - centerY;

        const absDistanceX = Math.abs(distanceX);
        const absDistanceY = Math.abs(distanceY);

        if (absDistanceX < magneticStrength && absDistanceY < magneticStrength) {
          x.set(distanceX * 0.3);
          y.set(distanceY * 0.3);
        }

        onMouseMove?.(e);
      },
      [x, y, magneticStrength, onMouseMove]
    );

    const handleMouseLeave = useCallback(
      (e: MouseEvent<HTMLButtonElement>) => {
        x.set(0);
        y.set(0);
        onMouseLeave?.(e);
      },
      [x, y, onMouseLeave]
    );

    const baseStyles = 'relative font-cyber uppercase tracking-wider transition-colors duration-300 inline-flex items-center justify-center gap-2';

    const variants = {
      primary: 'border border-cyber-blue text-cyber-blue hover:bg-cyber-blue hover:text-dark-bg hover:shadow-[0_0_20px_rgba(0,245,255,0.5)]',
      secondary: 'border border-cyber-purple text-cyber-purple hover:bg-cyber-purple hover:text-dark-bg hover:shadow-[0_0_20px_rgba(184,41,221,0.5)]',
      ghost: 'border border-transparent text-gray-400 hover:text-cyber-blue hover:border-cyber-blue/30',
      danger: 'border border-cyber-pink text-cyber-pink hover:bg-cyber-pink hover:text-dark-bg hover:shadow-[0_0_20px_rgba(255,45,117,0.5)]',
      gradient: 'cyber-gradient-button',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-5 py-2.5 text-sm',
      lg: 'px-7 py-3.5 text-base',
    };

    return (
      <motion.button
        ref={(node) => {
          buttonRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) (ref as any).current = node;
        }}
        type="button"
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        style={{ x: translateX, y: translateY }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        disabled={isLoading}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={onClick}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            {showRipple && <RippleEffect />}
            {icon}
            {children}
          </>
        )}
      </motion.button>
    );
  }
);

function RippleEffect() {
  const handleClick = useCallback((e: React.MouseEvent<HTMLSpanElement>) => {
    const span = e.currentTarget;
    const rect = span.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      background: radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%);
      border-radius: 50%;
      transform: scale(0);
      animation: ripple-effect 0.6s ease-out;
      pointer-events: none;
    `;

    span.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }, []);

  return (
    <span
      className="absolute inset-0 overflow-hidden pointer-events-none"
      onClick={handleClick}
    />
  );
}

MagneticButton.displayName = 'MagneticButton';

export default MagneticButton;
