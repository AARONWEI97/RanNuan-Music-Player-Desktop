import axios from 'axios';

import type { SongResult } from '../types';
import request, { TOKEN_KEY } from '../api/request';
import { getStorageAdapter } from '../storageAdapter';
import { SourceConfigManager } from './SongSourceConfigManager';

const URL_CACHE_PREFIX = 'music_url_cache_';
const URL_CACHE_EXPIRY = 30 * 60 * 1000;
const URL_CACHE_EXPIRY_MANUAL = 24 * 60 * 60 * 1000; // ★ 手动解析结果缓存 24 小时

/**
 * ★ 内存级失败缓存（与桌面端 CacheManager.failedCacheMap 对齐）
 * 记录策略+歌曲的失败组合，短时间内跳过重试
 * key: `${strategyName}:${songId}`, value: 失败时间戳
 */
const FAILED_CACHE_TIME = 1 * 60 * 1000; // 1分钟
const failedCacheMap = new Map<string, number>();

function isStrategyFailed(strategyName: string, songId: string | number): boolean {
  const key = `${strategyName}:${songId}`;
  const failTime = failedCacheMap.get(key);
  if (!failTime) return false;
  if (Date.now() - failTime > FAILED_CACHE_TIME) {
    failedCacheMap.delete(key);
    return false;
  }
  return true;
}

function markStrategyFailed(strategyName: string, songId: string | number): void {
  const key = `${strategyName}:${songId}`;
  failedCacheMap.set(key, Date.now());
}

// Fallback remote music API — same mechanism as desktop's VITE_API_MUSIC
const FALLBACK_MUSIC_API = 'https://music-api.gdstudio.xyz';

interface MusicSourceStrategy {
  name: string;
  priority: number;
  enabled: boolean;
  parse(id: string | number, songData: SongResult, quality: string): Promise<string | null>;
}

class OfficialApiStrategy implements MusicSourceStrategy {
  name = 'official';
  priority = 0;
  // ★ 当前服务端 unblock=true 不生效，暂时禁用，直接走 /song/url/match
  // 每首歌省掉一次注定返回试听 URL 的 HTTP 请求
  enabled = false;

  async parse(id: string | number, songData: SongResult, quality: string): Promise<string | null> {
    try {
      const token = await getStorageAdapter().getItem(TOKEN_KEY);
      const cookieWithOs = token && !token.startsWith('uid:') ? `${token} os=pc;` : undefined;
      const res = await request.get('/song/url/v1', {
        params: {
          id,
          level: quality,
          unblock: true,
          randomCNIP: true,
          ...(cookieWithOs ? { cookie: cookieWithOs } : {}),
        },
      });
      const url = res?.data?.data?.[0]?.url;
      const isTrial = !!res?.data?.data?.[0]?.freeTrialInfo;
      if (url && !isTrial) {
        console.log(`[MusicParser] Official API returned full URL for "${songData.name}"`);
        return url;
      }
      if (isTrial) {
        console.log(`[MusicParser] Official API returned trial URL for "${songData.name}", skipping`);
      } else {
        console.log(`[MusicParser] Official API returned no URL for "${songData.name}"`);
      }
    } catch (e) {
      console.warn(`[MusicParser] Official API error:`, e);
    }
    return null;
  }
}

class CustomApiStrategy implements MusicSourceStrategy {
  name = 'custom';
  priority = 1;
  // 未配置自定义 API，暂时禁用
  enabled = false;

  async parse(id: string | number, songData: SongResult, quality: string): Promise<string | null> {
    try {
      const customApiUrl = await getStorageAdapter().getItem('custom_api_url');
      if (!customApiUrl) {
        console.log(`[MusicParser] Custom API not configured, skipping`);
        return null;
      }

      const res = await axios.get(customApiUrl, {
        params: { id, type: 'song' },
        timeout: 10000,
      });

      const data = res.data;
      const url = data?.url || data?.data?.url || (Array.isArray(data?.data) && data.data[0]?.url);
      if (url) {
        console.log(`[MusicParser] Custom API found URL for "${songData.name}"`);
        return url;
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.warn(`[MusicParser] Custom API error:`, errMsg);
    }
    return null;
  }
}

/**
 * UnblockApiMatch strategy — calls /song/url/match (API server built-in unblock)
 * Uses @unblockneteasemusic/server on the backend to match from migu/kugou/kuwo CDN
 * This is the mobile equivalent of the desktop's local UnblockMusicStrategy
 *
 * ★ API 文档支持 source 参数：/song/url/match?id=xxx&source=migu
 * 不指定 source 时由服务端自动选择，但可能选不到最优源
 * 依次尝试 migu → kugou → kuwo → 不指定（与桌面端 ALL_PLATFORMS 对齐）
 */
class UnblockApiMatchStrategy implements MusicSourceStrategy {
  name = 'unblockMatch';
  priority = 2;
  enabled = true;

