import { AlertTriangle, X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
}

export default function DisclaimerModal({ open, onClose }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      {/* overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      {/* card */}
      <div className="relative bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in">
        {/* header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-white/[0.06] bg-amber-50 dark:bg-amber-950/30">
          <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-gray-900 dark:text-gray-100">免责声明</h2>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">使用前请仔细阅读</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* body */}
        <div className="p-5 text-[13px] text-gray-600 dark:text-gray-300 leading-relaxed space-y-3 max-h-[50vh] overflow-y-auto scrollbar-thin">
          <p><strong className="text-gray-900 dark:text-gray-100">1. 仅供学习交流</strong><br />
            本项目仅供个人学习、研究和技术交流使用，<strong className="text-[#e60026]">严禁用于任何商业用途</strong>。</p>

          <p><strong className="text-gray-900 dark:text-gray-100">2. 版权声明</strong><br />
            所有音乐内容的版权归原权利人及版权方所有。本项目不存储、不提供任何音乐文件的下载或分发服务。</p>

          <p><strong className="text-gray-900 dark:text-gray-100">3. 用户责任</strong><br />
            使用本项目所产生的任何法律后果由用户自行承担。开发者不对用户的任何使用行为负责。</p>

          <p><strong className="text-gray-900 dark:text-gray-100">4. 无担保声明</strong><br />
            本项目按"现状"提供，不提供任何形式的明示或默示担保，包括但不限于适销性或特定用途适用性的担保。</p>

          <p><strong className="text-gray-900 dark:text-gray-100">5. 合规使用</strong><br />
            请遵守所在地法律法规，支持正版音乐。如果喜欢某首歌曲，请通过正规渠道购买或订阅。</p>
        </div>

        {/* footer */}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-white/[0.06] bg-gray-50/50 dark:bg-white/[0.015]">
          <button onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors">
            我已阅读并同意
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
