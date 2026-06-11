export interface IMvItem {
  id: number;
  cover: string;
  name: string;
  playCount: number;
  briefDesc?: any;
  desc?: any;
  artistName: string;
  artistId: number;
  duration: number;
  mark: number;
  mv: IMvData;
  lastRank: number;
  score: number;
  subed: boolean;
  artists: MvArtist[];
  transNames?: string[];
  alias?: string[];
}

export interface IMvData {
  authId: number;
  status: number;
  id: number;
  title: string;
  subTitle: string;
  appTitle: string;
  aliaName: string;
  transName: string;
  pic4v3: number;
  pic16v9: number;
  caption: number;
  captionLanguage: string;
  style?: any;
  mottos: string;
  oneword?: any;
  appword: string;
  stars?: any;
  desc: string;
  area: string;
  type: string;
  subType: string;
  neteaseonly: number;
  upban: number;
  topWeeks: string;
  publishTime: string;
  online: number;
  score: number;
  plays: number;
  monthplays: number;
  weekplays: number;
  dayplays: number;
  fee: number;
  artists: MvArtist[];
  videos: MvVideo[];
}

interface MvVideo {
  tagSign: MvTagSign;
  tag: string;
  url: string;
  duration: number;
  size: number;
  width: number;
  height: number;
  container: string;
  md5: string;
  check: boolean;
}

interface MvTagSign {
  br: number;
  type: string;
  tagSign: string;
  resolution: number;
  mvtype: string;
}

interface MvArtist {
  id: number;
  name: string;
}

export interface IMvUrlData {
  id: number;
  url: string;
  r: number;
  size: number;
  md5: string;
  code: number;
  expi: number;
  fee: number;
  mvFee: number;
  st: number;
  promotionVo: null | any;
  msg: string;
}
