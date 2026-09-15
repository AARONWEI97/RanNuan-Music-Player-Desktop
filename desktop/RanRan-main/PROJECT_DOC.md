# 冉冉 (RanRan) - 3D元宇宙相册项目文档

## 1. 项目概述
RanRan 是一个基于 Web 3D 技术的沉浸式本地相册与音乐播放器应用。它打破了传统二维网格相册的展现形式，将用户的照片转化为宇宙中环绕恒星运行的“行星”，配合赛博朋克/元宇宙风格的 3D 背景和粒子特效，为用户提供独一无二的视觉体验。项目采用本地优先 (Local-first) 架构，所有媒体资源均存储在浏览器的 IndexedDB 中，保证了数据的隐私性与离线可用性。

## 2. 核心特性
- **3D 宇宙视图 (Universe/Solar System View)**
  - 照片 UV 铺满行星球体（自发光，类似恒星），开普勒共面公转 + 自转。
  - 恒星光晕、轨道环、四臂星河、银道带、星云；歌词以流星划过星空。
  - 全息屏在星空页静音循环片库视频；点入独立 HTML5 影院（卸载 WebGL 以免卡住）。
- **沉浸式元宇宙背景 (Metaverse Background)**
  - 采用 React Three Fiber 渲染的 3D 粒子场、悬浮光环、星空和后处理特效（Bloom, Vignette 等）。
- **本地存储引擎 (Local-first Database)**
  - 基于 `idb` 封装的数据库服务，支持图片、视频、音乐等大文件在 IndexedDB 中的缓存和读取。
- **多媒体管理**
  - **照片管理**：支持上传、分类（相册）、标签打标、全息视图预览 (Holographic Viewer)。
  - **音乐播放器**：独立运行时内置本地背景音乐；嵌入桌面端时隐藏内部播放器，走父页 `PlayerBar`。
- **桌面端混合嵌入**：`window.parent !== window` 时作为播放器的沉浸视图——恒星跟随当前封面，情绪推荐搜索真实曲库，快捷键转发到父页。
- **高度个性化设置**
  - 内置多种主题（赛博蓝、霓虹粉、矩阵绿、落日橙、星河紫、暗黑深渊、冉暖星河）。
  - 内置 5 种渐变色彩（赛博极光/全息彩虹/星云紫/落日余晖/深海蓝）。
  - 设置已接到真实行为：轨道显隐、镜头自动旋转、粒子强度、过渡动画、歌词流星、开场跳过、性能档位。
  - 导出/导入会写出照片原图 Blob、相册、标签和当前设置；导入覆盖照片库。
  - 嵌入桌面端时隐藏内部播放器，「音频」区改为宇宙联动，不抢父页 PlayerBar。
- **情绪音乐推荐**
  - 根据照片时间、季节、标签自动分析情绪，推荐匹配音乐。
- **时光穿梭**
  - 按年份浏览照片，全屏沉浸式回忆视图。

