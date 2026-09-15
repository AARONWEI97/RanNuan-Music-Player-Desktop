export const SUN_CONFIG = {
  radius: 5,
  glowIntensity: 2,
  coronaSize: 8,
  rotationSpeed: 0.1
};

export const ORBIT_CONFIG = {
  minDistance: 16,
  maxDistance: 102,
  baseSpeed: 0.11,
  rotationSpeed: 0.35,
  ySpread: 1.2
};

export const PLANET_COLORS = [
  '#4a9eff', '#ff6b4a', '#4aff6b', '#ff4a9e',
  '#ffd24a', '#9e4aff', '#4affd2', '#ff9e4a'
];

export const REAL_STARS = [
  { name: '天狼星', distance: 8.6, magnitude: -1.46, color: '#a8c5ff', ra: 101.28, dec: -16.71 },
  { name: '织女星', distance: 25, magnitude: 0.03, color: '#b8d4ff', ra: 279.23, dec: 38.78 },
  { name: '大角星', distance: 36.7, magnitude: -0.05, color: '#ffcc6b', ra: 213.91, dec: 19.18 },
  { name: '参宿七', distance: 860, magnitude: 0.13, color: '#b8c5ff', ra: 78.63, dec: -8.20 },
  { name: '五车二', distance: 42.9, magnitude: 0.08, color: '#ffd27a', ra: 79.17, dec: 45.99 },
  { name: '参宿四', distance: 700, magnitude: 0.50, color: '#ff8866', ra: 88.79, dec: 7.41 },
  { name: '南河三', distance: 11.4, magnitude: 0.34, color: '#fff4d6', ra: 114.82, dec: 5.22 },
  { name: '水委一', distance: 139, magnitude: 0.46, color: '#b8d4ff', ra: 24.42, dec: -57.24 },
  { name: '牛郎星', distance: 16.7, magnitude: 0.77, color: '#ffffff', ra: 297.69, dec: 8.87 },
  { name: '心宿二', distance: 550, magnitude: 0.96, color: '#ff6b4a', ra: 247.35, dec: -26.43 },
  { name: '角宿一', distance: 250, magnitude: 0.97, color: '#b8c5ff', ra: 201.30, dec: -11.16 },
  { name: '北落师门', distance: 25.1, magnitude: 1.16, color: '#ffffff', ra: 344.41, dec: -29.62 }
];

export const CONSTELLATIONS = {
  sagittarius: {
    name: '射手座',
    stars: [
      { x: 0, y: 0, size: 1.2 },
      { x: 2, y: 1, size: 0.8 },
      { x: 4, y: 0.5, size: 1.0 },
      { x: 5, y: -1, size: 0.7 },
      { x: 3, y: -2, size: 0.9 },
      { x: 1, y: -1.5, size: 0.6 },
      { x: -1, y: -0.5, size: 0.8 },
      { x: 6, y: -2, size: 0.5 },
      { x: 7, y: -1, size: 0.6 },
    ],
    lines: [[0,1], [1,2], [2,3], [3,4], [4,5], [5,6], [6,0], [3,7], [7,8]]
  },
  scorpius: {
    name: '天蝎座',
    stars: [
      { x: 0, y: 0, size: 1.3 },
      { x: 1.5, y: 0.8, size: 0.9 },
      { x: 3, y: 0.3, size: 1.1 },
      { x: 4.5, y: -0.5, size: 0.8 },
      { x: 5.5, y: -1.5, size: 0.7 },
      { x: 5, y: -2.5, size: 0.6 },
      { x: 4, y: -3, size: 0.8 },
      { x: 3, y: -2.8, size: 0.5 },
      { x: 2, y: -3.5, size: 0.6 },
    ],
    lines: [[0,1], [1,2], [2,3], [3,4], [4,5], [5,6], [6,7], [7,8]]
  },
  orion: {
    name: '猎户座',
    stars: [
      { x: 0, y: 2, size: 1.2 },
      { x: 2, y: 2, size: 1.4 },
      { x: 0.5, y: 0.5, size: 0.8 },
      { x: 1, y: 0, size: 0.9 },
      { x: 1.5, y: 0.5, size: 0.8 },
      { x: 0, y: -2, size: 1.0 },
      { x: 2, y: -2, size: 1.1 },
      { x: 1, y: -0.5, size: 0.7 },
    ],
    lines: [[0,2], [2,3], [3,4], [4,1], [3,7], [7,5], [7,6]]
  },
  ursaMajor: {
    name: '大熊座',
    stars: [
      { x: 0, y: 0, size: 1.0 },
      { x: 1.5, y: 0.5, size: 0.9 },
      { x: 3, y: 0.3, size: 1.1 },
      { x: 4.5, y: -0.2, size: 0.8 },
      { x: 4, y: -1.5, size: 0.9 },
      { x: 2.5, y: -1.8, size: 1.0 },
      { x: 1, y: -1.2, size: 0.8 },
    ],
    lines: [[0,1], [1,2], [2,3], [3,4], [4,5], [5,6], [6,0]]
  },
  cygnus: {
    name: '天鹅座',
    stars: [
      { x: 0, y: 0, size: 1.3 },
      { x: -1.5, y: 0.5, size: 0.8 },
      { x: 1.5, y: 0.5, size: 0.9 },
      { x: -2.5, y: 1, size: 0.7 },
      { x: 2.5, y: 1, size: 0.7 },
      { x: 0, y: -2, size: 1.1 },
    ],
    lines: [[0,1], [0,2], [1,3], [2,4], [0,5]]
  },
  leo: {
    name: '狮子座',
    stars: [
      { x: 0, y: 1, size: 1.2 },
      { x: 1, y: 0.5, size: 0.9 },
      { x: 2, y: 0, size: 1.0 },
      { x: 2.5, y: -1, size: 0.8 },
      { x: 1.5, y: -1.5, size: 0.7 },
      { x: 0.5, y: -1, size: 0.8 },
      { x: -0.5, y: -0.5, size: 0.9 },
    ],
    lines: [[0,1], [1,2], [2,3], [3,4], [4,5], [5,6], [6,0]]
  }
} as const;

export type ConstellationKey = keyof typeof CONSTELLATIONS;

export const CONSTELLATION_POSITIONS: Record<ConstellationKey, [number, number, number]> = {
  sagittarius: [-120, 40, -80],
  scorpius: [100, 30, -100],
  orion: [-80, 50, 80],
  ursaMajor: [80, 60, 60],
  cygnus: [-100, 70, 40],
  leo: [120, 45, 20]
};
