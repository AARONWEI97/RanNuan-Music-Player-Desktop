import { getStorageAdapter } from '../storageAdapter';

const KEY_PREFIX = 'song_source_';
const TYPE_SUFFIX = '_type';
const TRIED_SUFFIX = '_tried';
const MANUAL_TYPE = 'manual';
const AUTO_TYPE = 'auto';

interface SongSourceConfig {
  sources: string[];
  type: 'manual' | 'auto';
  updatedAt: number;
}

// 内存缓存，避免频繁读 AsyncStorage
const configCache = new Map<string, SongSourceConfig | null>();

// 当前会话中已尝试过的音源（播放同一首歌时避免重复失败）
const triedSourcesMap = new Map<string, Set<string>>();

export const SourceConfigManager = {
  /** 获取某首歌的专属音源配置 */
  async getConfig(songId: string | number): Promise<SongSourceConfig | null> {
    const key = `${KEY_PREFIX}${songId}`;
    const cached = configCache.get(key);
    if (cached !== undefined) return cached;

    try {
      const sourcesJson = await getStorageAdapter().getItem(key);
      const type = await getStorageAdapter().getItem(key + TYPE_SUFFIX);
      if (sourcesJson) {
        const sources = JSON.parse(sourcesJson) as string[];
        const config: SongSourceConfig = {
          sources: Array.isArray(sources) ? sources : [],
          type: (type === MANUAL_TYPE ? MANUAL_TYPE : AUTO_TYPE),
          updatedAt: Date.now(),
        };
        configCache.set(key, config);
        return config;
      }
    } catch {}
    configCache.set(key, null);
    return null;
  },

  /** 设置自定义音源 */
  async setConfig(songId: string | number, sources: string[], type: 'manual' | 'auto' = 'manual') {
    const key = `${KEY_PREFIX}${songId}`;
    const config: SongSourceConfig = { sources, type, updatedAt: Date.now() };
    configCache.set(key, config);
    // 标记为手动时清除已尝试记录
    if (type === 'manual') triedSourcesMap.delete(String(songId));
    try {
      await getStorageAdapter().setItem(key, JSON.stringify(sources));
      await getStorageAdapter().setItem(key + TYPE_SUFFIX, type);
    } catch {}
  },

  /** 清除自定义配置（恢复全局默认） */
  async clearConfig(songId: string | number) {
    const key = `${KEY_PREFIX}${songId}`;
    configCache.delete(key);
    triedSourcesMap.delete(String(songId));
    try {
      await getStorageAdapter().multiRemove([key, key + TYPE_SUFFIX, key + TRIED_SUFFIX]);
    } catch {}
  },

  /** 是否有自定义配置 */
  async hasConfig(songId: string | number): Promise<boolean> {
    const config = await this.getConfig(songId);
    return config !== null && config.sources.length > 0;
  },

  /** 是否为手动选择 */
  async isManualConfig(songId: string | number): Promise<boolean> {
    const config = await this.getConfig(songId);
    return config?.type === 'manual';
  },

  // ─── 已尝试音源追踪 ───

  /** 记录某音源已尝试（当前会话） */
  markSourceTried(songId: string | number, source: string) {
    const key = String(songId);
    let set = triedSourcesMap.get(key);
    if (!set) {
      set = new Set<string>();
      triedSourcesMap.set(key, set);
    }
    set.add(source);
  },

  /** 某音源是否已尝试过 */
  isSourceTried(songId: string | number, source: string): boolean {
    return triedSourcesMap.get(String(songId))?.has(source) ?? false;
  },

  /** 清除某首歌的已尝试记录 */
  clearTriedSources(songId: string | number) {
    triedSourcesMap.delete(String(songId));
  },

  /** 获取已尝试的音源列表 */
  getTriedSources(songId: string | number): string[] {
    const set = triedSourcesMap.get(String(songId));
    return set ? Array.from(set) : [];
  },
};

/** 可用音源注册表 — 与 /song/url/match 的 source 参数对齐 */
export const AVAILABLE_SOURCES = [
  { key: 'bodian', label: '波动',    icon: 'radio' as const,    color: '#ff6600' },
  { key: 'qq',     label: 'QQ 音乐', icon: 'music-circle' as const, color: '#12b886' },
  { key: 'migu',   label: '咪咕',    icon: 'music-note' as const,   color: '#ff8c00' },
  { key: 'kugou',  label: '酷狗',    icon: 'music-note' as const,   color: '#2979ff' },
  { key: 'kuwo',   label: '酷我',    icon: 'music-note' as const,   color: '#ffa500' },
  { key: 'pyncmd', label: '网易云',  icon: 'cloud' as const,       color: '#ec4141' },
  { key: 'gdmusic',label: 'GD 音乐', icon: 'google' as const,      color: '#4285f4' },
] as const;