  async parse(id: string | number, songData: SongResult, quality: string): Promise<string | null> {
    // ★ 与服务器 unblock_test.html 支持的音源对齐
    // 服务器实际支持的 source: bodian, qq, migu, kugou, kuwo, pyncmd
    // bodian 实测有效，放第一位；不指定 source 的情况放最后作为兜底
    const sources = ['bodian', 'qq', 'migu', 'kugou', 'kuwo', 'pyncmd', undefined];

    for (const source of sources) {
      try {
        const params: Record<string, any> = { id };
        if (source) {
          params.source = source;
        }
        const res = await request.get('/song/url/match', { params });
        // ★★★ 修复：/song/url/match 返回的是对象 data.url，不是数组 data[0].url ★★★
        const url = res?.data?.data?.url;
        if (url) {
          console.log(`[MusicParser] UnblockApiMatch (${source || 'auto'}) found URL for "${songData.name}"`);
          return url;
        }
        if (source) {
          console.log(`[MusicParser] UnblockApiMatch (${source}): no URL for "${songData.name}"`);
        }
      } catch (e) {
        console.warn(`[MusicParser] UnblockApiMatch (${source || 'auto'}) error:`, e instanceof Error ? e.message : String(e));
      }
    }

    console.log(`[MusicParser] UnblockApiMatch: all sources failed for "${songData.name}"`);
    return null;
  }

  /** 用指定单个 source 强制解析 */
  async parseWithSource(
    id: string | number,
    songData: SongResult,
    quality: string,
    forcedSource: string,
  ): Promise<string | null> {
    try {
      const params: Record<string, any> = { id, source: forcedSource };
      const res = await request.get('/song/url/match', { params });
      const url = res?.data?.data?.url;
      if (url) {
        console.log(`[MusicParser] UnblockApiMatch (${forcedSource}) found URL for "${songData.name}"`);
        return url;
      }
    } catch (e) {
      console.warn(`[MusicParser] UnblockApiMatch (${forcedSource}) error:`, e instanceof Error ? e.message : String(e));
    }
    return null;
  }
}

/**
 * GDMusic strategy — exactly aligned with desktop version
 * Desktop uses: https://music-api.gdstudio.xyz/api.php
 * Two-step: search → get URL (same as desktop's searchAndGetUrl)
 * Key differences from previous mobile impl:
 *   - br parameter: '999' (numeric) NOT '320k' (desktop sends numeric)
 *   - source for URL step: use searchResult.source (not original source)
 *   - trackId: only use matched.id (never matched.url which is NOT a track ID)
 *   - search query: "songName artistName" (desktop order)
 *   - count: 1 (desktop default)
 */
class GDMusicStrategy implements MusicSourceStrategy {
  name = 'gdmusic';
  priority = 3;
  enabled = true;

