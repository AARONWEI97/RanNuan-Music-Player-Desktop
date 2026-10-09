// Local Vite fixture: /ranran/tests/universe.html (not a production build entry).
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas } from '@react-three/fiber';
import UniverseView from '../src/components/astronomy/UniverseView';
import Scene from '../src/components/astronomy/Scene';
import { useUiStore } from '../src/store/modules/uiStore';
import { setStoredPerformanceTier } from '../src/utils/performance';
import '../src/index.css';

useUiStore.getState().updateSettings({ skipIntro: true });
setStoredPerformanceTier('high');
let seed = 42;
Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
let extension: WEBGL_lose_context | null = null;
let generation = 0;
const events: string[] = [];
const observed = new WeakSet<HTMLCanvasElement>();
new MutationObserver(() => {
  document.querySelectorAll('canvas').forEach(canvas => {
    if (observed.has(canvas)) return;
    observed.add(canvas);
    const id = ++generation;
    events.push(`canvas ${id} mounted`);
    for (const type of ['webglcontextlost', 'webglcontextrestored']) {
      canvas.addEventListener(type, () => events.push(`${id} ${type} attached=${canvas.isConnected}`));
    }
  });
}).observe(document.body, { childList: true, subtree: true });

export function Fixture() {
  const [post, setPost] = useState(true);
  const [report, setReport] = useState('');
  const sceneOnly = new URLSearchParams(location.search).has('scene');
  function lose(restore: boolean) {
    const canvas = document.querySelector('canvas');
    extension = canvas?.getContext('webgl2')?.getExtension('WEBGL_lose_context') ?? null;
    extension?.loseContext();
    if (restore) setTimeout(() => extension?.restoreContext(), 700);
  }
  function sample() {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const source = document.querySelector('canvas');
      if (!source) { setReport(JSON.stringify({ events, error: 'no canvas' })); return; }
      const copy = document.createElement('canvas');
      copy.width = source.width; copy.height = source.height;
      const ctx = copy.getContext('2d')!;
      ctx.drawImage(source, 0, 0);
      const data = ctx.getImageData(0, 0, copy.width, copy.height).data;
      let white = 0, dark = 0, sum = 0;
      for (let i = 0; i < data.length; i += 4) {
        const v = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (data[i] > 245 && data[i+1] > 245 && data[i+2] > 245) white++;
        if (v < 40) dark++;
        sum += v;
      }
      const pixels = data.length / 4;
      setReport(JSON.stringify({ size: [copy.width, copy.height], white: white/pixels, dark: dark/pixels, mean: sum/pixels, events }));
    }));
  }
  return <>
    <div style={{ height: 54, background: '#17202e', color: 'white', position: 'relative', zIndex: 100 }}>
      <button onClick={() => setPost(!post)}>Post {post ? 'ON' : 'OFF'}</button>{' | '}
      <button onClick={() => lose(true)}>Lose and restore</button>{' | '}
      <button onClick={() => lose(false)}>Lose permanently</button>{' | '}
      <button onClick={sample}>Sample pixels</button>
      <output style={{ display: 'block', fontSize: 10 }}>{report}</output>
    </div>
    <div style={{ height: 'calc(100vh - 54px)', position: 'relative' }}>
      {sceneOnly ? <Canvas camera={{ fov: 52, near: 0.1, far: 1400 }} dpr={1} gl={{ antialias: false }}>
        <Scene photos={[]} selectedPhotoId={null} onPhotoSelect={() => {}} isDark selectedConstellation={null} constellationPhotos={{} as never} performanceTier="high" cinemaOpen={!post} />
      </Canvas> : <UniverseView photos={[]} />}
    </div>
  </>;
}
const root = import.meta.hot?.data.root ?? createRoot(document.getElementById('root')!);
if (import.meta.hot) import.meta.hot.data.root = root;
root.render(<React.StrictMode><Fixture /></React.StrictMode>);
