import { usePlayerStore, usePlaylistStore, useSettingsStore, parseMusicUrl, parseLyric, type SongResult, getMusicLrc, musicParser, AVAILABLE_SOURCES } from '@shared';
import { addToHistory } from '@/store/historyStore';
import { showToast } from '@/utils/toast';
import { saveSession } from './sessionManager';

// ═══════════════ 托盘 tooltip 更新 ═══════════════
let updateTrayTooltipFn: ((text: string) => void) | null = null;

async function ensureTrayUpdater() {
  if (updateTrayTooltipFn) return;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    updateTrayTooltipFn = (text: string) => {
      invoke('update_tray_tooltip', { text }).catch(() => {});
    };
  } catch {
    // Tauri API 不可用（浏览器环境），静默忽略
    updateTrayTooltipFn = () => {};
  }
}

async function notifyTray(song: import('@shared').SongResult | null) {
  await ensureTrayUpdater();
  if (song) {
    const artists = song.ar?.map((a) => a.name).join(', ') || '';
    const name = song.name || '';
    updateTrayTooltipFn?.(`🎵 ${name} — ${artists}`);
  } else {
    updateTrayTooltipFn?.('RanNuan Music');
  }
}

// ==================== Audio Singleton ====================
let audio: HTMLAudioElement | null = null;
let progressInterval: number | null = null;

// ★ Generation counter — prevents race conditions from rapid song switching
// Inspired by AlgerMusicPlayer's playbackController generation pattern
let playGeneration = 0;

// ★ Preload cache for next song (seamless transitions)
let preloadedNext: { songId: number; url: string } | null = null;

// P0-5: 操作锁 — 防止并发 play/stop/seek 冲突
let isOperating = false;
let operationTimer: ReturnType<typeof setTimeout> | null = null;

function acquireOperationLock(): boolean {
  if (isOperating) return false;
  isOperating = true;
  if (operationTimer) clearTimeout(operationTimer);
  operationTimer = setTimeout(() => { isOperating = false; }, 500);
  return true;
}

function releaseOperationLock() {
  isOperating = false;
  if (operationTimer) { clearTimeout(operationTimer); operationTimer = null; }
}

// P1-9: 重试定时器
let retryTimer: ReturnType<typeof setTimeout> | null = null;

function cancelRetryTimer() {
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
}

function getAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio();
    audio.preload = 'auto';
    setupAudioListeners();
    initMediaSession();
  }
  return audio;
}

// ==================== Progress Sync ====================

function startProgressSync() {
  if (progressInterval) return;
  progressInterval = window.setInterval(() => {
    if (audio && !audio.paused) {
      usePlayerStore.getState().setCurrentProgress(audio.currentTime * 1000);
    }
  }, 500);
}

function stopProgressSync() {
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
}

// ==================== MediaSession (system tray / lock screen controls) ====================

function initMediaSession() {
  if (!('mediaSession' in navigator)) return;

  navigator.mediaSession.setActionHandler('play', () => {
    getAudio().play();
  });
  navigator.mediaSession.setActionHandler('pause', () => {
    getAudio().pause();
  });
  navigator.mediaSession.setActionHandler('previoustrack', () => {
    const { prevPlay, getCurrentSong } = usePlaylistStore.getState();
    prevPlay();
    const song = getCurrentSong();
    if (song) playSong(song);
  });
  navigator.mediaSession.setActionHandler('nexttrack', () => {
    const { nextPlay, getCurrentSong } = usePlaylistStore.getState();
    nextPlay();
    const song = getCurrentSong();
    if (song) playSong(song);
  });
  navigator.mediaSession.setActionHandler('seekto', (details) => {
    if (details.seekTime !== undefined) {
      seekTo(details.seekTime * 1000);
    }
  });
}

function updateMediaSessionMetadata(song: SongResult) {
  if (!('mediaSession' in navigator)) return;
  try {
    const artists = song.ar?.map((a) => a.name).join(', ') || '';
    const album = song.al?.name || '';
    const artwork = ['96', '128', '192', '256', '384', '512'].map((size) => ({
      src: `${song.picUrl}?param=${size}y${size}`,
      type: 'image/jpg',
      sizes: `${size}x${size}`,
    }));

    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.name || '',
      artist: artists,
      album,
      artwork,
    });
  } catch (e) {
    console.warn('MediaSession metadata update failed:', e);
  }
}

function updateMediaSessionPlaybackState(playing: boolean) {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
  } catch {/* mediaSession not supported */}
}

