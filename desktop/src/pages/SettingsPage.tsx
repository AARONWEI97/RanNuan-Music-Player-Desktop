import { useRef, useState, type KeyboardEvent } from 'react'
import {
  ArrowUpRight, AudioLines, Check, ChevronRight, CircleHelp, Database, Keyboard,
  Monitor, Moon, Palette, PawPrint, Search, Sun, Wifi, X,
} from 'lucide-react'
import { isTauri } from '@tauri-apps/api/core'
import { openUrl } from '@tauri-apps/plugin-opener'
import { usePlayerStore, usePlaylistStore, useSettingsStore } from '@shared'
import { defaultDesktopPreferences, isSearchShortcut, readSearchShortcut, useDesktopPreferences, type SearchShortcut } from '@/store/desktopPreferences'
import { musicQualities, playbackModes, playbackRates, themes, updatePlaybackRate } from '@/services/settingsPreferences'
import { saveSession } from '@/services/sessionManager'
import { toggleLyricsWindow } from '@/services/playerBridge'
import { SettingGroup, SettingRow, SettingsSelect, SettingsSwitch } from '@/components/settings/SettingControls'
import NetworkSettings from '@/components/settings/NetworkSettings'
import StorageSettings from '@/components/settings/StorageSettings'
import pkg from '../../package.json'
import './settings.css'

const categories = [
  { id: 'appearance', title: '外观', icon: Palette, description: '选择播放器主题，在这里预览效果。',
    topics: [['themes', '主题与宠物皮肤', '浅色 深色 跟随系统 狗狗奶油 狗狗可可']] },
  { id: 'playback', title: '播放', icon: AudioLines, description: '调整音质和播放方式。',
    topics: [['quality', '默认音质', '无损 Hi-Res 杜比'], ['playback', '播放方式', '播放模式 播放速度 倍速 循环 随机']] },
  { id: 'desktop', title: '桌面体验', icon: Monitor, description: '设置应用启动、关闭以及桌面工具的行为。',
    topics: [['startup', '启动与窗口', '启动动画 自动播放 恢复会话 退出 托盘 关闭'], ['desktop-tools', '桌面工具', '桌面歌词 悬浮 迷你播放 任务栏']] },
  { id: 'shortcuts', title: '快捷键', icon: Keyboard, description: '查看快捷键，或录入常用的搜索组合键。',
    topics: [['app-keys', '应用内快捷键', '全局搜索 Ctrl Space Esc 播放 暂停'], ['system-keys', '系统级快捷键', '媒体键 桌面歌词 锁定 切歌']] },
  { id: 'network', title: '网络与音源', icon: Wifi, description: '检测音乐服务连接，查看播放音源的选择方式。',
    topics: [['connection', '服务诊断', '检测连接 音乐服务 延迟 网络 API'], ['sources', '播放音源', '单曲音源 自动回退 音乐来源']] },
  { id: 'storage', title: '数据与存储', icon: Database, description: '管理缓存，备份或恢复偏好。',
    topics: [['cache', '页面缓存', '缓存用量 清理缓存'], ['backup', '备份与恢复', '导入 导出 设置备份 恢复默认 重置']] },
  { id: 'about', title: '关于', icon: CircleHelp, description: '查看版本、更新和开源信息。',
    topics: [['app-info', '应用信息', '版本 更新 发布日志 平台 Windows macOS Linux'], ['project', '开源项目', 'GitHub MIT 许可']] },
] as const

type Category = typeof categories[number]

