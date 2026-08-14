import { usePlayerStore, usePlaylistStore, useSettingsStore, parseMusicUrl, parseLyric, type SongResult, getMusicLrc, musicParser, AVAILABLE_SOURCES } from '@shared';
import { recordSuccessfulPlay } from '@/store/historyStore';
import { showToast } from '@/utils/toast';
import { saveSession } from './sessionManager';

const KNOWN_SOURCE_KEYS = new Set<string>(AVAILABLE_SOURCES.map((s) => s.key));

function applyActiveSource(song: SongResult, source?: string | null) {
  const player = usePlayerStore.getState();
  if (source && KNOWN_SOURCE_KEYS.has(source)) {
    song.musicSource = source;
    player.setActiveSource(source);
    return;
  }
  if (song.musicSource && KNOWN_SOURCE_KEYS.has(song.musicSource)) {
    player.setActiveSource(song.musicSource);
    return;
  }
  player.setActiveSource(null);
}

function isLocalPlayback(song: SongResult, url?: string) {
  if (String(song.id).startsWith('local-')) return true
  return !!url && (
    url.startsWith('blob:')
    || url.startsWith('data:')
    || url.startsWith('local://')
    || url.startsWith('asset:')
    || url.startsWith('http://asset.localhost/')
    || url.startsWith('https://asset.localhost/')
  )
}
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
let audioListenersController: AbortController | null = null;
let progressInterval: number | null = null;
let moduleDisposed = false;

// ★ Generation counter — prevents race conditions from rapid song switching
// Inspired by AlgerMusicPlayer's playbackController generation pattern
let playGeneration = 0;

// ★ Preload cache for next song (seamless transitions)
let preloadedNext: { songId: string | number; url: string; source?: string } | null = null;

// P0-5: 操作锁 — 防止并发 play/stop/seek 冲突
let operationOwner: number | null = null;
let operationSequence = 0;
let operationTimer: ReturnType<typeof setTimeout> | null = null;

function acquireOperationLock(): number | null {
  if (operationOwner !== null) return null;
  const owner = ++operationSequence;
  operationOwner = owner;
  if (operationTimer) clearTimeout(operationTimer);
  operationTimer = setTimeout(() => {
    if (operationOwner === owner) operationOwner = null;
    operationTimer = null;
  }, 500);
  return owner;
}

function releaseOperationLock(owner?: number) {
  if (owner !== undefined && operationOwner !== owner) return;
  operationOwner = null;
  if (operationTimer) { clearTimeout(operationTimer); operationTimer = null; }
}

function destroyAudioElement(target: HTMLAudioElement) {
  if (target === audio) {
    audioListenersController?.abort()
    audioListenersController = null
    audio = null
  }
  try {
    target.pause()
    target.removeAttribute('src')
    target.load()
  } catch { /* ignore */ }
}

/** 解绑监听后再释放实例，主动清 src 产生的事件不会污染下一首歌。 */
function disposeAudioInstance() {
  stopProgressSync()
  if (!audio) return
  destroyAudioElement(audio)
}

function invalidatePlayback() {
  playGeneration += 1
  preloadedNext = null
}

function isCurrentGeneration(generation: number) {
  return !moduleDisposed && generation === playGeneration
}

function cleanupStaleAudio(target: HTMLAudioElement) {
  // 用户在缓冲阶段主动暂停时保留当前 src；切歌、停止和 HMR 的旧实例则彻底释放。
  if (target !== audio || !target.paused) destroyAudioElement(target)
}

/** 解析/播放失败：停在当前曲并暂停，绝不自动下一首连环解析 */
function stopOnPlaybackFailure(title: string, detail = '请手动切换音源或下一首') {
  invalidatePlayback()
  const player = usePlayerStore.getState()
  disposeAudioInstance()
  player.setIsPlay(false)
  player.setIsLoading(false)
  updateMediaSessionPlaybackState(false)
  usePlaylistStore.getState().resetFailCount()
  showToast(title, detail)
}

function getAudio(): HTMLAudioElement {
  if (moduleDisposed) throw new Error('Audio service has been disposed')
  if (!audio) {
    audio = new Audio();
    audio.preload = 'auto';
    setupAudioListeners(audio);
    initMediaSession();
  }
  return audio;
}

