import request from './request';

export const getNewAlbums = (params?: { limit?: number; offset?: number; area?: string; type?: string; year?: string; month?: string }) => {
  return request.get('/album/new', { params });
};
