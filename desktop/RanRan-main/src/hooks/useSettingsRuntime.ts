import { useEffect } from 'react';
import { useUiStore } from '../store/modules/uiStore';
import { setStoredPerformanceTier } from '../utils/performance';
import { isEmbedded } from '../bridge/universeHost';

export function useSettingsRuntime() {
  const settings = useUiStore((s) => s.settings);

  useEffect(() => {
    setStoredPerformanceTier(settings.performanceMode);
  }, [settings.performanceMode]);

  useEffect(() => {
    if (isEmbedded) return;

    let cancelled = false;
    void import('../services/musicPlayer').then(({ useMusicPlayer }) => {
      if (cancelled) return;
      const player = useMusicPlayer.getState();
      player.setVolume(settings.musicVolume);
    });

    return () => {
      cancelled = true;
    };
  }, [settings.musicVolume]);

  useEffect(() => {
    if (isEmbedded) return;

    let cancelled = false;
    void import('../services/musicPlayer').then(async ({ useMusicPlayer }) => {
      if (cancelled) return;
      const player = useMusicPlayer.getState();
      if (!settings.backgroundMusic) {
        player.pauseMusic();
        return;
      }
      await player.loadMusicList();
      if (cancelled) return;
      const next = useMusicPlayer.getState();
      next.setVolume(useUiStore.getState().settings.musicVolume);
      if (next.currentMusic) {
        await next.resumeMusic();
      } else if (next.musicList[0]) {
        await next.playMusic(next.musicList[0].id);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [settings.backgroundMusic]);
}
