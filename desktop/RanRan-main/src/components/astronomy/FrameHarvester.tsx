import { useEffect, useRef, memo } from 'react';
import { grabVideoFrame } from './grabVideoFrame';

interface FrameHarvesterProps {
  src: string;
  onFrame: (bitmap: ImageBitmap) => void;
}

const FrameHarvester: React.FC<FrameHarvesterProps> = ({ src, onFrame }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', 'true');

    let raf = 0;
    let lastGrab = 0;
    let stopped = false;

    const tick = (now: number) => {
      if (stopped) return;
      raf = requestAnimationFrame(tick);
      if (now - lastGrab < 120) return;
      lastGrab = now;
      void grabVideoFrame(video).then((bitmap) => {
        if (!stopped && bitmap) onFrame(bitmap);
      });
    };

    const kick = () => {
      void video.play().catch(() => {});
    };

    kick();
    video.addEventListener('playing', kick);
    video.addEventListener('canplay', kick);
    raf = requestAnimationFrame(tick);
    const playTimer = window.setInterval(kick, 600);

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      window.clearInterval(playTimer);
      video.removeEventListener('playing', kick);
      video.removeEventListener('canplay', kick);
      video.pause();
    };
  }, [src, onFrame]);

  return (
    <video
      ref={videoRef}
      src={src}
      muted
      loop
      playsInline
      autoPlay
      preload="auto"
      disablePictureInPicture
      className="hologram-harvester"
    />
  );
};

export default memo(FrameHarvester);
