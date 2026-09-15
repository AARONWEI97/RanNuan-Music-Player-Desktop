import { useMemo, useRef, useState, useEffect, memo, type MutableRefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/** Same sky band as 射手座 / 天蝎座, not a HUD overlay. */
const POSITION: [number, number, number] = [0, 38, -86];
const SIZE: [number, number] = [42, 23.6];

interface HologramSlotProps {
  onClick: () => void;
  hasVideos: boolean;
  coverElRef: MutableRefObject<HTMLDivElement | null>;
}

function makeIdleTexture(hasVideos: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 540;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#071820';
    ctx.fillRect(0, 0, 960, 540);
    const gradient = ctx.createRadialGradient(480, 270, 40, 480, 270, 420);
    gradient.addColorStop(0, 'rgba(50, 160, 200, 0.45)');
    gradient.addColorStop(1, 'rgba(7, 24, 32, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 960, 540);
    ctx.strokeStyle = 'rgba(103, 232, 255, 0.55)';
    ctx.lineWidth = 6;
    ctx.strokeRect(24, 24, 912, 492);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(210, 248, 255, 0.95)';
    ctx.font = '600 58px Rajdhani, sans-serif';
    ctx.fillText('全息影院', 480, 250);
    ctx.font = '400 28px Rajdhani, sans-serif';
    ctx.fillStyle = 'rgba(180, 244, 255, 0.72)';
    ctx.fillText(hasVideos ? 'COVER LOOP · 点击进入' : '点底部「片库」上传 H.264 MP4', 480, 310);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

const _v = new THREE.Vector3();

const HologramSlot: React.FC<HologramSlotProps> = ({ onClick, hasVideos, coverElRef }) => {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const { camera, size } = useThree();
  const [hovered, setHovered] = useState(false);
  const idleMap = useMemo(() => makeIdleTexture(hasVideos), [hasVideos]);
  const frameGeo = useMemo(
    () => new THREE.PlaneGeometry(SIZE[0], SIZE[1]),
    []
  );

  useEffect(() => {
    return () => {
      idleMap.dispose();
      frameGeo.dispose();
    };
  }, [idleMap, frameGeo]);

  const hw = SIZE[0] / 2;
  const hh = SIZE[1] / 2;

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) return;

    group.lookAt(camera.position);
    group.rotateY(Math.PI);
    group.updateWorldMatrix(true, false);

    if (glowRef.current) {
      const material = glowRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.2 + Math.sin(clock.getElapsedTime() * 1.4) * 0.05;
    }

    const el = coverElRef.current;
    if (!el) return;

    const matrix = group.matrixWorld;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let behind = false;
    const corners: Array<[number, number]> = [
      [-hw, hh],
      [hw, hh],
      [hw, -hh],
      [-hw, -hh],
    ];
    for (const [x, y] of corners) {
      _v.set(x, y, 0).applyMatrix4(matrix).project(camera);
      if (_v.z > 1) behind = true;
      minX = Math.min(minX, _v.x);
      maxX = Math.max(maxX, _v.x);
      minY = Math.min(minY, _v.y);
      maxY = Math.max(maxY, _v.y);
    }

    const left = (minX * 0.5 + 0.5) * size.width;
    const top = (-maxY * 0.5 + 0.5) * size.height;
    const width = ((maxX - minX) * 0.5) * size.width;
    const height = ((maxY - minY) * 0.5) * size.height;
    const onScreen =
      !behind &&
      width > 10 &&
      height > 10 &&
      left < size.width &&
      top < size.height &&
      left + width > 0 &&
      top + height > 0;

    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    el.style.width = `${Math.max(width, 0)}px`;
    el.style.height = `${Math.max(height, 0)}px`;
    el.style.opacity = onScreen ? '1' : '0';
  });

  return (
    <group ref={groupRef} position={POSITION}>
      <mesh
        geometry={frameGeo}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={(event) => {
          event.stopPropagation();
          onClick();
        }}
      >
        {hasVideos ? (
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        ) : (
          <meshBasicMaterial map={idleMap} toneMapped={false} side={THREE.DoubleSide} />
        )}
      </mesh>

      <mesh position={[0, 0, -0.32]} raycast={() => {}}>
        <planeGeometry args={[SIZE[0] + 2.2, SIZE[1] + 2.2]} />
        <meshBasicMaterial color={hovered ? '#1a4a66' : '#0c2433'} />
      </mesh>

      <lineSegments raycast={() => {}}>
        <edgesGeometry args={[frameGeo]} />
        <lineBasicMaterial color={hovered ? '#c4f6ff' : '#7af0ff'} transparent opacity={0.85} />
      </lineSegments>

      <mesh ref={glowRef} position={[0, 0, -0.55]} raycast={() => {}}>
        <planeGeometry args={[SIZE[0] + 10, SIZE[1] + 8]} />
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
};

HologramSlot.displayName = 'HologramSlot';

export default memo(HologramSlot);
