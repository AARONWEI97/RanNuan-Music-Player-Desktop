import type { SongResult, ApiLyric } from '../types';
import request, { TOKEN_KEY } from './request';
import { getStorageAdapter } from '../storageAdapter';
import { useSettingsStore } from '../store/settingsStore';

export const fmTrash = (id: number) => {
  return request.post('/fm_trash', null, {
    params: { id, timestamp: Date.now() }
  });
};

export const getMusicQualityDetail = (id: number) => {
  return request.get('/song/music/detail', { params: { id } });
};

export const getMusicUrl = async (id: number, isDownloaded: boolean = false) => {
  const adapter = getStorageAdapter();
  const token = await adapter.getItem(TOKEN_KEY);
  const musicQuality = useSettingsStore.getState().musicQuality || 'higher';
  const encodeType = musicQuality === 'lossless' ? 'aac' : 'flac';
  const cookieWithOs = token && !token.startsWith('uid:') ? `${token} os=pc;` : undefined;

  if (isDownloaded && token && !token.startsWith('uid:')) {
    try {
      const url = '/song/download/url/v1';
      const res = await request.get(url, {
        params: {
          id,
          level: musicQuality,
          encodeType,
          cookie: `${token} os=pc;`
        }
      });

      if (res.data.data.url) {
        return { data: { data: [{ ...res.data.data }] } };
      }
    } catch (error) {
      console.error('error', error);
    }
  }

  return await request.get('/song/url/v1', {
    params: {
      id,
      level: musicQuality,
      encodeType,
      unblock: true,
      randomCNIP: true,
      ...(cookieWithOs ? { cookie: cookieWithOs } : {}),
    }
  });
};

export const getMusicDetail = (ids: Array<number>) => {
  return request.get('/song/detail', { params: { ids: ids.join(',') } });
};

export const getMusicLrc = async (id: number) => {
  const res = await request.get<ApiLyric>('/lyric/new', { params: { id } });
  return res;
};

export const getParsingMusicUrl = async (
  id: number,
  data: SongResult
): Promise<any> => {
  const adapter = getStorageAdapter();
  const token = await adapter.getItem(TOKEN_KEY);
  const musicQuality = useSettingsStore.getState().musicQuality || 'higher';
  const cookieWithOs = token && !token.startsWith('uid:') ? `${token} os=pc;` : undefined;
  return await request.get('/song/url/v1', {
    params: {
      id,
      level: musicQuality,
      encodeType: musicQuality === 'lossless' ? 'aac' : 'flac',
      unblock: true,
      randomCNIP: true,
      ...(cookieWithOs ? { cookie: cookieWithOs } : {}),
    }
  });
};

export const likeSong = (id: number, like: boolean = true) => {
  return request.get('/like', { params: { id, like } });
};

export const dislikeRecommendedSong = (id: number | string) => {
  return request.get('/recommend/songs/dislike', { params: { id } });
};

export const getLikedList = (uid: number) => {
  return request.get('/likelist', { params: { uid } });
};

export const createPlaylist = (params: { name: string; privacy: number }) => {
  return request.post('/playlist/create', params);
};

export const updatePlaylistTracks = (params: {
  op: 'add' | 'del';
  pid: number;
  tracks: string;
}) => {
  return request.post('/playlist/tracks', params);
};

export function getMusicListByType(type: string, id: string) {
  if (type === 'album') {
    return getAlbumDetail(Number(id));
  } else if (type === 'playlist') {
    return getPlaylistDetail(Number(id));
  }
  return Promise.reject(new Error('Unknown list type'));
}

export const getAlbumDetail = (id: number) => {
  return request.get('/album', { params: { id } });
};

export const getPlaylistDetail = (id: number) => {
  return request.get('/playlist/detail', { params: { id } });
};

export function subscribePlaylist(params: { t: number; id: number }) {
  return request({
    url: '/playlist/subscribe',
    method: 'post',
    params
  });
}

export function subscribeAlbum(params: { t: number; id: number }) {
  return request({
    url: '/album/sub',
    method: 'post',
    params
  });
}

export const getHistoryRecommendDates = () => {
  return request.get('/history/recommend/songs');
};

export const getHistoryRecommendSongs = (date: string) => {
  return request.get('/history/recommend/songs/detail', { params: { date } });
};

export function getIntelligenceList(params: { id: number; pid: number; sid?: number }) {
  return request({
    url: '/playmode/intelligence/list',
    method: 'get',
    params
  });
}

export function getPlaylistTrackAll(params: { id: number; limit?: number; offset?: number }) {
  return request({
    url: '/playlist/track/all',
    method: 'get',
    params: { id: params.id, limit: params.limit || 9999, offset: params.offset || 0 }
  });
}

export const getSongWiki = (id: number) => {
  return request.get('/song/wiki/summary', { params: { id } });
};

export const getSongCreators = (id: number) => {
  return request.get('/song/creators', { params: { id } });
};

export const getSongDynamicCover = (id: number) => {
  return request.get('/song/dynamic/cover', { params: { id } });
};

export const getSongChorus = (id: number) => {
  return request.get('/song/chorus', { params: { id } });
};

export const getSongCopyrightRcmd = (id: number) => {
  return request.get('/song/copyright/rcmd', { params: { id } });
};

export const getSongRedCount = (id: number) => {
  return request.get('/song/red/count', { params: { id } });
};

export const checkSongLike = (ids: number[]) => {
  return request.get('/song/like/check', { params: { ids: ids.join(',') } });
};

export const getSongDownloadUrl = (id: number, level?: string, encodeType?: string) => {
  return request.get('/song/download/url/v1', {
    params: { id, level, encodeType }
  });
};

export const matchSongUrl = (id: number, source?: string) => {
  return request.get('/song/url/match', { params: { id, ...(source ? { source } : {}) } });
};

export const getSheetList = () => {
  return request.get('/sheet/list');
};

export const getSheetPreview = (id: number) => {
  return request.get('/sheet/preview', { params: { id } });
};

export const setFmMode = (mode: string, subMode?: string) => {
  return request.get('/personal/fm/mode', {
    params: { mode, ...(subMode ? { submode: subMode } : {}) }
  });
};

export const getRecommendResource = () => {
  return request.get('/recommend/resource');
};
