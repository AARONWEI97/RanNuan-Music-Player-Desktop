import { create } from 'zustand'
import { getStorageAdapter, TOKEN_KEY } from '@shared'
import { getLoginStatus, getLoginUserDetail, logout as apiLogout } from '@shared'

interface UserProfile {
  userId: number
  nickname: string
  avatarUrl: string
  vipType: number
}

interface AuthState {
  isLoggedIn: boolean
  profile: UserProfile | null
  isChecking: boolean
  checkLoginStatus: () => Promise<boolean>
  login: (token: string) => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  profile: null,
  isChecking: false,

  checkLoginStatus: async () => {
    set({ isChecking: true })
    try {
      const adapter = getStorageAdapter()
      const token = await adapter.getItem(TOKEN_KEY)
      if (!token) {
        set({ isLoggedIn: false, profile: null, isChecking: false })
        return false
      }

      const res = await getLoginStatus()
      const data = res?.data?.data
      if (data?.account?.id) {
        const profileRes = await getLoginUserDetail()
        const profile = profileRes?.data?.profile
        if (profile?.userId) {
          const userProfile: UserProfile = {
            userId: profile.userId || profile.uid,
            nickname: profile.nickname || '',
            avatarUrl: profile.avatarUrl || '',
            vipType: profile.vipType || 0,
          }
          set({ isLoggedIn: true, profile: userProfile, isChecking: false })
          return true
        }
      }

      set({ isLoggedIn: false, profile: null, isChecking: false })
      return false
    } catch {
      set({ isLoggedIn: false, profile: null, isChecking: false })
      return false
    }
  },

  login: async (token: string) => {
    const adapter = getStorageAdapter()
    if (token) {
      await adapter.setItem(TOKEN_KEY, token)
    }
    // 登录后立即验证状态获取用户信息
    try {
      const statusRes = await getLoginStatus()
      const accountData = statusRes?.data?.data?.account
      if (accountData?.id) {
        // 登录态有效，获取详细用户信息
        const profileRes = await getLoginUserDetail()
        const profile = profileRes?.data?.profile
        if (profile?.userId) {
          const userProfile: UserProfile = {
            userId: profile.userId || profile.uid,
            nickname: profile.nickname || '',
            avatarUrl: profile.avatarUrl || '',
            vipType: profile.vipType || 0,
          }
          set({ isLoggedIn: true, profile: userProfile })
          return
        }
      }
      // cookie 方式登录成功但状态检查失败，尝试直接获取用户信息
      const profileRes = await getLoginUserDetail()
      const profile = profileRes?.data?.profile
      if (profile?.userId) {
        const userProfile: UserProfile = {
          userId: profile.userId || profile.uid,
          nickname: profile.nickname || '',
          avatarUrl: profile.avatarUrl || '',
          vipType: profile.vipType || 0,
        }
        set({ isLoggedIn: true, profile: userProfile })
      } else {
        set({ isLoggedIn: false, profile: null })
      }
    } catch {
      // 登录验证失败
      set({ isLoggedIn: false, profile: null })
    }
  },

  logout: async () => {
    try {
      await apiLogout()
    } catch {
      // Ignore logout API errors - clear local state anyway
    }
    const adapter = getStorageAdapter()
    await adapter.removeItem(TOKEN_KEY)
    set({ isLoggedIn: false, profile: null })
  },
}))
