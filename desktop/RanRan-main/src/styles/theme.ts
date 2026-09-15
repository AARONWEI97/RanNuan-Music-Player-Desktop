import { useMemo } from 'react';
import { useUiStore } from '../store/useStore';
import type { Theme } from '../types';

// 主题配置
export const themes: Record<string, Theme> = {
  'cyber-blue': {
    id: 'cyber-blue',
    name: '赛博蓝',
    primaryColor: '#00f5ff',
    secondaryColor: '#b829dd',
    particleColor: '#00f5ff',
    backgroundColor: '#0a0a0f',
  },
  'neon-pink': {
    id: 'neon-pink',
    name: '霓虹粉',
    primaryColor: '#ff2d75',
    secondaryColor: '#ff6b9d',
    particleColor: '#ff2d75',
    backgroundColor: '#0f0a10',
  },
  'matrix-green': {
    id: 'matrix-green',
    name: '矩阵绿',
    primaryColor: '#39ff14',
    secondaryColor: '#00ff88',
    particleColor: '#39ff14',
    backgroundColor: '#0a0f0a',
  },
  'sunset-orange': {
    id: 'sunset-orange',
    name: '落日橙',
    primaryColor: '#ff6b35',
    secondaryColor: '#f7931e',
    particleColor: '#ff6b35',
    backgroundColor: '#0f0a05',
  },
  'galaxy-purple': {
    id: 'galaxy-purple',
    name: '星河紫',
    primaryColor: '#b829dd',
    secondaryColor: '#8b5cf6',
    particleColor: '#b829dd',
    backgroundColor: '#0a0510',
  },
  'dark-abyss': {
    id: 'dark-abyss',
    name: '暗黑深渊',
    primaryColor: '#cc1a1a',
    secondaryColor: '#4a0000',
    particleColor: '#ff3333',
    backgroundColor: '#050000',
  },
  'ranran-warm': {
    id: 'ranran-warm',
    name: '冉暖星河',
    primaryColor: '#e19a7d',
    secondaryColor: '#9dbdb5',
    particleColor: '#f1b297',
    backgroundColor: '#140e0c',
  },
};

// 渐变配置
export const gradients = {
  cyberAurora: {
    name: '赛博极光',
    colors: ['#00f5ff', '#b829dd', '#39ff14'],
    angles: [0, 120, 240],
  },
  holographic: {
    name: '全息彩虹',
    colors: ['#ff2d75', '#00f5ff', '#b829dd', '#39ff14', '#ff6b35'],
    angles: [0, 72, 144, 216, 288],
  },
  nebula: {
    name: '星云紫',
    colors: ['#b829dd', '#8b5cf6', '#cc1a1a', '#050000'],
    angles: [0, 90, 180, 270],
  },
  sunset: {
    name: '落日余晖',
    colors: ['#ff6b35', '#f7931e', '#ff2d75'],
    angles: [0, 120, 240],
  },
  deepOcean: {
    name: '深海蓝',
    colors: ['#00f5ff', '#0066ff', '#0a0a0f'],
    angles: [0, 180, 360],
  },
} as const;

export type GradientName = keyof typeof gradients;

export const generateThemeVariableMap = (theme: Theme, gradientName?: GradientName): Record<string, string> => {
  const gradient = gradientName ? gradients[gradientName] : null;
  const warm = theme.id === 'ranran-warm';
  const vars: Record<string, string> = {
    '--cyber-primary': theme.primaryColor,
    '--cyber-secondary': theme.secondaryColor,
    '--cyber-particle': theme.particleColor,
    '--cyber-background': theme.backgroundColor,
    '--cyber-pink': warm ? '#f1b297' : '#ff2d75',
    '--cyber-blue': theme.primaryColor,
    '--cyber-purple': theme.secondaryColor,
    '--cyber-green': warm ? '#9dbdb5' : '#39ff14',
    '--color-cyber-pink': warm ? '#f1b297' : '#ff2d75',
    '--color-cyber-blue': theme.primaryColor,
    '--color-cyber-purple': theme.secondaryColor,
    '--color-cyber-green': warm ? '#9dbdb5' : '#39ff14',
    '--dark-bg': theme.backgroundColor,
    '--dark-card': '#12121a',
    '--dark-border': '#1e1e2e',
  };
  if (gradient) {
    vars['--cyber-gradient-1'] = gradient.colors[0];
    vars['--cyber-gradient-2'] = gradient.colors[1] || gradient.colors[0];
    vars['--cyber-gradient-3'] = gradient.colors[2] || gradient.colors[0];
    vars['--cyber-gradient-name'] = gradient.name;
  }
  return vars;
};

