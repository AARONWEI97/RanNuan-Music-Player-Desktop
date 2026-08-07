import request from './request';

/** 歌曲回忆坐标信息 */
export const getFirstListenInfo = (id: number) => {
  return request.get('/music/first/listen/info', { params: { id } });
};

/** 年度听歌报告 */
export const getAnnualSummary = (year: number) => {
  return request.get('/summary/annual', { params: { year } });
};

export type ListenReportPeriod = 'week' | 'month' | 'year';

/** 当前账号的年度听歌足迹 */
export const getListenYearReport = () => {
  return request.get('/listen/data/year/report');
};

/** 当前账号今日收听歌曲 */
export const getListenTodaySongs = () => {
  return request.get('/listen/data/today/song');
};

/** 当前账号周/月/年收听报告 */
export const getListenReport = (type: ListenReportPeriod, endTime?: number) => {
  return request.get('/listen/data/report', {
    params: { type, ...(endTime ? { endTime } : {}) },
  });
};

/** 音乐日历（歌曲、专辑和活动日程，不是用户听歌次数） */
export const getMusicCalendar = (startTime: number, endTime: number) => {
  return request.get('/calendar', { params: { startTime, endTime } });
};

/** 私人 DJ 推荐 */
export const getAidjContentRcmd = (longitude?: number, latitude?: number) => {
  return request.get('/aidj/content/rcmd', { params: { longitude, latitude } });
};

/** 跑步漫游 — 按步频推荐歌曲 */
export const getRadioSport = (bpm: number) => {
  return request.get('/radio/sport/get', { params: { bpm } });
};

/** 听歌识曲 — 音频指纹识别 */
export const matchAudio = (duration: number, audioFP: string) => {
  return request.post('/audio/match', { duration, audioFP });
};

/** 热门歌手榜单 */
export const getTopArtists = (params?: { type?: number; limit?: number; offset?: number }) => {
  return request.get('/top/artists', { params });
};

/** 歌手榜（type: 华语/欧美/韩国/日本） */
export const getToplistArtist = (type?: number) => {
  return request.get('/toplist/artist', { params: { type } });
};

/** 获取歌曲是否可用（检测版权） */
export const checkMusic = (id: number, br?: number) => {
  return request.get('/check/music', { params: { id, br } });
};
