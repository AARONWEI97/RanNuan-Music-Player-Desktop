import request from './request';

export const getSimiSong = (id: number) => request.get('/simi/song', { params: { id } });
export const getSimiPlaylist = (id: number) => request.get('/simi/playlist', { params: { id } });
export const getSimiMv = (mvid: number) => request.get('/simi/mv', { params: { mvid } });
export const getSimiArtist = (id: number) => request.get('/simi/artist', { params: { id } });
export const getSimiUser = (id: number) => request.get('/simi/user', { params: { id } });
