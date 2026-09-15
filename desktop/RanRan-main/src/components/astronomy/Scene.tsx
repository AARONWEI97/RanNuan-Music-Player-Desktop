import { useMemo, useState, useCallback, useEffect, useRef, memo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import type { BloomEffect } from 'postprocessing';
import * as THREE from 'three';
import type { Photo } from '../../types';
import { getPerformanceConfig, type PerformanceConfig } from '../../utils/performance';
import { getBeatEnergy } from '../../services/beatEnergy';
import { REAL_STARS, CONSTELLATIONS, CONSTELLATION_POSITIONS, type ConstellationKey } from './constants';
import { createPlanetOrbit, usedBeltIndexes } from './kepler';
import Sun from './Sun';
import PhotoPlanet from './PhotoPlanet';
import OrbitRing from './OrbitRing';
import BackgroundStar from './BackgroundStar';
import SpiralGalaxy from './SpiralGalaxy';
import MilkyWayBand from './MilkyWayBand';
import SkyDecor from './SkyDecor';
import StarRiver from './StarRiver';
import TwinklingStars from './TwinklingStars';
import ShootingStars from './ShootingStars';
import SpaceDust from './SpaceDust';
import SunRays from './SunRays';
import BlackHole from './BlackHole';
import Pulsar from './Pulsar';
import SupernovaEvents from './SupernovaEvents';
import { ConstellationPattern, ConstellationTextureLoader } from './ConstellationPattern';
import AsteroidBelt from './AsteroidBelt';
import Nebula from './Nebula';
import DistantPlanetParticles from './DistantPlanetParticles';
import SpiralArmView from './SpiralArmView';
import { useUiStore } from '../../store/modules/uiStore';

export type ViewMode = 'solar' | 'spiral';

const MAX_FULL_RENDER_PLANETS = 30;
const VIRTUALIZE_DISTANCE = 160;
const BLOOM_BASE_INTENSITY = 1.72;

// Bloom 强度随节拍能量呼吸：ref 直改 effect，不走 React 重渲染
const BeatBloom: React.FC = () => {
  const bloomRef = useRef<BloomEffect | null>(null);
  useFrame(() => {
    if (bloomRef.current) {
      bloomRef.current.intensity = BLOOM_BASE_INTENSITY + getBeatEnergy() * 0.5;
    }
  });
  return <Bloom ref={bloomRef} intensity={BLOOM_BASE_INTENSITY} luminanceThreshold={0.14} luminanceSmoothing={0.78} />;
};

interface SceneProps {
  photos: Photo[];
  selectedPhotoId: string | null;
  onPhotoSelect: (id: string) => void;
  isDark: boolean;
  selectedConstellation: ConstellationKey | null;
  constellationPhotos: Record<ConstellationKey, Photo | null>;
  viewMode?: ViewMode;
  cinemaOpen?: boolean;
}

const Scene: React.FC<SceneProps> = memo(({
  photos,
  selectedPhotoId,
  onPhotoSelect,
  isDark,
  selectedConstellation,
  constellationPhotos,
  viewMode = 'solar',
  cinemaOpen = false,
}) => {
  const { camera } = useThree();
  const settings = useUiStore((s) => s.settings);
  const [constellationTextures, setConstellationTextures] = useState<Record<ConstellationKey, THREE.Texture | null>>({} as Record<ConstellationKey, THREE.Texture | null>);
  const [visiblePhotoIds, setVisiblePhotoIds] = useState<Set<string>>(new Set(photos.map((p) => p.id)));

  const [perfRevision, setPerfRevision] = useState(0);
  useEffect(() => {
    const onChange = () => setPerfRevision((v) => v + 1);
    window.addEventListener('ranran-performance-change', onChange);
    return () => window.removeEventListener('ranran-performance-change', onChange);
  }, []);
  // perfRevision 是「性能档位变更」事件触发的重算信号，必须在回调里引用它才算合法依赖
  const perfConfig: PerformanceConfig = useMemo(() => {
    void perfRevision;
    return getPerformanceConfig();
  }, [perfRevision]);
  const shouldVirtualize = photos.length > MAX_FULL_RENDER_PLANETS;

  useEffect(() => {
    camera.position.set(0, 28, 78);
    camera.lookAt(0, 6, -20);
  }, [camera]);

  useFrame(() => {
    if (!shouldVirtualize) return;

    const camPos = camera.position;
    const next = new Set<string>();

    photos.forEach((photo, index) => {
      const orbit = createPlanetOrbit(index, photos.length);
      const distance = Math.sqrt(camPos.x ** 2 + camPos.z ** 2 + (camPos.y * 0.4) ** 2);
      if (Math.abs(distance - orbit.a) < VIRTUALIZE_DISTANCE || selectedPhotoId === photo.id) {
        next.add(photo.id);
      }
    });

    if (next.size !== visiblePhotoIds.size || [...next].some((id) => !visiblePhotoIds.has(id))) {
      setVisiblePhotoIds(next);
    }
  });

  const renderedPhotos = shouldVirtualize
    ? photos.filter((photo) => visiblePhotoIds.has(photo.id) || selectedPhotoId === photo.id)
    : photos;

  const handleTextureLoad = useCallback((key: ConstellationKey, texture: THREE.Texture | null) => {
    setConstellationTextures((prev) => ({
      ...prev,
      [key]: texture,
    }));
  }, []);

  const beltIndexes = useMemo(() => usedBeltIndexes(photos.length), [photos.length]);
  const intensity = Math.max(0, Math.min(2, settings.particleIntensity ?? 1));
  const starCount = Math.max(0, Math.round(perfConfig.starCount * intensity));
  const galaxyMultiplier = Math.max(0.05, perfConfig.galaxyParticleMultiplier * Math.max(0.2, intensity));
  const themeBg = settings.theme?.backgroundColor || (isDark ? '#010208' : '#070814');
  const orbitColor = settings.theme?.primaryColor;

  const distantPhotos = useMemo(() => {
    if (!shouldVirtualize) return [];
    return photos
      .filter((p) => !visiblePhotoIds.has(p.id))
      .map((p) => ({
        id: p.id,
        index: photos.indexOf(p),
        totalPhotos: photos.length,
      }));
  }, [photos, shouldVirtualize, visiblePhotoIds]);

  return (
    <>
      <color attach="background" args={[isDark ? themeBg : '#070814']} />

      <TwinklingStars count={starCount} radius={480} depth={90} isDark={isDark} />

      {perfConfig.meteorSlots > 0 && (
        <ShootingStars slots={perfConfig.meteorSlots} intensity={intensity} isDark={isDark} />
      )}

      {perfConfig.enableSpaceDust && intensity > 0 && (
        <SpaceDust count={Math.floor(260 * Math.min(1, intensity))} isDark={isDark} />
      )}

      <MilkyWayBand isDark={isDark} particleCount={Math.floor(starCount * 0.9)} />
      <SpiralGalaxy isDark={isDark} particleMultiplier={galaxyMultiplier} />
      <StarRiver isDark={isDark} density={Math.max(0.2, galaxyMultiplier)} />
      <SkyDecor isDark={isDark} />

      {REAL_STARS.map((star, index) => (
        <BackgroundStar key={star.name} star={star} index={index} />
      ))}

      {Object.entries(CONSTELLATIONS).map(([key, constellation]) => {
        const constKey = key as ConstellationKey;
        return (
          <ConstellationPattern
            key={key}
            constellation={constellation}
            position={CONSTELLATION_POSITIONS[constKey]}
            scale={1.5}
            visible={selectedConstellation === null || selectedConstellation === constKey}
            isDark={isDark}
            photoTexture={constellationTextures[constKey] || undefined}
          />
        );
      })}

      {(Object.keys(CONSTELLATIONS) as ConstellationKey[]).map((constKey) => (
        <ConstellationTextureLoader
          key={`loader-${constKey}`}
          constellationKey={constKey}
          photo={constellationPhotos[constKey] || null}
          onTextureLoad={handleTextureLoad}
        />
      ))}

      <ambientLight intensity={isDark ? 0.12 : 0.18} />
      <hemisphereLight args={['#9eb7ff', '#24180e', isDark ? 0.22 : 0.32]} />

      <Sun />

      {perfConfig.enableSunRays && intensity > 0 && (
        <SunRays isDark={isDark} />
      )}

      {perfConfig.enableBlackHole && <BlackHole />}

      {perfConfig.enablePulsar && <Pulsar />}

      {perfConfig.supernovaSlots > 0 && (
        <SupernovaEvents slots={perfConfig.supernovaSlots} isDark={isDark} />
      )}

      {perfConfig.enableNebula && intensity > 0 && (
        <>
          <Nebula position={[-48, 36, -92]} color1={settings.theme?.secondaryColor || '#ff5a9a'} color2="#5a3aff" size={58} isDark={isDark} />
          <Nebula position={[62, 22, -86]} color1={settings.theme?.primaryColor || '#3ab8ff'} color2="#2affb0" size={48} isDark={isDark} />
          <Nebula position={[8, 42, -118]} color1="#ffb347" color2={settings.theme?.particleColor || '#c86bff'} size={64} isDark={isDark} />
          <Nebula position={[-90, 8, -70]} color1="#6a8cff" color2="#ff5a3a" size={40} isDark={isDark} />
        </>
      )}

      {viewMode === 'solar' && (
        <>
          {perfConfig.enableAsteroids && (
            <AsteroidBelt innerRadius={35} outerRadius={39} count={220} isDark={isDark} />
          )}

          {settings.showGrid && beltIndexes.map((beltIndex) => (
            <OrbitRing key={beltIndex} beltIndex={beltIndex} isDark={isDark} color={orbitColor} />
          ))}

          {renderedPhotos.map((photo) => {
            const index = photos.indexOf(photo);
            return (
              <PhotoPlanet
                key={photo.id}
                photo={photo}
                index={index}
                totalPhotos={photos.length}
                isSelected={selectedPhotoId === photo.id}
                onSelect={() => onPhotoSelect(photo.id)}
                isDark={isDark}
              />
            );
          })}

          {shouldVirtualize && distantPhotos.length > 0 && (
            <DistantPlanetParticles
              photos={distantPhotos}
              onPhotoClick={onPhotoSelect}
              isDark={isDark}
            />
          )}
        </>
      )}

      {viewMode === 'spiral' && (
        <SpiralArmView
          photos={photos}
          selectedPhotoId={selectedPhotoId}
          onPhotoSelect={onPhotoSelect}
          isDark={isDark}
        />
      )}

      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        autoRotate={settings.autoRotate}
        autoRotateSpeed={0.28}
        enableDamping
        dampingFactor={0.08}
        minDistance={18}
        maxDistance={340}
        maxPolarAngle={Math.PI * 0.78}
        minPolarAngle={Math.PI * 0.12}
        target={[0, 4, -8]}
      />

      {perfConfig.enablePostProcessing && !cinemaOpen && (
        <EffectComposer>
          <BeatBloom />
          <Vignette darkness={0.38} offset={0.26} />
        </EffectComposer>
      )}
    </>
  );
});

Scene.displayName = 'Scene';

export default Scene;
