import request from './request';

export const getStyleList = () => request.get('/style/list');
export const getStylePreference = () => request.get('/style/preference');
export const getStyleDetail = (tagId: number) => request.get('/style/detail', { params: { tagId } });
export const getStyleSong = (tagId: number, size?: number) => request.get('/style/song', { params: { tagId, size } });
export const getStyleAlbum = (tagId: number, size?: number) => request.get('/style/album', { params: { tagId, size } });
export const getStylePlaylist = (tagId: number, size?: number) => request.get('/style/playlist', { params: { tagId, size } });
export const getStyleArtist = (tagId: number, size?: number) => request.get('/style/artist', { params: { tagId, size } });