function AppearanceSettings() {
  const theme = useSettingsStore(state => state.theme)
  const setTheme = useSettingsStore(state => state.setTheme)
  const icons = { light: Sun, dark: Moon, system: Monitor, 'dog-light': PawPrint, 'dog-dark': PawPrint }

  const options = (pet: boolean) => themes.filter(({ id }) => id.startsWith('dog-') === pet).map(({ id, label }) => {
    const Icon = icons[id]
    return (
      <label key={id} className="settings-theme-option" data-theme-preview={id}>
        <input type="radio" name="rannuan-theme" value={id} checked={theme === id} onChange={() => setTheme(id)} />
        <span className="settings-theme-preview" aria-hidden="true">
          <span className="settings-preview-window">
            <span className="settings-preview-rail"><i /><i /><i /></span>
            <span className="settings-preview-main"><i /><i /><i /></span>
            <span className="settings-preview-player"><i /><i /><i /></span>
            {pet && <img src="/logo.png" alt="" />}
          </span>
        </span>
        <span className="settings-theme-label">
          <Icon size={16} aria-hidden="true" />
          {label}
          {theme === id && <Check className="settings-theme-check" size={16} aria-hidden="true" />}
        </span>
      </label>
    )
  })

  return (
    <section id="settings-themes" className="settings-appearance" aria-label="主题与宠物皮肤">
      <fieldset>
        <legend>界面主题</legend>
        <div className="settings-theme-grid">{options(false)}</div>
      </fieldset>
      <fieldset>
        <legend>宠物皮肤</legend>
        <div className="settings-theme-grid is-pet">{options(true)}</div>
      </fieldset>
    </section>
  )
}

function PlaybackSettings() {
  const quality = useSettingsStore(state => state.musicQuality)
  const setQuality = useSettingsStore(state => state.setMusicQuality)
  const mode = usePlaylistStore(state => state.playMode)
  const rate = usePlayerStore(state => state.playbackRate)
  return (
    <>
      <SettingGroup id="settings-quality" title="音质">
        <SettingRow title="默认音质" detail="解析歌曲时优先尝试的音质。">
          <SettingsSelect label="默认音质" value={quality} options={musicQualities} onChange={setQuality} />
        </SettingRow>
      </SettingGroup>
      <SettingGroup id="settings-playback" title="播放方式">
        <SettingRow title="播放模式" detail="决定队列里下一首歌的播放顺序。">
          <SettingsSelect label="播放模式" value={String(mode)} options={playbackModes} onChange={value => {
            usePlaylistStore.getState().setPlayMode(Number(value))
            saveSession()
          }} />
        </SettingRow>
        <SettingRow title="播放速度">
          <SettingsSelect label="播放速度" value={String(rate)} options={playbackRates.map(value => [String(value), value + '×'])}
            onChange={value => updatePlaybackRate(Number(value))} />
        </SettingRow>
      </SettingGroup>
    </>
  )
}

function DesktopSettings() {
  const { showSplash, resumePlayback, closeAction, miniPlayerMode } = useDesktopPreferences()
  return (
    <>
      <SettingGroup id="settings-startup" title="启动与窗口">
        <SettingRow title="启动动画" detail="下次启动时显示开场动画与音效。">
          <SettingsSwitch label="启动动画" value={showSplash} onChange={value => useDesktopPreferences.setState({ showSplash: value })} />
        </SettingRow>
        <SettingRow title="启动后继续播放" detail="开启后自动从上次的位置播放，关闭时恢复到暂停状态。">
          <SettingsSwitch label="启动后继续播放" value={resumePlayback} onChange={value => useDesktopPreferences.setState({ resumePlayback: value })} />
        </SettingRow>
        <SettingRow title="点击标题栏关闭按钮" detail="收起到托盘时，音乐继续在后台播放。">
          <SettingsSelect label="点击标题栏关闭按钮" value={closeAction} options={[[ 'tray', '收起到托盘' ], [ 'quit', '退出应用' ]]}
            onChange={value => useDesktopPreferences.setState({ closeAction: value === 'quit' ? 'quit' : 'tray' })} />
        </SettingRow>
      </SettingGroup>
      <SettingGroup id="settings-desktop-tools" title="桌面工具">
        <SettingRow title="桌面歌词" detail="在主窗口外显示可拖动的浮动歌词。">
          {isTauri() && <button type="button" className="settings-button" onClick={() => toggleLyricsWindow()}>显示或隐藏</button>}
        </SettingRow>
        <SettingRow title="迷你播放器" detail="自动模式在 Windows 优先使用任务栏，其他情况下使用悬浮窗口。">
          <SettingsSelect label="迷你播放器" value={miniPlayerMode} options={[[ 'automatic', '自动' ], [ 'floating', '悬浮窗口' ]]}
            onChange={value => useDesktopPreferences.setState({ miniPlayerMode: value === 'floating' ? 'floating' : 'automatic' })} />
        </SettingRow>
      </SettingGroup>
    </>
  )
}

