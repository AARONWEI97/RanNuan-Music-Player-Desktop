import { useUniverseHostStore } from '../bridge/universeHost';
import { getLocalAudioEnergy } from './musicPlayer';

// 设计决策：2026-09-15 方案A 第二期
// 节拍能量总线（0~1，快起慢落平滑）：
// - 嵌入桌面端：取父页桥快照的 synthetic energy（主播放器是跨域流媒体，不能挂分析器）
// - 独立运行：取本地 AudioPlayer 的 Web Audio 分析器真实能量（blob 音源无 CORS 问题）
// 消费方（Bloom/星闪/体积光）在 useFrame 里以模块函数方式读取，不触发 React 重渲染。

let smoothed = 0;
let lastTime = -1;

export function getBeatEnergy(): number {
  const now = typeof performance !== 'undefined' ? performance.now() / 1000 : 0;
  const dt = lastTime < 0 ? 0.016 : Math.min(0.1, Math.max(0.001, now - lastTime));
  lastTime = now;

  const host = useUniverseHostStore.getState();
  const target = host.embedded
    ? (host.snapshot.isPlay ? (host.snapshot.energy ?? 0) : 0)
    : getLocalAudioEnergy();

  const rate = target > smoothed ? 9 : 3; // 起峰快、回落慢
  smoothed += (target - smoothed) * Math.min(1, rate * dt);
  return smoothed;
}
