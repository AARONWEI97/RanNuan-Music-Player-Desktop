# 🌌 冉冉 (RanRan) - 3D 元宇宙相册

> 将你的照片化作宇宙中的星辰，在赛博朋克风格的 3D 世界中自由探索。

RanRan 是一个基于 Web 3D 技术的沉浸式本地相册与音乐播放器应用。它打破了传统二维网格相册的展现形式，将用户的照片转化为宇宙中环绕恒星运行的"行星"，配合赛博朋克/元宇宙风格的 3D 背景和粒子特效，为用户提供独一无二的视觉体验。

项目采用 **本地优先 (Local-first)** 架构，所有媒体资源均存储在浏览器的 IndexedDB 中，保证了数据的隐私性与离线可用性。

桌面端 RanNuan 以 iframe 嵌入本项目（`base: '/ranran/'`，产物拷到 `desktop/public/ranran/`）。嵌入时隐藏内部播放器，音乐走父页；架构与明天待办见 `PROJECT_DOC.md` Phase 7 和 `desktop/DESKTOP_DEV.md` 第三十一 / 三十二节。

## ✨ 核心特性

- **3D 宇宙视图** — 照片映射为 3D 行星模型，支持轨道公转、自转，包含恒星光晕、轨道环、星空背景等天文视觉元素
- **沉浸式元宇宙背景** — React Three Fiber 渲染的 3D 粒子场、悬浮光环、星空和后处理特效（Bloom, Vignette 等）
- **本地存储引擎** — 基于 `idb` 封装的数据库服务，支持图片、视频、音乐等大文件在 IndexedDB 中的缓存和读取
- **多媒体管理** — 支持照片上传、分类、标签打标、全息视图预览；内置全局背景音乐播放器
- **高度个性化** — 内置多种主题（赛博蓝、霓虹粉、矩阵绿、落日橙、星河紫、暗黑深渊），支持调整粒子强度、网格显示、自动旋转等
- **PWA 支持** — 支持离线访问 + 桌面安装

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

打开浏览器访问 `http://localhost:5173`

### 构建生产版本

```bash
npm run build
```

### 预览构建结果

```bash
npm run preview
```

### 代码检查

```bash
npm run lint
```

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| 核心框架 | React 19, TypeScript, Vite |
| 3D 渲染 | Three.js, @react-three/fiber, @react-three/drei, @react-three/postprocessing |
| 状态管理 | Zustand |
| 样式与动画 | Tailwind CSS (v4), Framer Motion, Lucide React |
| 本地存储 | idb, localforage |
| PWA | vite-plugin-pwa |

## 📁 目录结构

```text
src/
├── assets/         # 静态资源
├── components/     # UI 和 3D 组件库
│   ├── 3d/         # 元宇宙背景等纯 3D 环境组件
│   ├── astronomy/  # 天文主题组件（宇宙视图、太阳、行星、轨道环、星云等）
│   ├── layout/     # 页面布局组件 (Navbar, Sidebar)
│   ├── music/      # 音乐播放器组件
│   ├── photos/     # 照片相关组件 (PhotoGrid, HolographicViewer, UploadModal)
│   ├── settings/   # 设置相关组件 (SettingsModal, TagsModal)
│   └── ui/         # 基础通用 UI 组件
├── hooks/          # 自定义 Hooks
├── utils/          # 工具函数
├── services/       # 核心业务服务
├── workers/        # Web Workers
├── store/          # Zustand 状态管理
├── styles/         # 全局样式和工具函数
├── types/          # TypeScript 全局类型定义
├── App.tsx         # 应用主入口
└── main.tsx        # React 挂载点
```

## 🗺️ 开发路线图

### Phase 0：架构治理 ✅ 已完成
拆分巨型组件、统一 URL 加载、修复主题切换、清理冗余代码、统一视频元素管理

### Phase 1：3D 视觉与动效升级 ✅ 已完成
行星星环、螺旋臂视图、后处理自适应降级、行星表面细节、恒星脉冲动画、小行星带、星云效果

### Phase 2：功能扩展 ✅ 已完成
数据导出/导入、照片标签分配、照片描述编辑、时间轴模式、歌词解析与展示、通知系统 UI、PWA 配置、搜索增强

### Phase 3：性能调优 ✅ 已完成
InstancedMesh 实例化渲染、Web Worker 缩略图压缩、纹理懒加载与 LOD、虚拟化照片列表、IndexedDB 批量操作、内存泄漏排查

### Phase 4：UI/UX 精细化 ✅ 已完成
暗黑深渊主题、移动端触摸手势、行星信息卡片、键盘快捷键、引导教程、加载骨架屏、无障碍优化

### Phase 5：视觉体验优化 ✅ 已完成
过场动画科幻感增强、行星信息卡片全息风格、全屏模式名称遮挡修复

## 📝 使用指南

### 上传照片
点击导航栏的「上传」按钮，选择本地照片文件，系统将自动上传到 IndexedDB 并在 3D 宇宙中生成对应的行星。

### 查看照片
- **3D 视图**：点击行星进入全息视图查看照片详情
- **时间轴模式**：右下角日历按钮进入时间轴视图

### 音乐播放器
点击导航栏的「音乐」图标，可以上传本地音乐文件并播放。支持歌词同步展示。

### 快捷键
| 快捷键 | 功能 |
|--------|------|
| `ESC` | 关闭弹窗 |
| `←` / `→` | 切换上一张/下一张照片 |
| `Space` | 播放/暂停音乐 |
| `Ctrl + U` | 上传照片 |
| `Ctrl + ,` | 打开设置 |

### 移动端手势
| 手势 | 功能 |
|------|------|
| 左滑 | 下一张照片 |
| 右滑 | 上一张照片 |
| 下滑 | 关闭照片查看器 |
| 长按 | 触发更多操作 |

## 📄 License

MIT