const searchShortcuts = [
  { key: 'openSearchShortcut', label: '打开全局搜索' },
  { key: 'toggleSearchShortcut', label: '切换全局搜索' },
] as const

function ShortcutSettings() {
  const prefs = useDesktopPreferences()
  const [recording, setRecording] = useState<SearchShortcut>()
  const [feedback, setFeedback] = useState('')

  function record(event: KeyboardEvent<HTMLButtonElement>, key: SearchShortcut) {
    if (recording !== key || event.key === 'Tab') return
    event.preventDefault()
    event.stopPropagation()
    if (event.key === 'Escape') {
      setRecording(undefined)
      setFeedback('已取消录入')
      return
    }
    if (['Control', 'Meta', 'Shift', 'Alt'].includes(event.key)) return
    const shortcut = readSearchShortcut(event.nativeEvent)
    if (!shortcut || !isSearchShortcut(shortcut)) {
      setFeedback(shortcut ? '此组合键已被保留，请换一个。' : '请按 Ctrl／⌘、可选的 Shift 与一个字母或数字。')
      return
    }
    const otherKey = key === 'openSearchShortcut' ? 'toggleSearchShortcut' : 'openSearchShortcut'
    if (shortcut === prefs[otherKey]) {
      setFeedback('此组合键已分配给另一项搜索操作。')
      return
    }
    useDesktopPreferences.setState({ [key]: shortcut })
    setRecording(undefined)
    setFeedback('快捷键已保存')
  }

  return (
    <>
      <SettingGroup id="settings-app-keys" title="应用内快捷键">
        {searchShortcuts.map(({ key, label }) => (
          <SettingRow key={key} title={label}>
            <kbd>{prefs[key].replaceAll('+', ' + ')}</kbd>
            <button type="button" className="settings-button" aria-label={'修改' + label}
              aria-pressed={recording === key}
              onClick={event => { event.currentTarget.focus(); setRecording(key); setFeedback('请按下新的组合键，按 Esc 取消。') }}
              onKeyDown={event => record(event, key)}
              onBlur={() => {
                if (recording === key) {
                  setRecording(undefined)
                  setFeedback('')
                }
              }}>
              {recording === key ? '录入中…' : '修改'}
            </button>
          </SettingRow>
        ))}
        <SettingRow title="播放或暂停" detail="焦点位于输入框或按钮等控件时，空格由控件处理。"><kbd>Space</kbd></SettingRow>
        <SettingRow title="关闭当前弹窗"><kbd>Esc</kbd></SettingRow>
        <div className="settings-shortcut-footer">
          <span className="settings-note" role="status">{feedback}</span>
          <button type="button" className="settings-button" onClick={() => {
            const { openSearchShortcut, toggleSearchShortcut } = defaultDesktopPreferences
            useDesktopPreferences.setState({ openSearchShortcut, toggleSearchShortcut })
            setFeedback('已恢复默认快捷键')
          }}>恢复默认快捷键</button>
        </div>
      </SettingGroup>
      <SettingGroup id="settings-system-keys" title="系统级快捷键">
        <SettingRow title="显示或隐藏桌面歌词"><kbd>Ctrl + Alt + D</kbd></SettingRow>
        <SettingRow title="锁定或解锁桌面歌词"><kbd>Ctrl + Alt + L</kbd></SettingRow>
        <SettingRow title="播放、暂停与切歌"><kbd>媒体键</kbd></SettingRow>
      </SettingGroup>
    </>
  )
}

const projectUrl = 'https://github.com/AARONWEI97/RanNuan-Music-Player-Desktop'
const platform = /Windows/.test(navigator.userAgent) ? 'Windows'
  : /Macintosh/.test(navigator.userAgent) ? 'macOS'
    : /Linux/.test(navigator.userAgent) ? 'Linux' : '浏览器'

function ProjectLink({ href, children }: { href: string; children: string }) {
  return (
    <a className="settings-button" href={href} target="_blank" rel="noreferrer" onClick={event => {
      if (isTauri()) {
        event.preventDefault()
        void openUrl(href)
      }
    }}>
      {children}<ArrowUpRight size={15} aria-hidden="true" />
    </a>
  )
}

