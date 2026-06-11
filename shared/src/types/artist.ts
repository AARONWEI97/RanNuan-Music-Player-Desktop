export interface IArtistDetail {
  videoCount: number;
  vipRights: ArtistVipRights;
  identify: ArtistIdentify;
  artist: IArtist;
  blacklist: boolean;
  preferShow: number;
  showPriMsg: boolean;
  secondaryExpertIdentiy: ArtistSecondaryExpertIdentiy[];
  eventCount: number;
  user: ArtistUser;
}

interface ArtistUser {
  backgroundUrl: string;
  birthday: number;
  detailDescription: string;
  authenticated: boolean;
  gender: number;
  city: number;
  signature: null;
  description: string;
  remarkName: null;
  shortUserName: string;
  accountStatus: number;
  locationStatus: number;
  avatarImgId: number;
  defaultAvatar: boolean;
  province: number;
  nickname: string;
  expertTags: null;
  djStatus: number;
  avatarUrl: string;
  accountType: number;
  authStatus: number;
  vipType: number;
  userName: string;
  followed: boolean;
  userId: number;
  lastLoginIP: string;
  lastLoginTime: number;
  authenticationTypes: number;
  mutual: boolean;
  createTime: number;
  anchor: boolean;
  authority: number;
  backgroundImgId: number;
  userType: number;
  experts: null;
  avatarDetail: ArtistAvatarDetail;
}

interface ArtistAvatarDetail {
  userType: number;
  identityLevel: number;
  identityIconUrl: string;
}

interface ArtistSecondaryExpertIdentiy {
  expertIdentiyId: number;
  expertIdentiyName: string;
  expertIdentiyCount: number;
}

export interface IArtist {
  id: number;
  cover: string;
  avatar: string;
  name: string;
  transNames: any[];
  alias: any[];
  identities: any[];
  identifyTag: string[];
  briefDesc: string;
  rank: ArtistRank;
  albumSize: number;
  musicSize: number;
  mvSize: number;
  picUrl?: string;
}

interface ArtistRank {
  rank: number;
  type: number;
}

interface ArtistIdentify {
  imageUrl: string;
  imageDesc: string;
  actionUrl: string;
}

interface ArtistVipRights {
  rightsInfoDetailDtoList: ArtistRightsInfoDetailDtoList[];
  oldProtocol: boolean;
  redVipAnnualCount: number;
  redVipLevel: number;
  now: number;
}

interface ArtistRightsInfoDetailDtoList {
  vipCode: number;
  expireTime: number;
  iconUrl: null;
  dynamicIconUrl: null;
  vipLevel: number;
  signIap: boolean;
  signDeduct: boolean;
  signIapDeduct: boolean;
  sign: boolean;
}