function updateMediaSessionPositionState() {
  if (!('mediaSession' in navigator) || !audio) return;
  try {
    if ('setPositionState' in navigator.mediaSession && audio.duration && isFinite(audio.duration)) {
      navigator.mediaSession.setPositionState!({
        duration: audio.duration,
        playbackRate: audio.playbackRate,
        position: audio.currentTime,
      });
    }
  } catch {/* position state not available */}
}

// ==================== Audio Event Listeners ====================

function setupAudioListeners() {
  if (!audio) return;

  audio.addEventListener('ended', () => {
    updateMediaSessionPlaybackState(false);
    const playlist = usePlaylistStore.getState();

    // 1. Single loop mode
    if (playlist.playMode === 1) {
      audio!.currentTime = 0;
      audio!.play();
      return;
    }

    // P0-3: 顺序模式播完最后一首时，autoEnd=true 不循环
    const isAtEnd = playlist.playMode === 0 && playlist.playListIndex >= playlist.playList.length - 1
      && usePlaylistStore.getState().playNextQueue.length === 0;

    if (isAtEnd) {
      usePlayerStore.getState().setIsPlay(false);
      showToast('播放列表已结束', '');
      return;
    }

    // 2. nextPlay 内部会优先消费 playNextQueue
    playlist.nextPlay(true);
    const song = usePlaylistStore.getState().getCurrentSong();
    if (song) playSong(song);
  });

  audio.addEventListener('timeupdate', () => {
    if (audio) {
      usePlayerStore.getState().setCurrentProgress(audio.currentTime * 1000);
    }
  });

  audio.addEventListener('loadedmetadata', () => {
    if (audio) {
      usePlayerStore.getState().setDuration(audio.duration * 1000);
      updateMediaSessionPositionState();
    }
  });

  audio.addEventListener('play', () => {
    usePlayerStore.getState().setIsPlay(true);
    updateMediaSessionPlaybackState(true);
    startProgressSync();
  });

  audio.addEventListener('pause', () => {
    usePlayerStore.getState().setIsPlay(false);
    updateMediaSessionPlaybackState(false);
    stopProgressSync();
  });

  audio.addEventListener('seeked', () => {
    updateMediaSessionPositionState();
  });

  audio.addEventListener('error', async () => {
    const errCode = audio?.error?.code
    if (errCode !== 4) console.error('Audio error:', errCode, audio?.error?.message)
    usePlayerStore.getState().setIsLoading(false)
    updateMediaSessionPlaybackState(false)

    const currentSong = usePlaylistStore.getState().getCurrentSong()
    if (!currentSong) return

    // ★ 音源降级链：netease → kugou → kuwo → migu → bodian
    const FALLBACK_ORDER = ['kugou', 'kuwo', 'migu', 'bodian']
    const tried = (currentSong as any)._audioFailedSources || []
    tried.push((currentSong.source as string) || 'netease')
    ;(currentSong as any)._audioFailedSources = tried

    const nextSource = FALLBACK_ORDER.find(s => !tried.includes(s))
    if (nextSource) {
      try {
        const quality = useSettingsStore.getState().musicQuality || 'exhigh'
        const url = await musicParser.parseMusicWithSource(currentSong.id, currentSong, quality, nextSource)
        if (url) {
          console.log(`[Audio] 🔄 切换到 ${nextSource}: ${currentSong.name}`)
          ;(currentSong.source as any) = nextSource
          currentSong.playMusicUrl = url
          ;(currentSong as any).expiredAt = Date.now() + 24 * 60 * 60 * 1000
          usePlayerStore.setState({ playMusicUrl: url })
          const a = getAudio()
          a.src = url
          a.volume = usePlayerStore.getState().isMuted ? 0 : usePlayerStore.getState().volume
          a.playbackRate = usePlayerStore.getState().playbackRate
          await a.play()
          usePlayerStore.getState().setIsPlay(true)
          usePlaylistStore.getState().resetFailCount()
          preloadNextSong()
          return
        }
      } catch {}
      // 当前源失败 → 延迟后重试下一个（避免循环触发 error）
      setTimeout(() => {
        const song = usePlaylistStore.getState().getCurrentSong()
        if (song?.id === currentSong.id && song.playMusicUrl !== currentSong.playMusicUrl) {
          // 已经换过 URL 了，让 playSong 处理
          playSong(song)
        }
      }, 300)
      return
    }

    // 所有音源都失败 → 切下一首
    delete (currentSong as any)._audioFailedSources
    const failCount = usePlaylistStore.getState().incrementFailCount()
    if (failCount >= 5) {
      showToast('连续播放失败，已停止')
      usePlayerStore.getState().setIsPlay(false)
      usePlaylistStore.getState().resetFailCount()
    } else {
      usePlaylistStore.getState().nextPlay()
      const nextSong = usePlaylistStore.getState().getCurrentSong()
      if (nextSong && nextSong.id !== currentSong.id) {
        playSong(nextSong)
      }
    }
  });
}

