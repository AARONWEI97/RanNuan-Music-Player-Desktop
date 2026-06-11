import type { IAlbumNew, IRecommendMusic, ISearchKeyword, IHotSearch, IList } from '../types';
import request from './request';

interface IHotSingerParams {
  offset: number;
  limit: number;
}

interface IRecommendMusicParams {
  limit: number;
}

export const getHotSinger = (params: IHotSingerParams) => {
  return request.get<any>('/top/artists', { params });
};

export const getSearchKeyword = () => {
  return request.get<ISearchKeyword>('/search/default');
};

export const getHotSearch = () => {
  return request.get<IHotSearch>('/search/hot/detail');
};

export const getPlaylistCategory = () => {
  return request.get<any>('/playlist/catlist');
};

export const getRecommendMusic = (params: IRecommendMusicParams) => {
  return request.get<IRecommendMusic>('/personalized/newsong', { params });
};

export const getDayRecommend = () => {
  return request.get<any>('/recommend/songs');
};

export const getNewAlbum = () => {
  return request.get<IAlbumNew>('/album/newest');
};

export const getBanners = (type: number = 0) => {
  return request.get<any>('/banner', { params: { type } });
};

export const getPersonalizedPlaylist = (limit: number = 30) => {
  return request.get<any>('/personalized', { params: { limit } });
};

export const getPersonalFM = () => {
  return request.get<any>('/personal_fm');
};

export const getPrivateContent = () => {
  return request.get<any>('/personalized/privatecontent');
};

export const getPersonalizedMV = () => {
  return request.get<any>('/personalized/mv');
};

export const getTopAlbum = (params?: { limit?: number; offset?: number; area?: string }) => {
  return request.get<any>('/top/album', { params });
};

export const getPersonalizedDJ = () => {
  return request.get<any>('/personalized/djprogram');
};
