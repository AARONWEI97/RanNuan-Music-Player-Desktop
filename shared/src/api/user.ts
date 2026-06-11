import type { IUserDetail, IUserFollow } from '../types';
import request from './request';

// ─── 用户详情/歌单/记录 ───
export function getUserDetail(uid: number) {
  return request.get('/user/detail', { params: { uid } });
}

export function getUserPlaylist(uid: number, limit: number = 30, offset: number = 0) {
  return request.get('/user/playlist', { params: { uid, limit, offset } });
}

export function getUserRecord(uid: number, type: number = 0) {
  return request.get('/user/record', {
    params: { uid, type },
    noRetry: true
  } as any);
}

// ─── 最近播放 ───
export function getRecentSongs(limit: number = 100) {
  return request.get('/record/recent/song', {
    params: { limit },
    noRetry: true
  } as any);
}

export function getRecentPlaylists(limit: number = 100) {
  return request.get('/record/recent/playlist', {
    params: { limit },
    noRetry: true
  } as any);
}

export function getRecentAlbums(limit: number = 100) {
  return request.get('/record/recent/album', {
    params: { limit },
    noRetry: true
  } as any);
}

// ─── 关注/粉丝 ───
export function getUserFollows(uid: number, limit: number = 30, offset: number = 0) {
  return request.get('/user/follows', { params: { uid, limit, offset } });
}

export function getUserFollowers(uid: number, limit: number = 30, offset: number = 0) {
  return request.post('/user/followeds', { uid, limit, offset });
}

// ─── 关注/取消关注用户 ───
export function followUser(id: number, t: number = 1) {
  return request.get('/follow', { params: { id, t } });
}

// ─── 是否互相关注 ───
export const checkMutualFollow = (uid: number) => {
  return request({ url: '/user/mutualfollow/get', method: 'get', params: { uid } });
};

// ─── 当前关注的用户/歌手（新版） ───
export const getFollowMixed = (params?: { size?: number; cursor?: number; scene?: number }) => {
  return request({
    url: '/user/follow/mixed',
    method: 'get',
    params: {
      size: params?.size || 30,
      cursor: params?.cursor || 0,
      scene: params?.scene || 0
    }
  });
};

// ─── 账号信息 ───
export const getUserAccount = () => {
  return request<any>({
    url: '/user/account',
    method: 'get'
  });
};

export const getUserDetailInfo = (params: { uid: string | number }) => {
  return request<IUserDetail>({
    url: '/user/detail',
    method: 'get',
    params
  });
};

// ─── 用户统计 ───
export const getUserSubcount = () => {
  return request({
    url: '/user/subcount',
    method: 'get'
  });
};

// ─── 用户等级 ───
export const getUserLevel = () => {
  return request({
    url: '/user/level',
    method: 'get'
  });
};

// ─── 用户绑定信息 ───
export const getUserBinding = (uid: number) => {
  return request({
    url: '/user/binding',
    method: 'get',
    params: { uid }
  });
};

// ─── 用户徽章 ───
export const getUserMedal = (uid: number) => {
  return request({
    url: '/user/medal',
    method: 'get',
    params: { uid }
  });
};

// ─── 用户动态 ───
export const getUserEvent = (params: { uid: number; limit?: number; lasttime?: number }) => {
  return request({
    url: '/user/event',
    method: 'get',
    params: {
      uid: params.uid,
      limit: params.limit || 30,
      lasttime: params.lasttime || -1
    }
  });
};

// ─── 用户电台 ───
export const getUserDj = (uid: number) => {
  return request({
    url: '/user/dj',
    method: 'get',
    params: { uid }
  });
};

// ─── 更新用户信息 ───
export const updateUserInfo = (params: {
  gender?: number;
  birthday?: number;
  nickname?: string;
  province?: number;
  city?: number;
  signature?: string;
}) => {
  return request({
    url: '/user/update',
    method: 'get',
    params
  });
};

// ─── 用户状态 ───
export const getUserSocialStatus = (uid?: number) => {
  return request({
    url: '/user/social/status',
    method: 'get',
    params: uid ? { uid } : {}
  });
};

export const getSocialStatusSupport = () => {
  return request({
    url: '/user/social/status/support',
    method: 'get'
  });
};