// ==================== Core: playSong with generation-based cancellation ====================

export async function playSong(song: SongResult, retryCount = 0, autoPlay = true) {
  // P0-5: 操作锁（autoPlay=false 时不抢占锁，允许后续正常播放）
  if (autoPlay && !acquireOperationLock()) {
    console.log('[Audio] Operation locked, ignoring playSong');
    return;
  }

  addToHistory(song);
  const player = usePlayerStore.getState();
  const musicQuality = useSettingsStore.getState().musicQuality || 'exhigh';

  // ★ Increment generation — any in-flight playSong with older generation will abort
  const thisGeneration = ++playGeneration;
  cancelRetryTimer(); // P1-9: 取消之前的重试

  player.setIsLoading(true);
  player.setPlayMusic(song);

  try {
    // ★ Check preload cache first (seamless transitions)
    if (preloadedNext && preloadedNext.songId == song.id) {
      console.log(`[Audio] ⚡ Hit preload cache for "${song.name}"`);
      const url = preloadedNext.url;
      preloadedNext = null;

      if (thisGeneration !== playGeneration) { releaseOperationLock(); return; }

      player.setIsLoading(false);
      player.setPlayMusicUrl(url);
      const a = getAudio();
      a.src = url;
      a.volume = player.isMuted ? 0 : player.volume;
      a.playbackRate = player.playbackRate;

      if (autoPlay) {
        await a.play();
        player.setIsPlay(true);
      } else {
        player.setIsPlay(false);
      }

      updateMediaSessionMetadata(song);
      if (autoPlay) showToast('正在播放', song.name);
      usePlaylistStore.getState().resetFailCount(); // P0-2: 播放成功重置失败计数
      saveSession(); // ★ 保存播放会话
      notifyTray(song); // ★ 更新托盘 tooltip
      preloadNextSong();
      preloadLyric(song); // P1-10: 预加载歌词
      if (autoPlay) { releaseOperationLock(); }
      return;
    }
    preloadedNext = null;

    // P0-6: URL 过期检查 — 如果 URL 有过期时间且已过期，强制重新解析
    if (song.playMusicUrl && song['expiredAt'] && song['expiredAt'] < Date.now()) {
      if (!song.playMusicUrl.startsWith('local://')) {
        console.info(`[Audio] URL 已过期，重新解析: ${song.name}`);
        song.playMusicUrl = undefined;
        song['expiredAt'] = undefined;
      }
    }

    // Resolve URL
    let url = song.playMusicUrl;
    if (!url) {
      url = await parseMusicUrl(song.id, song, musicQuality);
    }

    // ★ Check generation after async operation
    if (thisGeneration !== playGeneration) {
      console.log(`[Audio] gen=${thisGeneration} stale after URL resolve, aborting`);
      releaseOperationLock();
      return;
    }

    if (url) {
      player.setPlayMusicUrl(url);
      const a = getAudio();
      a.src = url;
      a.volume = player.isMuted ? 0 : player.volume;
      a.playbackRate = player.playbackRate;

      if (autoPlay) {
        await a.play();

        // ★ Check generation after play() — user may have clicked another song during buffering
        if (thisGeneration !== playGeneration) {
          console.log(`[Audio] gen=${thisGeneration} stale after play(), stopping`);
          a.pause();
          a.removeAttribute('src');
          releaseOperationLock();
          return;
        }
      }

      player.setIsPlay(autoPlay);
      updateMediaSessionMetadata(song);
      if (autoPlay) showToast('正在播放', song.name);
      usePlaylistStore.getState().resetFailCount(); // P0-2: 播放成功重置失败计数
      saveSession(); // ★ 保存播放会话
      notifyTray(song); // ★ 更新托盘 tooltip
      preloadNextSong();
      preloadLyric(song); // P1-10: 预加载歌词
    } else {
      console.warn('No playable URL found for', song.name);
      showToast('无法播放', '该歌曲暂无可用音源');
      if (thisGeneration === playGeneration) {
        // P1-9: 重试机制 — 首次失败 1s 后重试一次
        if (retryCount < 1) {
          retryTimer = setTimeout(() => {
            if (playGeneration !== thisGeneration) return;
            console.log(`[Audio] 重试播放: ${song.name}`);
            playSong(song, retryCount + 1, autoPlay);
          }, 1000);
        } else {
          // 重试仍失败，跳到下一首
          const failCount = usePlaylistStore.getState().incrementFailCount();
          if (failCount >= 5) {
            showToast('连续播放失败', '已停止播放');
            usePlayerStore.getState().setIsPlay(false);
            usePlaylistStore.getState().resetFailCount();
          } else {
            setTimeout(() => {
              if (playGeneration !== thisGeneration) return;
              const playlist = usePlaylistStore.getState();
              playlist.nextPlay();
              const nextSong = playlist.getCurrentSong();
              if (nextSong && nextSong.id !== song.id) playSong(nextSong);
            }, 1000);
          }
        }
      }
    }
  } catch (e) {
    console.error('Play error:', e);
    if (thisGeneration !== playGeneration) { releaseOperationLock(); return; }

    showToast('播放失败', '网络或音源错误');
    // P1-9: 重试机制
    if (retryCount < 1) {
      retryTimer = setTimeout(() => {
        if (playGeneration !== thisGeneration) return;
        console.log(`[Audio] 重试播放: ${song.name}`);
        playSong(song, retryCount + 1, autoPlay);
      }, 1000);
    } else {
      const failCount = usePlaylistStore.getState().incrementFailCount();
      if (failCount >= 5) {
        showToast('连续播放失败', '已停止播放');
        usePlayerStore.getState().setIsPlay(false);
        usePlaylistStore.getState().resetFailCount();
      } else {
        setTimeout(() => {
          if (playGeneration !== thisGeneration) return;
          const playlist = usePlaylistStore.getState();
          playlist.nextPlay();
          const nextSong = playlist.getCurrentSong();
          if (nextSong && nextSong.id !== song.id) playSong(nextSong);
        }, 1000);
      }
    }
  } finally {
    if (thisGeneration === playGeneration) {
      player.setIsLoading(false);
    }
    releaseOperationLock();
  }
}

