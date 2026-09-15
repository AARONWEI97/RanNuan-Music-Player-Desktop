import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

export default function Card({ children, className = '', hover = true, onClick }: CardProps) {
  return (
    <motion.div
      className={`
        cyber-glass rounded-xl p-4
        border border-cyber-blue/10
        ${hover ? 'cursor-pointer hover:border-cyber-blue/30 hover:shadow-[0_0_30px_rgba(0,245,255,0.1)]' : ''}
        transition-all duration-300
        ${className}
      `}
      whileHover={hover ? { y: -2 } : {}}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}