function AboutSettings() {
  return (
    <>
      <SettingGroup id="settings-app-info" title="应用信息">
        <div className="settings-app-info">
          <img src="/logo.png" alt="" />
          <div><strong>RanNuan Music</strong><p className="settings-note">版本 {pkg.version} · {platform}</p></div>
        </div>
        <SettingRow title="更新与发布记录" detail="在发布页查看版本说明和安装包。">
          <ProjectLink href={projectUrl + '/releases'}>查看发布</ProjectLink>
        </SettingRow>
      </SettingGroup>
      <SettingGroup id="settings-project" title="开源项目">
        <SettingRow title="GitHub"><ProjectLink href={projectUrl}>项目主页</ProjectLink></SettingRow>
        <SettingRow title="开源许可"><ProjectLink href={projectUrl + '/blob/main/LICENSE'}>MIT License</ProjectLink></SettingRow>
      </SettingGroup>
    </>
  )
}

const sections = {
  appearance: AppearanceSettings, playback: PlaybackSettings, desktop: DesktopSettings,
  shortcuts: ShortcutSettings, network: NetworkSettings, storage: StorageSettings, about: AboutSettings,
}

export default function SettingsPage() {
  const [category, setCategory] = useState<Category>(categories[0])
  const [query, setQuery] = useState('')
  const pageRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const search = query.trim().toLowerCase()
  const Section = sections[category.id]
  const matches = search ? categories.flatMap(item => item.topics
    .filter(([, title, terms]) => (item.title + ' ' + title + ' ' + terms).toLowerCase().includes(search))
    .map(([id, title]) => ({ category: item, id, title }))) : []

  function select(next: Category, target?: string) {
    setCategory(next)
    setQuery('')
    requestAnimationFrame(() => {
      const page = pageRef.current
      const main = page?.closest('main')
      if (!page || !main) return
      if (!target) {
        main.scrollTo(0, 0)
        return
      }
      const section = page.querySelector('#settings-' + target)
      if (!section) return
      const heading = section.querySelector<HTMLElement>('h3[tabindex], legend')
      heading?.setAttribute('tabindex', '-1')
      heading?.focus({ preventScroll: true })
      const top = section.getBoundingClientRect().top - main.getBoundingClientRect().top
      main.scrollTo(0, main.scrollTop + top - 16)
    })
  }

  return (
    <div className="settings-page" ref={pageRef}>
      <header className="settings-header">
        <h1>设置</h1>
        <div className="settings-search">
          <Search size={18} aria-hidden="true" />
          <input ref={inputRef} type="search" aria-label="搜索设置" placeholder="搜索设置" value={query}
            onChange={event => setQuery(event.currentTarget.value)} onKeyDown={event => {
              if (event.key === 'Enter' && matches[0]) select(matches[0].category, matches[0].id)
              if (event.key === 'Escape' && query) {
                event.stopPropagation()
                setQuery('')
              }
            }} />
          {query && <button type="button" aria-label="清空搜索" onClick={() => { setQuery(''); inputRef.current?.focus() }}><X size={16} /></button>}
        </div>
      </header>
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="设置分类">
          {categories.map(item => (
            <button key={item.id} type="button" aria-current={!search && item.id === category.id ? 'page' : undefined}
              onClick={() => select(item)}>
              <item.icon size={17} aria-hidden="true" />
              <span>{item.title}</span>
              <ChevronRight className="settings-nav-chevron" size={15} aria-hidden="true" />
            </button>
          ))}
        </nav>
        <section className="settings-content" aria-labelledby="settings-content-heading">
          <div className="settings-content-header">
            <h2 id="settings-content-heading">{search ? '搜索结果' : category.title}</h2>
            {!search && <p>{category.description}</p>}
          </div>
          {search ? (
            <div className="settings-panel">
              {matches.length === 0 && <p className="settings-empty" role="status">没有找到相关设置。</p>}
              {matches.map(result => (
                <button type="button" className="settings-search-result" key={result.id}
                  onClick={() => select(result.category, result.id)}>
                  <result.category.icon size={18} aria-hidden="true" />
                  <span><strong>{result.title}</strong><small>{result.category.title}</small></span>
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              ))}
            </div>
          ) : <Section />}
        </section>
      </div>
    </div>
  )
}