  async parse(id: string | number, songData: SongResult, quality: string): Promise<string | null> {
    try {
      const songName = songData.name || '';
      let artistNames = '';
      if (songData.ar && Array.isArray(songData.ar)) {
        artistNames = songData.ar.map((a: any) => a.name).join(' ');
      } else if ((songData as any).artists && Array.isArray((songData as any).artists)) {
        artistNames = (songData as any).artists.map((a: any) => a.name).join(' ');
      }

      const searchQuery = `${songName} ${artistNames}`.trim();
      if (!searchQuery) return null;

      // Desktop uses br=999 (numeric) for all qualities
      const br = '999';

      // ★ 调整源优先级与桌面端对齐：netease → joox → tidal
      // joox 返回的 URL 不稳定（常出现 Source error），netease 更可靠
      // 桌面端顺序: joox → tidal → netease，但 netease 在国内更稳定
      const sources = ['netease', 'joox', 'tidal'];

      for (const source of sources) {
        try {
          // Step 1: Search — increase count to 3 for better matching
          const searchUrl = `${FALLBACK_MUSIC_API}/api.php?types=search&source=${source}&name=${encodeURIComponent(searchQuery)}&count=3&pages=1`;
          console.log(`[MusicParser] GDMusic (${source}) searching: ${searchQuery}`);

          const searchRes = await axios.get(searchUrl, { timeout: 10000 });

          const searchData = searchRes.data;
          if (!Array.isArray(searchData) || searchData.length === 0) {
            console.log(`[MusicParser] GDMusic (${source}): no search results`);
            continue;
          }

          const firstResult = searchData[0];
          if (!firstResult || !firstResult.id) {
            console.log(`[MusicParser] GDMusic (${source}): search result invalid (no id)`);
            continue;
          }

          const trackId = firstResult.id;
          const trackSource = firstResult.source || source;

          // Step 2: Get URL — using trackSource from search result (desktop behavior)
          // Encode trackId for safe URL (joox IDs contain base64 '==' chars)
          const songUrl = `${FALLBACK_MUSIC_API}/api.php?types=url&source=${trackSource}&id=${encodeURIComponent(String(trackId))}&br=${br}`;
          console.log(`[MusicParser] GDMusic getting URL from ${trackSource}, id=${trackId}`);

          const urlRes = await axios.get(songUrl, { timeout: 10000 });

          if (urlRes.data && urlRes.data.url) {
            console.log(`[MusicParser] GDMusic (${trackSource}) found URL for "${songData.name}"`);
            return urlRes.data.url;
          } else {
            console.log(`[MusicParser] GDMusic (${trackSource}): no URL in response`);
          }
        } catch (e) {
          console.warn(`[MusicParser] GDMusic (${source}) failed:`, e instanceof Error ? e.message : String(e));
        }
      }

      console.log(`[MusicParser] GDMusic: no URL found for "${songData.name}" from any source`);
    } catch (e) {
      console.warn(`[MusicParser] GDMusic error:`, e instanceof Error ? e.message : String(e));
    }
    return null;
  }
}

class LxMusicStrategy implements MusicSourceStrategy {
  name = 'lxMusic';
  priority = 4;
  enabled = true;

  async parse(id: string | number, songData: SongResult, quality: string): Promise<string | null> {
    try {
      const songName = songData.name;
      const artistName = songData.ar?.map((a) => a.name).join(' ') || '';
      if (!songName || !artistName) return null;

      const lxApiUrl = await getStorageAdapter().getItem('lxmusic_api_url');
      const baseUrl = lxApiUrl || 'https://lxmusicapi.pages.dev';

      // Quick connectivity check — LxMusic public API is often down
      try {
        await axios.get(baseUrl, { timeout: 3000 });
      } catch {
        if (!lxApiUrl) {
          console.log(`[MusicParser] LxMusic: public API unreachable, skipping (configure custom URL in settings)`);
          return null;
        }
      }

      const searchRes = await axios.get(`${baseUrl}/search`, {
        params: { keywords: `${songName} ${artistName}`, limit: 5, page: 1 },
        timeout: 8000,
      });

      const songs = searchRes.data?.data?.songs || searchRes.data?.result?.songs;
      if (!Array.isArray(songs) || songs.length === 0) {
        console.log(`[MusicParser] LxMusic: no search results for "${songData.name}"`);
        return null;
      }

      const matched = songs.find(
        (item: any) =>
          String(item.songid || item.id) === String(id) ||
          item.name?.includes(songName)
      ) || songs[0];

      const matchId = matched.songid || matched.id;
      if (!matchId) return null;

      const qualityMap: Record<string, string> = {
        standard: '128',
        higher: '320',
        exhigh: '320',
        lossless: 'flac',
      };
      const lxQuality = qualityMap[quality] || '320';

      const urlRes = await axios.get(`${baseUrl}/url`, {
        params: { id: matchId, quality: lxQuality },
        timeout: 8000,
      });

      const url = urlRes.data?.data?.url || urlRes.data?.url;
      if (url) {
        console.log(`[MusicParser] LxMusic found URL for "${songData.name}"`);
        return url;
      }
    } catch (e) {
      console.warn(`[MusicParser] LxMusic error:`, e instanceof Error ? e.message : String(e));
    }
    return null;
  }
}

class UnblockMusicServiceStrategy implements MusicSourceStrategy {
  name = 'unblock';
  priority = 5;
  enabled = true;

  async parse(id: string | number, songData: SongResult, quality: string): Promise<string | null> {
    try {
      const unblockUrl = await getStorageAdapter().getItem('unblock_service_url');
      if (!unblockUrl) return null;

      const res = await axios.post(`${unblockUrl}/unblock`, {
        id: Number(id),
        quality,
      }, { timeout: 15000 });

      const url = res.data?.data?.url || res.data?.url;
      if (url) {
        console.log(`[MusicParser] Unblock service found URL for "${songData.name}"`);
        return url;
      }
    } catch (e) {
      console.warn(`[MusicParser] Unblock service error:`, e instanceof Error ? e.message : String(e));
    }
    return null;
  }
}

/**
 * Fallback remote API — searches by song name on gdstudio as last resort
 * Note: Cannot use netease song ID directly — gdstudio's URL endpoint
 * expects IDs from its OWN search results, not netease song IDs.
 * So we do a full search → get URL flow just like GDMusicStrategy,
 * but only as a final fallback with source=netease.
 */
class FallbackApiStrategy implements MusicSourceStrategy {
  name = 'fallback';
  priority = 6;
  enabled = true;

