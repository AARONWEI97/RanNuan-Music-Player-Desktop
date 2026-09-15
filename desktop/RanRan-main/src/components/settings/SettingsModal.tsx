import { motion } from 'framer-motion';
import { useRef, type ReactNode } from 'react';
import {
  Volume2,
  VolumeX,
  Grid3X3,
  RotateCw,
  Sparkles,
  Download,
  Upload,
  Palette,
  Gauge,
  Star,
  Clapperboard,
} from 'lucide-react';
import { useUiStore } from '../../store/modules/uiStore';
import { defaultThemes, type PerformanceMode } from '../../types';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { exportAllData, downloadAsJson, readJsonFile, importData } from '../../services/dataExport';
import GradientSelector from './GradientSelector';
import { isEmbedded } from '../../bridge/universeHost';
import { setStoredPerformanceTier } from '../../utils/performance';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function ToggleRow({
  icon,
  label,
  hint,
  on,
  colorClass,
  onToggle,
}: {
  icon: ReactNode;
  label: string;
  hint?: string;
  on: boolean;
  colorClass: string;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        {icon}
        <div className="min-w-0">
          <div className="text-gray-300">{label}</div>
          {hint && <div className="text-xs text-gray-500">{hint}</div>}
        </div>
      </div>
      <button
        type="button"
        className={`relative h-7 w-14 rounded-full transition-colors duration-300 ${on ? colorClass : 'bg-dark-border'}`}
        onClick={onToggle}
        aria-pressed={on}
      >
        <motion.div
          className="absolute top-1 h-5 w-5 rounded-full bg-white shadow-lg"
          animate={{ left: on ? '32px' : '4px' }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </button>
    </div>
  );
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, updateSettings, showSuccess, showError, showWarning, currentGradient, setGradient } = useUiStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      const data = await exportAllData();
      downloadAsJson(data);
      showSuccess(`已导出 ${data.photos.length} 张照片`);
    } catch {
      showError('导出失败，请重试');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await readJsonFile(file);
      const count = data.photos?.length || 0;
      if (!window.confirm(`导入将覆盖当前照片库（备份含 ${count} 张照片），是否继续？`)) {
        return;
      }
      const result = await importData(data);
      showSuccess(`导入成功：${result.importedPhotos} 张照片，${result.importedBlobs} 个文件`);
    } catch (err) {
      showError((err as Error).message || '导入失败');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const setPerformance = (mode: PerformanceMode) => {
    updateSettings({ performanceMode: mode });
    setStoredPerformanceTier(mode);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="设置" size="lg">
      <div className="space-y-8">
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 font-cyber text-lg text-white">
            <Sparkles size={20} className="text-cyber-blue" />
            主题风格
          </h3>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {defaultThemes.map((theme) => (
              <motion.button
                key={theme.id}
                className={`
                  relative rounded-xl border-2 p-4 transition-all duration-300
                  ${settings.theme.id === theme.id
                    ? 'border-cyber-blue bg-cyber-blue/10'
                    : 'border-dark-border bg-dark-card hover:border-cyber-blue/50'
                  }
                `}
                onClick={() => updateSettings({ theme })}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="mb-3 flex items-center gap-3">
                  <div
                    className="h-8 w-8 rounded-full"
                    style={{ background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})` }}
                  />
                  <span className="font-cyber text-sm text-white">{theme.name}</span>
                </div>
                <div className="flex gap-1">
                  <div className="h-4 w-4 rounded-full" style={{ backgroundColor: theme.primaryColor }} />
                  <div className="h-4 w-4 rounded-full" style={{ backgroundColor: theme.secondaryColor }} />
                  <div className="h-4 w-4 rounded-full" style={{ backgroundColor: theme.particleColor }} />
                </div>
                {settings.theme.id === theme.id && (
                  <motion.div
                    layoutId="theme-selected"
                    className="absolute inset-0 rounded-xl border-2 border-cyber-blue"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </motion.button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="flex items-center gap-2 font-cyber text-lg text-white">
            <Palette size={20} className="text-cyber-purple" />
            渐变色彩系统
          </h3>
          <div className="cyber-glass rounded-xl p-4">
            <GradientSelector
              currentGradient={currentGradient}
              onSelectGradient={setGradient}
              isDark
            />
          </div>
        </div>

        {isEmbedded ? (
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 font-cyber text-lg text-white">
              <Star size={20} className="text-cyber-blue" />
              宇宙联动
            </h3>
            <div className="cyber-glass space-y-4 rounded-xl p-4">
              <ToggleRow
                icon={<Star size={20} className="text-cyber-blue" />}
                label="歌词流星"
                hint="播放时当前歌词从星空落下"
                on={settings.showLyricMeteors}
                colorClass="bg-cyber-blue"
                onToggle={() => updateSettings({ showLyricMeteors: !settings.showLyricMeteors })}
              />
              <ToggleRow
                icon={<Clapperboard size={20} className="text-cyber-purple" />}
                label="进入开场"
                hint="每次进入宇宙播放穿梭动画"
                on={!settings.skipIntro}
                colorClass="bg-cyber-purple"
                onToggle={() => updateSettings({ skipIntro: !settings.skipIntro })}
              />
              <p className="text-xs text-gray-500">音乐由桌面播放器控制，恒星封面和轨道会跟随当前歌曲。</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 font-cyber text-lg text-white">
              <Volume2 size={20} className="text-cyber-purple" />
              音频设置
            </h3>
            <div className="cyber-glass space-y-4 rounded-xl p-4">
              <ToggleRow
                icon={settings.backgroundMusic
                  ? <Volume2 size={20} className="text-cyber-blue" />
                  : <VolumeX size={20} className="text-gray-500" />}
                label="背景音乐"
                hint="开启后自动播放本地曲库"
                on={settings.backgroundMusic}
                colorClass="bg-cyber-blue"
                onToggle={() => {
                  const next = !settings.backgroundMusic;
                  updateSettings({ backgroundMusic: next });
                  if (next) {
                    void import('../../services/musicPlayer').then(({ useMusicPlayer }) => {
                      if (useMusicPlayer.getState().musicList.length === 0) {
                        showWarning('还没有本地曲目，请先在播放器里添加音乐');
                      }
                    });
                  }
                }}
              />
              {settings.backgroundMusic && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>音量</span>
                    <span>{Math.round(settings.musicVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.musicVolume}
                    onChange={(e) => updateSettings({ musicVolume: parseFloat(e.target.value) })}
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-dark-border
                      [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
                      [&::-webkit-slider-thumb]:bg-cyber-blue [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(0,245,255,0.5)]"
                  />
                </div>
              )}
              <ToggleRow
                icon={<Star size={20} className="text-cyber-blue" />}
                label="歌词流星"
                on={settings.showLyricMeteors}
                colorClass="bg-cyber-blue"
                onToggle={() => updateSettings({ showLyricMeteors: !settings.showLyricMeteors })}
              />
              <ToggleRow
                icon={<Clapperboard size={20} className="text-cyber-purple" />}
                label="进入开场"
                on={!settings.skipIntro}
                colorClass="bg-cyber-purple"
                onToggle={() => updateSettings({ skipIntro: !settings.skipIntro })}
              />
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h3 className="flex items-center gap-2 font-cyber text-lg text-white">
            <Grid3X3 size={20} className="text-cyber-green" />
            显示设置
          </h3>
          <div className="cyber-glass space-y-4 rounded-xl p-4">
            <ToggleRow
              icon={<Grid3X3 size={20} className="text-cyber-blue" />}
              label="显示轨道"
              hint="太阳系黄道面轨道环"
              on={settings.showGrid}
              colorClass="bg-cyber-blue"
              onToggle={() => updateSettings({ showGrid: !settings.showGrid })}
            />
            <ToggleRow
              icon={<RotateCw size={20} className="text-cyber-purple" />}
              label="自动旋转"
              hint="镜头沿恒星缓慢公转"
              on={settings.autoRotate}
              colorClass="bg-cyber-purple"
              onToggle={() => updateSettings({ autoRotate: !settings.autoRotate })}
            />
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-400">
                <span>粒子强度</span>
                <span>{Math.round(settings.particleIntensity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={settings.particleIntensity}
                onChange={(e) => updateSettings({ particleIntensity: parseFloat(e.target.value) })}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-dark-border
                  [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-cyber-purple [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(184,41,221,0.5)]"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="flex items-center gap-2 font-cyber text-lg text-white">
            <Gauge size={20} className="text-cyber-blue" />
            性能模式
          </h3>
          <div className="flex flex-wrap gap-2">
            {([
              ['auto', '自动'],
              ['low', '流畅'],
              ['medium', '均衡'],
              ['high', '画质'],
            ] as const).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                className={`rounded-lg px-4 py-2 font-cyber text-sm uppercase tracking-wider transition-all ${
                  settings.performanceMode === mode
                    ? 'bg-cyber-blue text-dark-bg'
                    : 'bg-dark-card text-gray-400 hover:text-white'
                }`}
                onClick={() => setPerformance(mode)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-cyber text-lg text-white">过渡效果</h3>
          <div className="flex flex-wrap gap-2">
            {([
              ['fade', '淡入淡出'],
              ['slide', '滑动'],
              ['zoom', '缩放'],
              ['flip', '翻转'],
            ] as const).map(([effect, label]) => (
              <button
                key={effect}
                type="button"
                className={`rounded-lg px-4 py-2 font-cyber text-sm uppercase tracking-wider transition-all ${
                  settings.transitionEffect === effect
                    ? 'bg-cyber-blue text-dark-bg'
                    : 'bg-dark-card text-gray-400 hover:text-white'
                }`}
                onClick={() => updateSettings({ transitionEffect: effect })}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="flex items-center gap-2 font-cyber text-lg text-white">
            <Download size={20} className="text-cyber-blue" />
            数据管理
          </h3>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => void handleExport()}
              className="flex items-center gap-2 rounded-lg border border-dark-border bg-dark-card px-4 py-2.5 font-cyber text-sm text-white transition-all hover:border-cyber-blue/50"
            >
              <Download size={16} />
              导出数据
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={(event) => void handleImport(event)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-lg border border-dark-border bg-dark-card px-4 py-2.5 font-cyber text-sm text-white transition-all hover:border-cyber-blue/50"
            >
              <Upload size={16} />
              导入数据
            </button>
          </div>
          <p className="text-xs text-gray-500">
            导出会保存照片、相册、标签、原图文件和当前设置。导入会覆盖现有照片库。
          </p>
        </div>

        <div className="flex justify-end border-t border-cyber-blue/10 pt-4">
          <Button variant="primary" onClick={onClose}>
            完成
          </Button>
        </div>
      </div>
    </Modal>
  );
}
