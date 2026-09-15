import { motion } from 'framer-motion';
import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-cyber text-gray-400 mb-2 uppercase tracking-wider">
            {label}
          </label>
        )}
        
        <div className="relative">
          {icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none z-10 flex items-center justify-center">
              {icon}
            </div>
          )}
          
          <input
            ref={ref}
            className={`
              w-full bg-dark-card border border-dark-border rounded-lg
              py-3 text-white font-body
              placeholder-gray-500
              focus:outline-none focus:border-cyber-blue focus:shadow-[0_0_10px_rgba(0,245,255,0.2)]
              transition-all duration-300
              ${icon ? '!pl-12 !pr-4' : 'px-4'}
              ${error ? 'border-cyber-pink' : ''}
              ${className}
            `}
            style={icon ? { paddingLeft: '3rem' } : undefined}
            {...props}
          />
          
          <motion.div
            className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-cyber-blue to-cyber-purple"
            initial={{ width: 0 }}
            whileFocus={{ width: '100%' }}
          />
        </div>
        
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-1 text-sm text-cyber-pink"
          >
            {error}
          </motion.p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
