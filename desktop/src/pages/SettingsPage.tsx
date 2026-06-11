import { useSettingsStore } from '@shared'
import { useState } from 'react'
import {
  Sun, Moon, Music, Play, Info, Zap, Monitor, Volume2,
  RotateCcw, ExternalLink,
} from 'lucide-react'
import { showToast } from '@/utils/toast'
import { openUrl } from '@tauri-apps/plugin-opener'
import pkg from '../../package.json'

type SettingTab = 'general' | 'playback' | 'about'

/* ═══════════ Setting Section Card ═══════════ */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2.5 px-1">
        {title}
      </h2>
      <div className="bg-white dark:bg-neutral-900/60 rounded-2xl border border-gray-100 dark:border-white/[0.06] overflow-hidden shadow-sm">
        {children}
      </div>
    </section>
  )
}

/* ═══════════ Setting Row ═══════════ */
function Row({
  icon: Icon, label, desc, children, last,
}: {
  icon?: any; label: string; desc?: string; children: React.ReactNode; last?: boolean
}) {
  return (
    <div className={`flex items-center justify-between px-4 py-3.5 ${!last ? 'border-b border-gray-50 dark:border-white/[0.04]' : ''} group hover:bg-gray-50/50 dark:hover:bg-white/[0.015] transition-colors`}>
      <div className="flex items-center gap-3 min-w-0 mr-4">
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center flex-shrink-0 group-hover:bg-[#e60026]/10 transition-colors">
            <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-[#e60026] transition-colors" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
          {desc && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 leading-relaxed">{desc}</p>}
        </div>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

/* ═══════════ Toggle Switch ═══════════ */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)}
      className={`relative w-10 h-6 rounded-full transition-all duration-300 flex-shrink-0 ${
        checked ? 'bg-[#e60026] shadow-sm shadow-[#e60026]/25' : 'bg-gray-200 dark:bg-gray-700'
      }`}>
      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-300 ${
        checked ? 'left-[calc(100%-22px)]' : 'left-0.5'
      }`} />
    </button>
  )
}

/* ═══════════ Select ═══════════ */
function SelectField({
  value, onChange, options, width,
}: {
  value: string; onChange: (v: string) => void; options: { label: string; value: string }[]; width?: string
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className={`${width || 'w-36'} px-3 py-2 rounded-xl text-xs font-medium bg-gray-100 dark:bg-white/[0.06] border-none outline-none focus:ring-2 focus:ring-[#e60026]/20 cursor-pointer transition-all hover:bg-gray-200 dark:hover:bg-white/[0.1]`}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

/* ═══════════════ MAIN ═══════════════ */
export default function SettingsPage() {
  const settings = useSettingsStore()
  const [tab, setTab] = useState<SettingTab>('general')

  const handleReset = () => {
    settings.setApiBaseUrl('http://139.9.223.233:3000')
    settings.setUnblockServiceUrl('')
    settings.setLxmusicApiUrl('')
    settings.setCustomApiUrl('')
    settings.setMusicQuality('exhigh')
    settings.setEnableCache(true)
    settings.setAutoPlay(true)
    showToast('已恢复默认设置')
  }

  const tabs: { k: SettingTab; l: string; i: any }[] = [
    { k: 'general', l: '通用', i: Monitor },
    { k: 'playback', l: '播放', i: Music },
    { k: 'about', l: '关于', i: Info },
  ]

  return (
    <div className="max-w-2xl mx-auto pb-20">
      {/* ── Header ── */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          设置
        </h1>
        <p className="text-[13px] text-gray-400 dark:text-gray-500 mt-1">
          个性化你的音乐体验
        </p>
      </div>

      {/* ── Tab Pills ── */}
      <div className="flex gap-1.5 mb-6">
        {tabs.map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all duration-250 ${
              tab === t.k
                ? 'bg-[#e60026] text-white shadow-lg shadow-red-500/20 scale-[1.02]'
                : 'bg-gray-100 dark:bg-white/[0.04] text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/[0.08] hover:text-gray-700 dark:hover:text-gray-200'
            }`}>
            <t.i className="w-3.5 h-3.5" />
            {t.l}
          </button>
        ))}
      </div>

      {/* ═══ Tab: General ═══ */}
      {tab === 'general' && (
        <>
          <Section title="外观">
            <Row icon={settings.theme === 'dark' ? Moon : Sun} label="深色模式"
              desc={settings.theme === 'dark' ? '当前：深色主题' : '当前：浅色主题'}>
              <Toggle checked={settings.theme === 'dark'} onChange={(v) => settings.setTheme(v ? 'dark' : 'light')} />
            </Row>
          </Section>

          <Section title="体验">
            <Row icon={Play} label="自动播放" desc="启动后自动恢复上次播放">
              <Toggle checked={settings.autoPlay} onChange={settings.setAutoPlay} />
            </Row>
            <Row icon={Zap} label="启用缓存" desc="缓存专辑封面和歌曲数据以加速加载" last>
              <Toggle checked={settings.enableCache} onChange={settings.setEnableCache} />
            </Row>
          </Section>
        </>
      )}

      {/* ═══ Tab: Playback ═══ */}
      {tab === 'playback' && (
        <>
          <Section title="音质">
            <Row icon={Volume2} label="默认音质" desc="选择播放时的首选音质等级">
              <SelectField value={settings.musicQuality} onChange={settings.setMusicQuality}
                options={[
                  { label: '超高 (Master)', value: 'jymaster' },
                  { label: '杜比全景声', value: 'dolby' },
                  { label: '沉浸环绕声', value: 'sky' },
                  { label: '高清环绕声', value: 'jyeffect' },
                  { label: 'Hi-Res', value: 'hires' },
                  { label: '无损', value: 'lossless' },
                  { label: '极高', value: 'exhigh' },
                  { label: '较高', value: 'higher' },
                  { label: '标准', value: 'standard' },
                ]}
              />
            </Row>
          </Section>

          {/* ── Shortcuts ── */}
          <Section title="快捷键">
            {[
              { key: 'Space', label: '播放 / 暂停' },
              { key: 'Ctrl + L', label: '歌词面板' },
              { key: 'Ctrl + Shift + S', label: '全局搜索' },
              { key: 'Ctrl + D', label: '桌面歌词' },
            ].map((s, i) => (
              <Row key={s.key} label={s.label} desc={undefined} last={i === 3}>
                <kbd className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/[0.06] text-[10px] font-mono font-semibold text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/[0.08]">
                  {s.key}
                </kbd>
              </Row>
            ))}
          </Section>
        </>
      )}

      {/* ═══ Tab: About ═══ */}
      {tab === 'about' && (
        <>
          <Section title="应用信息">
            <Row icon={Info} label="版本号" desc="当前应用版本">
              <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{pkg.version || '1.0.0'}</span>
            </Row>
            <Row icon={ExternalLink} label="检查更新" desc="前往 GitHub 获取最新版本">
              <button onClick={() => openUrl('https://github.com/AARONWEI97/RanNuan-Music-Player-Desktop')}
                className="flex items-center gap-1 text-xs text-[#e60026] hover:text-[#c4001f] transition-colors font-medium">
                查看 <ExternalLink className="w-3 h-3" />
              </button>
            </Row>
          </Section>

          <Section title="开源与致谢">
            <Row label="GitHub" desc="项目完全开源，欢迎 Star ⭐">
              <button onClick={() => openUrl('https://github.com/AARONWEI97/RanNuan-Music-Player-Desktop')}
                className="flex items-center gap-1 text-xs text-[#e60026] hover:text-[#c4001f] transition-colors font-medium">
                访问主页 <ExternalLink className="w-3 h-3" />
              </button>
            </Row>
            <Row label="API 服务" desc="基于 NeteaseCloudMusicApi 提供数据支持" last>{null}</Row>
          </Section>

          {/* ── Reset ── */}
          <Section title="数据管理">
            <Row icon={RotateCcw} label="恢复默认设置"
              desc="将所有设置还原为初始状态（不影响播放记录和收藏）" last>
              <button onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border border-red-200 dark:border-red-900/40 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                <RotateCcw className="w-3 h-3" /> 恢复默认
              </button>
            </Row>
          </Section>
        </>
      )}
    </div>
  )
}
