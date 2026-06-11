export interface ISearchKeyword {
  code: number;
  message?: any;
  data: SearchKeywordData;
}

interface SearchKeywordData {
  showKeyword: string;
  realkeyword: string;
  searchType: number;
  action: number;
  alg: string;
  gap: number;
  source?: any;
  bizQueryInfo: string;
}

export interface IHotSearch {
  code: number;
  data: HotSearchDatum[];
  message: string;
}

interface HotSearchDatum {
  searchWord: string;
  score: number;
  content: string;
  source: number;
  iconType: number;
  iconUrl?: string;
  url: string;
  alg: string;
}

export interface ISearchDetail {
  result: SearchResult;
  code: number;
}

interface SearchResult {
  song: SearchSongResult;
  code: number;
  mlog: SearchMlogResult;
  playList: SearchPlayListResult;
  artist: SearchArtistResult;
  album: SearchAlbumResult;
  video: SearchVideoResult;
  sim_query: SearchSimQueryResult;
  djRadio: SearchDjRadioResult;
  rec_type?: any;
  talk: SearchTalkResult;
  rec_query: null[];
  user: SearchUserResult;
  order: string[];
}

interface SearchUserResult {
  moreText: string;
  more: boolean;
  users: SearchUser[];
  resourceIds: number[];
}

interface SearchUser {
  defaultAvatar: boolean;
  province: number;
  authStatus: number;
  followed: boolean;
  avatarUrl: string;
  accountStatus: number;
  gender: number;
  city: number;
  birthday: number;
  userId: number;
  userType: number;
  nickname: string;
  signature: string;
  description: string;
  detailDescription: string;
  avatarImgId: number;
  backgroundImgId: number;
  backgroundUrl: string;
  authority: number;
  mutual: boolean;
  expertTags?: any;
  experts?: any;
  djStatus: number;
  vipType: number;
  remarkName?: any;
  authenticationTypes: number;
  avatarDetail?: any;
  avatarImgIdStr: string;
  backgroundImgIdStr: string;
  anchor: boolean;
  [key: string]: any;
}

interface SearchSongResult {
  songs: any[];
  more: boolean;
  [key: string]: any;
}

interface SearchMlogResult {
  mlogs: any[];
  more: boolean;
  [key: string]: any;
}

interface SearchPlayListResult {
  playlists: any[];
  more: boolean;
  [key: string]: any;
}

interface SearchArtistResult {
  artists: any[];
  more: boolean;
  [key: string]: any;
}

interface SearchAlbumResult {
  albums: any[];
  more: boolean;
  [key: string]: any;
}

interface SearchVideoResult {
  videos: any[];
  more: boolean;
  [key: string]: any;
}

interface SearchSimQueryResult {
  sim_querys: any[];
  [key: string]: any;
}

interface SearchDjRadioResult {
  djRadios: any[];
  more: boolean;
  [key: string]: any;
}

interface SearchTalkResult {
  talks: any[];
  more: boolean;
  [key: string]: any;
}
