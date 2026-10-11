import { useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Rocket, MousePointer, Keyboard, Music, Upload, Radar, Sparkles, Check, ShieldCheck, Signal } from 'lucide-react';

interface OnboardingStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  shortcut?: string;
}

const standaloneSteps: OnboardingStep[] = [
  {
    icon: <Rocket size={32} className="text-cyan-400" />,
    title: '欢迎来到 RanRan 宇宙',
    description: '你的 3D 元宇宙相册，每张照片都是一颗独特的行星，在星海中等待探索。',
  },
  {
    icon: <MousePointer size={32} className="text-cyan-400" />,
    title: '探索星系',
    description: '鼠标拖拽旋转视角，滚轮缩放远近，点击行星查看照片详情。悬停可预览照片信息。',
  },
  {
    icon: <Upload size={32} className="text-cyan-400" />,
    title: '上传照片',
    description: '点击上传按钮或使用快捷键 Ctrl+U，将照片化为宇宙中的新星。',
    shortcut: 'Ctrl+U',
  },
  {
    icon: <Keyboard size={32} className="text-cyan-400" />,
    title: '快捷键',
    description: 'ESC 关闭弹窗，方向键切换照片，空格键播放/暂停音乐，Ctrl+, 打开设置。',
  },
  {
    icon: <Music size={32} className="text-cyan-400" />,
    title: '星际音乐',
    description: '上传你喜欢的音乐，在宇宙中聆听旋律。支持 LRC 歌词同步显示。',
  },
];

const embeddedSteps: OnboardingStep[] = [
  {
    icon: <Rocket size={32} className="text-cyan-400" />,
    title: '欢迎来到宇宙相册',
    description: '这里还是冉暖播放器：底部继续控制当前歌曲，照片会变成环绕恒星的行星。',
  },
  {
    icon: <MousePointer size={32} className="text-cyan-400" />,
    title: '探索星系',
    description: '拖拽旋转视角，滚轮缩放，点击行星查看照片。恒星会跟着正在播放的封面呼吸。',
  },
  {
    icon: <Upload size={32} className="text-cyan-400" />,
    title: '上传照片',
    description: '用工具条上传或按 Ctrl+U，把照片送进这片星海。',
    shortcut: 'Ctrl+U',
  },
  {
    icon: <Music size={32} className="text-cyan-400" />,
    title: '音乐还在底部',
    description: '空格键控制桌面端播放条。情绪推荐会搜索你的曲库，而不是另一套播放器。',
    shortcut: 'Space',
  },
];

interface OnboardingGuideProps {
  onComplete: () => void;
}

