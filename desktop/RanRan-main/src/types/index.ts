export interface Photo {
  id: string;
  url: string;
  thumbnail?: string;
  name: string;
  description?: string;
  tags: string[];
  albumId: string;
  createdAt: number;
  width?: number;
  height?: number;
  type?: 'image' | 'video';
  duration?: number; // For video
}

export interface Album {
  id: string;
  name: string;
  description?: string;
  coverPhotoId?: string;
  createdAt: number;
  photoCount: number;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  count: number;
}

export interface Theme {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  particleColor: string;
  backgroundColor: string;
}

export type PerformanceMode = 'auto' | 'low' | 'medium' | 'high';

export interface AppSettings {
  theme: Theme;
  backgroundMusic: boolean;
  musicVolume: number;
  particleIntensity: number;
  showGrid: boolean;
  autoRotate: boolean;
  transitionEffect: 'fade' | 'slide' | 'zoom' | 'flip';
  showLyricMeteors: boolean;
  skipIntro: boolean;
  universeDark: boolean;
  performanceMode: PerformanceMode;
}

export const defaultThemes: Theme[] = [
  {
    id: 'cyber-blue',
    name: '赛博蓝',
    primaryColor: '#00f5ff',
    secondaryColor: '#b829dd',
    particleColor: '#00f5ff',
    backgroundColor: '#0a0a0f',
  },
  {
    id: 'neon-pink',
    name: '霓虹粉',
    primaryColor: '#ff2d75',
    secondaryColor: '#ff6b9d',
    particleColor: '#ff2d75',
    backgroundColor: '#0f0a10',
  },
  {
    id: 'matrix-green',
    name: '矩阵绿',
    primaryColor: '#39ff14',
    secondaryColor: '#00ff88',
    particleColor: '#39ff14',
    backgroundColor: '#0a0f0a',
  },
  {
    id: 'sunset-orange',
    name: '落日橙',
    primaryColor: '#ff6b35',
    secondaryColor: '#f7931e',
    particleColor: '#ff6b35',
    backgroundColor: '#0f0a05',
  },
  {
    id: 'galaxy-purple',
    name: '星河紫',
    primaryColor: '#b829dd',
    secondaryColor: '#8b5cf6',
    particleColor: '#b829dd',
    backgroundColor: '#0a0510',
  },
  {
    id: 'dark-abyss',
    name: '暗黑深渊',
    primaryColor: '#cc1a1a',
    secondaryColor: '#4a0000',
    particleColor: '#ff3333',
    backgroundColor: '#050000',
  },
  {
    id: 'ranran-warm',
    name: '冉暖星河',
    primaryColor: '#e19a7d',
    secondaryColor: '#9dbdb5',
    particleColor: '#f1b297',
    backgroundColor: '#140e0c',
  },
];

export const defaultSettings: AppSettings = {
  theme: defaultThemes[0],
  backgroundMusic: false,
  musicVolume: 0.5,
  particleIntensity: 1,
  showGrid: true,
  autoRotate: false,
  transitionEffect: 'fade',
  showLyricMeteors: true,
  skipIntro: false,
  universeDark: true,
  performanceMode: 'auto',
};

export function mergeAppSettings(partial?: Partial<AppSettings> | null): AppSettings {
  return {
    ...defaultSettings,
    ...partial,
    theme: partial?.theme ?? defaultSettings.theme,
    musicVolume: clamp01(partial?.musicVolume ?? defaultSettings.musicVolume),
    particleIntensity: clampRange(partial?.particleIntensity ?? defaultSettings.particleIntensity, 0, 2),
  };
}

function clamp01(value: number) {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.5;
}

function clampRange(value: number, min: number, max: number) {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;
}
