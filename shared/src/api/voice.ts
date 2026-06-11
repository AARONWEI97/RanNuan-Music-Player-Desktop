import request from './request';

export const searchVoiceList = (params?: any) => request.get('/voice/search', { params });
export const getVoiceList = (params?: any) => request.get('/voice/list', { params });
export const searchVoiceInList = (params?: any) => request.get('/voice/list/search', { params });
export const getVoiceDetail = (params?: any) => request.get('/voice/detail', { params });
export const updateVoiceOrder = (params?: any) => request.get('/voice/order/update', { params });
export const getVoiceListDetail = (params?: any) => request.get('/voice/list/detail', { params });
export const deleteVoice = (params?: any) => request.get('/voice/delete', { params });
export const uploadVoice = (params?: any) => request.get('/voice/upload', { params });
export const getVoiceLyric = (params?: any) => request.get('/voice/lyric', { params });
export const getMyCreatedVoiceList = () => request.get('/voice/my/list');
