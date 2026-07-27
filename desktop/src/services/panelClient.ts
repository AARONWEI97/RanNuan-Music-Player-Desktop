/**
 * 副窗口侧的事件桥（托盘面板 / 桌面歌词共用）。
 *
 * 副窗口没有 audio、没有 store，只订阅主窗口广播的快照并回发命令。
 */
import { useEffect, useState } from 'react'
import {
  EMPTY_SNAPSHOT,
  EVT_CMD,
  EVT_REQUEST_STATE,
  EVT_STATE,
  type PanelCommand,
  type PlayerSnapshot,
} from './panelProtocol'

/** 回发一条控制命令给主窗口 */
export function sendCmd(cmd: PanelCommand) {
  import('@tauri-apps/api/event')
    .then(({ emit }) => emit(EVT_CMD, cmd))
    .catch((e) => console.error('[panel] sendCmd 失败:', cmd.type, e))
}

/**
 * 浏览器里预览面板用的假数据。
 *
 * 副窗口平时由 Rust 创建、靠主窗口广播喂数据，直接开 `localhost:5173/index.html?w=tray-panel`
 * 会因为拿不到快照而一片空白，没法调样式。加 `&mock=1` 即可用这份数据渲染。
 * 仅 dev 生效，生产构建里 `import.meta.env.DEV` 为 false，整段会被摇树掉。
 */
function mockSnapshot(): PlayerSnapshot {
  return {
    song: {
      id: 347230,
      name: '学不会',
      artist: '林俊杰',
      picUrl: 'https://p2.music.126.net/6y-UleORITEDbvrOLV0Q8A==/109951165474121408.jpg',
      album: '学不会',
    },
    isPlay: true,
    isLoading: false,
    currentProgress: 84_000,
    duration: 272_000,
    volume: 0.6,
    isMuted: false,
    playMode: 2,
    isFav: true,
    queueTotal: 12,
    queue: [
      { id: 2, name: '起风了', artist: '买辣椒也用券' },
      { id: 3, name: '晴天', artist: '周杰伦' },
      { id: 4, name: '夜曲', artist: '周杰伦' },
    ],
    lyric: {
      lines: [
        { text: '时间总是骗过我们' },
        { text: '我学不会 真的学不会', sub: "I really can't learn it" },
        { text: '把你的名字轻轻收回' },
      ],
      index: 1,
    },
    lyricsWindowOpen: false,
  }
}

/** 订阅主窗口广播的播放快照 */
export function usePlayerSnapshot(): PlayerSnapshot {
  const isMock = import.meta.env.DEV
    && new URLSearchParams(window.location.search).get('mock') === '1'

  const [snapshot, setSnapshot] = useState<PlayerSnapshot>(
    () => (isMock ? mockSnapshot() : EMPTY_SNAPSHOT),
  )

  useEffect(() => {
    if (isMock) return

    let unlisten: (() => void) | undefined
    let disposed = false
    const retryTimers: ReturnType<typeof setTimeout>[] = []

    import('@tauri-apps/api/event').then(({ emit, listen }) => {
      // Rust 可能在窗口 WebView 完成加载前就发过 request-state；监听器
      // 注册完成后主动握手，确保歌词窗不会一直停在 EMPTY_SNAPSHOT。
      listen<PlayerSnapshot>(EVT_STATE, (e) => {
        if (e.payload) setSnapshot(e.payload)
      }).then((fn) => {
        if (disposed) fn()
        else unlisten = fn

        // 监听器真正注册完成后再请求快照，避免初始化时序丢事件。
        const requestState = () => {
          if (!disposed) emit(EVT_REQUEST_STATE, {}).catch(() => {})
        }
        requestState()
        // 主窗口 App 可能仍在动态加载，补两次轻量重试覆盖这个启动窗口。
        retryTimers.push(
          setTimeout(requestState, 150),
          setTimeout(requestState, 600),
        )
      })
        .catch(() => {})
    })

    return () => {
      disposed = true
      unlisten?.()
      retryTimers.forEach(clearTimeout)
    }
  }, [isMock])

  return snapshot
}

/** 隐藏当前副窗口（面板「关闭」按钮用） */
export function hideSelf() {
  import('@tauri-apps/api/window')
    .then(({ getCurrentWindow }) => getCurrentWindow().hide())
    .catch((e) => console.error('[panel] hideSelf 失败:', e))
}

/**
 * 调整当前副窗口高度（宽度不变）。
 *
 * 队列展开/收起时用来让窗口贴合内容，避免收起时留一大块空白。
 * 面板是从底部向上弹的，改高度后需要同步上移，否则底部会越过托盘。
 */
export function resizeSelf(height: number) {
  Promise.all([
    import('@tauri-apps/api/window'),
    import('@tauri-apps/api/dpi'),
  ]).then(async ([{ getCurrentWindow }, { LogicalSize, PhysicalPosition }]) => {
    const win = getCurrentWindow()
    const before = await win.outerSize()
    const pos = await win.outerPosition()

    await win.setSize(new LogicalSize(PANEL_WIDTH, height))

    // 保持底边不动：窗口长高多少，就往上挪多少
    const after = await win.outerSize()
    const delta = after.height - before.height
    if (delta !== 0) {
      await win.setPosition(new PhysicalPosition(pos.x, pos.y - delta))
    }
  }).catch((e) => {
    // 浏览器预览或权限缺失时不影响面板渲染，但要留痕便于排查
    console.error('[panel] resizeSelf 失败:', e)
  })
}

/** 面板宽度，与 lib.rs 的 PANEL_W 保持一致 */
const PANEL_WIDTH = 340

/** 调用主进程命令（显示主窗口 / 退出应用） */
export function invokeMain(cmd: 'show_main_window' | 'quit_app') {
  import('@tauri-apps/api/core')
    .then(({ invoke }) => invoke(cmd))
    .catch((e) => console.error('[panel] invokeMain 失败:', cmd, e))
}

export function formatTime(ms: number): string {
  if (!ms || ms < 0 || !isFinite(ms)) return '0:00'
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