export const getSocialStatusRcmd = () => {
  return request({
    url: '/user/social/status/rcmd',
    method: 'get'
  });
};

export const editSocialStatus = (params: Record<string, any>) => {
  return request({
    url: '/user/social/status/edit',
    method: 'get',
    params
  });
};

// ─── 歌单列表 ───
export const getUserPlaylists = (params: { uid: string | number }) => {
  return request({
    url: '/user/playlist',
    method: 'get',
    params
  });
};

export const getUserCreatePlaylist = (params: { uid: number; limit?: number; offset?: number }) => {
  return request({
    url: '/user/playlist/create',
    method: 'get',
    params: {
      uid: params.uid,
      limit: params.limit || 100,
      offset: params.offset || 0
    }
  });
};

export const getUserCollectPlaylist = (params: { uid: number; limit?: number; offset?: number }) => {
  return request({
    url: '/user/playlist/collect',
    method: 'get',
    params: {
      uid: params.uid,
      limit: params.limit || 100,
      offset: params.offset || 0
    }
  });
};

// ─── 关注信息 ───
export const getUserFollowsInfo = (params: {
  uid: string | number;
  limit?: number;
  offset?: number;
}) => {
  return request<{
    follow: IUserFollow[];
    more: boolean;
  }>({
    url: '/user/follows',
    method: 'get',
    params
  });
};

// ─── 专辑收藏 ───
export const getUserAlbumSublist = (params?: { limit?: number; offset?: number }) => {
  return request({
    url: '/album/sublist',
    method: 'get',
    params: {
      limit: params?.limit || 25,
      offset: params?.offset || 0
    }
  });
};

// ─── 数字专辑 ───
export const getPurchasedAlbumList = (params?: { limit?: number; offset?: number }) => {
  return request({
    url: '/digitalAlbum/purchased',
    method: 'get',
    params: {
      limit: params?.limit || 30,
      offset: params?.offset || 0
    }
  });
};

// ─── 已购单曲 ───
export const getPurchasedSongs = (params?: { limit?: number; offset?: number }) => {
  return request({
    url: '/song/purchased',
    method: 'get',
    params: {
      limit: params?.limit || 20,
      offset: params?.offset || 0
    }
  });
};

// ─── 关注歌手新歌/新MV ───
export const getArtistNewSongs = (params?: { limit?: number; before?: number }) => {
  return request({
    url: '/artist/new/song',
    method: 'get',
    params: {
      limit: params?.limit || 20,
      before: params?.before
    }
  });
};

export const getArtistNewMv = (params?: { limit?: number; before?: number }) => {
  return request({
    url: '/artist/new/mv',
    method: 'get',
    params: {
      limit: params?.limit || 20,
      before: params?.before
    }
  });
};

// ─── DJ/电台 ───
export const getDjSublist = (params?: { limit?: number; offset?: number }) => {
  return request({
    url: '/dj/sublist',
    method: 'get',
    params: {
      limit: params?.limit || 30,
      timestamp: Date.now()
    }
  });
};

export const getDjProgram = (params: { rid: number; limit?: number; offset?: number; asc?: boolean }) => {
  return request({
    url: '/dj/program',
    method: 'get',
    params: {
      rid: params.rid,
      limit: params.limit || 30,
      offset: params.offset || 0,
      asc: params.asc ? 'true' : 'false',
      timestamp: Date.now()
    }
  });
};

export const getDjDetail = (rid: number) => {
  return request({
    url: '/dj/detail',
    method: 'get',
    params: { rid, timestamp: Date.now() }
  });
};

export const getRecentDj = (limit: number = 100) => {
  return request({
    url: '/record/recent/dj',
    method: 'get',
    params: { limit }
  });
};

// ─── 头像上传 ───
export const uploadAvatar = (uri: string, imgSize?: number) => {
  const formData = new FormData();
  const fileName = uri.split('/').pop() || 'avatar.jpg';
  const fileType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';
  formData.append('imgFile', {
    uri,
    name: fileName,
    type: fileType,
  } as any);
  if (imgSize) formData.append('imgSize', String(imgSize));

  return request({
    url: '/avatar/upload',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 30000,
  });
};
