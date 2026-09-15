import { useRef, useMemo, useState, useEffect, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { SUN_CONFIG } from './constants';
import { getSunPulseScale, toggleHostPlayback, useUniverseHostStore } from '../../bridge/universeHost';

interface SunProps {
  onClick?: () => void;
}

const SolarFlare: React.FC<{ angle: number; speed: number; size: number; delay: number }> = memo(({ angle, speed, size, delay }) => {
  const flareRef = useRef<THREE.Mesh>(null);
  const startTime = useRef(delay);

  useFrame(({ clock }) => {
    if (!flareRef.current) return;
    const time = clock.getElapsedTime() - startTime.current;
    if (time < 0) return;
    
    const cycle = (time * speed) % 4;
    
    if (cycle < 2) {
      const t = cycle / 2;
      const scale = Math.sin(t * Math.PI) * size;
      flareRef.current.scale.set(scale, scale, scale);
      flareRef.current.position.y = t * 3;
      (flareRef.current.material as THREE.MeshBasicMaterial).opacity = Math.sin(t * Math.PI) * 0.8;
    } else {
      flareRef.current.scale.set(0, 0, 0);
    }
  });

  return (
    <mesh ref={flareRef} position={[Math.cos(angle) * 5.5, 0, Math.sin(angle) * 5.5]} scale={[0, 0, 0]} raycast={() => {}}>
      <sphereGeometry args={[0.8, 8, 8]} />
      <meshBasicMaterial 
        color="#ffaa00" 
        transparent 
        opacity={0}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
});

SolarFlare.displayName = 'SolarFlare';

const BASE_GLOW_COLOR = new THREE.Color('#ff8800');
const BASE_CORONA_COLOR = new THREE.Color('#ff4400');

// useMemo 创建的材质不能直接进 hook 域修改（react-hooks/immutability），
// 逐帧时间推进收敛到模块作用域函数里。
function setMaterialTime(material: THREE.ShaderMaterial, time: number) {
  material.uniforms.time.value = time;
}

// 从封面图提取主色：8x8 降采样取平均，跳过近黑像素，再提亮饱和化。
// CORS 污染或解码失败时返回 null，保持默认暖橙。
function extractCoverColor(img: HTMLImageElement): THREE.Color | null {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 8;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, 8, 8);
    const data = ctx.getImageData(0, 0, 8, 8).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < data.length; i += 4) {
      const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      if (lum < 24) continue;
      r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
    }
    if (!n) return null;
    const color = new THREE.Color(r / (n * 255), g / (n * 255), b / (n * 255));
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    color.setHSL(hsl.h, Math.min(1, hsl.s * 1.35 + 0.15), Math.min(0.72, hsl.l * 1.25 + 0.18));
    return color;
  } catch {
    return null;
  }
}