// ==================== Preload Next Song ====================

// P1-10: 预加载歌词（非阻塞，失败不影响播放）
function preloadLyric(song: SongResult) {
  if (song.lyric) return // 已有歌词
  getMusicLrc(Number(song.id)).then((res) => {
    const apiLyric = res?.data ?? res
    const parsed = parseLyric(apiLyric as Parameters<typeof parseLyric>[0])
    if (parsed) {
      song.lyric = parsed
      console.log(`[Audio] Preloaded lyric for "${song.name}"`)
    }
  }).catch(() => {/* lyric preload is non-critical */})
}

function preloadNextSong() {
  try {
    const playlist = usePlaylistStore.getState();
    const { playList, playListIndex, playMode } = playlist;
    if (playList.length === 0) return;

    let nextIndex: number;
    if (playMode === 2) {
      // P1-8: 随机模式 — 使用预打乱索引获取真正的下一首
      const _g = globalThis as Record<string, unknown>;
      const shuffled = _g['__shuffledIndices'] as number[] | undefined;
      if (shuffled && shuffled.length === playList.length) {
        const currentPos = shuffled.indexOf(playListIndex);
        const nextPos = (currentPos + 1) % shuffled.length;
        nextIndex = shuffled[nextPos];
      } else {
        // Fallback: 顺序下一首
        nextIndex = (playListIndex + 1) % playList.length;
      }
    } else {
      // 顺序/单曲循环模式 — 预加载顺序下一首
      nextIndex = (playListIndex + 1) % playList.length;
    }

    const nextSong = playList[nextIndex];
    if (!nextSong || nextSong.id === playlist.getCurrentSong()?.id) return;

    const musicQuality = useSettingsStore.getState().musicQuality || 'exhigh';
    parseMusicUrl(nextSong.id, nextSong, musicQuality).then((url) => {
      if (url) {
        preloadedNext = { songId: Number(nextSong.id), url };
        console.log(`[Audio] Preloaded next song: "${nextSong.name}"`);
      }
    }).catch(() => {/* preload failure is non-critical */});
  } catch {/* preload error is non-critical */}
}

// ==================== Playback Controls ====================

