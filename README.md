<p align="center">
  <img src="/desktop/public/logo.png" width="96" alt="RanNuan Music" />
</p>

<h1 align="center">RanNuan Music Player</h1>
<p align="center"><strong>冉暖音乐播放器 · 桌面端 + 3D 元宇宙相册</strong></p>

<p align="center">
  <img src="https://img.shields.io/badge/Tauri-2.11-orange?logo=tauri" />
  <img src="https://img.shields.io/badge/React-19.2-61DAFB?logo=react" />
  <img src="https://img.shields.io/badge/Vite-8.0-646CFF?logo=vite" />
  <img src="https://img.shields.io/badge/Zustand-5.0-blue" />
  <img src="https://img.shields.io/badge/Three.js-R3F-black?logo=threedotjs" />
  <img src="https://img.shields.io/badge/license-MIT-green" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" />
  <img src="https://img.shields.io/badge/desktop-v1.5.0-e60026" />
  <img src="https://img.shields.io/badge/ranran-v6.2-00ffff" />
</p>

---

> 🎵 一款基于 Tauri 2.x + React 19 + Vite 8 的跨平台桌面音乐播放器。内置 **ranran (冉冉) 3D 元宇宙相册**，将照片化为宇宙行星，搭配全息影院、情绪音乐推荐等沉浸式体验。

---

## ✨ 功能亮点

### 🎧 播放器
- **多音源支持** — Netease / QQ / Kugou / Kuwo / Migu / Bodian 自动降级
- **播放模式** — 列表循环 / 单曲循环 / Fisher-Yates 随机播放
- **连续失败保护** — 5 次播放失败自动暂停，防止死循环
- **会话持久化** — 刷新/重启后恢复播放队列 + 歌曲位置，保持暂停
- **播放队列管理** — 下一首播放 / 右键菜单 / 拖拽排序
- **播放历史** — 最近 200 首带时间戳

### 🎨 界面
- **首页轮播** — Banner + 推荐歌单 + 热门歌手 + 新碟上架
- **搜索页** — 防抖建议 + 热搜卡片 + 搜索历史 + 键盘导航
- **歌曲详情页** — 毛玻璃 + 黑胶唱片动画 + 歌词/评论/相似推荐
- **右键菜单** — 10 项完整操作（播放/收藏/下载/删除/评论/相似…）
- **深色模式** — iOS 风格 toggle 开关 + 系统主题同步
- **启动动画** — 3s 马卡龙配色 + 3D Logo 浮动 + 🐶 狗狗叫声

### 🔧 系统特性
- **系统托盘** — 右键菜单：播放/暂停 + 上/下一首 + 实时歌曲 tooltip
- **全局快捷键** — 播放/暂停/上/下一首 + Ctrl+L 歌词 + Ctrl+K 搜索
- **迷你模式** — 窗口缩小至 360×72，悬浮桌面
- **桌面歌词** — Ctrl+D 悬浮歌词 + 拖拽 + 透明背景
- **下载管理** — 并发队列 + 进度弹窗 + 打开文件夹

### 📂 数据管理
- **本地音乐** — IndexedDB 持久化 + 封面自动匹配
- **收藏 / 历史** — localStorage 持久化
- **下载记录** — Zustand persist，最多 100 条
- **歌单导入** — 链接 / 文本两种模式

### 🌌 宇宙相册 (RanRan) — v6.2 集成
- **3D 太阳系视图** — 照片映射为行星模型，轨道公转 + 自转
- **银河螺旋臂** — 4 臂螺旋按时间排列照片行星，2400 粒子渲染
- **沉浸元宇宙背景** — React Three Fiber 粒子场 + 星云 + Bloom 后处理
- **全息影院** — 赛博朋克风格视频播放器，支持多视频列表切换
- **时光穿梭** — 按年份浏览照片，全屏沉浸式回忆视图
- **情绪音乐推荐** — 根据照片时间/标签自动分析情绪匹配音乐
- **6 种主题 + 5 种渐变** — 赛博蓝/霓虹粉/矩阵绿/落日橙/星河紫/暗黑深渊
- **本地优先架构** — IndexedDB 存储照片/视频/音乐，离线可用
- **iframe 嵌入** — RanRan 独立构建，`/universe` 路由零耦合集成
- **KeepAlive 缓存** — 切换页面不丢失 3D 场景状态和已上传照片

---

## 🖼 截图

| 首页 | 歌曲详情 |
|:---:|:---:|
| ![首页](/desktop/screenshots/home.png) | ![歌曲详情](/desktop/screenshots/song-detail.png) |

| 搜索 | 设置 |
|:---:|:---:|
| ![搜索](/desktop/screenshots/search.png) | ![设置](/desktop/screenshots/settings.png) |

