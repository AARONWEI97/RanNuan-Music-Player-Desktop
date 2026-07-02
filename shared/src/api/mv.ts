import request from './request';

export const getTopMv = (limit?: number, offset?: number, area?: string) => request.get('/top/mv', { params: { limit, offset, area } });
export const getAllMv = (params?: any) => request.get('/mv/all', { params });
export const getMvDetail = (mvid: number) => request.get('/mv/detail', { params: { mvid } });
export const getMvUrl = (id: number, r?: number) => request.get('/mv/url', { params: { id, r } });

export const getVideoGroupList = () => request.get('/video/group/list');
export const getVideoCategoryList = () => request.get('/video/category/list');
export const getVideoGroup = (id: number | string, offset?: number) => request.get('/video/group', { params: { id, offset } });
export const getVideoTimelineAll = (offset?: number) => request.get('/video/timeline/all', { params: { offset } });
export const getVideoTimelineRecommend = (offset?: number) => request.get('/video/timeline/recommend', { params: { offset } });
export const getRelatedAllVideo = (id: number | string) => request.get('/related/allvideo', { params: { id } });
export const getVideoDetail = (id: number | string) => request.get('/video/detail', { params: { id } });
export const getVideoDetailInfo = (vid: number | string) => request.get('/video/detail/info', { params: { vid } });
export const getVideoUrl = (id: number | string, resolution?: number) => request.get('/video/url', { params: { id, resolution } });