export const generateThemeVariables = (theme: Theme, gradientName?: GradientName): string => {
  return Object.entries(generateThemeVariableMap(theme, gradientName))
    .map(([key, value]) => `${key}: ${value};`)
    .join('\n');
};

// 获取当前主题
export const useCurrentTheme = (): Theme => {
  const { currentTheme } = useUiStore();
  return currentTheme;
};

// 应用主题到DOM
export const applyThemeToDocument = (theme: Theme, gradientName?: GradientName) => {
  const root = document.documentElement;
  const vars = generateThemeVariableMap(theme, gradientName);
  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
};

// 主题相关的CSS类生成器
export const themeClasses = {
  glass: 'cyber-glass',
  border: 'cyber-border',
  text: 'cyber-text',
  buttonPrimary: 'cyber-button',
  buttonPink: 'cyber-button-pink',
  card: 'cyber-card',
  scanline: 'scanline',
  gradientText: 'cyber-gradient-text',
  gradientBorder: 'cyber-gradient-border',
  gradientButton: 'cyber-gradient-button',
  gradientCard: 'cyber-gradient-card',
};

// 颜色工具函数
export const colorUtils = {
  // 生成渐变背景
  gradient(primary: string, secondary: string): string {
    return `linear-gradient(135deg, ${primary}, ${secondary})`;
  },
  
  // 生成带透明度的颜色
  withOpacity(color: string, opacity: number): string {
    // 简单的RGB转换，实际项目中可能需要更复杂的解析
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  },
  
  // 生成阴影效果
  glow(color: string, intensity: number = 1): string {
    return `0 0 ${10 * intensity}px ${color}, 0 0 ${20 * intensity}px ${color}, 0 0 ${30 * intensity}px ${color}`;
  }
};

// 动画配置
export const animations = {
  glow: 'glow 2s ease-in-out infinite alternate',
  float: 'float 6s ease-in-out infinite',
  pulseSlow: 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  gradientShift: 'gradient 8s ease infinite',
  scan: 'scan 8s linear infinite',
};

// 响应式断点
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

// 布局配置
export const layout = {
  navbarHeight: '4rem',
  sidebarWidth: '16rem',
  cardBorderRadius: '0.75rem',
  modalBorderRadius: '1rem',
};

// 字体配置
export const typography = {
  fontFamily: {
    cyber: "'Orbitron', sans-serif",
    body: "'Rajdhani', sans-serif",
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
  },
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
};

// 自定义Hook：获取主题相关的样式
export const useThemedStyles = () => {
  const theme = useCurrentTheme();
  
  return useMemo(() => ({
    colors: {
      primary: theme.primaryColor,
      secondary: theme.secondaryColor,
      background: theme.backgroundColor,
      particle: theme.particleColor,
    },
    gradients: {
      primary: colorUtils.gradient(theme.primaryColor, theme.secondaryColor),
      secondary: colorUtils.gradient(theme.secondaryColor, theme.particleColor),
    },
    shadows: {
      glow: colorUtils.glow(theme.primaryColor),
      strongGlow: colorUtils.glow(theme.primaryColor, 1.5),
    },
    theme,
  }), [theme]);
};