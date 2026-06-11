import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getStorageAdapter } from '../storageAdapter';
import { TOKEN_KEY } from '../api/request';
import {
  getUserAccount,
  getUserPlaylist,
  getUserSubcount,
  getUserLevel,
  followUser,
  getUserCreatePlaylist,
  getUserCollectPlaylist,
  getUserSocialStatus,
  getUserBinding,
  getFollowMixed,
} from '../api/user';
import { logout as apiLogout } from '../api/login';

interface UserData {
  userId: number;
  nickname?: string;
  avatarUrl?: string;
  backgroundUrl?: string;
  vipType?: number;
  profile?: any;
  account?: any;
  [key: string]: any;
}

interface UserPlaylist {
  id: number;
  name: string;
  coverImgUrl: string;
  trackCount: number;
  playCount: number;
  creator?: { nickname: string };
  subscribed?: boolean;
}

interface UserState {
  user: UserData | null;
  loginType: 'token' | 'cookie' | 'qr' | 'uid' | 'phone' | 'guest' | null;
  collectedAlbumIds: Set<number>;
  playlists: UserPlaylist[];
  playlistsLoading: boolean;
  createdPlaylists: UserPlaylist[];
  collectedPlaylists: UserPlaylist[];
  followingMap: Record<number, boolean>;
}

interface UserActions {
  setUser: (userData: UserData) => void;
  setLoginType: (type: UserState['loginType']) => void;
  handleLogout: () => Promise<void>;
  addCollectedAlbum: (albumId: number) => void;
  removeCollectedAlbum: (albumId: number) => void;
  isAlbumCollected: (albumId: number) => boolean;
  fetchUserPlaylists: () => Promise<void>;
  fetchCreatedPlaylists: () => Promise<void>;
  fetchCollectedPlaylists: () => Promise<void>;
  toggleFollow: (userId: number, currentFollowed: boolean) => Promise<boolean>;
  checkLoginStatus: () => Promise<boolean>;
}

export const useUserStore = create<UserState & UserActions>()(
  persist(
    (set, get) => ({
      user: null,
      loginType: null,
      collectedAlbumIds: new Set<number>(),
      playlists: [],
      playlistsLoading: false,
      createdPlaylists: [],
      collectedPlaylists: [],
      followingMap: {},

      setUser: (userData) => set({ user: userData }),
      setLoginType: (type) => set({ loginType: type }),

      handleLogout: async () => {
        try {
          await apiLogout();
        } catch {}
        try {
          const adapter = getStorageAdapter();
          await adapter.removeItem(TOKEN_KEY);
        } catch {}
        set({
          user: null,
          loginType: null,
          collectedAlbumIds: new Set<number>(),
          playlists: [],
          createdPlaylists: [],
          collectedPlaylists: [],
          followingMap: {},
        });
      },

      addCollectedAlbum: (albumId) => {
        const { collectedAlbumIds } = get();
        const newSet = new Set(collectedAlbumIds);
        newSet.add(albumId);
        set({ collectedAlbumIds: newSet });
      },

      removeCollectedAlbum: (albumId) => {
        const { collectedAlbumIds } = get();
        const newSet = new Set(collectedAlbumIds);
        newSet.delete(albumId);
        set({ collectedAlbumIds: newSet });
      },

      isAlbumCollected: (albumId) => get().collectedAlbumIds.has(albumId),

      fetchUserPlaylists: async () => {
        const { user } = get();
        if (!user?.userId) return;
        set({ playlistsLoading: true });
        try {
          const res = await getUserPlaylist(user.userId);
          const data = res?.data?.playlist;
          if (Array.isArray(data)) {
            set({
              playlists: data.map((p: any) => ({
                id: p.id,
                name: p.name,
                coverImgUrl: p.coverImgUrl || '',
                trackCount: p.trackCount || 0,
                playCount: p.playCount || 0,
                creator: { nickname: p.creator?.nickname || '' },
                subscribed: p.subscribed || false,
              })),
            });
          }
        } catch {
        } finally {
          set({ playlistsLoading: false });
        }
      },

      fetchCreatedPlaylists: async () => {
        const { user } = get();
        if (!user?.userId) return;
        try {
          const res = await getUserCreatePlaylist({ uid: user.userId, limit: 100 });
          const data = res?.data?.playlist;
          if (Array.isArray(data)) {
            set({
              createdPlaylists: data.map((p: any) => ({
                id: p.id, name: p.name, coverImgUrl: p.coverImgUrl || '',
                trackCount: p.trackCount || 0, playCount: p.playCount || 0,
                creator: { nickname: p.creator?.nickname || '' },
                subscribed: p.subscribed || false,
              })),
            });
          }
        } catch {}
      },

      fetchCollectedPlaylists: async () => {
        const { user } = get();
        if (!user?.userId) return;
        try {
          const res = await getUserCollectPlaylist({ uid: user.userId, limit: 100 });
          const data = res?.data?.playlist;
          if (Array.isArray(data)) {
            set({
              collectedPlaylists: data.map((p: any) => ({
                id: p.id, name: p.name, coverImgUrl: p.coverImgUrl || '',
                trackCount: p.trackCount || 0, playCount: p.playCount || 0,
                creator: { nickname: p.creator?.nickname || '' },
                subscribed: p.subscribed || false,
              })),
            });
          }
        } catch {}
      },

      toggleFollow: async (userId, currentFollowed) => {
        try {
          const t = currentFollowed ? 0 : 1;
          const res = await followUser(userId, t);
          if (res?.data?.code === 200) {
            const { followingMap } = get();
            set({
              followingMap: { ...followingMap, [userId]: !currentFollowed },
            });
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      checkLoginStatus: async () => {
        try {
          const adapter = getStorageAdapter();
          const token = await adapter.getItem(TOKEN_KEY);
          if (!token) return false;

          if (token.startsWith('uid:')) {
            return !!get().user;
          }

          const res = await getUserAccount();
          const profile = res?.data?.profile;
          const account = res?.data?.account;

          if (profile) {
            set({
              user: {
                userId: profile.userId || account?.id,
                nickname: profile.nickname,
                avatarUrl: profile.avatarUrl,
                backgroundUrl: profile.backgroundUrl,
                vipType: profile.vipType,
                profile,
                account,
              },
            });
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },
    }),
    {
      name: 'user-store',
      storage: createJSONStorage(() => getStorageAdapter()),
      partialize: (state) => ({
        user: state.user
          ? {
              userId: state.user.userId,
              nickname: state.user.nickname,
              avatarUrl: state.user.avatarUrl,
              backgroundUrl: state.user.backgroundUrl,
              vipType: state.user.vipType,
            }
          : null,
        loginType: state.loginType,
      }),
    }
  )
);
