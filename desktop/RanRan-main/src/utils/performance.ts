export type PerformanceTier = 'high' | 'medium' | 'low';

export interface PerformanceConfig {
  tier: PerformanceTier;
  enableBloom: boolean;
  enableVignette: boolean;
  enableParticles: boolean;
  particleCount: number;
  maxDpr: number;
  enablePostProcessing: boolean;
  galaxyParticleMultiplier: number;
  enablePlanetRings: boolean;
  enableAsteroids: boolean;
  enableNebula: boolean;
  starCount: number;
  enableSpaceDust: boolean;
  enableSunRays: boolean;
  meteorSlots: number;
  enableBlackHole: boolean;
  enablePulsar: boolean;
  supernovaSlots: number;
}

const PERFORMANCE_PRESETS: Record<PerformanceTier, PerformanceConfig> = {
  high: {
    tier: 'high',
    enableBloom: true,
    enableVignette: true,
    enableParticles: true,
    particleCount: 2000,
    maxDpr: 2,
    enablePostProcessing: true,
    galaxyParticleMultiplier: 1.0,
    enablePlanetRings: true,
    enableAsteroids: true,
    enableNebula: true,
    starCount: 15000,
    enableSpaceDust: true,
    enableSunRays: true,
    meteorSlots: 3,
    enableBlackHole: true,
    enablePulsar: true,
    supernovaSlots: 2,
  },
  medium: {
    tier: 'medium',
    enableBloom: true,
    enableVignette: true,
    enableParticles: true,
    particleCount: 1000,
    maxDpr: 1.5,
    enablePostProcessing: true,
    galaxyParticleMultiplier: 0.75,
    enablePlanetRings: true,
    enableAsteroids: true,
    enableNebula: true,
    starCount: 10000,
    enableSpaceDust: true,
    enableSunRays: true,
    meteorSlots: 2,
    enableBlackHole: true,
    enablePulsar: true,
    supernovaSlots: 1,
  },
  low: {
    tier: 'low',
    enableBloom: false,
    enableVignette: false,
    enableParticles: true,
    particleCount: 500,
    maxDpr: 1,
    enablePostProcessing: false,
    galaxyParticleMultiplier: 0.3,
    enablePlanetRings: false,
    enableAsteroids: false,
    enableNebula: false,
    starCount: 3000,
    enableSpaceDust: false,
    enableSunRays: false,
    meteorSlots: 1,
    enableBlackHole: false,
    enablePulsar: false,
    supernovaSlots: 1,
  },
};

function detectGPUTier(): PerformanceTier {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    
    if (!gl) return 'low';
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = debugInfo 
      ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase() 
      : '';
    
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const maxRenderbufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
    
    canvas.remove();
    
    if (maxTextureSize < 4096 || maxRenderbufferSize < 4096) {
      return 'low';
    }
    
    const lowEndPatterns = [
      'mali-4', 'mali-t6', 'adreno 3', 'adreno 4', 'adreno 5',
      'powervr sgx', 'intel hd graphics', 'intel uhd graphics 6',
      'apple gpu', 'swiftshader', 'llvmpipe',
    ];
    
    const highEndPatterns = [
      'nvidia', 'geforce rtx', 'geforce gtx 10', 'geforce gtx 16',
      'geforce gtx 20', 'radeon rx', 'radeon pro', 'apple m1',
      'apple m2', 'apple m3', 'apple m4', 'apple gpu',
      'adreno 7', 'adreno 8', 'mali-g7', 'mali-g610',
    ];
    
    for (const pattern of highEndPatterns) {
      if (renderer.includes(pattern)) return 'high';
    }
    
    for (const pattern of lowEndPatterns) {
      if (renderer.includes(pattern)) return 'low';
    }
    
    // CPU-only/低线程设备即使暴露了较大的纹理上限，也不适合高密度粒子场。
    const cores = navigator.hardwareConcurrency || 4;
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 4;
    if (cores <= 2 || memory <= 2) return 'low';
    if (maxTextureSize >= 8192 && cores >= 8) return 'high';
    if (maxTextureSize >= 4096) return 'medium';
    
    return 'medium';
  } catch {
    return 'medium';
  }
}

let cachedConfig: PerformanceConfig | null = null;

export function getStoredPerformanceTier(): PerformanceTier | 'auto' {
  if (typeof window === 'undefined') return 'auto';
  const value = window.localStorage.getItem('ranran-performance-tier');
  return value === 'low' || value === 'medium' || value === 'high' ? value : 'auto';
}

export function setStoredPerformanceTier(tier: PerformanceTier | 'auto') {
  if (typeof window !== 'undefined') {
    if (tier === 'auto') window.localStorage.removeItem('ranran-performance-tier');
    else window.localStorage.setItem('ranran-performance-tier', tier);
    window.dispatchEvent(new CustomEvent('ranran-performance-change', { detail: tier }));
  }
  clearPerformanceCache();
}

export function getPerformanceConfig(forceTier?: PerformanceTier): PerformanceConfig {
  if (cachedConfig && !forceTier) return cachedConfig;

  // 单次读取后再分支：拆成两次调用会让 TS 无法把 'auto' 从索引类型里窄化掉
  const stored = getStoredPerformanceTier();
  const tier: PerformanceTier = forceTier ?? (stored === 'auto' ? detectGPUTier() : stored);
  cachedConfig = { ...PERFORMANCE_PRESETS[tier] };

  return cachedConfig;
}

export function clearPerformanceCache(): void {
  cachedConfig = null;
}

export { detectGPUTier };
