import { useRef, useState, useEffect, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface HologramScreenProps {
  position: [number, number, number];
  onClick: () => void;
  hasVideos?: boolean;
  previewVideo?: HTMLVideoElement | null;
}

const FRAME_W = 960;
const FRAME_H = 540;

function paintIdle(ctx: CanvasRenderingContext2D, hasVideos: boolean) {
  ctx.fillStyle = '#071820';
  ctx.fillRect(0, 0, FRAME_W, FRAME_H);
  const gradient = ctx.createRadialGradient(480, 270, 40, 480, 270, 420);
  gradient.addColorStop(0, 'rgba(50, 160, 200, 0.45)');
  gradient.addColorStop(1, 'rgba(7, 24, 32, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, FRAME_W, FRAME_H);
  ctx.strokeStyle = 'rgba(103, 232, 255, 0.55)';
  ctx.lineWidth = 6;
  ctx.strokeRect(24, 24, FRAME_W - 48, FRAME_H - 48);
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(210, 248, 255, 0.95)';
  ctx.font = '600 58px Rajdhani, sans-serif';
  ctx.fillText(hasVideos ? 'HOLOGRAM CINEMA' : 'NO REEL YET', 480, 250);
  ctx.font = '400 28px Rajdhani, sans-serif';
  ctx.fillStyle = 'rgba(180, 244, 255, 0.72)';
  ctx.fillText(hasVideos ? 'COVER LOOP · CLICK TO ENTER' : 'UPLOAD A CLIP IN 片库', 480, 310);
}

const HologramScreen: React.FC<HologramScreenProps> = memo(({
  position,
  onClick,
  hasVideos = false,
  previewVideo = null,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const scanRef = useRef<THREE.Mesh>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [screenTexture, setScreenTexture] = useState<THREE.CanvasTexture | null>(null);
  const liveRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = FRAME_W;
    canvas.height = FRAME_H;
    canvasRef.current = canvas;
    const ctx = canvas.getContext('2d');
    if (ctx) paintIdle(ctx, hasVideos);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    setScreenTexture(texture);
    liveRef.current = false;
    return () => {
      texture.dispose();
      canvasRef.current = null;
    };
  }, [hasVideos]);

  useFrame(({ clock, camera }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.lookAt(camera.position);
      groupRef.current.rotateY(Math.PI);
    }
    if (glowRef.current) {
      const material = glowRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.22 + Math.sin(t * 1.4) * 0.06;
    }
    if (scanRef.current) scanRef.current.position.y = Math.sin(t * 0.7) * 14;

    const canvas = canvasRef.current;
    const texture = screenTexture;
    const video = previewVideo;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !texture || !ctx) return;

    const canDraw = Boolean(
      video &&
      video.readyState >= 2 &&
      video.videoWidth > 0 &&
      !video.paused &&
      video.currentTime > 0.04
    );

    if (canDraw && video) {
      ctx.drawImage(video, 0, 0, FRAME_W, FRAME_H);
      liveRef.current = true;
      texture.needsUpdate = true;
    } else if (liveRef.current && !canDraw) {
      paintIdle(ctx, hasVideos);
      liveRef.current = false;
      texture.needsUpdate = true;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh
        onPointerOver={() => setIsHovered(true)}
        onPointerOut={() => setIsHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <planeGeometry args={[78, 44]} />
        {screenTexture ? (
          <meshBasicMaterial map={screenTexture} toneMapped={false} side={THREE.DoubleSide} />
        ) : (
          <meshBasicMaterial color="#071820" side={THREE.DoubleSide} />
        )}
      </mesh>

      <mesh position={[0, 0, -0.4]} raycast={() => {}}>
        <planeGeometry args={[86, 50]} />
        <meshBasicMaterial color={isHovered ? '#1a4a66' : '#0c2433'} />
      </mesh>

      <mesh position={[0, 0, 0.05]} raycast={() => {}}>
        <planeGeometry args={[78, 44]} />
        <meshBasicMaterial
          color="#4fd2ff"
          transparent
          opacity={isHovered ? 0.07 : 0.025}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {!liveRef.current && (
        <mesh ref={scanRef} position={[0, 0, 0.08]} raycast={() => {}}>
          <planeGeometry args={[76, 0.32]} />
          <meshBasicMaterial
            color="#7af0ff"
            transparent
            opacity={0.22}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}

      <mesh ref={glowRef} position={[0, 0, -0.6]} raycast={() => {}}>
        <planeGeometry args={[96, 58]} />
        <meshBasicMaterial
          color="#1a6a88"
          transparent
          opacity={0.22}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
});

HologramScreen.displayName = 'HologramScreen';

export default HologramScreen;