export function togglePlay() {
  if (!acquireOperationLock()) return; // P0-5
  try {
    const a = getAudio();
    if (a.paused) {
      a.play();
      // 恢复播放时更新 tooltip
      const song = usePlayerStore.getState().playMusic;
      if (song) notifyTray(song);
    } else {
      a.pause();
      notifyTray(null);
    }
  } finally {
    releaseOperationLock();
  }
}

export function seekTo(ms: number) {
  if (!acquireOperationLock()) return; // P0-5
  try {
    const a = getAudio();
    a.currentTime = ms / 1000;
    usePlayerStore.getState().setCurrentProgress(ms);
    updateMediaSessionPositionState();
  } finally {
    releaseOperationLock();
  }
}

export function setVolume(vol: number) {
  const a = getAudio();
  a.volume = vol;
}

export function setPlaybackRate(rate: number) {
  const a = getAudio();
  a.playbackRate = rate;
  updateMediaSessionPositionState();
}

export function stop() {
  if (!acquireOperationLock()) return; // P0-5
  try {
    const a = getAudio();
    a.pause();
    a.removeAttribute('src');
    a.load();
    usePlayerStore.getState().setIsPlay(false);
    updateMediaSessionPlaybackState(false);
    cancelRetryTimer(); // P1-9
  } finally {
    releaseOperationLock();
  }
}

export function getCurrentTime(): number {
  return (audio?.currentTime || 0) * 1000;
}

export function getDuration(): number {
  return (audio?.duration || 0) * 1000;
}

// ★ Expose preload cache invalidation for external use (e.g. playlist changes)
export function clearPreloadCache() {
  preloadedNext = null;
}

// P1-7: 批量获取歌曲详情（URL + 歌词预加载）
// 在设置播放列表后调用，提前解析当前歌曲附近几首的 URL 和歌词
export async function fetchSongs(startIndex: number, count = 3) {
  const playlist = usePlaylistStore.getState();
  const { playList } = playlist;
  if (playList.length === 0) return;

  const musicQuality = useSettingsStore.getState().musicQuality || 'exhigh';
  const end = Math.min(startIndex + count, playList.length);

  for (let i = startIndex; i < end; i++) {
    const song = playList[i];
    if (!song) continue;

    // 预加载 URL（不覆盖已有的）
    if (!song.playMusicUrl) {
      parseMusicUrl(song.id, song, musicQuality).then((url) => {
        if (url && !song.playMusicUrl) {
          song.playMusicUrl = url;
          console.log(`[Audio] fetchSongs: preloaded URL for "${song.name}"`);
        }
      }).catch(() => {/* non-critical */});
    }

    // 预加载歌词
    preloadLyric(song);
  }
}

// ═══════════════ 音源选择 → 重新解析当前歌曲 ═══════════════
export async function reparseWithSource(source: string) {
  const player = usePlayerStore.getState();
  const playlist = usePlaylistStore.getState();
  const song = playlist.getCurrentSong();
  if (!song) { showToast('无法操作', '没有正在播放的歌曲'); return; }

  const quality = useSettingsStore.getState().musicQuality || 'exhigh';

  // pause + loading
  player.setIsLoading(true);
  const a = audio ?? getAudio();
  const savedTime = a.currentTime; // 保存播放位置
  a.pause();

  try {
    console.log(`[Audio] Reparse with source "${source}" for "${song.name}"`);
    const url = await musicParser.parseMusicWithSource(song.id, song, quality, source);

    if (url) {
      song.playMusicUrl = url;
      song['expiredAt'] = Date.now() + 24 * 60 * 60 * 1000;
      player.setPlayMusicUrl(url);
      a.src = url;
      a.currentTime = savedTime;
      a.volume = player.isMuted ? 0 : player.volume;
      a.playbackRate = player.playbackRate;
      await a.play();
      player.setIsPlay(true);
      player.setIsLoading(false);

      saveSession(); // ★ 切换音源后保存会话
      notifyTray(song); // ★ 更新托盘 tooltip
      const srcLabel = AVAILABLE_SOURCES.find(s => s.key === source)?.label || source;
      showToast(`切换到 ${srcLabel}`, song.name);
    } else {
      player.setIsLoading(false);
      showToast('解析失败', `${song.name} — 该音源无可用 URL`);
    }
  } catch (e) {
    player.setIsLoading(false);
    console.warn(`[Audio] Reparse failed:`, e);
    showToast('解析失败', '请尝试其他音源');
  }
}