## 3. 技术栈
- **核心框架**: React 19, TypeScript, Vite
- **3D 渲染**: Three.js, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`
- **状态管理**: Zustand (分模块管理: photoStore, uiStore)
- **样式与动画**: Tailwind CSS (v4), Framer Motion, Lucide React
- **本地存储**: `idb`, `localforage`
- **PWA 支持**: `vite-plugin-pwa` (具备渐进式 Web 应用能力)

## 4. 目录结构说明
```text
src/
├── assets/         # 静态资源 (如 svg 图标)
├── components/     # UI 和 3D 组件库
│   ├── 3d/         # 元宇宙背景等纯 3D 环境组件 (MetaverseBackground)
│   ├── astronomy/  # 天文主题组件
│   │   ├── constants.ts          # 常量与类型（恒星数据、星座数据、轨道配置）
│   │   ├── kepler.ts             # 8 条共面开普勒轨道带（公转，禁止按 index 叠倾角）
│   │   ├── UniverseView.tsx      # 宇宙视图编排器（Canvas / 封面 / 影院 / 片库）
│   │   ├── Scene.tsx             # 3D 场景组合（读 uiStore 设置：轨道/旋转/粒子/主题色）
│   │   ├── Sun.tsx               # 太阳（Shader+光晕+日冕+当前歌曲封面+播放脉冲）
│   │   ├── PhotoPlanet.tsx       # 照片行星（自发光贴图铺满球体+开普勒公转+光晕）
│   │   ├── PlanetRing.tsx        # 行星星环（土星环纹理+陨石带粒子）
│   │   ├── OrbitRing.tsx         # 轨道环
│   │   ├── BackgroundStar.tsx    # 背景恒星（真实恒星数据）
│   │   ├── SpiralGalaxy.tsx      # 螺旋星系（SoftPoints 圆点，内半径避开太阳系）
│   │   ├── SoftPoints.tsx        # 圆形星点（替代 PointsMaterial 方块）
│   │   ├── MilkyWayBand.tsx      # 银道带
│   │   ├── SkyDecor.tsx          # 默认镜头内的星云精灵
│   │   ├── StarRiver.tsx         # 拱形星河粒子带
│   │   ├── AsteroidBelt.tsx      # 小行星带
│   │   ├── Nebula.tsx            # 星云
│   │   ├── DistantPlanetParticles.tsx # 远处行星粒子（虚拟化）
│   │   ├── PlanetInfoCard.tsx    # 行星信息卡片（悬停）
│   │   ├── SpiralArmView.tsx     # 螺旋臂视图（同样用自发光照片球）
│   │   ├── HologramScreen.tsx    # 【旧】3D VideoTexture 封面，WebView2 上常黑，勿当主封面
│   │   ├── HologramCover.tsx     # 星空 HTML 封面（与 WebGL 同屏解码仍会冻，影院才稳定）
│   │   ├── HologramCinema.tsx    # 独立 HTML5 影院（自动播放+循环；进影院卸载 Canvas）
│   │   ├── LyricMeteors.tsx      # 当前歌词流星（HTML 上往下掉，落地闪光）
│   │   ├── ConstellationPattern.tsx # 星座图案 + 纹理加载器
│   │   ├── ConstellationSelector.tsx # 星座选择器
│   │   ├── InfoPanel.tsx         # 行星信息面板
│   │   ├── UniverseIntro.tsx     # 宇宙开场动画（嵌入态保留）
│   │   └── VideoManager.tsx      # 片库
│   ├── layout/     # 页面布局组件 (Navbar, Sidebar)
│   ├── music/      # 音乐播放器组件 (MusicPlayer, MusicRecommendationPanel)
│   ├── photos/     # 照片相关组件 (PhotoGrid, HolographicViewer, UploadModal, TimelineView, TimeTravel)
│   ├── settings/   # 设置相关组件 (SettingsModal, TagsModal, GradientSelector)
│   └── ui/         # 基础通用 UI 组件 (Button, Card, Input, Modal, Toast, CyberSkeleton, OnboardingGuide, MagneticButton, PageTransition, ParallaxBackground)
├── bridge/         # 桌面端 iframe 桥 (protocol.ts, universeHost.ts)
├── hooks/          # 自定义 Hooks
│   ├── usePhotoUrl.ts  # 统一照片URL加载（blobStorage → object URL）
│   ├── usePlanetTexture.ts  # 行星贴图（缩略图先上球，完整图替换）
│   ├── useKeyboardShortcuts.ts  # 全局键盘快捷键（ESC/方向键/Space/Ctrl+U）
│   ├── useTouchGestures.ts  # 移动端触摸手势（滑动/长按）
│   ├── useParallax.ts  # 3D视差滚动
│   └── useSettingsRuntime.ts  # 设置运行时：性能档 + 独立态背景音乐
├── utils/          # 工具函数
│   ├── performance.ts  # GPU性能检测与自适应降级
│   └── motionPresets.ts  # 设置里的过渡动画预设
├── services/       # 核心业务服务
│   ├── database.ts            # IndexedDB 数据库服务（idb封装，事务批量操作）
│   ├── musicPlayer.ts         # 音乐播放器服务（AudioPlayer + Zustand store）
│   ├── musicRecommendation.ts # 情绪音乐推荐服务（时间/季节/标签分析）
│   ├── videoElementManager.ts # 【遗留】旧双解码方案，影院已不用，勿接回
│   ├── dataExport.ts          # 数据导出/导入（照片+Blob+相册+标签+设置，导入写回 store）
│   ├── lrcParser.ts           # LRC歌词解析器
│   └── imageWorker.ts         # 图片压缩Worker管理（Worker线程压缩+主线程回退）
├── workers/        # Web Workers
│   └── imageCompressor.worker.ts  # 图片压缩Worker（压缩+缩略图生成）
├── store/          # Zustand 状态管理
│   ├── modules/    # 状态分片 (photoStore.ts, uiStore.ts)
│   ├── useStore.ts # 聚合的 Store Hook
│   └── usePhotoStore.ts # 向后兼容导出
├── styles/         # 全局样式和工具函数 (theme.ts, utils.ts)
├── types/          # TypeScript 全局类型定义 (index.ts)
├── App.tsx         # 应用主入口，整合背景、导航、视图、弹窗等
└── main.tsx        # React 挂载点
```

## 5. 核心逻辑流转
1. **数据初始化**：`App.tsx` 挂载时，调用 `dbService.init()` 初始化 IndexedDB，清理遗留的 LocalStorage 数据。
2. **状态管理**：通过 `Zustand` 集中管理选中的照片、UI 弹窗开关、当前播放的音乐以及用户的主题配置。
3. **3D 渲染层**：`UniverseView` 接收照片列表，用 `kepler.ts` 映射为 `PhotoPlanet`（照片自发光贴满球体）。嵌入桌面端时恒星/轨道/歌词跟随父页播放快照。
4. **交互响应**：点击行星呼出 `HolographicViewer`；点击全息屏进入独立 HTML5 影院（同时卸载 Canvas，避免 WebView2 双解码卡死）。
5. **桌面端嵌入**：`window.parent !== window` 时隐藏内部播放器，通过 `bridge/universeHost.ts` 收父页快照、发播放命令。

## 6. 代码审计与已知问题

> 审计日期：2026-03-05 | Phase 0 完成日期：2026-03-05

### 6.1 架构问题

| 编号 | 问题 | 严重性 | 状态 |
|------|------|--------|------|
| A-1 | `UniverseView.tsx` 2080 行巨型组件 | 🔴 高 | ✅ 已修复：拆分为 10+ 独立组件，主文件 352 行 |
| A-2 | 两套音乐系统并存 | 🟡 中 | ✅ 已修复：删除旧版 musicStore，统一使用 musicPlayer 服务 |
| A-3 | 照片 URL 加载逻辑分散 | 🟡 中 | ✅ 已修复：抽取 `usePhotoUrl` Hook |
| A-4 | 视频元素管理混乱 | 🟡 中 | ✅ 已修复：创建 VideoElementManager 单例 |
| A-5 | `useStore` 组合 store 命名冲突 | 🟢 低 | ✅ 已修复：移除 musicStore，减少冲突风险 |

### 6.2 功能缺陷

| 编号 | 问题 | 严重性 | 状态 |
|------|------|--------|------|
| B-1 | 主题切换不完整 | 🔴 高 | ✅ 已修复：App.tsx 中调用 applyThemeToDocument，uiStore 同步 currentTheme |
| B-2 | 通知系统无 UI | 🟡 中 | ✅ 已修复：新增 Toast 组件（P2-6） |
| B-3 | 照片标签无法分配 | 🟡 中 | ✅ 已修复：新增 TagEditor 组件（P2-2） |
| B-4 | 照片描述无法编辑 | 🟢 低 | ✅ 已修复：新增 DescriptionEditor 组件（P2-3） |
| B-5 | 布局模式固定 | 🟢 低 | ⏳ 待实现 |

### 6.3 冗余代码

| 编号 | 模块 | 状态 |
|------|------|------|
| C-1 | `AstronomyModel.tsx` | ✅ 已删除 |
| C-2 | `SolarSystemView.tsx` | ✅ 已删除 |
| C-3 | `GalaxyView.tsx` | ✅ 已删除 |
| C-4 | `PhotoCard.tsx` | ✅ 已删除 |
| C-5 | `PhotoViewer.tsx` | ✅ 已删除 |
| C-6 | `musicStore.ts`（旧版） | ✅ 已删除 |
| C-7 | `App.optimized.tsx` | ✅ 已删除 |

### 6.4 未配置功能

| 编号 | 功能 | 说明 |
|------|------|------|
| D-1 | PWA 支持 | ✅ 已配置：vite-plugin-pwa 已启用，支持离线访问+桌面安装 |
| D-2 | 数据导出/备份 | ✅ 已实现：导出含原图 Blob；导入调用 `photoStore.importLibrary` 覆盖照片库 |
| D-3 | 移动端手势 | 无触摸手势优化 |

---

## 7. 开发路线图

> 更新日期：2026-04-20

### Phase 0：架构治理 ✅ 已完成

> 🎯 目标：解决技术债务，为后续功能开发扫清障碍
> 
> 📅 完成日期：2026-03-05

| 任务 | 编号 | 状态 | 实际效果 |
|------|------|------|----------|
| 拆分 UniverseView 巨型组件 | P0-1 | ✅ | 2080行→352行，拆为 Sun/PhotoPlanet/SpiralGalaxy/ConstellationPattern/HologramScreen/Scene/OrbitRing/BackgroundStar/InfoPanel/ConstellationSelector 共10个独立组件 + constants.ts |
| 统一照片 URL 加载逻辑 | P0-2 | ✅ | 新增 `hooks/usePhotoUrl.ts`，支持 blobStorage/localforage/legacy 三级回退 |
| 修复主题切换系统 | P0-3 | ✅ | App.tsx 中 useEffect 调用 applyThemeToDocument，uiStore.updateSettings 同步 currentTheme |
| 清理冗余代码 | P0-4 | ✅ | 删除 7 个冗余文件（AstronomyModel/SolarSystemView/GalaxyView/PhotoCard/PhotoViewer/musicStore/App.optimized），更新 useStore.ts |
| 统一视频元素管理 | P0-5 | ✅ | 曾用 `videoElementManager.ts` 单例；Phase 7 改为「封面 muted video + 进影院卸载 Canvas」，该单例已闲置，勿接回双解码 |

### Phase 1：🌌 3D 视觉与动效升级 ✅ 6/7 完成

> 🎯 目标：提升视觉冲击力，打造更沉浸的宇宙体验
> 
> 📅 完成日期：2026-03-05

| 任务 | 编号 | 状态 | 实际效果 |
|------|------|------|----------|
| 行星星环效果 | P1-1 | ✅ | 新增 `PlanetRing.tsx`，土星环纹理+120粒子陨石带，每3颗行星自动添加 |
| 银河系螺旋臂视图 | P1-2 | ✅ | 新增 `SpiralArmView.tsx`，4条螺旋臂按时间排列照片行星，2400粒子渲染螺旋臂结构，UniverseView 添加「🌀 螺旋臂/☀️ 太阳系」视图切换按钮 |
| 后处理自适应降级 | P1-3 | ✅ | 新增 `utils/performance.ts`，GPU检测→high/medium/low三档，自动调整Bloom/Vignette/粒子数/DPR |
| 行星表面细节 | P1-4 | ✅ | PhotoPlanet 增强大气层（AdditiveBlending）+ 云层纹理 + 选中光晕 |
| 恒星脉冲动画 | P1-5 | ✅ | Sun 升级：呼吸脉冲+日冕流（Shader streamer）+5个耀斑喷射+外层脉冲光圈 |
| 小行星带 | P1-6 | ✅ | 新增 `AsteroidBelt.tsx`，80个不规则小行星+粒子场，在太阳系内环 |
| 星云效果 | P1-7 | ✅ | 新增 `Nebula.tsx`，3团彩色星云（粉紫/蓝绿/橙红），粒子模拟+核心发光 |

### Phase 2：🛠️ 功能扩展 ✅ 7/8 完成

> 🎯 目标：补全核心功能，提升实用性
> 
> 📅 完成日期：2026-03-05

| 任务 | 编号 | 状态 | 实际效果 |
|------|------|------|----------|
| 数据导出/导入 | P2-1 | ✅ | `dataExport.ts` 写出照片/相册/标签/原图 Blob/设置；导入写回 `importLibrary`，不再只灌 IndexedDB 却不更新 store |
| 照片标签分配 | P2-2 | ✅ | HolographicViewer 中新增 TagEditor 组件，支持添加/删除标签，photoStore 新增 createTag/addTagToPhoto/removeTagFromPhoto |
| 照片描述编辑 | P2-3 | ✅ | HolographicViewer 中新增 DescriptionEditor 组件，支持编辑/保存描述，Ctrl+Enter 快捷保存 |
| 时间轴模式 | P2-4 | ✅ | 新增 `TimelineView.tsx`，按年月分组的时间轴侧边栏，支持年份筛选，缩略图+日期+标签信息，右下角日历按钮触发 |
| 歌词解析与展示 | P2-5 | ✅ | 新增 `services/lrcParser.ts`，MusicPlayer 中添加歌词上传+同步滚动展示，当前行高亮 |
| 通知系统 UI | P2-6 | ✅ | 新增 `components/ui/Toast.tsx`，支持 success/error/warning/info 四种类型，自动消失+手动关闭 |
| PWA 配置 | P2-7 | ✅ | vite.config.ts 中配置 VitePWA，支持离线访问+桌面安装，Workbox 缓存策略 |
| 搜索增强 | P2-8 | ✅ | 已有搜索支持按文件名/标签/描述搜索（photoStore.getFilteredPhotos 已实现） |

### Phase 3：⚡ 性能调优 ✅ 已完成

> 🎯 目标：确保大规模数据下的流畅体验
> 
> 📅 完成日期：2026-04-20

| 任务 | 编号 | 状态 | 实际效果 |
|------|------|------|----------|
| InstancedMesh 实例化渲染 | P3-1 | ✅ | AsteroidBelt 改用 InstancedMesh，80个小行星从80个独立Mesh→1个InstancedMesh，Draw Call大幅减少 |
| Web Worker 缩略图压缩 | P3-2 | ✅ | 新增 `workers/imageCompressor.worker.ts` + `services/imageWorker.ts`，照片上传压缩在Worker线程执行，主线程不卡顿，失败自动回退主线程 |
| 纹理懒加载与 LOD | P3-3 | ✅ | PhotoPlanet 新增三级LOD（high/medium/low），根据摄像机距离动态切换：近处加载高清纹理+32段几何体，远处用缩略图+12段几何体，选中/悬停强制高清 |
| 虚拟化照片列表 | P3-4 | ✅ | 新增 `DistantPlanetParticles.tsx`，照片超过30张时启用虚拟化，仅渲染视口内行星，远处用彩色粒子点替代，Scene.tsx 中 useFrame 动态计算可见性 |
| IndexedDB 批量操作优化 | P3-5 | ✅ | database.ts 全面改用事务（transaction），新增 batchDeleteFiles/batchPutFiles/batchDeleteMusic/batchPutMusic/batchUpdateMusicOrder 等批量方法，清理操作也使用事务 |
| 内存泄漏排查 | P3-6 | ✅ | 修复5处泄漏：PhotoPlanet纹理dispose、Sun的3个ShaderMaterial dispose、PlanetRing的CanvasTexture dispose、ConstellationTextureLoader纹理dispose、AsteroidBelt几何体clone改为InstancedMesh |

### Phase 4：🎨 UI/UX 精细化 ✅ 已完成

> 🎯 目标：打磨交互细节，提升用户满意度
> 
> 📅 完成日期：2026-04-20

| 任务 | 编号 | 状态 | 实际效果 |
|------|------|------|----------|
| 新增「暗黑深渊」主题 | P4-1 | ✅ | types/index.ts + styles/theme.ts 新增 dark-abyss 主题（深黑底色 #050000 + 暗红 #cc1a1a 点缀），SettingsModal 可切换 |
| 移动端触摸手势 | P4-2 | ✅ | 新增 `hooks/useTouchGestures.ts`，HolographicViewer 集成：左滑下一张、右滑上一张、下滑关闭、长按触发 |
| 行星信息卡片 | P4-3 | ✅ | 新增 `PlanetInfoCard.tsx`，PhotoPlanet 悬停时显示赛博风格信息卡（名称、日期、标签数、相册），替代简单文字 |
| 键盘快捷键 | P4-4 | ✅ | 新增 `hooks/useKeyboardShortcuts.ts`，App.tsx 集成：ESC关闭弹窗、←→切换照片、Space播放/暂停、Ctrl+U上传、Ctrl+,设置 |
| 引导教程 | P4-5 | ✅ | 新增 `OnboardingGuide.tsx`，5步引导（欢迎→探索→上传→快捷键→音乐），首次使用自动弹出，localStorage 记录完成状态 |
| 加载骨架屏 | P4-6 | ✅ | 新增 `CyberSkeleton.tsx`（card/planet/list 三种变体）+ `.cyber-shimmer` CSS动画，PhotoGrid 加载时替代旋转加载器 |
| 无障碍优化 | P4-7 | ✅ | Navbar 添加 role="navigation" + aria-label，按钮添加 aria-label，HolographicViewer 添加 role="dialog" + aria-modal，移动菜单添加 aria-expanded |

### Phase 5：✨ 视觉体验优化 ✅ 已完成

> 🎯 目标：针对用户反馈的具体视觉问题进行精细化改进
> 
> 📅 完成日期：2026-04-20

| 任务 | 编号 | 状态 | 实际效果 |
|------|------|------|----------|
| 过场动画科幻感增强 | P5-1 | ✅ | UniverseIntro 全面重写：新增 DataStream（60粒子数据流汇聚）、HUDScanLines（6条扫描线）、EnergyPulse（4层能量脉冲环）、SystemBootText（打字机启动序列）；色调从暖橙→冷蓝/青色；虫洞速度线24条；超空间隧道线条120→200条；叙事时序：数据流→HUD扫描→能量脉冲→系统文字→虫洞→超空间→白光→完成 |
| 行星信息卡片全息风格 | P5-2 | ✅ | PlanetInfoCard 重写为全息投影风格：扫描线叠加（holo-scanline）、半透明蓝色基底+毛玻璃、呼吸脉冲（holo-pulse）、故障闪烁效果（holo-glitch）、四角L形装饰线（holo-corner）、40×40缩略图带发光边框；index.css 新增6组CSS动画 |
| 全屏模式名称遮挡修复 | P5-3 | ✅ | HolographicViewer 底部名称区域 bottom-6→bottom-24（24px→96px），为 MusicPlayer 进度条预留充足空间，全屏/非全屏模式均完整显示 |

### Phase 6：🚀 视觉与功能进阶 ✅ 已完成

> 🎯 目标：突破视觉体验瓶颈，拓展核心功能边界，提升产品竞争力
>
> 📅 完成日期：2026-04-21
> 📅 更新日期：2026-04-22（UI修复 + 照片持久化 + 上传进度条）

#### 🎨 视觉效果提升方案

| 方案 | 编号 | 难度 | 优先级 | 状态 | 实际效果 |
|------|------|------|--------|------|----------|
| 动态渐变色彩系统 | P6-1 | ⭐⭐ | P0 | ✅ | 新增 5 种渐变预设（赛博极光/全息彩虹/星云紫/落日余晖/深海蓝），CSS 渐变文字/边框/按钮/卡片动画，SettingsModal 中新增渐变选择器，uiStore 持久化渐变状态 |
| 3D 视差滚动 | P6-2 | ⭐⭐⭐ | P1 | ✅ | 新增 `hooks/useParallax.ts`（useParallax/useParallaxLayer/useScrollParallax），`components/ui/ParallaxBackground.tsx` 深度分层粒子视差，鼠标跟踪 + 弹簧物理动画 |
| 微交互动画升级 | P6-3 | ⭐⭐ | P0 | ✅ | 新增 `components/ui/MagneticButton.tsx`（磁吸按钮 + 涟漪效果），`components/ui/PageTransition.tsx`（4 种过渡动画），CSS 新增 `@keyframes ripple-effect` |
| 排版层次优化 | P6-4 | ⭐ | P1 | ⏳ 待实现 |
| 数据可视化图表 | P6-5 | ⭐⭐⭐ | P2 | ⏳ 待实现 |
| UI 样式统一 | P6-18 | ⭐⭐ | P0 | ✅ | UniverseView 右上角按钮重写为赛博朋克风格：渐变背景 + 发光边框 + font-cyber 字体 + 悬停阴影动画；图标替换为 Lucide 组件解决 emoji 渲染问题；按钮从左侧移至右上角避免遮挡标题 |

#### 🔮 功能拓展方向

| 方向 | 编号 | 难度 | 预期价值 | 状态 | 实际效果 |
|------|------|------|----------|------|----------|
| 情绪化音乐推荐 | P6-10 | ⭐⭐⭐ | 音乐使用率提升 50%+ | ✅ | 新增 `services/musicRecommendation.ts`（15+ 标签映射/时间段分析/季节分析），`components/music/MusicRecommendationPanel.tsx` 推荐面板，App.tsx 右侧垂直排列浮动按钮（🎵音乐/📅时间轴/⚡侧边栏） |
| 时光穿梭交互 | P6-13 | ⭐⭐⭐ | 回忆沉浸感提升 45%+ | ✅ | 新增 `components/photos/TimeTravel.tsx`，按年份分组照片，全屏年份视图 + 动画网格，ESC 快捷键关闭 |
| 照片上传进度条 | P6-16 | ⭐⭐ | 用户体验提升 | ✅ | UploadModal 新增渐变动画进度条 + 百分比显示 + 当前文件索引提示，photoStore.addPhoto 支持 onProgress 回调 |
| 照片持久化修复 | P6-17 | ⭐⭐ | 数据完整性 | ✅ | 修复刷新后照片不显示问题，initializeDefaultAlbum 异步从 blobStorage 恢复 url 字段，新上传照片 url 直接存储 base64 |
| 智能相册分类 | P6-6 | ⭐⭐⭐⭐ | 节省整理时间 70%+ | ⏳ 待实现 |
| 3D 照片回忆录 | P6-7 | ⭐⭐⭐⭐⭐ | 独特情感表达载体 | ⏳ 待实现 |
| 实时协作相册 | P6-8 | ⭐⭐⭐⭐ | 社交分享场景覆盖 | ⏳ 待实现 |
| AR 照片展示 | P6-9 | ⭐⭐⭐⭐⭐ | 创新体验技术壁垒 | ⏳ 待实现 |

#### ⚛️ React 技术路径

| 技术 | 用途 | 状态 | 实际效果 |
|------|------|------|----------|
| React 性能优化组合 | 减少不必要重新渲染 | ✅ | PhotoGrid/Navbar/MagneticButton/ParallaxBackground/GradientSelector 全面 memo，useMemo/useCallback 优化依赖 |
| 代码分割 + Suspense | 路由级懒加载 | ⏳ 待实现 |
| Zustand 选择器优化 | 状态订阅精准化 | ✅ | PhotoGrid 中 useMemo 缓存 getFilteredPhotos 结果 |
| 自定义 Hook 矩阵 | 逻辑复用与抽象 | ✅ | 新增 useParallax（3 个子 Hook） |
| 错误边界 | 优雅降级处理 | ⏳ 待实现 |

#### 🌟 创新交互模式

| 模式 | 编号 | 难度 | 预期效果 | 状态 | 描述 |
|------|------|------|----------|------|------|
| 星空探索模式 | P6-11 | ⭐⭐⭐⭐ | 探索时长提升 60%+ | ⏳ 待实现 | WASD/箭头键在 3D 宇宙中漫游 |
| 手势绘画相册 | P6-12 | ⭐⭐⭐ | 增强分享传播性 | ⏳ 待实现 | 3D 空间中手势绘制照片排列轨迹 |
| 语音控制导航 | P6-14 | ⭐⭐ | 无障碍体验创新 | ⏳ 待实现 | Web Speech API 语音命令 |

#### 📊 效果评估标准

| 指标 | 测量方法 | 目标值 |
|------|----------|--------|
| 视觉满意度 | 用户调查评分 | ≥ 4.5/5 |
| 交互流畅度 | FPS 监控 | ≥ 55fps |
| 加载性能 | Lighthouse 评分 | ≥ 90 |
| 用户停留时间 | 分析工具统计 | 提升 30%+ |
| 功能使用率 | 埋点数据统计 | 各功能 ≥ 40% |
| NPS 评分 | 净推荐值调查 | ≥ 50 |

#### 🗓️ 实施优先级排序

| 优先级 | 任务 | 状态 |
|--------|------|------|
| **P0 已完成** | 动态渐变色彩系统 (P6-1) | ✅ |
| **P0 已完成** | 微交互动画升级 (P6-3) | ✅ |
| **P0 已完成** | React 性能优化组合 (P6-15) | ✅ |
| **P1 已完成** | 3D 视差滚动 (P6-2) | ✅ |
| **P1 已完成** | 时光穿梭交互 (P6-13) | ✅ |
| **P1 已完成** | 情绪化音乐推荐 (P6-10) | ✅ |
| **P1 待实现** | 排版层次优化 (P6-4) | ⏳ |
| **P2 待实现** | 数据可视化图表 (P6-5) | ⏳ |
| **P2 长期探索** | 智能相册分类 (P6-6) | ⏳ |
| **P2 长期探索** | AR 照片展示 (P6-9) | ⏳ |

---

## 7.1 Phase 7：桌面端混合沉浸（2026-09 进行中）

> 🎯 目标：RanRan 作为桌面播放器的宇宙相册页，照片行星 + 全息影院 + 歌词流星，音乐只走父页 PlayerBar。
>
> 📅 更新日期：2026-09-14  
> 状态：**设置已接通；星空页全息循环仍受 WebView2 限制。** 桌面端对照：`desktop/DESKTOP_DEV.md` 第三十一～三十三节。

### 已完成

| 任务 | 状态 | 说明 |
|------|------|------|
| iframe 同源嵌入 | ✅ | `vite.config.ts` `base: '/ranran/'`，产物拷到 `desktop/public/ranran/` |
| 播放桥 | ✅ | `bridge/protocol.ts` + `universeHost.ts`；父页 `universeBridge.ts` 250ms 推快照 |
| 开场动画保留 | ✅ | 嵌入态也播 `UniverseIntro`；设置可跳过 |
| Kepler 公转 | ✅ | 8 带共面椭圆，`n ∝ a^-1.5`，解决「满屏乱飞」 |
| 星河升级 | ✅ | `SoftPoints` 圆点、四臂螺旋、银道带、`StarRiver`、`SkyDecor`；星系让开太阳系 |
| 行星照片铺满 | ✅ | `usePlanetTexture` + `meshBasicMaterial` 自发光；禁止再用 Standard + 暗光（会变纯色黑球） |
| 独立影院 | ✅ | 进影院卸载 Canvas；原生 `<video>` 自动播放+循环；多段自动切 |
| 歌词流星 | ✅ | HTML 层从上往下掉，落地闪光；设置可关；进影院不挂 |
| 设置模块接通 | ✅ | 主题/轨道/旋转/粒子/过渡/导入导出/流星/开场/性能都驱动真实行为 |

### 硬约束（后续改动不要踩）

1. **进影院必须卸载 Canvas**，星空封面与影院 **不要同时解码**。
2. 影院 **不要** 用 `drei Html` / `VideoTexture` 再叠一层 HTML `<video>`。
3. 行星贴图必须 **unlit**（`meshBasicMaterial`），不要叠云层挡住照片。
4. 视频优先 **H.264 MP4**。
5. `videoElementManager.ts` 是旧双解码遗留，**不要接回去**。
6. **禁止** 给桌面端主窗口加 `additionalBrowserArgs`（`--disable-accelerated-video-decode` 等）。WebView2 参数是进程级的，会弄丢桌面歌词窗和托盘面板。
7. 歌词窗和托盘面板必须在 `setup` 里立刻预建，不要延迟创建，失败时才回退原生菜单。

### 未完成 / 下次

1. 星空页看见片子静音循环：WebView2 上 WebGL 和硬件视频互抢，影院能播是因为 Canvas 已卸。不要再用进程级软件解码去换。
2. 行星大小、默认相机、全息屏占位与样式。
3. 有空再清 `performance.ts` 历史 tsc 报错。

构建：`cd desktop/RanRan-main; npm run build`，拷 `dist/*` → `desktop/public/ranran/`，改 `UniversePage` 的 `?build=`。当前缓存号 `20260914g`，产物 `index-BKv4OkZs.js`。

---

## 8. 后续开发与对话指南

你可以直接引用上述路线图中的任务编号来启动开发，例如：
- "帮我执行 P0-1，拆分 UniverseView"
- "开始 P1-1，给行星添加星环效果"
- "执行 Phase 0 全部任务"

也可以提出路线图之外的新需求，我会评估后补充到文档中。

---
*文档生成于：2026-04-19 | 路线图更新于：2026-09-14 | Phase 5 完成于：2026-04-20 | Phase 6 完成于：2026-04-22 | Phase 7（桌面端混合）进行中*
