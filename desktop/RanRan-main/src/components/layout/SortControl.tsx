import { motion } from 'framer-motion';
import { ArrowDownAZ, ArrowUpAZ, CalendarArrowDown, CalendarArrowUp } from 'lucide-react';
import { usePhotoStore } from '../../store/usePhotoStore';

const sortOptions = [
  { id: 'date-desc', icon: CalendarArrowDown, label: '最新' },
  { id: 'date-asc', icon: CalendarArrowUp, label: '最早' },
  { id: 'name-asc', icon: ArrowDownAZ, label: 'A-Z' },
  { id: 'name-desc', icon: ArrowUpAZ, label: 'Z-A' },
] as const;

interface SortControlProps {
  className?: string;
}

export default function SortControl({ className }: SortControlProps) {
  const { sortOption, setSortOption } = usePhotoStore();

  return (
    <motion.div 
      className={`flex items-center gap-1 bg-dark-card/50 backdrop-blur-sm rounded-xl p-1 border border-cyber-blue/10 ${className}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      {sortOptions.map((option) => (
        <motion.button
          key={option.id}
          className={`flex items-center justify-center p-1.5 rounded-lg transition-all ${
            sortOption === option.id 
              ? 'bg-gradient-to-r from-cyber-pink/30 to-cyber-purple/30 text-cyber-pink shadow-lg shadow-cyber-pink/20' 
              : 'text-gray-400 hover:text-cyber-pink hover:bg-cyber-pink/10'
          }`}
          onClick={() => setSortOption(option.id)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title={option.label}
        >
          <option.icon size={16} />
        </motion.button>
      ))}
    </motion.div>
  );
}
