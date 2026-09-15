import { useEffect, useRef, useState, memo } from 'react';

interface HologramCoverProps {
  sources: string[];
  onExpand: () => void;
}

const HologramCover: React.FC<HologramCoverProps> = ({ sources, onExpand }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [index, setIndex] = useState(0);
  const src = sources[index] || '';
  const playlist = sources.length > 1;

  useEffect(() => {
    if (index >= sources.length) setIndex(0);
  }, [index, sources.length]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    video.loop = !playlist;
    video.playsInline = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', 'true');

    const kick = () => {
      video.muted = true;
      video.volume = 0;
      video.loop = !playlist;
      const play = video.play();
      if (play) void play.catch(() => {});
    };

    const onEnded = () => {
      if (playlist) {
        setIndex((prev) => (prev + 1) % sources.length);
        return;
      }
      video.currentTime = 0;
      kick();
    };

    kick();
    video.addEventListener('loadeddata', kick);
    video.addEventListener('canplay', kick);
    video.addEventListener('playing', kick);
    video.addEventListener('ended', onEnded);
    const timer = window.setInterval(() => {
      if (video.ended && playlist) return;
      if (video.paused) kick();
    }, 800);

    return () => {
      video.removeEventListener('loadeddata', kick);
      video.removeEventListener('canplay', kick);
      video.removeEventListener('playing', kick);
      video.removeEventListener('ended', onEnded);
      window.clearInterval(timer);
    };
  }, [src, playlist, sources.length]);

  return (
    <div className="hologram-stage">
      <div className="hologram-bezel">
        <span className="hologram-corner hologram-corner-tl" />
        <span className="hologram-corner hologram-corner-tr" />
        <span className="hologram-corner hologram-corner-bl" />
        <span className="hologram-corner hologram-corner-br" />
        <div className="hologram-topbar">
          <span className="hologram-live">
            <i />
            LIVE
          </span>
          <span className="hologram-title">全息影院</span>
          <span className="hologram-enter-row">
            {playlist ? (
              <span className="hologram-count">
                {index + 1}/{sources.length}
              </span>
            ) : null}
            <button type="button" className="hologram-enter" onClick={onExpand}>
              全屏
            </button>
          </span>
        </div>
        <div className="hologram-screen">
          {src ? (
            <video
              key={src}
              ref={videoRef}
              src={src}
              muted
              loop={!playlist}
              playsInline
              autoPlay
              preload="auto"
              disablePictureInPicture
              controls={false}
              onClick={onExpand}
            />
          ) : (
            <button type="button" className="hologram-idle" onClick={onExpand}>
              <span className="hologram-idle-title">全息影院</span>
              <span className="hologram-idle-hint">点底部「片库」上传 H.264 MP4</span>
            </button>
          )}
          <span className="hologram-scan" />
          <span className="hologram-grid" />
        </div>
      </div>
    </div>
  );
};

export default memo(HologramCover);
