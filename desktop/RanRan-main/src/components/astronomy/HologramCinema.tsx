import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, SkipBack, SkipForward, X } from 'lucide-react';
import { grabVideoFrame } from './grabVideoFrame';

interface HologramCinemaProps {
  isOpen: boolean;
  onClose: () => void;
  sources: string[];
  onCaptureFrame?: (bitmap: ImageBitmap) => void;
}

function formatTime(time: number) {
  if (!Number.isFinite(time) || time < 0) return '0:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const HologramCinema: React.FC<HologramCinemaProps> = ({ isOpen, onClose, sources, onCaptureFrame }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCapture = useRef(0);
  const src = sources[index] || '';

  useEffect(() => {
    if (!isOpen) {
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setError(null);
      setIndex(0);
      setIsFullscreen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const video = videoRef.current;
    if (!video) return;

    const onTime = () => {
      setCurrentTime(video.currentTime || 0);
      if (!onCaptureFrame) return;
      const now = performance.now();
      if (now - lastCapture.current < 140) return;
      lastCapture.current = now;
      void grabVideoFrame(video).then((bitmap) => {
        if (bitmap) onCaptureFrame(bitmap);
      });
    };
    const onMeta = () => {
      if (Number.isFinite(video.duration)) setDuration(video.duration);
    };
    const onPlay = () => {
      setIsPlaying(true);
      setError(null);
    };
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => {
      // WebView2 在非全屏时偶尔会假死在 waiting；踢一下解码器
      if (video.readyState >= 2 && video.paused === false) {
        const t = video.currentTime;
        video.currentTime = t + 0.001;
      }
    };
    const onError = () => setError('这段影像无法解码。请用 H.264 的 MP4 再试。');
    const onEnded = () => {
      if (sources.length > 1) {
        setIndex((prev) => (prev + 1) % sources.length);
      } else {
        video.currentTime = 0;
        void video.play().catch(() => setIsPlaying(false));
      }
    };
    const onFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));

    video.addEventListener('timeupdate', onTime);
    video.addEventListener('loadedmetadata', onMeta);
    video.addEventListener('durationchange', onMeta);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('error', onError);
    video.addEventListener('ended', onEnded);
    document.addEventListener('fullscreenchange', onFullscreen);

    video.loop = sources.length <= 1;
    video.muted = isMuted;
    video.volume = isMuted ? 0 : volume;

    const tryPlay = async () => {
      try {
        await video.play();
        setIsPlaying(true);
        setError(null);
      } catch {
        try {
          video.muted = true;
          setIsMuted(true);
          await video.play();
          setIsPlaying(true);
          setError(null);
        } catch {
          setIsPlaying(false);
          setError('点播放键开始。若仍卡住，换一段 H.264 MP4。');
        }
      }
    };
    void tryPlay();

    return () => {
      video.pause();
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('loadedmetadata', onMeta);
      video.removeEventListener('durationchange', onMeta);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('error', onError);
      video.removeEventListener('ended', onEnded);
      document.removeEventListener('fullscreenchange', onFullscreen);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, src, sources.length]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = isMuted;
    video.volume = isMuted ? 0 : volume;
  }, [isMuted, volume]);

  const playFromClick = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !src) return;
    setError(null);
    try {
      video.muted = isMuted;
      video.volume = isMuted ? 0 : volume;
      await video.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
      setError('点播放键开始。若仍卡住，换一段 H.264 MP4。');
    }
  }, [src, isMuted, volume]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void playFromClick();
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [playFromClick]);

  const revealControls = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setShowControls(false);
    }, 2600);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const node = rootRef.current;
    if (!node) return;
    if (!document.fullscreenElement) void node.requestFullscreen?.();
    else void document.exitFullscreen?.();
  }, []);

  if (!isOpen) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={rootRef}
      className="absolute inset-0 z-[80] bg-black"
      onMouseMove={revealControls}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-5 top-5 z-20 grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-black/60 text-white hover:bg-white/10"
        aria-label="关闭影院"
      >
        <X size={18} />
      </button>

      <div className="flex h-full w-full items-center justify-center bg-black">
        {src ? (
          <video
            key={src}
            ref={videoRef}
            src={src}
            playsInline
            loop={sources.length <= 1}
            autoPlay
            preload="auto"
            controls={false}
            disablePictureInPicture
            className="max-h-full max-w-full bg-black"
            style={{ transform: 'none', filter: 'none' }}
            onClick={togglePlay}
          />
        ) : (
          <div className="text-sm text-white/70">还没有影像。先点底部「片库」上传一段 H.264 MP4。</div>
        )}
      </div>

      {error && (
        <div className="absolute inset-x-0 top-16 mx-auto max-w-md rounded-lg border border-amber-300/30 bg-black/70 px-3 py-2 text-center text-xs text-amber-100">
          {error}
        </div>
      )}

      {src && !isPlaying && (
        <button
          type="button"
          onClick={togglePlay}
          className="absolute inset-0 z-10 grid place-items-center bg-black/20"
          aria-label="播放"
        >
          <span className="grid h-20 w-20 place-items-center rounded-full border border-white/50 bg-black/50 text-white">
            <Play size={34} className="ml-1" />
          </span>
        </button>
      )}

      {showControls && src && (
        <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black via-black/70 to-transparent p-5">
          <div className="relative mb-3 h-1.5 overflow-hidden rounded-full bg-white/15">
            <div className="absolute inset-y-0 left-0 bg-sky-400" style={{ width: `${progress}%` }} />
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={(e) => {
                const video = videoRef.current;
                if (!video) return;
                const next = parseFloat(e.target.value);
                video.currentTime = next;
                setCurrentTime(next);
              }}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </div>
          <div className="mb-2 flex justify-between font-mono text-[11px] text-white/70">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button type="button" className="rounded-lg bg-white/10 p-2 text-white" onClick={() => setIndex((i) => (i - 1 + Math.max(sources.length, 1)) % Math.max(sources.length, 1))} aria-label="上一段">
                <SkipBack size={16} />
              </button>
              <button type="button" className="rounded-full bg-white/15 p-2.5 text-white" onClick={togglePlay} aria-label={isPlaying ? '暂停' : '播放'}>
                {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
              </button>
              <button type="button" className="rounded-lg bg-white/10 p-2 text-white" onClick={() => setIndex((i) => (i + 1) % Math.max(sources.length, 1))} aria-label="下一段">
                <SkipForward size={16} />
              </button>
              {sources.length > 1 && <span className="text-[11px] text-white/50">{index + 1}/{sources.length}</span>}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className="rounded-lg bg-white/10 p-2 text-white" onClick={() => setIsMuted((v) => !v)} aria-label="静音">
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const next = parseFloat(e.target.value);
                  setVolume(next);
                  setIsMuted(next === 0);
                }}
                className="h-1 w-24 cursor-pointer appearance-none rounded-full bg-white/20"
              />
              <button type="button" className="rounded-lg bg-white/10 p-2 text-white" onClick={toggleFullscreen} aria-label="全屏">
                {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(HologramCinema);
