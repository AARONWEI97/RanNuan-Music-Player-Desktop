export interface IAlbumNew {
  code: number;
  albums: AlbumDetail[];
}

export interface AlbumDetail {
  name: string;
  id: number;
  type: string;
  size: number;
  picId: number;
  blurPicUrl: string;
  companyId: number;
  pic: number;
  picUrl: string;
  publishTime: number;
  description: string;
  tags: string;
  company: string;
  briefDesc: string;
  artist: AlbumArtist;
  songs?: any;
  alias: string[];
  status: number;
  copyrightId: number;
  commentThreadId: string;
  artists: AlbumListArtist[];
  paid: boolean;
  onSale: boolean;
  picId_str: string;
}

interface AlbumListArtist {
  name: string;
  id: number;
  picId: number;
  img1v1Id: number;
  briefDesc: string;
  picUrl: string;
  img1v1Url: string;
  albumSize: number;
  alias: any[];
  trans: string;
  musicSize: number;
  topicPerson: number;
  img1v1Id_str: string;
}

interface AlbumArtist {
  name: string;
  id: number;
  picId: number;
  img1v1Id: number;
  briefDesc: string;
  picUrl: string;
  img1v1Url: string;
  albumSize: number;
  alias: string[];
  trans: string;
  musicSize: number;
  topicPerson: number;
  picId_str?: string;
  img1v1Id_str: string;
  transNames?: string[];
}