  async parse(id: string | number, songData: SongResult, quality: string): Promise<string | null> {
    try {
      const songName = songData.name || '';
      let artistNames = '';
      if (songData.ar && Array.isArray(songData.ar)) {
        artistNames = songData.ar.map((a: any) => a.name).join(' ');
      }

      const searchQuery = `${songName} ${artistNames}`.trim();
      if (!searchQuery) return null;

      // Step 1: Search on netease source as fallback
      const searchUrl = `${FALLBACK_MUSIC_API}/api.php?types=search&source=netease&name=${encodeURIComponent(searchQuery)}&count=1&pages=1`;
      console.log(`[MusicParser] Fallback API searching: ${searchQuery}`);

      const searchRes = await axios.get(searchUrl, { timeout: 10000 });
      const searchData = searchRes.data;

      if (!Array.isArray(searchData) || searchData.length === 0 || !searchData[0]?.id) {
        console.log(`[MusicParser] Fallback API: no search results`);
        return null;
      }

      const trackId = searchData[0].id;
      const trackSource = searchData[0].source || 'netease';

      // Step 2: Get URL
      const urlEndpoint = `${FALLBACK_MUSIC_API}/api.php?types=url&source=${trackSource}&id=${encodeURIComponent(String(trackId))}&br=999`;
      const urlRes = await axios.get(urlEndpoint, { timeout: 10000 });

      if (urlRes.data && urlRes.data.url) {
        console.log(`[MusicParser] Fallback API found URL for "${songData.name}"`);
        return urlRes.data.url;
      }
    } catch (e) {
      console.warn(`[MusicParser] Fallback API error:`, e instanceof Error ? e.message : String(e));
    }
    return null;
  }
}

export class MusicParser {
  strategies: MusicSourceStrategy[] = [];

  constructor() {
    this.strategies = [
      new OfficialApiStrategy(),
      new CustomApiStrategy(),
      new UnblockApiMatchStrategy(),
      new GDMusicStrategy(),
      new LxMusicStrategy(),
      new UnblockMusicServiceStrategy(),
      new FallbackApiStrategy(),
    ].sort((a, b) => a.priority - b.priority);
  }

  async parseMusic(
    id: string | number,
    songData: SongResult,
    quality: string = 'exhigh',
    skipOfficial: boolean = false
  ): Promise<string | null> {
    const cachedUrl = await this.getCachedUrl(id);
    if (cachedUrl) {
      console.log(`[MusicParser] Using cached URL for "${songData.name}"`);
      return cachedUrl;
    }

    for (const strategy of this.strategies) {
      if (!strategy.enabled) continue;
      if (skipOfficial && strategy.name === 'official') continue;
      // ★ 跳过近期已失败的策略+歌曲组合（1分钟内不重试）
      if (isStrategyFailed(strategy.name, id)) {
        console.log(`[MusicParser] Strategy "${strategy.name}" recently failed for "${songData.name}", skipping`);
        continue;
      }

      try {
        const url = await strategy.parse(id, songData, quality);
        if (url) {
          // ★ OfficialApiStrategy 返回试听 URL 时也会返回 url（但不应该缓存为完整）
          // 策略本身已经过滤了试听 URL（isTrial → return null），所以这里缓存的都是完整 URL
          await this.cacheUrl(id, url, false);
          return url;
        }
      } catch (e) {
        console.warn(`[MusicParser] Strategy "${strategy.name}" threw:`, e);
      }
      // ★ 策略返回 null 或抛异常，标记为失败
      markStrategyFailed(strategy.name, id);
    }

    console.warn(`[MusicParser] All strategies failed for "${songData.name}" (id: ${id})`);
    return null;
  }

  async getCachedUrl(id: string | number, skipTrial: boolean = true): Promise<string | null> {
    try {
      const cached = await getStorageAdapter().getItem(`${URL_CACHE_PREFIX}${id}`);
      if (!cached) return null;
      const { url, timestamp, isTrial, expiry } = JSON.parse(cached);
      const cacheExpiry = expiry || URL_CACHE_EXPIRY;
      if (Date.now() - timestamp > cacheExpiry) {
        await getStorageAdapter().removeItem(`${URL_CACHE_PREFIX}${id}`);
        return null;
      }
      // ★ 试听 URL 不应被缓存复用，跳过
      if (isTrial && skipTrial) {
        console.log(`[MusicParser] Cached URL is trial, skipping`);
        return null;
      }
      return url;
    } catch {
      return null;
    }
  }

