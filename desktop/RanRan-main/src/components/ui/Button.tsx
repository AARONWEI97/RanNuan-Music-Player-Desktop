import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';
import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'primary', size = 'md', isLoading, icon, className = '', ...props }, ref) => {
    const baseStyles = 'relative font-cyber uppercase tracking-wider transition-all duration-300 inline-flex items-center justify-center gap-2';
    
    const variants = {
      primary: 'border border-cyber-blue text-cyber-blue hover:bg-cyber-blue hover:text-dark-bg hover:shadow-[0_0_20px_rgba(0,245,255,0.5)]',
      secondary: 'border border-cyber-purple text-cyber-purple hover:bg-cyber-purple hover:text-dark-bg hover:shadow-[0_0_20px_rgba(184,41,221,0.5)]',
      ghost: 'border border-transparent text-gray-400 hover:text-cyber-blue hover:border-cyber-blue/30',
      danger: 'border border-cyber-pink text-cyber-pink hover:bg-cyber-pink hover:text-dark-bg hover:shadow-[0_0_20px_rgba(255,45,117,0.5)]',
    };
    
    const sizes = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-5 py-2.5 text-sm',
      lg: 'px-7 py-3.5 text-base',
    };

    return (
      <motion.button
        ref={ref}
        type="button"
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        disabled={isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            {icon}
            {children}
          </>
        )}
        
        <span className="absolute inset-0 overflow-hidden">
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700" />
        </span>
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