// Vite HMR 会丢掉模块级 audio 引用，旧实例却继续出声 → 进度条假跑 / 叠音
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    moduleDisposed = true
    invalidatePlayback()
    releaseOperationLock()
    disposeAudioInstance()
    const player = usePlayerStore.getState()
    player.setIsPlay(false)
    player.setIsLoading(false)
    updateMediaSessionPlaybackState(false)
    clearMediaSessionHandlers()
  })
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

const MEDIA_SESSION_ACTIONS: MediaSessionAction[] = [
  'play', 'pause', 'previoustrack', 'nexttrack', 'seekto',
]

function clearMediaSessionHandlers() {
  if (!('mediaSession' in navigator)) return
  for (const action of MEDIA_SESSION_ACTIONS) {
    try { navigator.mediaSession.setActionHandler(action, null) } catch { /* unsupported action */ }
  }
}

function initMediaSession() {
  if (!('mediaSession' in navigator)) return;

  navigator.mediaSession.setActionHandler('play', () => {
    if (moduleDisposed) return
    const song = usePlayerStore.getState().playMusic || usePlaylistStore.getState().getCurrentSong()
    if (!audio?.currentSrc) {
      if (song) void playSong(song)
      return
    }
    void audio.play().catch((error) => {
      console.warn('[Audio] MediaSession play failed:', error)
    })
  });
  navigator.mediaSession.setActionHandler('pause', () => {
    if (!moduleDisposed) audio?.pause();
  });
  navigator.mediaSession.setActionHandler('previoustrack', () => {
    if (moduleDisposed) return
    const { prevPlay, getCurrentSong } = usePlaylistStore.getState();
    prevPlay();
    const song = getCurrentSong();
    if (song) playSong(song);
  });
  navigator.mediaSession.setActionHandler('nexttrack', () => {
    if (moduleDisposed) return
    const { nextPlay, getCurrentSong } = usePlaylistStore.getState();
    nextPlay();
    const song = getCurrentSong();
    if (song) playSong(song);
  });
  navigator.mediaSession.setActionHandler('seekto', (details) => {
    if (moduleDisposed) return
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

function setupAudioListeners(target: HTMLAudioElement) {
  audioListenersController?.abort()
  const controller = new AbortController()
  audioListenersController = controller
  const options = { signal: controller.signal }
  const isCurrent = () => !moduleDisposed && audio === target

  target.addEventListener('ended', () => {
    if (!isCurrent()) return
    updateMediaSessionPlaybackState(false);
    const playlist = usePlaylistStore.getState();

    // 1. Single loop mode
    if (playlist.playMode === 1) {
      target.currentTime = 0;
      void target.play().catch((error) => {
        console.warn('[Audio] Single-loop replay failed:', error)
      });
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
  }, options);

  target.addEventListener('timeupdate', () => {
    // 仅在实际播放时同步进度，避免暂停后仍被残留事件推进进度条
    if (isCurrent() && !target.paused) {
      usePlayerStore.getState().setCurrentProgress(target.currentTime * 1000);
    }
  }, options);

  target.addEventListener('loadedmetadata', () => {
    if (isCurrent()) {
      usePlayerStore.getState().setDuration(target.duration * 1000);
      updateMediaSessionPositionState();
    }
  }, options);

  target.addEventListener('play', () => {
    if (!isCurrent()) return
    usePlayerStore.getState().setIsPlay(true);
    updateMediaSessionPlaybackState(true);
    startProgressSync();
  }, options);

  target.addEventListener('pause', () => {
    if (!isCurrent()) return
    usePlayerStore.getState().setIsPlay(false);
    updateMediaSessionPlaybackState(false);
    stopProgressSync();
  }, options);

  target.addEventListener('seeked', () => {
    if (isCurrent()) updateMediaSessionPositionState();
  }, options);

  target.addEventListener('error', () => {
    if (!isCurrent()) return
    const errCode = target.error?.code
    if (errCode !== 4) console.error('Audio error:', errCode, target.error?.message)
    usePlayerStore.getState().setIsLoading(false)
    updateMediaSessionPlaybackState(false)

    const currentSong = usePlayerStore.getState().playMusic || usePlaylistStore.getState().getCurrentSong()
    // 解析/播放失败后停在当前曲，不再自动换源、自动下一首，避免无限解析循环。
    // 用户可手动切歌或用音源选择器重试。
    stopOnPlaybackFailure(
      currentSong?.name ? `「${currentSong.name}」播放失败` : '播放失败',
      '请手动切换音源或下一首',
    )
  }, options);
}

// ==================== Core: playSong with generation-based cancellation ====================

export async function playSong(song: SongResult, autoPlay = true) {
  if (moduleDisposed) return

  const player = usePlayerStore.getState();
  const musicQuality = useSettingsStore.getState().musicQuality || 'exhigh';

  // ★ Increment generation — any in-flight playSong with older generation will abort
  const thisGeneration = ++playGeneration;

  // 切歌时先停掉当前音频，避免旧歌继续播放到新 URL 解析完成
  if (autoPlay) {
    disposeAudioInstance()
    usePlayerStore.getState().setIsPlay(false);
    updateMediaSessionPlaybackState(false);
  }

  player.setIsLoading(true);
  player.setPlayMusic(song);
  let operationAudio: HTMLAudioElement | null = null

  try {
    // ★ Check preload cache first (seamless transitions)
    if (preloadedNext && preloadedNext.songId == song.id) {
      console.log(`[Audio] ⚡ Hit preload cache for "${song.name}"`);
      const url = preloadedNext.url;
      applyActiveSource(song, preloadedNext.source);
      preloadedNext = null;

      if (!isCurrentGeneration(thisGeneration)) return;

      player.setIsLoading(false);
      player.setPlayMusic({ ...song });
      player.setPlayMusicUrl(url);
      const a = getAudio();
      operationAudio = a
      a.src = url;
      a.volume = player.isMuted ? 0 : player.volume;
      a.playbackRate = player.playbackRate;

      if (autoPlay) {
        await a.play();
        if (!isCurrentGeneration(thisGeneration)) {
          cleanupStaleAudio(a)
          return
        }
        player.setIsPlay(true);
        recordSuccessfulPlay(song);
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

    // Resolve URL + 音源：已有 URL 但缺少 musicSource 时也重新解析，保证勾选能显示
    let url = song.playMusicUrl;
    const localPlayback = isLocalPlayback(song, url)
    const hasKnownSource = !!(song.musicSource && KNOWN_SOURCE_KEYS.has(song.musicSource));
    if (!url || (!localPlayback && !hasKnownSource)) {
      const parsed = await parseMusicUrl(song.id, song, musicQuality);
      if (parsed) {
        url = parsed.url;
        applyActiveSource(song, parsed.source);
      } else if (url) {
        // 解析失败但旧 URL 仍可用，至少清空无效勾选状态
        applyActiveSource(song, song.musicSource);
      }
    } else if (localPlayback) {
      player.setActiveSource(null)
    } else {
      applyActiveSource(song, song.musicSource);
    }

    // ★ Check generation after async operation
    if (!isCurrentGeneration(thisGeneration)) {
      console.log(`[Audio] gen=${thisGeneration} stale after URL resolve, aborting`);
      return;
    }

    if (url) {
      song.playMusicUrl = url;
      // 同步解析命中的音源到 player store，供音源选择器打勾
      player.setPlayMusic({ ...song });
      player.setPlayMusicUrl(url);
      const a = getAudio();
      operationAudio = a
      a.src = url;
      a.volume = player.isMuted ? 0 : player.volume;
      a.playbackRate = player.playbackRate;

      if (autoPlay) {
        await a.play();

        // ★ Check generation after play() — user may have clicked another song during buffering
        if (!isCurrentGeneration(thisGeneration)) {
          console.log(`[Audio] gen=${thisGeneration} stale after play(), stopping`);
          cleanupStaleAudio(a)
          return;
        }
      }

      player.setIsPlay(autoPlay);
      if (autoPlay) recordSuccessfulPlay(song);
      updateMediaSessionMetadata(song);
      if (autoPlay) showToast('正在播放', song.name);
      usePlaylistStore.getState().resetFailCount(); // P0-2: 播放成功重置失败计数
      saveSession(); // ★ 保存播放会话
      notifyTray(song); // ★ 更新托盘 tooltip
      preloadNextSong();
      preloadLyric(song); // P1-10: 预加载歌词
    } else {
      console.warn('No playable URL found for', song.name);
      if (isCurrentGeneration(thisGeneration)) {
        // 清掉失效缓存，避免下次手动播放仍命中坏 URL
        song.playMusicUrl = undefined
        song['expiredAt'] = undefined
        stopOnPlaybackFailure(
          `「${song.name}」解析失败`,
          '音源接口异常或备用线路不可用，请换网络/音源或检查 API',
        )
      }
    }
  } catch (e) {
    console.error('Play error:', e);
    if (!isCurrentGeneration(thisGeneration)) {
      if (operationAudio) cleanupStaleAudio(operationAudio)
      return
    }

    song.playMusicUrl = undefined
    song['expiredAt'] = undefined
    stopOnPlaybackFailure(
      `「${song.name}」播放失败`,
      '请手动切换音源或下一首',
    )
  } finally {
    if (isCurrentGeneration(thisGeneration)) {
      player.setIsLoading(false);
    }
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
      // 歌词是播放后的异步数据，直接挂到歌曲对象不会触发 Zustand
      // 订阅；副窗口需要这一帧才能从「暂无歌词」切换到真实歌词。
      if (usePlayerStore.getState().playMusic?.id === song.id) {
        usePlayerStore.getState().setPlayMusic({ ...song })
      }
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

    if (nextSong.playMusicUrl && isLocalPlayback(nextSong, nextSong.playMusicUrl)) {
      preloadedNext = { songId: nextSong.id, url: nextSong.playMusicUrl }
      return
    }

    const musicQuality = useSettingsStore.getState().musicQuality || 'exhigh';
    const preloadGeneration = playGeneration
    parseMusicUrl(nextSong.id, nextSong, musicQuality).then((result) => {
      if (result && isCurrentGeneration(preloadGeneration)) {
        nextSong.playMusicUrl = result.url;
        nextSong.musicSource = result.source;
        preloadedNext = { songId: nextSong.id, url: result.url, source: result.source };
        console.log(`[Audio] Preloaded next song: "${nextSong.name}" (source=${result.source})`);
      }
    }).catch(() => {/* preload failure is non-critical */});
  } catch {/* preload error is non-critical */}
}

// ==================== Playback Controls ====================

export function togglePlay() {
  if (moduleDisposed) return
  const operationId = acquireOperationLock()
  if (operationId === null) return; // P0-5
  const a = getAudio();
  const player = usePlayerStore.getState();
  const song = player.playMusic || usePlaylistStore.getState().getCurrentSong();

  // 以真实 audio 状态为准：UI 显示暂停但实例仍在播时，先停干净，避免再点播放叠音
  if (!a.paused || player.isPlay) {
    if (player.isLoading) {
      invalidatePlayback()
      player.setIsLoading(false)
    }
    if (!a.paused) a.pause();
    player.setIsPlay(false);
    notifyTray(null);
    releaseOperationLock(operationId);
    return;
  }

  // 启动恢复、浏览器重建 Audio 实例或上次 URL 失效时，audio.src 可能为空。
  // 直接调用 audio.play() 不会触发 URL 解析，必须复用完整的 playSong 流程。
  if (!song || !a.currentSrc) {
    releaseOperationLock(operationId);
    if (song) void playSong(song);
    return;
  }

  const resumeGeneration = playGeneration
  const playPromise = a.play();
  // 远程地址过期时，先清掉旧缓存再重新解析当前歌曲。
  playPromise?.catch((error: unknown) => {
    console.warn('[Audio] Resumed playback failed, resolving a fresh URL:', error);
    if (!isCurrentGeneration(resumeGeneration) || audio !== a) return;
    if (usePlayerStore.getState().playMusic?.id !== song.id) return;
    song.playMusicUrl = undefined;
    song['expiredAt'] = undefined;
    usePlayerStore.getState().setPlayMusicUrl('');
    void playSong(song);
  });
  // 恢复播放是异步的，不能持有同步操作锁等待 Promise。
  releaseOperationLock(operationId);
  notifyTray(song);
}

export function seekTo(ms: number) {
  if (moduleDisposed) return
  const operationId = acquireOperationLock()
  if (operationId === null) return; // P0-5
  try {
    const a = getAudio();
    a.currentTime = ms / 1000;
    usePlayerStore.getState().setCurrentProgress(ms);
    updateMediaSessionPositionState();
  } finally {
    releaseOperationLock(operationId);
  }
}

export function setVolume(vol: number) {
  if (moduleDisposed) return
  const a = getAudio();
  a.volume = vol;
}

export function setPlaybackRate(rate: number) {
  if (moduleDisposed) return
  const a = getAudio();
  a.playbackRate = rate;
  updateMediaSessionPositionState();
}

export function stop() {
  if (moduleDisposed) return
  invalidatePlayback()
  disposeAudioInstance()
  usePlayerStore.getState().setIsPlay(false);
  usePlayerStore.getState().setIsLoading(false);
  updateMediaSessionPlaybackState(false);
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
      parseMusicUrl(song.id, song, musicQuality).then((result) => {
        if (result && !song.playMusicUrl) {
          song.playMusicUrl = result.url;
          song.musicSource = result.source;
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
  if (moduleDisposed) return
  const player = usePlayerStore.getState();
  const playlist = usePlaylistStore.getState();
  const song = player.playMusic || playlist.getCurrentSong();
  if (!song) { showToast('无法操作', '没有正在播放的歌曲'); return; }

  const quality = useSettingsStore.getState().musicQuality || 'exhigh';
  const thisGeneration = ++playGeneration
  preloadedNext = null

  const previousAudio = audio
  const savedTime = previousAudio?.currentTime || 0
  const shouldResume = !!previousAudio && (!previousAudio.paused || player.isPlay)
  disposeAudioInstance()
  player.setIsPlay(false)
  player.setIsLoading(true)
  updateMediaSessionPlaybackState(false)
  let operationAudio: HTMLAudioElement | null = null

  try {
    console.log(`[Audio] Reparse with source "${source}" for "${song.name}"`);
    const result = await musicParser.parseMusicWithSource(song.id, song, quality, source);

    const currentSong = usePlayerStore.getState().playMusic
    if (!isCurrentGeneration(thisGeneration) || currentSong?.id !== song.id) return

    if (result) {
      song.playMusicUrl = result.url;
      song.musicSource = result.source;
      song['expiredAt'] = Date.now() + 24 * 60 * 60 * 1000;
      applyActiveSource(song, result.source);
      player.setPlayMusic({ ...song });
      player.setPlayMusicUrl(result.url);
      const a = getAudio()
      operationAudio = a
      a.src = result.url;
      a.volume = player.isMuted ? 0 : player.volume;
      a.playbackRate = player.playbackRate;

      if (savedTime > 0) {
        const restorePosition = () => {
          if (!isCurrentGeneration(thisGeneration) || audio !== a) return
          const maxTime = Number.isFinite(a.duration) ? Math.max(0, a.duration - 0.05) : savedTime
          a.currentTime = Math.min(savedTime, maxTime)
        }
        if (a.readyState >= 1) restorePosition()
        else a.addEventListener('loadedmetadata', restorePosition, { once: true })
      }

      if (shouldResume) {
        await a.play();
        if (!isCurrentGeneration(thisGeneration) || usePlayerStore.getState().playMusic?.id !== song.id) {
          cleanupStaleAudio(a)
          return
        }
        player.setIsPlay(true);
      } else {
        player.setIsPlay(false)
      }

      saveSession(); // ★ 切换音源后保存会话
      notifyTray(song); // ★ 更新托盘 tooltip
      const srcLabel = AVAILABLE_SOURCES.find(s => s.key === result.source)?.label || result.source;
      showToast(`切换到 ${srcLabel}`, song.name);
    } else {
      showToast('解析失败', `${song.name} — 该音源无可用 URL`);
    }
  } catch (e) {
    if (!isCurrentGeneration(thisGeneration)) {
      if (operationAudio) cleanupStaleAudio(operationAudio)
      return
    }
    console.warn(`[Audio] Reparse failed:`, e);
    showToast('解析失败', '请尝试其他音源');
  } finally {
    if (isCurrentGeneration(thisGeneration)) player.setIsLoading(false)
  }
}
