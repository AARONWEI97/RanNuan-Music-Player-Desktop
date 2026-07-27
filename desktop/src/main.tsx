import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { setStorageAdapter } from '@shared'
import { localStorageAdapter } from './adapters/localStorageAdapter'

/**
 * ★ 必须在任何 store 被读写之前同步注册。
 *
 * zustand persist 在 `@shared` 模块求值时就开始 rehydrate，若把这行推迟到
 * 动态 import 的 .then() 里，rehydrate 会先跑、`getStorageAdapter()` 抛错，
 * persist 静默降级为「storage unavailable」——播放状态/队列/音量全部不落盘。
 */
setStorageAdapter(localStorageAdapter)

/**
 * 单 HTML 入口，按 URL hash 分流到三个窗口。
 *
 * 副窗口（tray-panel / lyrics）由 Rust 端以 `index.html#xxx` 创建，
 * 必须走轻量分支 —— 绝不能加载 App，否则会实例化第二个
 * HTMLAudioElement / session 恢复 / 全局快捷键，与主窗口互相打架。
 *
 * 用 hash 而非 query：`WebviewUrl::App` 内部是 `PathBuf`，Windows 上 `?`
 * 会被当成普通文件名字符参与路径规范化，query 传不到前端 —— 副窗口读到
 * null 就掉进 else 分支加载了完整 App。hash 不参与路径解析，dev/prod 都稳。
 */
const view = window.location.hash.replace(/^#/, '')
const root = createRoot(document.getElementById('root')!)

if (view === 'tray-panel' || view === 'lyrics') {
  // 副窗口是 transparent 的，去掉默认底色让 CSS 圆角/阴影生效
  document.body.classList.add('transparent-window')

  if (view === 'tray-panel') {
    import('./windows/TrayPanelApp').then(({ default: TrayPanelApp }) => {
      root.render(<StrictMode><TrayPanelApp /></StrictMode>)
    })
  } else {
    import('./windows/LyricsWindowApp').then(({ default: LyricsWindowApp }) => {
      root.render(<StrictMode><LyricsWindowApp /></StrictMode>)
    })
  }
} else {
  // ── 主窗口：唯一持有 audio / session / 快捷键的窗口 ──
  import('./App').then(({ default: App }) => {
    root.render(<StrictMode><App /></StrictMode>)
  })
}
