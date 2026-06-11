import request from './request';

export function importPlaylist(params: {
  local?: string;
  text?: string;
  link?: string;
  importStarPlaylist?: boolean;
  playlistName?: string;
}) {
  // API docs: /playlist/import/name/task/create?text=${text}&link=${link}
  // Use POST with params in query string (same as mobile working version)
  console.log('[PlaylistAPI] importPlaylist request:', JSON.stringify({ ...params, text: params.text?.substring(0, 50), link: params.link?.substring(0, 80) }));
  return request({
    url: '/playlist/import/name/task/create',
    method: 'post',
    params,
  });
}

export function getImportTaskStatus(id: string | number) {
  return request({
    url: '/playlist/import/task/status',
    method: 'get',
    params: { id }
  });
}

export function deletePlaylist(id: number | string) {
  return request({
    url: '/playlist/delete',
    method: 'get',
    params: { id }
  });
}

export function updatePlaylistName(params: { id: number; name: string }) {
  return request.get('/playlist/name/update', { params });
}

export function updatePlaylistDesc(params: { id: number; desc: string }) {
  return request.get('/playlist/desc/update', { params });
}

export function updatePlaylistTags(params: { id: number; tags: string }) {
  return request.get('/playlist/tags/update', { params });
}

export function updatePlaylistCover(params: { id: number; imgFile: any }) {
  return request.post('/playlist/cover/update', params, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export function updatePlaylist(params: { id: number; name: string; desc?: string; tags?: string }) {
  return request.get('/playlist/update', { params });
}

/** 热门歌单分类 */
export function getHotPlaylistCategories() {
  return request.get('/playlist/hot');
}

/** 精品歌单标签列表 */
export function getHighqualityTags() {
  return request.get('/playlist/highquality/tags');
}

/** 调整歌单歌曲顺序 */
export function updatePlaylistOrder(params: { pid: number; ids: number[] }) {
  return request.post('/playlist/order/update', { params });
}

/** 歌单收藏者列表 */
export function getPlaylistSubscribers(params: { id: number; limit?: number; offset?: number }) {
  return request.get('/playlist/subscribers', { params });
}

/** 歌单详情动态（评论数/收藏数/播放数） */
export function getPlaylistDetailDynamic(id: number) {
  return request.get('/playlist/detail/dynamic', { params: { id } });
}

/** 更新歌单播放量 */
export function updatePlaylistPlaycount(id: number) {
  return request.post('/playlist/update/playcount', { params: { id } });
}

/** 相关歌单推荐 */
export function getPlaylistRcmd(id: number) {
  return request.get('/playlist/detail/rcmd/get', { params: { id } });
}
