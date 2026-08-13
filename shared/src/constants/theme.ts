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
    primary: '#b86f58',
    background: '#fff6ec',
    surface: '#ffe9d4',
    text: '#5b4a43',
    textSecondary: '#927d70',
    border: '#e4cdb8',
  },
  'dog-dark': {
    primary: '#e19a7d',
    background: '#241915',
    surface: '#34251e',
    text: '#ffe8d7',
    textSecondary: '#c6a696',
    border: '#60473a',
  },
} as const;