  async cacheUrl(id: string | number, url: string, isTrial: boolean = false, expiry?: number): Promise<void> {
    try {
      await getStorageAdapter().setItem(
        `${URL_CACHE_PREFIX}${id}`,
        JSON.stringify({ url, timestamp: Date.now(), isTrial, expiry })
      );
    } catch {}
  }

  async clearCache(): Promise<void> {
    try {
      const keys = await getStorageAdapter().getAllKeys();
      const cacheKeys = keys.filter((k: string) => k.startsWith(URL_CACHE_PREFIX));
      if (cacheKeys.length > 0) {
        await getStorageAdapter().multiRemove(cacheKeys);
      }
    } catch {}
  }

  /** 获取音源解析缓存大小（字节） */
  async getCacheSize(): Promise<number> {
    try {
      const keys = await getStorageAdapter().getAllKeys();
      const cacheKeys = keys.filter((k: string) => k.startsWith(URL_CACHE_PREFIX));
      let totalSize = 0;
      for (const key of cacheKeys) {
        const value = await getStorageAdapter().getItem(key);
        if (value) {
          // key + value 的近似字节数（UTF-16 每字符 2 字节）
          totalSize += (key.length + value.length) * 2;
        }
      }
      return totalSize;
    } catch {
      return 0;
    }
  }

  /** 清除指定歌曲的 URL 缓存（播放失败时使用，避免复用坏 URL） */
  async invalidateCache(id: string | number): Promise<void> {
    try {
      await getStorageAdapter().removeItem(`${URL_CACHE_PREFIX}${id}`);
      console.log(`[MusicParser] 已清除歌曲 id=${id} 的缓存 URL`);
    } catch {}
  }

  /** 用指定音源强制重新解析 */
  async parseMusicWithSource(
    id: string | number,
    songData: SongResult,
    quality: string,
    forcedSource: string,
  ): Promise<string | null> {
    // 1. 清除缓存
    await this.invalidateCache(id);
    // 2. 清除失败标记
    failedCacheMap.clear();
    SourceConfigManager.clearTriedSources(id);

    console.log(`[MusicParser] Forced reparse with source "${forcedSource}" for "${songData.name}"`);

    // 3. 映射到策略
    const unblockSources = ['bodian', 'qq', 'migu', 'kugou', 'kuwo', 'pyncmd'];
    const strategyMap: Record<string, { strategy: MusicSourceStrategy; extraParam?: string }> = {
      gdmusic: { strategy: this.strategies.find((s) => s.name === 'gdmusic')! },
    };
    // 所有 unblock 源用同一个策略
    for (const src of unblockSources) {
      strategyMap[src] = { strategy: this.strategies.find((s) => s.name === 'unblockMatch')!, extraParam: src };
    }

    const entry = strategyMap[forcedSource];
    if (!entry || !entry.strategy) {
      console.warn(`[MusicParser] Unknown forced source: ${forcedSource}, falling back to normal parse`);
      return this.parseMusic(id, songData, quality, true);
    }

    try {
      // 对 unblock 源，直接调用 parseWithSource
      if (entry.extraParam) {
        const url = await (entry.strategy as UnblockApiMatchStrategy).parseWithSource(id, songData, quality, entry.extraParam);
        if (url) {
          await this.cacheUrl(id, url, false, URL_CACHE_EXPIRY_MANUAL);
          return url;
        }
      } else {
        const url = await entry.strategy.parse(id, songData, quality);
        if (url) {
          await this.cacheUrl(id, url, false, URL_CACHE_EXPIRY_MANUAL);
          return url;
        }
      }
    } catch (e) {
      console.warn(`[MusicParser] Forced source "${forcedSource}" failed:`, e);
    }

    return null;
  }

  setStrategyEnabled(name: string, enabled: boolean): void {
    const strategy = this.strategies.find((s) => s.name === name);
    if (strategy) {
      strategy.enabled = enabled;
    }
  }

  getStrategies(): { name: string; priority: number; enabled: boolean }[] {
    return this.strategies.map((s) => ({
      name: s.name,
      priority: s.priority,
      enabled: s.enabled,
    }));
  }
}

export const musicParser = new MusicParser();

export async function parseMusicUrl(
  id: string | number,
  songData: SongResult,
  quality: string = 'exhigh',
  skipOfficial: boolean = false
): Promise<string | null> {
  return musicParser.parseMusic(id, songData, quality, skipOfficial);
}
