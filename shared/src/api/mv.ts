import request from './request';

export const getTopMv = (limit?: number, offset?: number, area?: string) => request.get('/top/mv', { params: { limit, offset, area } });
export const getAllMv = (params?: any) => request.get('/mv/all', { params });
export const getMvDetail = (mvid: number) => request.get('/mv/detail', { params: { mvid } });
export const getMvUrl = (id: number, r?: number) => request.get('/mv/url', { params: { id, r } });