| 托盘菜单 | 迷你播放器 |
|:---:|:---:|
| ![托盘](/desktop/screenshots/tray.png) | ![迷你](/desktop/screenshots/mini-player.png) |

| 宇宙相册 |
|:---:|
| ![宇宙相册](/desktop/screenshots/universe.png) |

### 🎬 演示视频

<video src="https://github.com/AARONWEI97/RanNuan-Music-Player-Desktop/raw/main/desktop/screenshots/demo.mp4" controls width="100%" poster="https://github.com/AARONWEI97/RanNuan-Music-Player-Desktop/raw/main/desktop/screenshots/home.png"></video>

---

## 🛠 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **桌面框架** | Tauri 2.11 | Rust 后端 + 系统托盘 + 原生窗口 |
| **前端框架** | React 19 + TypeScript | 组件化 UI + 类型安全 |
| **构建工具** | Vite 8 | 秒级 HMR + 极速打包 |
| **路由** | React Router 7 | KeepAlive 页面级 + Tab 级缓存 |
| **状态管理** | Zustand 5 | persist 中间件 + sessionManager |
| **样式引擎** | Tailwind CSS 4 | 原子化 CSS + 深色模式 class 策略 |
| **图标库** | Lucide React | 2700+ 可定制 SVG 图标 |
| **HTTP** | axios | 拦截器 + 多 API 源 |
| **音频** | HTMLAudioElement | 原生播放 + MediaSession API |
| **存储** | localStorage + IndexedDB | 双引擎持久化 |

---

## 🚀 快速开始

### 前置要求

- **Node.js** ≥ 18
- **Rust** ≥ 1.77（含 `cargo`）
- **Visual Studio 2022**（Windows，含 C++ 桌面开发组件）
- **WebView2**（Windows 10/11 自带，Win7 需手动安装）

### 开发运行

```bash
# 克隆仓库
git clone https://github.com/AARONWEI97/RanNuan-Music-Player-Desktop.git
cd RanNuan-Music-Player-Desktop

# 进入桌面端目录
cd desktop

# 安装依赖
npm install

# 启动 Tauri 开发模式（前端 + Rust 后端）
npm run tauri-dev

# 或仅启动前端
npm run dev
```

### 构建生产包

```bash
cd desktop

# 构建前端
npm run build

# 打包安装包（当前平台）
npx tauri build
```

构建产物：
- **Windows**: `src-tauri/target/release/bundle/msi/*.msi` / `nsis/*.exe`
- **macOS**: `src-tauri/target/release/bundle/dmg/*.dmg`
- **Linux**: `src-tauri/target/release/bundle/deb/*.deb` / `AppImage`

---

## 📁 项目结构

```
desktop/
├── src/
│   ├── main.tsx                       # React 入口
│   ├── App.tsx                        # 根组件（主题同步 + 托盘事件 + splash + session恢复）
│   ├── components/
│   │   ├── layout/                    # 全局布局
│   │   │   ├── Layout.tsx            # 主骨架（Sidebar + 主内容 + PlayerBar）
│   │   │   ├── Sidebar.tsx           # 导航栏（流光 Logo + 主题切换 + 用户头像 + 宇宙相册入口）
│   │   │   ├── TitleBar.tsx          # 自定义标题栏（Logo + 版本号 + 关闭→托盘）
│   │   │   ├── PlayerBar.tsx         # 底部播放器（进度条/音量/速率/收藏/歌词，宇宙页面自动隐藏）
│   │   │   ├── MiniPlayer.tsx        # 迷你播放器
│   │   │   ├── KeepAlive.tsx         # 路由级 + Tab 级缓存（含宇宙相册页）
│   │   │   └── ...
│   │   └── common/                   # 通用组件
│   │       ├── SplashScreen.tsx       # 启动动画（马卡龙配色 + 3D Logo + 狗叫）
│   │       ├── CommentSection.tsx     # 全局评论（热门/最新 + 抱抱 + 楼层回复）
│   │       ├── SongRow.tsx           # 歌曲列表行（纯组件 + memo）
│   │       └── ...
│   ├── pages/                        # 20 个页面组件
│   │   ├── HomePage.tsx              # 首页（Banner轮播/推荐歌单/热门歌手）
│   │   ├── UniversePage.tsx          # ★ 宇宙相册页面（iframe 加载 /ranran/index.html）
│   │   └── ...
│   ├── services/
│   │   ├── audioService.ts           # 音频引擎（playSong + autoPlay参数）
│   │   ├── sessionManager.ts         # 会话持久化（localStorage直写）
│   │   └── shellService.ts           # Tauri Shell
│   ├── hooks/                        # 自定义 Hooks（11个）
│   ├── store/                        # 桌面端专属 stores
│   └── utils/                        # 工具函数
├── src-tauri/                        # Rust 后端
│   ├── src/
│   │   ├── main.rs                   # Tauri 主进程
│   │   └── lib.rs                    # 应用构建（托盘菜单/事件/tooltip/下载）
│   ├── capabilities/default.json     # 权限配置
│   └── tauri.conf.json               # Tauri 配置（1100×800）
├── public/
│   ├── logo.png                      # 应用图标
│   ├── dog.mp3                       # 启动声效
│   └── ranran/                       # ★ RanRan 宇宙相册构建产物（npm run build → xcopy dist）
├── DESKTOP_DEV.md                    # 完整桌面端开发文档（26 节）
└── RanRan-main/                      # ★ RanRan 源码项目（不上传 GitHub，见 .gitignore）
    └── PROJECT_DOC.md                # RanRan 独立项目文档（8 节）

shared/                               # 多端共享核心包
└── src/
    ├── api/                          # API 请求层
    ├── store/                        # 共享状态（playerStore / playlistStore / settingsStore）
    ├── types/                        # 类型定义
    └── utils/                        # 工具函数
```

