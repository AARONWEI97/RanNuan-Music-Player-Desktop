import { create } from 'zustand'
import { getStorageAdapter, TOKEN_KEY } from '@shared'
import { getLoginStatus, getLoginUserDetail, refreshLogin, logout as apiLogout } from '@shared'

export type LoginMethod = 'qr' | 'phone-password' | 'phone-captcha' | 'email' | 'cookie' | 'guest'

const LOGIN_METHOD_KEY = 'auth_login_method'
const REFRESHABLE_LOGIN_METHODS = new Set<LoginMethod>(['phone-password', 'phone-captcha', 'email'])

interface UserProfile {
  userId: number
  nickname: string
  avatarUrl: string
  vipType: number
}

interface ApiUserProfile {
  userId?: number
  uid?: number
  nickname?: string
  avatarUrl?: string
  vipType?: number
}

interface AuthState {
  isLoggedIn: boolean
  profile: UserProfile | null
  isChecking: boolean
  checkLoginStatus: () => Promise<boolean>
  login: (token: string, method?: LoginMethod) => Promise<void>
  logout: () => Promise<void>
}

function parseProfile(profile?: ApiUserProfile | null): UserProfile | null {
  const userId = profile?.userId || profile?.uid
  if (!userId) return null
  return {
    userId,
    nickname: profile.nickname || '',
    avatarUrl: profile.avatarUrl || '',
    vipType: profile.vipType || 0,
  }
}

async function fetchAuthenticatedProfile(): Promise<UserProfile | null> {
  try {
    const statusRes = await getLoginStatus()
    if (!statusRes?.data?.data?.account?.id) return null
    const profileRes = await getLoginUserDetail()
    return parseProfile(profileRes?.data?.profile)
  } catch {
    return null
  }
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

      let userProfile = await fetchAuthenticatedProfile()
      if (!userProfile) {
        const method = await adapter.getItem(LOGIN_METHOD_KEY) as LoginMethod | null
        if (method && REFRESHABLE_LOGIN_METHODS.has(method)) {
          const refreshRes = await refreshLogin(token)
          const refreshedCookie = refreshRes?.data?.cookie
          if (refreshedCookie) await adapter.setItem(TOKEN_KEY, refreshedCookie)
          else await adapter.setItem(TOKEN_KEY, token)
          userProfile = await fetchAuthenticatedProfile()
        }
      }

      if (userProfile) {
        set({ isLoggedIn: true, profile: userProfile, isChecking: false })
        return true
      }

      set({ isLoggedIn: false, profile: null, isChecking: false })
      return false
    } catch {
      set({ isLoggedIn: false, profile: null, isChecking: false })
      return false
    }
  },

  login: async (token: string, method: LoginMethod = 'cookie') => {
    const adapter = getStorageAdapter()
    if (token) {
      await adapter.setItem(TOKEN_KEY, token)
      await adapter.setItem(LOGIN_METHOD_KEY, method)
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
          const userProfile = parseProfile(profile)
          if (userProfile) {
            set({ isLoggedIn: true, profile: userProfile })
            return
          }
        }
      }
      // cookie 方式登录成功但状态检查失败，尝试直接获取用户信息
      const profileRes = await getLoginUserDetail()
      const profile = profileRes?.data?.profile
      if (profile?.userId) {
        const userProfile = parseProfile(profile)
        if (userProfile) set({ isLoggedIn: true, profile: userProfile })
      } else {
        set({ isLoggedIn: false, profile: null })
        if (token) await adapter.multiRemove([TOKEN_KEY, LOGIN_METHOD_KEY])
        throw new Error('登录状态验证失败')
      }
    } catch {
      // 登录验证失败
      set({ isLoggedIn: false, profile: null })
      if (token) await adapter.multiRemove([TOKEN_KEY, LOGIN_METHOD_KEY])
      throw new Error('登录状态验证失败')
    }
  },

  logout: async () => {
    try {
      await apiLogout()
    } catch {
      // Ignore logout API errors - clear local state anyway
    }
    const adapter = getStorageAdapter()
    await adapter.multiRemove([TOKEN_KEY, LOGIN_METHOD_KEY])
    set({ isLoggedIn: false, profile: null })
  },
}))
