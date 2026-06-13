import { NavLink, useNavigate } from 'react-router-dom'
import { useSettingsStore } from '@shared'
import { useAuthStore } from '@/store/authStore'
import { thumbUrl } from '@/utils/image'
import { Home, Search, Library, Heart, Settings, Sun, Moon, Clock, HardDrive, Trophy, LogIn, LogOut, User, Download, Coffee, Globe } from 'lucide-react'

const navItems = [
  { to: '/', label: '首页', icon: Home },
  { to: '/search', label: '搜索', icon: Search },
  { to: '/toplist', label: '排行榜', icon: Trophy },
  { to: '/library', label: '音乐库', icon: Library },
  { to: '/favorites', label: '我喜欢', icon: Heart },
  { to: '/history', label: '最近播放', icon: Clock },
  { to: '/local', label: '本地音乐', icon: HardDrive },
  { to: '/download', label: '下载管理', icon: Download },
  { to: '/universe', label: '宇宙相册', icon: Globe },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const { theme, setTheme } = useSettingsStore()
  const { isLoggedIn, profile, logout } = useAuthStore()
  const isDark = theme === 'dark'

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark')
  }

  const handleLogout = async () => {
    await logout()
  }

  return (
    <aside className="w-52 flex-shrink-0 flex flex-col border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#121212]">
      {/* Logo */}
      <div className="relative px-3 py-3.5 select-none border-b border-gray-200/50 dark:border-white/[0.04]">
        {/* brand glow */}
        <div className="absolute -inset-2 bg-[#e60026]/[0.03] dark:bg-[#e60026]/[0.02] rounded-2xl blur-xl opacity-0 hover:opacity-100 transition-opacity duration-500" />
        <div className="flex items-center gap-2 relative">
          {/* vinyl-style logo */}
          <div className="relative group/logo cursor-pointer">
            {/* pulse ring */}
            <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-tr from-[#e60026]/60 to-rose-400/40 opacity-0 group-hover/logo:opacity-100 blur-sm transition-opacity duration-300" />
            <img
              src="/logo.png"
              className="relative w-11 h-11 rounded-xl object-cover flex-shrink-0
                shadow-sm group-hover/logo:shadow-lg group-hover/logo:shadow-[#e60026]/20
                transition-all duration-300 ease-out
                group-hover/logo:scale-105 group-hover/logo:rotate-6"
              alt="RanNuan"
            />
          </div>
          {/* title with gradient text + shimmer */}
          <div className="flex flex-col leading-tight">
            <span className="font-extrabold text-lg tracking-tighter bg-gradient-to-r from-[#e60026] via-red-500 to-rose-400 bg-clip-text text-transparent
              bg-[length:200%_100%] animate-shimmer">
              RanNuan
            </span>
            <span className="text-[9px] text-gray-400 dark:text-gray-500 tracking-widest uppercase -mt-0.5">
              Music Player
            </span>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-[#e60026]/10 to-transparent text-[#e60026] font-semibold shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-200'
              }`
            }
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="px-3 pb-3 space-y-1 border-t border-gray-200 dark:border-gray-800 pt-3">
        {isLoggedIn && profile ? (
          <>
            <button
              onClick={() => navigate(`/user/${profile.userId}`)}
              className="flex items-center gap-3 px-3 py-2 w-full rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group"
            >
              <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0 ring-2 ring-transparent group-hover:ring-[#e60026]/30 transition-all">
                {profile.avatarUrl ? (
                  <img src={thumbUrl(profile.avatarUrl)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-300 dark:bg-gray-600">
                    <User className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                )}
              </div>
              <span className="truncate font-medium">{profile.nickname}</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-[#e60026] transition-colors"
            >
              <LogOut className="w-4 h-4" />
              退出登录
            </button>
          </>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-[#e60026] transition-colors"
          >
            <LogIn className="w-4 h-4" />
            登录
          </button>
        )}

        <button
          onClick={toggleTheme}
          className="flex items-center justify-between gap-3 px-3 py-2.5 w-full rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group"
        >
          <span className="flex items-center gap-3">
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
            {isDark ? '浅色模式' : '深色模式'}
          </span>
          {/* Toggle switch */}
          <div className={`relative w-9 h-5 rounded-full transition-colors duration-300 flex-shrink-0 ${
            isDark ? 'bg-amber-400/20 border border-amber-400/30' : 'bg-gray-300 dark:bg-gray-600'
          }`}>
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white dark:bg-gray-100 shadow-md transition-all duration-300 ${
              isDark ? 'left-[calc(100%-18px)] bg-amber-100' : 'left-0.5'
            }`}>
              <span className="absolute inset-0 flex items-center justify-center text-[8px]">
                {isDark ? '☀️' : '🌙'}
              </span>
            </div>
          </div>
        </button>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm transition-all ${
              isActive
                ? 'bg-gradient-to-r from-[#e60026]/10 to-transparent text-[#e60026] font-semibold shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-200'
            }`
          }
        >
          <Settings className="w-4 h-4" />
          设置
        </NavLink>
        <NavLink
          to="/donation"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm transition-all ${
              isActive
                ? 'bg-gradient-to-r from-amber-500/10 to-transparent text-amber-500 font-semibold shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-amber-500'
            }`
          }
        >
          <Coffee className="w-4 h-4" />
          捐赠
        </NavLink>
      </div>
    </aside>
  )
}