---

## ⌨ 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Space` | 播放 / 暂停 |
| `Ctrl + L` | 显示 / 隐藏歌词 |
| `Ctrl + D` | 桌面悬浮歌词 |
| `Ctrl + K` | 聚焦搜索框 |
| `Ctrl + Shift + S` | 全局搜索弹窗 |
| `Esc` | 关闭弹窗/抽屉 |
| `Ctrl+U` | 上传照片（宇宙相册） |
| `← / →` | 上一张 / 下一张照片（全息查看器） |

---

## 🌌 宇宙相册 (RanRan)

独立的 3D 元宇宙相册项目，通过 iframe 嵌入到音乐播放器中。侧边栏点击「宇宙相册」即可进入。

### 技术亮点

| 技术 | 用途 |
|------|------|
| **React Three Fiber** | 3D 场景渲染（行星/恒星/星系） |
| **@react-three/postprocessing** | Bloom / Vignette 后处理特效 |
| **IndexedDB (idb)** | 照片/视频/音乐本地持久化 |
| **Web Worker** | 照片上传压缩，主线程零卡顿 |
| **InstancedMesh** | 小行星带批量渲染，Draw Call 爆降 |
| **三级 LOD** | 行星表面按摄像机距离动态切换纹理精度 |

### 嵌入架构

```
desktop/src/pages/UniversePage.tsx
  └── <iframe src="/ranran/index.html">
        └── RanRan 构建产物 (public/ranran/)
              └── index.html + JS/CSS bundles
```

- **同源策略**：iframe 与 desktop 同源，IndexedDB/localStorage 共享，数据互通
- **KeepAlive 缓存**：切换回宇宙页面不丢失 3D 场景状态
- **PlayerBar 智能隐藏**：宇宙页面自动隐藏桌面端播放器栏，避免遮挡

### 开发工作流

```powershell
# 修改 RanRan 代码后：
cd desktop\RanRan-main
npm run build
xcopy dist\* ..\public\ranran\ /E /Y

# 重启 Tauri（WebView2 缓存需完全重启）
cd ..
npx tauri dev
```

> 📖 完整文档：[desktop/DESKTOP_DEV.md §二十六](desktop/DESKTOP_DEV.md) | [RanRan PROJECT_DOC.md](desktop/RanRan-main/PROJECT_DOC.md)

---

## 📖 文档

| 文档 | 路径 | 说明 |
|------|------|------|
| **桌面端开发文档** | [`desktop/DESKTOP_DEV.md`](desktop/DESKTOP_DEV.md) | 26 节完整文档：项目结构/共享层/功能清单/快捷键/路由/性能优化/下载系统/宇宙相册集成 |
| **RanRan 项目文档** | [`desktop/RanRan-main/PROJECT_DOC.md`](desktop/RanRan-main/PROJECT_DOC.md) | 8 节完整文档：核心特性/技术栈/目录结构/架构治理/6 个 Phase 开发路线图 |

---

## 🔌 API 服务

本项目依赖 [NeteaseCloudMusicApi](https://github.com/Binaryify/NeteaseCloudMusicApi) 提供音乐数据接口，默认 API 地址为内置服务器。可在「设置 → 播放」中自定义 API 地址。

---

## 📝 License

[MIT](LICENSE) © 2025 RanNuan Music

---

<p align="center">
  <sub>Made with ❤️ by <a href="https://github.com/AARONWEI97">AARONWEI97</a></sub>
</p>
