import { memo } from 'react';
import { motion } from 'framer-motion';
import { Palette } from 'lucide-react';
import { gradients, type GradientName } from '../../styles/theme';

interface GradientSelectorProps {
  currentGradient?: GradientName;
  onSelectGradient: (gradient?: GradientName) => void;
  isDark?: boolean;
}

const GradientSelector = memo(({ currentGradient, onSelectGradient, isDark = true }: GradientSelectorProps) => {
  const gradientEntries = Object.entries(gradients) as Array<[GradientName, typeof gradients[GradientName]]>;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <Palette className="w-4 h-4 text-cyber-blue" />
        <h3 className="text-sm font-cyber text-cyber-blue">渐变色彩</h3>
      </div>

      <button
        onClick={() => onSelectGradient(undefined)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all ${
          !currentGradient
            ? 'border-cyber-blue bg-cyber-blue/10'
            : isDark
            ? 'border-white/10 hover:border-white/20 bg-white/5'
            : 'border-gray-200 hover:border-gray-300 bg-gray-50'
        }`}
      >
        <span className={`text-sm ${isDark ? 'text-white' : 'text-gray-800'}`}>默认主题色</span>
        {!currentGradient && (
          <div className="w-3 h-3 rounded-full bg-cyber-blue" />
        )}
      </button>

      <div className="grid grid-cols-1 gap-2">
        {gradientEntries.map(([key, gradient]) => {
          const isActive = currentGradient === key;
          return (
            <motion.button
              key={key}
              onClick={() => onSelectGradient(key)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all ${
                isActive
                  ? 'border-cyber-blue bg-cyber-blue/10'
                  : isDark
                  ? 'border-white/10 hover:border-white/20 bg-white/5'
                  : 'border-gray-200 hover:border-gray-300 bg-gray-50'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-2 rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${gradient.colors.join(', ')})`,
                  }}
                />
                <span className={`text-sm ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  {gradient.name}
                </span>
              </div>
              {isActive && (
                <div className="w-3 h-3 rounded-full bg-cyber-blue" />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
});

GradientSelector.displayName = 'GradientSelector';

export default GradientSelector;
