import request from './request';

// ── 歌曲评论 ──
export const getMusicComment = (params: {
  id: number; limit?: number; offset?: number; before?: number;
}) => request.get('/comment/music', { params });

// ── 歌单评论 ──
export const getPlaylistComment = (params: {
  id: number; limit?: number; offset?: number; before?: number;
}) => request.get('/comment/playlist', { params });

// ── 专辑评论 ──
export const getAlbumComment = (params: {
  id: number; limit?: number; offset?: number; before?: number;
}) => request.get('/comment/album', { params });

// ── MV 评论 ──
export const getMvComment = (params: {
  id: number; limit?: number; offset?: number; before?: number;
}) => request.get('/comment/mv', { params });

// ── 热门评论 ──
export const getHotComment = (params: {
  id: number; type: number; limit?: number; offset?: number;
}) => request.get('/comment/hot', { params });

// ── 楼层评论（回复列表）──
export const getFloorComment = (params: {
  parentCommentId: number; id: number; type: number; limit?: number;
}) => request.get('/comment/floor', { params });

// ── 发表/删除评论 ──
export const sendComment = (params: {
  t: 1 | 2 | 0;   // 1=发送 2=回复 0=删除
  type: number;     // 0=歌曲 1=mv 2=歌单 3=专辑 4=电台 5=视频 6=动态
  id: number;
  content: string;
  commentId?: number; // t=2时，回复的评论ID
}) => request.post('/comment', params);

// ── 点赞评论 ──
export const likeComment = (params: {
  id: number; cid: number; t: 1 | 0; type: number;
}) => request.get('/comment/like', { params });

// ── 云村热评 ──
export const getHotwallComment = (params: { limit?: number }) =>
  request.get('/comment/hotwall/list', { params });

// ── 用户评论历史 ──
export const getUserCommentHistory = (params: {
  uid: number; limit?: number; time?: number;
}) => request.get('/user/comment/history', { params });

// ── 动态评论 ──
export const getEventComment = (params: {
  threadId: string; limit?: number; offset?: number;
}) => request.get('/comment/event', { params });

// ── 新版评论接口（分页+排序：推荐/热度/时间）──
export const getNewComment = (params: {
  id: number;
  type: number;
  pageNo?: number;
  pageSize?: number;
  sortType?: 2 | 3 | 99; // 2=热度 3=时间 99=推荐
  cursor?: string;
}) => request.get('/comment/new', { params });

// ── 视频评论 ──
export const getVideoComment = (params: {
  id: number; limit?: number; offset?: number; before?: number;
}) => request.get('/comment/video', { params });

// ── 电台节目评论 ──
export const getDjComment = (params: {
  id: number; limit?: number; offset?: number; before?: number;
}) => request.get('/comment/dj', { params });

// ── 批量评论统计 ──
export const getCommentInfoList = (type: number, ids: number[]) =>
  request.get('/comment/info/list', { params: { type, ids: ids.join(',') } });

// ── 举报评论 ──
export const reportComment = (params: {
  id: number;       // 资源id
  cid: number;      // 评论id
  reason: string;   // 举报原因
  type: number;     // 资源类型
}) => request.post('/comment/report', params);

// ── 抱一抱评论 ──
export const hugComment = (params: {
  uid: number;
  cid: number;
  sid: number;
}) => request.post('/hug/comment', params);

// ── 抱一抱列表 ──
export const getCommentHugList = (params: {
  uid: number;
  cid: number;
  sid: number;
  limit?: number;
  offset?: number;
}) => request.get('/comment/hug/list', { params });
