import { Heart, Coffee, QrCode, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { openUrl } from '@tauri-apps/plugin-opener'

const GITHUB_URL = 'https://github.com/AARONWEI97/RanNuan-Music-Player-Desktop'

interface Props {
  open: boolean
  onClose: () => void
}

export default function DonationModal({ open, onClose }: Props) {
  const navigate = useNavigate()

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      {/* overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      {/* card */}
      <div className="relative bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in">
        {/* header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-white/[0.06] bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/10">
          <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-500/20">
            <Coffee className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-gray-900 dark:text-gray-100">支持 RanNuen Music</h2>
            <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Heart className="w-3 h-3 fill-amber-500 text-amber-500" /> 用爱发电
            </p>
          </div>
        </div>

        {/* body */}
        <div className="p-5">
          <p className="text-center text-[13px] text-gray-500 dark:text-gray-400 mb-4">
            这是一个由个人开发者维护的开源项目。如果你喜欢，可以请作者喝杯咖啡 ☕
          </p>
          {/* QR codes */}
          <div className="grid grid-cols-2 gap-3">
            {/* Alipay */}
            <div className="text-center">
              <div className="w-full aspect-square rounded-xl bg-white border border-gray-100 dark:border-white/[0.06] overflow-hidden mb-1.5 flex items-center justify-center">
                <img src="/alipay_qr.png" alt="支付宝" className="w-full h-full object-contain p-1.5"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                    ;(e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden')
                  }}
                />
                <div className="hidden w-full aspect-square flex flex-col items-center justify-center gap-1 bg-gray-50 dark:bg-white/[0.03]">
                  <QrCode className="w-6 h-6 text-gray-300 dark:text-gray-500" />
                  <span className="text-[8px] text-gray-400">alipay_qr.png</span>
                </div>
              </div>
              <span className="text-[10px] text-gray-400">支付宝</span>
            </div>
            {/* WeChat */}
            <div className="text-center">
              <div className="w-full aspect-square rounded-xl bg-white border border-gray-100 dark:border-white/[0.06] overflow-hidden mb-1.5 flex items-center justify-center">
                <img src="/wechat_qr.png" alt="微信" className="w-full h-full object-contain p-1.5"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                    ;(e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden')
                  }}
                />
                <div className="hidden w-full aspect-square flex flex-col items-center justify-center gap-1 bg-gray-50 dark:bg-white/[0.03]">
                  <QrCode className="w-6 h-6 text-gray-300 dark:text-gray-500" />
                  <span className="text-[8px] text-gray-400">wechat_qr.png</span>
                </div>
              </div>
              <span className="text-[10px] text-gray-400">微信支付</span>
            </div>
          </div>
        </div>

        {/* GitHub Star —— 免费支持 */}
        <div className="px-5 pb-1">
          <button onClick={() => openUrl(GITHUB_URL)}
            className="w-full text-left block p-3 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] hover:border-gray-300 dark:hover:border-white/[0.12] hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all group">
            <div className="flex items-center gap-3">
              {/* GitHub Logo */}
              <svg className="w-6 h-6 text-gray-600 dark:text-gray-300 group-hover:text-black dark:group-hover:text-white transition-colors flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 group-hover:text-black dark:group-hover:text-white transition-colors">
                  去 GitHub 点个免费的 Star ⭐
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">你的 Star 是对开源作者最好的鼓励</p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#e60026] transition-colors flex-shrink-0" />
            </div>
          </button>
        </div>

        {/* footer */}
        <div className="px-5 pb-4 space-y-2">
          <button onClick={() => { onClose(); navigate('/donation') }}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#e60026] to-rose-500 text-white text-sm font-semibold hover:from-[#c4001f] hover:to-rose-600 transition-all shadow-md shadow-red-500/20">
            查看完整捐赠页面
          </button>
          <button onClick={onClose}
            className="w-full py-2 rounded-xl text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            稍后再说
          </button>
        </div>
      </div>

      <style>{`
        .animate-in {
          animation: modalIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
      `}</style>
    </div>
  )
}
