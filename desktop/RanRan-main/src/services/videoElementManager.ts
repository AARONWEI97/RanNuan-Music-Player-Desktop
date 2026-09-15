function isBlobSrc(src: string): boolean {
  return src.startsWith('blob:') || src.startsWith('data:');
}

function applyOffscreenStyle(video: HTMLVideoElement) {
  video.className = '';
  video.controls = false;
  video.style.cssText = [
    'position:fixed',
    'left:0',
    'top:0',
    'width:48px',
    'height:27px',
    'opacity:0.02',
    'pointer-events:none',
    'z-index:-1',
    'object-fit:contain',
    'background:#000',
  ].join(';');
}

function applyCinemaStyle(video: HTMLVideoElement) {
  video.className = 'h-full w-full object-contain';
  video.controls = false;
  video.style.cssText = [
    'position:relative',
    'inset:auto',
    'width:100%',
    'height:100%',
    'opacity:1',
    'pointer-events:auto',
    'z-index:1',
    'object-fit:contain',
    'background:#000',
    'filter:drop-shadow(0 0 10px rgba(0,255,255,0.2))',
  ].join(';');
}

class VideoElementManager {
  private static instance: VideoElementManager;
  private videoElement: HTMLVideoElement | null = null;
  private attached = false;
  private playlist: string[] = [];
  private playlistIndex = 0;
  private recoverTimer: number | null = null;

  private constructor() {}

  static getInstance(): VideoElementManager {
    if (!VideoElementManager.instance) {
      VideoElementManager.instance = new VideoElementManager();
    }
    return VideoElementManager.instance;
  }

  getVideo(): HTMLVideoElement | null {
    return this.videoElement;
  }

  getPlaylist(): string[] {
    return this.playlist;
  }

  getPlaylistIndex(): number {
    return this.playlistIndex;
  }

  createVideo(src?: string, playlist?: string[]): HTMLVideoElement {
    if (this.videoElement) {
      this.destroyVideo();
    }

    const video = document.createElement('video');
    video.id = 'hologram-cinema-video';
    video.loop = !playlist || playlist.length <= 1;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.preload = 'auto';
    video.volume = 0;
    video.disablePictureInPicture = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('muted', '');
    video.setAttribute('autoplay', '');
    video.setAttribute('preload', 'auto');

    if (src && !isBlobSrc(src)) {
      video.crossOrigin = 'anonymous';
    }

    applyOffscreenStyle(video);
    document.body.appendChild(video);

    this.videoElement = video;
    this.playlist = playlist?.length ? [...playlist] : src ? [src] : [];
    this.playlistIndex = 0;

    if (this.playlist[0]) {
      video.src = this.playlist[0];
      video.load();
    }

    video.addEventListener('ended', this.handleEnded);
    video.addEventListener('waiting', this.handleWaiting);
    video.addEventListener('stalled', this.handleWaiting);
    video.addEventListener('canplay', this.handleCanPlay);
    video.addEventListener('canplaythrough', this.handleCanPlay);

    return video;
  }

  setPlaylist(urls: string[], startIndex = 0): HTMLVideoElement | null {
    this.playlist = urls.filter(Boolean);
    this.playlistIndex = Math.min(Math.max(startIndex, 0), Math.max(this.playlist.length - 1, 0));
    if (!this.videoElement) {
      if (this.playlist.length === 0) return null;
      return this.createVideo(this.playlist[this.playlistIndex], this.playlist);
    }
    this.videoElement.loop = this.playlist.length <= 1;
    const next = this.playlist[this.playlistIndex];
    if (next) this.updateSrc(next);
    return this.videoElement;
  }

  updateSrc(src: string): HTMLVideoElement | null {
    if (!this.videoElement) {
      this.createVideo(src);
      return this.videoElement;
    }

    if (isBlobSrc(src)) {
      this.videoElement.removeAttribute('crossorigin');
    } else {
      this.videoElement.crossOrigin = 'anonymous';
    }

    if (this.videoElement.src !== src) {
      this.videoElement.src = src;
      this.videoElement.load();
    }
    return this.videoElement;
  }

  playAt(index: number): void {
    if (this.playlist.length === 0) return;
    const next = (index + this.playlist.length) % this.playlist.length;
    this.playlistIndex = next;
    const src = this.playlist[next];
    if (src) this.updateSrc(src);
    void this.play();
  }

  playNext(): void {
    this.playAt(this.playlistIndex + 1);
  }

  playPrev(): void {
    this.playAt(this.playlistIndex - 1);
  }

  async play(): Promise<boolean> {
    if (!this.videoElement) return false;
    try {
      this.videoElement.defaultMuted = this.videoElement.muted;
      if (this.videoElement.paused || this.videoElement.ended) {
        await this.videoElement.play();
      }
      return true;
    } catch {
      return false;
    }
  }

  pause(): void {
    this.videoElement?.pause();
  }

  attachTo(container: HTMLElement): HTMLVideoElement | null {
    if (!this.videoElement) return null;
    applyCinemaStyle(this.videoElement);
    container.appendChild(this.videoElement);
    this.attached = true;
    return this.videoElement;
  }

  detachToOffscreen(): void {
    if (!this.videoElement) return;
    this.videoElement.muted = true;
    this.videoElement.defaultMuted = true;
    this.videoElement.volume = 0;
    this.videoElement.loop = this.playlist.length <= 1;
    applyOffscreenStyle(this.videoElement);
    document.body.appendChild(this.videoElement);
    this.attached = false;
    void this.play();
  }

  isAttached(): boolean {
    return this.attached;
  }

  destroyVideo(): void {
    if (this.recoverTimer != null) {
      window.clearTimeout(this.recoverTimer);
      this.recoverTimer = null;
    }
    if (!this.videoElement) return;

    this.videoElement.removeEventListener('ended', this.handleEnded);
    this.videoElement.removeEventListener('waiting', this.handleWaiting);
    this.videoElement.removeEventListener('stalled', this.handleWaiting);
    this.videoElement.removeEventListener('canplay', this.handleCanPlay);
    this.videoElement.removeEventListener('canplaythrough', this.handleCanPlay);

    this.videoElement.pause();
    this.videoElement.removeAttribute('src');
    this.videoElement.load();
    this.videoElement.parentNode?.removeChild(this.videoElement);
    this.videoElement = null;
    this.attached = false;
    this.playlist = [];
    this.playlistIndex = 0;
  }

  private handleEnded = () => {
    if (this.playlist.length > 1) {
      this.playNext();
      return;
    }
    if (this.videoElement) {
      this.videoElement.currentTime = 0;
      void this.play();
    }
  };

  private handleWaiting = () => {
    if (this.recoverTimer != null) return;
    this.recoverTimer = window.setTimeout(() => {
      this.recoverTimer = null;
      const video = this.videoElement;
      if (!video) return;
      if (video.readyState >= 2 && video.paused) {
        void this.play();
      }
    }, 400);
  };

  private handleCanPlay = () => {
    const video = this.videoElement;
    if (!video) return;
    if (video.paused && !this.attached) {
      video.muted = true;
      void this.play();
    }
  };
}

export const videoManager = VideoElementManager.getInstance();
export default videoManager;
