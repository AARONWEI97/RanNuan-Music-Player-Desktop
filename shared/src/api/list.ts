import request from './request';

export const getListByTag = (params?: any) => request.get('/playlist/list', { params });
export const getListByCat = (params?: any) => request.get('/playlist/cat', { params });
export const getRecommendList = (limit?: number) => request.get('/personalized', { params: { limit } });
export const getListDetail = (id: number) => request.get('/playlist/detail', { params: { id } });
export const getAlbumList = (params?: any) => request.get('/album/list', { params });
export const getToplist = () => request.get('/toplist');
