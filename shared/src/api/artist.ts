import request from './request';

// ─── 歌手详情 ───
export const getArtistDetail = (id: number | string) => {
  return request.get('/artist/detail', { params: { id } });
};

// ─── 歌手详情动态 ───
export const getArtistDetailDynamic = (id: number | string) => {
  return request.get('/artist/detail/dynamic', { params: { id } });
};

// ─── 歌手描述 ───
export const getArtistDesc = (id: number | string) => {
  return request.get('/artist/desc', { params: { id } });
};

// ─── 歌手热门 50 首 ───
export const getArtistTopSong = (id: number | string) => {
  return request.get('/artist/top/song', { params: { id } });
};

// ─── 歌手全部歌曲（分页+排序） ───
export const getArtistSongs = (params: { id: number | string; limit?: number; offset?: number; order?: 'hot' | 'time' }) => {
  return request.get('/artist/songs', { params });
};

export const getArtistTopSongs = (params: { id: number | string; limit?: number; offset?: number }) => {
  return request.get('/artist/songs', {
    params: {
      ...params,
      order: 'hot'
    }
  });
};

// ─── 歌手专辑 ───
export const getArtistAlbums = (params: { id: number | string; limit?: number; offset?: number }) => {
  return request.get('/artist/album', { params });
};

// ─── 歌手 MV ───
export const getArtistMv = (params: { id: number | string; limit?: number; offset?: number }) => {
  return request.get('/artist/mv', { params });
};

// ─── 歌手视频 ───
export const getArtistVideo = (params: { id: number | string; size?: number; cursor?: number; order?: number }) => {
  return request.get('/artist/video', {
    params: {
      id: params.id,
      size: params.size || 10,
      cursor: params.cursor || 0,
      order: params.order || 0,
    }
  });
};

// ─── 收藏/取消收藏歌手 ───
export const subscribeArtist = (id: number | string, t: number = 1) => {
  return request.get('/artist/sub', { params: { id, t } });
};

// ─── 收藏的歌手列表 ───
export const getArtistSublist = (params?: { limit?: number; offset?: number }) => {
  return request.get('/artist/sublist', {
    params: {
      limit: params?.limit || 25,
      offset: params?.offset || 0,
    }
  });
};

// ─── 歌手粉丝 ───
export const getArtistFans = (params: { id: number | string; limit?: number; offset?: number }) => {
  return request.get('/artist/fans', { params });
};

// ─── 歌手粉丝数量 ───
export const getArtistFollowCount = (id: number | string) => {
  return request.get('/artist/follow/count', { params: { id } });
};

// ─── 歌手分类列表 ───
export const getArtistList = (params: {
  type?: number;   // -1:全部 1:男 2:女 3:乐队
  area?: number;   // -1:全部 7:华语 96:欧美 8:日本 16:韩国 0:其他
  initial?: number | string; // 首字母索引
  limit?: number;
  offset?: number;
}) => {
  return request.get('/artist/list', {
    params: {
      type: params.type ?? -1,
      area: params.area ?? -1,
      initial: params.initial,
      limit: params.limit || 30,
      offset: params.offset || 0,
    }
  });
};