const Sun: React.FC<SunProps> = memo(({ onClick }) => {
  const sunRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const coronaRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef<THREE.Mesh>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [coverTexture, setCoverTexture] = useState<THREE.Texture | null>(null);
  const hostSong = useUniverseHostStore((s) => s.snapshot.song);
  // 光晕目标色：封面主色 60% + 基底暖橙 40%，useFrame 里逐帧 lerp 平滑过渡
  const targetGlowColor = useRef(BASE_GLOW_COLOR.clone());
  const targetCoronaColor = useRef(BASE_CORONA_COLOR.clone());

  const sunMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color1: { value: new THREE.Color('#ffdd00') },
        color2: { value: new THREE.Color('#ff6600') },
        color3: { value: new THREE.Color('#ff2200') }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        void main() {
          vUv = uv;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color1;
        uniform vec3 color2;
        uniform vec3 color3;
        varying vec2 vUv;
        varying vec3 vPosition;
        
        float noise(vec3 p) {
          return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
        }
        
        float smoothNoise(vec3 p) {
          vec3 i = floor(p);
          vec3 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          
          float n = mix(
            mix(mix(noise(i), noise(i + vec3(1,0,0)), f.x),
                mix(noise(i + vec3(0,1,0)), noise(i + vec3(1,1,0)), f.x), f.y),
            mix(mix(noise(i + vec3(0,0,1)), noise(i + vec3(1,0,1)), f.x),
                mix(noise(i + vec3(0,1,1)), noise(i + vec3(1,1,1)), f.x), f.y), f.z
          );
          return n;
        }
        
        void main() {
          vec3 pos = vPosition * 0.5;
          float n = smoothNoise(pos + time * 0.5);
          float n2 = smoothNoise(pos * 2.0 - time * 0.3);
          float n3 = smoothNoise(pos * 3.0 + time * 0.2);
          
          vec3 color = mix(color1, color2, n);
          color = mix(color, color3, n2 * 0.5);
          color += vec3(0.2, 0.05, 0.0) * n3;
          
          float brightness = 1.0 + n * 0.3 + sin(time * 1.5) * 0.1;
          gl_FragColor = vec4(color * brightness, 1.0);
        }
      `
    });
  }, []);

  const glowMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        glowColor: { value: new THREE.Color('#ff8800') }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 glowColor;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          
          float pulse = 0.8 + 0.2 * sin(time * 2.0);
          float breathe = 0.9 + 0.1 * sin(time * 0.8);
          float flicker = 0.95 + 0.05 * sin(time * 7.0 + vPosition.x * 3.0);
          
          gl_FragColor = vec4(glowColor, intensity * pulse * breathe * flicker * 0.6);
        }
      `,
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending
    });
  }, []);

  const coronaMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        coronaColor: { value: new THREE.Color('#ff4400') }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec2 vUv;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 coronaColor;
        varying vec3 vNormal;
        varying vec2 vUv;
        
        void main() {
          float intensity = pow(0.5 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
          
          float streamer1 = sin(vUv.y * 20.0 + time * 3.0) * 0.5 + 0.5;
          float streamer2 = sin(vUv.y * 15.0 - time * 2.0) * 0.5 + 0.5;
          float streamers = mix(streamer1, streamer2, 0.5);
          
          float pulse = 0.7 + 0.3 * sin(time * 1.5);
          float burst = max(0.0, sin(time * 0.3) - 0.8) * 5.0;
          
          float alpha = intensity * (0.15 + streamers * 0.1) * pulse + burst * 0.05;
          gl_FragColor = vec4(coronaColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending
    });
  }, []);

  useEffect(() => {
    return () => {
      sunMaterial.dispose();
      glowMaterial.dispose();
      coronaMaterial.dispose();
      setCoverTexture((prev) => {
        prev?.dispose();
        return null;
      });
    };
  }, [sunMaterial, glowMaterial, coronaMaterial]);

  useEffect(() => {
    const url = hostSong?.picUrl;
    if (!url) {
      targetGlowColor.current.copy(BASE_GLOW_COLOR);
      targetCoronaColor.current.copy(BASE_CORONA_COLOR);
      // 不在 effect 体内同步 setState（react-hooks/set-state-in-effect）：
      // 清空贴图放微任务里，避免触发级联渲染
      let cancelled = false;
      queueMicrotask(() => {
        if (cancelled) return;
        setCoverTexture((prev) => {
          prev?.dispose();
          return null;
        });
      });
      return () => {
        cancelled = true;
      };
    }
    let disposed = false;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(
      url,
      (texture) => {
        if (disposed) {
          texture.dispose();
          return;
        }
        texture.colorSpace = THREE.SRGBColorSpace;
        const dominant = extractCoverColor(texture.image as HTMLImageElement);
        if (dominant) {
          targetGlowColor.current.copy(BASE_GLOW_COLOR).lerp(dominant, 0.6);
          targetCoronaColor.current.copy(BASE_CORONA_COLOR).lerp(dominant, 0.35);
        } else {
          targetGlowColor.current.copy(BASE_GLOW_COLOR);
          targetCoronaColor.current.copy(BASE_CORONA_COLOR);
        }
        setCoverTexture((prev) => {
          prev?.dispose();
          return texture;
        });
      },
      undefined,
      () => {
        if (!disposed) {
          setCoverTexture((prev) => {
            prev?.dispose();
            return null;
          });
        }
      }
    );
    return () => {
      disposed = true;
    };
  }, [hostSong?.picUrl]);

  const flareConfigs = useMemo(() => [
    { angle: 0.5, speed: 0.8, size: 1.5, delay: 0 },
    { angle: 1.8, speed: 1.2, size: 1.2, delay: 1.5 },
    { angle: 3.2, speed: 0.6, size: 1.8, delay: 3.0 },
    { angle: 4.5, speed: 1.0, size: 1.3, delay: 0.8 },
    { angle: 5.8, speed: 0.9, size: 1.6, delay: 2.2 },
  ], []);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    const playScale = getSunPulseScale();
    const timeScale = 0.45 + playScale;

    // 光晕/日冕颜色向封面主色平滑过渡
    glowMaterial.uniforms.glowColor.value.lerp(targetGlowColor.current, 0.04);
    coronaMaterial.uniforms.coronaColor.value.lerp(targetCoronaColor.current, 0.04);

    if (sunRef.current) {
      sunRef.current.rotation.y += 0.002 * timeScale;
      const pulseScale = 1 + Math.sin(time * 1.5 * timeScale) * (0.015 + 0.03 * playScale);
      sunRef.current.scale.set(pulseScale, pulseScale, pulseScale);
      setMaterialTime(sunMaterial, time * timeScale);
    }
    
    if (glowRef.current) {
      setMaterialTime(glowMaterial, time * timeScale);
      const glowPulse = 1.2 + Math.sin(time * 2.0 * timeScale) * (0.03 + 0.05 * playScale);
      glowRef.current.scale.set(glowPulse, glowPulse, glowPulse);
    }
    
    if (coronaRef.current) {
      coronaRef.current.rotation.y -= 0.001 * timeScale;
      coronaRef.current.rotation.z += 0.0005 * timeScale;
      setMaterialTime(coronaMaterial, time * timeScale);
      const coronaPulse = 1.5 + Math.sin(time * 1.5 * timeScale) * (0.06 + 0.08 * playScale);
      coronaRef.current.scale.set(coronaPulse, coronaPulse, coronaPulse);
    }

    if (pulseRef.current) {
      const pulseScale = 1.3 + Math.sin(time * 0.8) * 0.15;
      pulseRef.current.scale.set(pulseScale, pulseScale, pulseScale);
      (pulseRef.current.material as THREE.MeshBasicMaterial).opacity = 
        0.05 + Math.sin(time * 0.8) * 0.03;
    }
  });

  const handleToggle = (event: { stopPropagation: () => void }) => {
    event.stopPropagation();
    toggleHostPlayback();
    onClick?.();
  };

  return (
    <group
      onClick={handleToggle}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerOver={() => {
        setIsHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setIsHovered(false);
        document.body.style.cursor = 'default';
      }}
    >
      <mesh ref={sunRef} material={sunMaterial}>
        <sphereGeometry args={[SUN_CONFIG.radius, 64, 64]} />
      </mesh>

      {coverTexture && (
        <mesh raycast={() => {}}>
          <sphereGeometry args={[SUN_CONFIG.radius * 1.02, 48, 48]} />
          <meshBasicMaterial
            map={coverTexture}
            transparent
            opacity={0.55}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* 比光晕更大的点击体：光晕/日冕默认会挡住太阳本体的 raycast */}
      <mesh>
        <sphereGeometry args={[SUN_CONFIG.radius * 1.85, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      
      <mesh ref={glowRef} material={glowMaterial} raycast={() => {}}>
        <sphereGeometry args={[SUN_CONFIG.radius * 1.2, 32, 32]} />
      </mesh>
      
      <mesh ref={coronaRef} material={coronaMaterial} raycast={() => {}}>
        <sphereGeometry args={[SUN_CONFIG.radius * 1.5, 32, 32]} />
      </mesh>

      <mesh ref={pulseRef} raycast={() => {}}>
        <sphereGeometry args={[SUN_CONFIG.radius * 1.8, 32, 32]} />
        <meshBasicMaterial 
          color="#ff4400" 
          transparent 
          opacity={0.05}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {flareConfigs.map((config, i) => (
        <group key={i} raycast={() => {}}>
          <SolarFlare {...config} />
        </group>
      ))}
      
      {isHovered && (
        <Html center position={[0, SUN_CONFIG.radius + 2, 0]} style={{ pointerEvents: 'none' }}>
          <div className="pointer-events-none px-3 py-1.5 rounded-lg bg-black/80 text-white text-sm border border-yellow-500/30 backdrop-blur-sm whitespace-nowrap">
            {hostSong ? `♪ ${hostSong.name}` : '☀️ 太阳 · 中心恒星'}
          </div>
        </Html>
      )}
      
      <pointLight 
        color="#ffdd88" 
        intensity={4.2} 
        distance={240} 
        decay={0.55}
      />
      <pointLight 
        color="#ff8800" 
        intensity={1.8} 
        distance={160} 
        decay={0.35}
      />
    </group>
  );
});

Sun.displayName = 'Sun';

export default Sun;