const OnboardingGuide: React.FC<OnboardingGuideProps> = memo(({ onComplete }) => {
  const embedded = typeof window !== 'undefined' && window.parent !== window;
  const steps = embedded ? embeddedSteps : standaloneSteps;
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  }, [currentStep, onComplete, steps.length]);

  const handleSkip = useCallback(() => {
    onComplete();
  }, [onComplete]);

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const stepNumber = String(currentStep + 1).padStart(2, '0');
  const totalSteps = String(steps.length).padStart(2, '0');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#020611]/90 p-4 backdrop-blur-xl sm:p-6"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage: 'linear-gradient(rgba(79, 220, 255, 0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(79, 220, 255, 0.045) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          maskImage: 'linear-gradient(to bottom, transparent, black 18%, black 82%, transparent)',
        }}
      />
      <motion.div
        className="pointer-events-none absolute h-[30rem] w-[30rem] rounded-full border border-cyan-300/10"
        animate={{ rotate: 360 }}
        transition={{ duration: 32, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="pointer-events-none absolute h-[20rem] w-[20rem] rounded-full border border-cyan-300/10 border-dashed"
        animate={{ rotate: -360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 18 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 12 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className="relative w-full max-w-2xl overflow-hidden rounded-[1.75rem] border border-cyan-200/15 bg-[#07111e]/95 shadow-[0_30px_120px_rgba(0,0,0,.6),0_0_80px_rgba(0,212,255,.08)]"
        style={{
          backgroundImage: 'linear-gradient(135deg, rgba(9, 29, 48, .98), rgba(3, 9, 20, .98))',
        }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-cyan-200/70 shadow-[0_0_18px_rgba(34,211,238,.9)]" />
        <div className="flex items-center justify-between border-b border-white/[.08] px-5 py-4 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl border border-cyan-300/25 bg-cyan-300/[.08] text-cyan-300">
              <Radar size={18} />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[.28em] text-cyan-200/55">RANRAN / INITIALIZE</div>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-white/45"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,.9)]" />系统准备就绪 · 本地空间</div>
            </div>
          </div>
          <button
            onClick={handleSkip}
            aria-label="关闭引导"
            className="rounded-xl border border-white/10 bg-white/[.03] p-2 text-white/45 transition hover:border-white/20 hover:bg-white/[.08] hover:text-white"
          >
            <X size={17} />
          </button>
        </div>

        <div className="grid md:grid-cols-[minmax(190px,.72fr)_minmax(0,1.28fr)]">
          <div className="relative flex min-h-[230px] items-center justify-center overflow-hidden border-b border-white/[.08] bg-cyan-300/[.025] p-8 md:border-b-0 md:border-r">
            <div className="absolute left-5 top-5 font-mono text-[10px] tracking-[.18em] text-cyan-100/30">NODE {stepNumber} / {totalSteps}</div>
            <div className="absolute bottom-5 left-5 flex items-center gap-2 text-[10px] uppercase tracking-[.18em] text-white/30"><Signal size={13} className="text-cyan-300/60" /> SIGNAL LOCKED</div>
            <div className="relative grid h-40 w-40 place-items-center">
              <motion.div
                className="absolute inset-0 rounded-full border border-cyan-300/20"
                animate={{ rotate: 360, scale: [1, 1.04, 1] }}
                transition={{ rotate: { duration: 14, repeat: Infinity, ease: 'linear' }, scale: { duration: 3, repeat: Infinity, ease: 'easeInOut' } }}
              />
              <motion.div
                className="absolute inset-4 rounded-full border border-cyan-300/25 border-dashed"
                animate={{ rotate: -360 }}
                transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
              />
              <div className="absolute inset-[2.75rem] rounded-full bg-cyan-300/[.08] shadow-[0_0_45px_rgba(34,211,238,.16)]" />
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, scale: .65, rotate: -12 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: .75, rotate: 12 }}
                  transition={{ duration: .28 }}
                  className="relative grid h-16 w-16 place-items-center rounded-2xl border border-cyan-200/35 bg-[#0b2232] text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,.22)]"
                >
                  {step.icon}
                </motion.div>
              </AnimatePresence>
              <Sparkles size={13} className="absolute right-1 top-6 text-cyan-100/70" />
            </div>
          </div>

          <div className="p-5 sm:p-7">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.22em] text-cyan-200/55"><ShieldCheck size={13} />探索协议</div>
              <div className="font-mono text-xs text-white/35">{stepNumber}<span className="mx-1 text-white/15">/</span>{totalSteps}</div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -18 }}
                transition={{ duration: 0.25 }}
              >
                <h2 id="onboarding-title" className="text-2xl font-semibold tracking-tight text-white sm:text-[1.75rem]">{step.title}</h2>
                <p className="mt-3 max-w-lg text-sm leading-7 text-white/60">{step.description}</p>
                {step.shortcut && (
                  <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-cyan-200/15 bg-cyan-300/[.06] px-3 py-2 text-cyan-100/80">
                    <Keyboard size={14} className="text-cyan-300" />
                    <span className="font-mono text-xs tracking-wide">{step.shortcut}</span>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="mt-8 flex items-center gap-1.5" aria-label={`第 ${currentStep + 1} 步，共 ${steps.length} 步`}>
              {steps.map((_, index) => (
                <div key={index} className={`h-1 rounded-full transition-all duration-300 ${index === currentStep ? 'w-10 bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,.7)]' : index < currentStep ? 'w-5 bg-cyan-300/45' : 'w-5 bg-white/10'}`} />
              ))}
            </div>

            <div className="mt-8 flex items-center justify-between gap-3 border-t border-white/[.08] pt-5">
              <button onClick={handleSkip} className="text-xs text-white/35 transition hover:text-white/70">跳过初始化</button>
              <div className="flex items-center gap-2">
                {currentStep > 0 && (
                  <button onClick={() => setCurrentStep((value) => value - 1)} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-white/50 transition hover:border-white/20 hover:bg-white/[.07] hover:text-white" aria-label="上一步"><ChevronLeft size={16} /></button>
                )}
                <button onClick={handleNext} className="inline-flex h-10 items-center gap-2 rounded-xl border border-cyan-200/35 bg-cyan-300/[.1] px-4 text-xs font-semibold text-cyan-100 transition hover:border-cyan-200/60 hover:bg-cyan-300/[.18]">
                  {isLastStep ? <Check size={15} /> : <ChevronRight size={15} />}
                  {isLastStep ? '进入宇宙' : '继续'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
});

OnboardingGuide.displayName = 'OnboardingGuide';

export default OnboardingGuide;
