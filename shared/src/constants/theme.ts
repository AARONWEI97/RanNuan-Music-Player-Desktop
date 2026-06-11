export type ThemeType = 'light' | 'dark' | 'system' | 'dog-light' | 'dog-dark';

export const THEME_COLORS = {
  light: {
    primary: '#e60026',
    background: '#ffffff',
    surface: '#f5f5f5',
    text: '#1a1a1a',
    textSecondary: '#666666',
    border: '#e5e5e5',
  },
  dark: {
    primary: '#ff3b3b',
    background: '#1a1a1a',
    surface: '#2a2a2a',
    text: '#ffffff',
    textSecondary: '#999999',
    border: '#333333',
  },
  'dog-light': {
    primary: '#d48872',
    background: '#fff8f0',
    surface: '#ffe8d0',
    text: '#5c3d2e',
    textSecondary: '#8a6a5a',
    border: '#e8d5c0',
  },
  'dog-dark': {
    primary: '#e8a080',
    background: '#2a1f1a',
    surface: '#3d2e26',
    text: '#ffe8d0',
    textSecondary: '#c8a890',
    border: '#4a3a30',
  },
} as const;
