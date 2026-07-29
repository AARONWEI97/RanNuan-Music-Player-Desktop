/**
 * Ctrl+D 由 Rust 原生层注册，不能再在页面内处理同一按键，
 * 否则系统快捷键与 WebView keydown 会把歌词窗连续切换两次。
 *
 * 这个组件不再自己渲染浮层 —— 之前它是主窗口内的一个 fixed div，
 * 主窗口 hide() 到托盘后歌词会一起消失。现在歌词由独立的置顶透明系统窗口
 * （`windows/LyricsWindowApp.tsx`）承载，关到托盘后依然显示。
 *
 * 组件本身无需渲染内容；保留它只是为了兼容现有布局结构。
 */
export default function FloatingLyrics() {
  return null
}
