import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// 类名合并工具
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 条件类名生成器
export const conditionalClasses = {
  // 按钮状态类
  button: (isActive: boolean, variant: 'primary' | 'secondary' | 'ghost' = 'primary') => {
    const base = 'font-cyber uppercase tracking-wider transition-all duration-300';
    const variants = {
      primary: isActive 
        ? 'border border-cyber-blue text-cyber-blue bg-cyber-blue text-dark-bg shadow-[0_0_20px_rgba(0,245,255,0.5)]'
        : 'border border-cyber-blue text-cyber-blue hover:bg-cyber-blue hover:text-dark-bg hover:shadow-[0_0_20px_rgba(0,245,255,0.5)]',
      secondary: isActive
        ? 'border border-cyber-purple text-cyber-purple bg-cyber-purple text-dark-bg shadow-[0_0_20px_rgba(184,41,221,0.5)]'
        : 'border border-cyber-purple text-cyber-purple hover:bg-cyber-purple hover:text-dark-bg hover:shadow-[0_0_20px_rgba(184,41,221,0.5)]',
      ghost: isActive
        ? 'border border-cyber-blue/30 text-cyber-blue'
        : 'border border-transparent text-gray-400 hover:text-cyber-blue hover:border-cyber-blue/30',
    };
    
    return `${base} ${variants[variant]}`;
  },

  // 卡片状态类
  card: (isSelected: boolean = false, isHovered: boolean = false) => {
    const base = 'cyber-card transition-all duration-300';
    const selected = isSelected ? 'ring-2 ring-cyber-blue ring-offset-2 ring-offset-dark-bg' : '';
    const hovered = isHovered ? 'border-cyber-blue/30 shadow-[0_0_30px_rgba(0,245,255,0.1)]' : '';
    
    return `${base} ${selected} ${hovered}`;
  },

  // 布局模式类
  layoutGrid: (columns: number = 6) => {
    const cols = {
      2: 'grid-cols-2',
      3: 'grid-cols-3',
      4: 'grid-cols-4',
      5: 'grid-cols-5',
      6: 'grid-cols-6',
    };
    return `grid ${cols[columns as keyof typeof cols] || cols[6]} gap-4`;
  },

  // 玻璃态效果
  glass: (intensity: number = 0.7) => {
    return `bg-[rgba(18,18,26,${intensity})] backdrop-blur-2xl border border-cyber-blue/[calc(0.1*${intensity})]`;
  },

  // 渐变文本
  gradientText: (from: string, to: string) => {
    return `bg-gradient-to-r from-[${from}] to-[${to}] bg-clip-text text-transparent`;
  },

  // 扫描线效果
  scanline: (color: string = '#00f5ff') => {
    return `relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-0.5 before:bg-gradient-to-r before:from-transparent before:via-[${color}] before:to-transparent before:animate-scan`;
  },
};

// 尺寸工具
export const sizing = {
  // 响应式容器宽度
  container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  
  // 卡片尺寸
  card: {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8',
  },
  
  // 按钮尺寸
  button: {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3.5 text-base',
  },
  
  // 间距工具
  spacing: {
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  },
};

// 动画工具
export const animations = {
  // 进入动画
  fadeIn: (delay: number = 0) => ({
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.3, delay },
  }),
  
  slideUp: (delay: number = 0) => ({
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, delay },
  }),
  
  scaleIn: (delay: number = 0) => ({
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.2, delay },
  }),
  
  // 悬停动画
  hover: {
    scale: { scale: 1.02 },
    lift: { y: -2 },
    glow: { boxShadow: '0 0 20px rgba(0, 245, 255, 0.5)' },
  },
  
  // 点击动画
  tap: {
    scale: { scale: 0.98 },
    shrink: { scaleX: 0.95, scaleY: 0.95 },
  },
};

// 响应式工具
export const responsive = {
  // 媒体查询生成器
  media: {
    sm: '@media (min-width: 640px)',
    md: '@media (min-width: 768px)',
    lg: '@media (min-width: 1024px)',
    xl: '@media (min-width: 1280px)',
    '2xl': '@media (min-width: 1536px)',
  },
  
  // 响应式隐藏
  hide: {
    sm: 'hidden sm:block',
    md: 'hidden md:block',
    lg: 'hidden lg:block',
    xl: 'hidden xl:block',
  },
  
  // 响应式显示
  show: {
    sm: 'block sm:hidden',
    md: 'block md:hidden',
    lg: 'block lg:hidden',
    xl: 'block xl:hidden',
  },
};

// 可访问性工具
export const a11y = {
  // 屏幕阅读器专用
  srOnly: 'sr-only',
  
  // 焦点环
  focusRing: 'focus:outline-none focus:ring-2 focus:ring-cyber-blue focus:ring-offset-2 focus:ring-offset-dark-bg',
  
  // 减少动画偏好
  reducedMotion: 'motion-reduce:transition-none motion-reduce:transform-none',
  
  // 高对比度模式
  highContrast: 'contrast-more:border-2 contrast-more:border-white',
};

// 性能优化工具
export const performance = {
  // 硬件加速
  accelerate: 'transform-gpu will-change-transform',
  
  // 防止重绘
  preventRepaint: 'content-visibility: auto',
  
  // 包含上下文
  contain: 'contain: layout style paint',
  
  // 层创建提示
  layerHint: 'isolation: isolate',
};

// 工具函数：生成随机ID
export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

// 工具函数：防抖动
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void => {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// 工具函数：节流
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};