export type Platform =
  | 'qq'
  | 'migu'
  | 'kugou'
  | 'kuwo'
  | 'pyncmd'
  | 'joox'
  | 'gdmusic'
  | 'lxMusic'
  | 'custom';

export const DEFAULT_PLATFORMS: Platform[] = ['lxMusic', 'migu', 'kugou', 'kuwo', 'pyncmd'];

export interface Artist {
  id: number;
  name: string;
  picUrl?: string;
  [key: string]: any;
}

export interface Album {
  id: number;
  name: string;
  picUrl?: string;
  [key: string]: any;
}

export interface IRecommendMusic {
  code: number;
  category: number;
  result: SongResult[];
}

export interface IWordData {
  text: string;
  startTime: number;
  duration: number;
  space?: boolean;
}

export interface ILyricText {
  text: string;
  trText: string;
  words?: IWordData[];
  hasWordByWord?: boolean;
  startTime?: number;
  duration?: number;
}

export interface ILyric {
  lrcTimeArray: number[];
  lrcArray: ILyricText[];
  hasWordByWord?: boolean;
}

export interface SongResult {
  id: string | number;
  name: string;
  picUrl: string;
  playCount?: number;
  song?: any;
  copywriter?: string;
  type?: number;
  canDislike?: boolean;
  program?: any;
  alg?: string;
  ar: Artist[];
  artists?: Artist[];
  al: Album;
  album?: Album;
  count: number;
  playMusicUrl?: string;
  playLoading?: boolean;
  lyric?: ILyric;
  dt?: number;
  duration?: number;
  source?: string;
  [key: string]: any;
}

export interface Song {
  name: string;
  id: number;
  ar: Artist[];
  al: Album;
  dt: number;
  [key: string]: any;
}

export interface IPlayMusicUrl {
  id: number;
  url: string;
  br: number;
  size: number;
  md5: string;
  code: number;
  type: string;
}

export interface IArtists {
  id: number;
  name: string;
  picUrl: string;
}
