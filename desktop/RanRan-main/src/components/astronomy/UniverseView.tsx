import { useState, useEffect, useCallback, useRef, Suspense, Component, type ReactNode } from 'react';
import { Gauge, Images, Orbit, Moon, Sun as SunIcon, Video, Music } from 'lucide-react';
import { toggleHostPlayback, useUniverseHostStore } from '../../bridge/universeHost';
import { Canvas } from '@react-three/fiber';
import localforage from 'localforage';
import type { Photo } from '../../types';
import { dbService } from '../../services/database';
import { getPerformanceConfig, getStoredPerformanceTier, type PerformanceTier } from '../../utils/performance';
import { type ConstellationKey } from './constants';
import { useUiStore } from '../../store/modules/uiStore';
import UniverseIntro from './UniverseIntro';
import HologramCinema from './HologramCinema';
import HologramCover from './HologramCover';
import VideoManager from './VideoManager';
import Scene, { type ViewMode } from './Scene';
import ConstellationSelector from './ConstellationSelector';
import LyricMeteors from './LyricMeteors';

class StarfieldBoundary extends Component<{ children: ReactNode; resetKey: number }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidUpdate(prev: { resetKey: number }) {
    if (prev.resetKey !== this.props.resetKey && this.state.failed) {
      this.setState({ failed: false });
    }
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#070910] px-6 text-center">
        <div>
          <p className="text-sm text-white/85">这台电脑没有创建出星空画面</p>
          <p className="mt-1 text-xs text-white/45">开场不走显卡，星空画布失败后就会是黑屏</p>
          <button
            type="button"
            className="mt-4 rounded-full border border-white/20 px-4 py-1.5 text-xs text-white/80"
            onClick={() => this.setState({ failed: false })}
          >
            重试
          </button>
        </div>
      </div>
    );
  }
}

interface UniverseViewProps {
  photos: Photo[];
  onPhotoClick?: (photoId: string) => void;
}

const UniverseView: React.FC<UniverseViewProps> = ({ photos, onPhotoClick }) => {
  const settings = useUiStore((s) => s.settings);
  const updateSettings = useUiStore((s) => s.updateSettings);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(() => settings.universeDark !== false);
  const [selectedConstellation, setSelectedConstellation] = useState<ConstellationKey | null>(null);
  const [constellationPhotos, setConstellationPhotos] = useState<Record<ConstellationKey, Photo | null>>({} as Record<ConstellationKey, Photo | null>);
  const hostSong = useUniverseHostStore((s) => s.snapshot.song);
  const hostPlaying = useUniverseHostStore((s) => s.snapshot.isPlay);
  const [showIntro, setShowIntro] = useState(() => !settings.skipIntro);
  const [isUniverseReady, setIsUniverseReady] = useState(() => Boolean(settings.skipIntro));
  const [hostReady, setHostReady] = useState(false);
  const [glFailed, setGlFailed] = useState(false);
  const [glKey, setGlKey] = useState(0);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const applySkip = () => {
      if (useUiStore.getState().settings.skipIntro) {
        setShowIntro(false);
        setIsUniverseReady(true);
      }
    };
    applySkip();
    return useUiStore.persist.onFinishHydration(applySkip);
  }, []);
  const [showCinema, setShowCinema] = useState(false);
  const [showVideoManager, setShowVideoManager] = useState(false);
  const [videoList, setVideoList] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('solar');
  const [performanceTier, setPerformanceTier] = useState<PerformanceTier | 'auto'>(() => getStoredPerformanceTier());
  const performance = getPerformanceConfig(performanceTier === 'auto' ? undefined : performanceTier);
  const objectUrlsRef = useRef<string[]>([]);

  const pauseScene = showCinema || showVideoManager;
  const previewSrc = videoList[0] || '';

  useEffect(() => {
    setIsDark(settings.universeDark !== false);
  }, [settings.universeDark]);

  useEffect(() => {
    const onPerformanceChange = (event: Event) => {
      const tier = (event as CustomEvent<PerformanceTier | 'auto'>).detail;
      setPerformanceTier(tier || 'auto');
    };
    window.addEventListener('ranran-performance-change', onPerformanceChange);
    return () => {
      window.removeEventListener('ranran-performance-change', onPerformanceChange);
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current = [];
    };
  }, []);

  const bindVideos = useCallback((urls: string[]) => {
    objectUrlsRef.current.forEach((url) => {
      if (!urls.includes(url)) URL.revokeObjectURL(url);
    });
    objectUrlsRef.current = urls;
    setVideoList(urls);
  }, []);

  useEffect(() => {
    const loadSavedVideos = async () => {
      try {
        const videos = await dbService.getAllCinemaVideos();
        if (videos.length > 0) {
          const sortedVideos = videos.sort((a, b) => b.createdAt - a.createdAt);
          const urls = sortedVideos.map((v) => {
            const blob = v.data?.type?.startsWith('video/')
              ? v.data
              : new Blob([v.data], { type: 'video/mp4' });
            return URL.createObjectURL(blob);
          });
          bindVideos(urls);
        }
      } catch (error) {
        console.error('Failed to load saved videos:', error);
      }
    };
    void loadSavedVideos();
  }, [bindVideos]);

  useEffect(() => {
    const loadCachedBackgrounds = async () => {
      try {
        const cachedBackgrounds = await dbService.getAllConstellationBackgrounds();
        const loadedPhotos: Record<ConstellationKey, Photo | null> = {} as Record<ConstellationKey, Photo | null>;

        for (const bg of cachedBackgrounds) {
          const matchingPhoto = photos.find((p) => p.id === bg.photoId);
          if (matchingPhoto) {
            loadedPhotos[bg.constellationKey as ConstellationKey] = matchingPhoto;
          } else {
            const url = URL.createObjectURL(bg.photoData);
            const virtualPhoto: Photo = {
              id: bg.photoId,
              url,
              thumbnail: bg.thumbnail,
              name: `Cached Background`,
              tags: [],
              albumId: '',
              createdAt: bg.createdAt,
            };
            loadedPhotos[bg.constellationKey as ConstellationKey] = virtualPhoto;
          }
        }

        setConstellationPhotos((prev) => ({ ...prev, ...loadedPhotos }));
      } catch (error) {
        console.error('Failed to load cached backgrounds:', error);
      }
    };

    void loadCachedBackgrounds();
  }, [photos]);

  const handlePhotoSelect = useCallback((id: string) => {
    setSelectedPhotoId(id);
    onPhotoClick?.(id);
  }, [onPhotoClick]);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      updateSettings({ universeDark: next });
      return next;
    });
  }, [updateSettings]);

  const handleConstellationSelect = useCallback((key: ConstellationKey | null) => {
    setSelectedConstellation(key);
  }, []);

  const handleConstellationPhotoSelect = useCallback(async (constellationKey: ConstellationKey, photo: Photo | null) => {
    setConstellationPhotos((prev) => ({
      ...prev,
      [constellationKey]: photo,
    }));

    if (photo) {
      try {
        let photoBlob: Blob;

        if (photo.url && photo.url.startsWith('data:')) {
          const response = await fetch(photo.url);
          photoBlob = await response.blob();
        } else if (photo.url && photo.url.startsWith('blob:')) {
          const response = await fetch(photo.url);
          photoBlob = await response.blob();
        } else {
          const storedUrl = await localforage.getItem<string>(photo.id);
          if (storedUrl) {
            const response = await fetch(storedUrl);
            photoBlob = await response.blob();
          } else {
            return;
          }
        }

        await dbService.saveConstellationBackground(
          constellationKey,
          photo.id,
          photoBlob,
          photo.thumbnail
        );
      } catch (error) {
        console.error('Failed to save constellation background:', error);
      }
    } else {
      try {
        await dbService.deleteConstellationBackground(constellationKey);
      } catch (error) {
        console.error('Failed to delete constellation background:', error);
      }
    }
  }, []);

  const handleIntroComplete = useCallback(() => {
    setShowIntro(false);
    setIsUniverseReady(true);
  }, []);

  useEffect(() => {
    if (showIntro) {
      setHostReady(false);
      return;
    }
    const node = hostRef.current;
    if (!node) return;
    let raf = 0;
    const wait = () => {
      if (node.clientWidth > 0 && node.clientHeight > 0) {
        setHostReady(true);
        return;
      }
      raf = requestAnimationFrame(wait);
    };
    raf = requestAnimationFrame(wait);
    return () => cancelAnimationFrame(raf);
  }, [showIntro]);

  return (
    <div ref={hostRef} className="relative h-full w-full">
      {showIntro && <UniverseIntro onComplete={handleIntroComplete} />}

      {/* 画布必须在已经可见、没有 opacity/transform 的盒子里创建。藏着创建时，除这台笔记本外 WebView2 会一直黑。 */}
      <div className="absolute inset-0 z-[1]">
        {!pauseScene && !showIntro && hostReady && !glFailed && (
        <StarfieldBoundary resetKey={glKey}>
        <Canvas
          key={glKey}
          camera={{ fov: 52, near: 0.1, far: 1400 }}
          dpr={[1, previewSrc ? 1 : performance.maxDpr]}
          gl={{
            antialias: false,
            alpha: false,
            powerPreference: 'default',
            failIfMajorPerformanceCaveat: false,
            preserveDrawingBuffer: true,
            stencil: true,
          }}
          onCreated={({ gl }) => {
            const lost = (event: Event) => {
              event.preventDefault();
              setGlFailed(true);
            };
            gl.domElement.addEventListener('webglcontextlost', lost);
          }}
          style={{ position: 'absolute', inset: 0, zIndex: 1 }}
        >
          <Suspense fallback={null}>
            <Scene
              photos={photos}
              selectedPhotoId={selectedPhotoId}
              onPhotoSelect={handlePhotoSelect}
              isDark={isDark}
              selectedConstellation={selectedConstellation}
              constellationPhotos={constellationPhotos}
              viewMode={viewMode}
              cinemaOpen={Boolean(previewSrc)}
            />
          </Suspense>
        </Canvas>
        </StarfieldBoundary>
        )}

        {glFailed && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#070910] px-6 text-center">
            <div>
              <p className="text-sm text-white/85">星空画面中断了</p>
              <button
                type="button"
                className="mt-4 rounded-full border border-white/20 px-4 py-1.5 text-xs text-white/80"
                onClick={() => {
                  setGlFailed(false);
                  setGlKey((key) => key + 1);
                }}
              >
                重试
              </button>
            </div>
          </div>
        )}

        {!pauseScene && <div className="pointer-events-none absolute right-3 top-3 z-30">
          <div className="rounded-xl border border-white/10 bg-black/40 px-2.5 py-1.5 text-[11px] text-white/70 shadow-lg backdrop-blur-md">
            <div className="flex items-center gap-2">
              <Images size={12} className="text-cyan-300" />
              <span>{photos.length.toLocaleString()} 行星</span>
              <span className="text-white/20">·</span>
              <Orbit size={12} className="text-cyan-300" />
              <span>{viewMode === 'solar' ? '黄道面' : '螺旋臂'}</span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-white/40">
              <Gauge size={11} />
              <span>{performanceTier === 'auto' ? `自动 ${performance.tier}` : performanceTier}</span>
            </div>
          </div>
        </div>}

        {!pauseScene && <div className="absolute bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/10 bg-black/45 p-1 shadow-xl backdrop-blur-md">
          <button
            type="button"
            onClick={() => setViewMode((prev) => (prev === 'solar' ? 'spiral' : 'solar'))}
            className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs text-cyan-100/90 hover:bg-white/10"
          >
            {viewMode === 'solar' ? <Orbit size={13} /> : <SunIcon size={13} />}
            {viewMode === 'solar' ? '螺旋臂' : '太阳系'}
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs text-cyan-100/90 hover:bg-white/10"
          >
            {isDark ? <Moon size={13} /> : <SunIcon size={13} />}
            {isDark ? '深空' : '晨昏'}
          </button>
          <button
            type="button"
            onClick={() => setShowCinema(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs text-cyan-100/90 hover:bg-white/10"
          >
            <Video size={13} />
            影院
          </button>
          <button
            type="button"
            onClick={() => setShowVideoManager(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs text-cyan-100/90 hover:bg-white/10"
          >
            片库
          </button>
          {hostSong && (
            <button
              type="button"
              onClick={toggleHostPlayback}
              className="inline-flex h-8 max-w-[180px] items-center gap-1.5 rounded-full px-3 text-xs text-cyan-100/90 hover:bg-white/10"
              title={hostPlaying ? '暂停' : '播放'}
            >
              <Music size={13} className="shrink-0" />
              <span className="truncate">{hostPlaying ? '播放中' : '已暂停'} · {hostSong.name}</span>
            </button>
          )}
        </div>}

        {!pauseScene && settings.showLyricMeteors && <LyricMeteors />}

        {!pauseScene && (
        <ConstellationSelector
          selectedConstellation={selectedConstellation}
          onSelect={handleConstellationSelect}
          isDark={isDark}
          photos={photos}
          constellationPhotos={constellationPhotos}
          onSelectPhoto={handleConstellationPhotoSelect}
        />
        )}
      </div>

      {!pauseScene && !showIntro && isUniverseReady && (
        <HologramCover sources={videoList} onExpand={() => setShowCinema(true)} />
      )}

      <HologramCinema
        isOpen={showCinema}
        onClose={() => setShowCinema(false)}
        sources={videoList}
      />

      <VideoManager
        isOpen={showVideoManager}
        onClose={() => setShowVideoManager(false)}
        onSelectVideo={(url) => {
          const next = videoList.includes(url) ? videoList : [url, ...videoList];
          bindVideos(next);
        }}
        onSelectMultipleVideos={(urls) => {
          bindVideos(urls);
        }}
      />
    </div>
  );
};

export default UniverseView;
