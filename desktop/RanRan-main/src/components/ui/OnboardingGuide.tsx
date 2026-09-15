import { useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, X, Rocket, MousePointer, Keyboard, Music, Upload } from 'lucide-react';

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
  }, [currentStep, onComplete]);

  const handleSkip = useCallback(() => {
    onComplete();
  }, [onComplete]);

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-md mx-4 rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(0,30,50,0.95) 0%, rgba(5,5,15,0.98) 100%)',
          border: '1px solid rgba(0,245,255,0.15)',
          boxShadow: '0 0 40px rgba(0,245,255,0.1), inset 0 0 40px rgba(0,245,255,0.03)',
        }}
      >
        <button
          onClick={handleSkip}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors z-10"
        >
          <X size={16} />
        </button>

        <div className="p-8 text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-6 flex justify-center">
                <div className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/10">
                  {step.icon}
                </div>
              </div>

              <h2 className="text-xl font-cyber text-white mb-3">
                {step.title}
              </h2>

              <p className="text-gray-400 text-sm leading-relaxed mb-4">
                {step.description}
              </p>

              {step.shortcut && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                  <Keyboard size={14} className="text-cyan-400" />
                  <span className="text-xs font-mono text-cyan-300">{step.shortcut}</span>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-center gap-1.5 mt-6 mb-6">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === currentStep
                    ? 'w-6 bg-cyan-400'
                    : i < currentStep
                    ? 'w-3 bg-cyan-400/40'
                    : 'w-3 bg-white/10'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              onClick={handleSkip}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              跳过引导
            </button>

            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-500/50 transition-all"
            >
              {isLastStep ? '开始探索' : '下一步'}
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
});

OnboardingGuide.displayName = 'OnboardingGuide';

export default OnboardingGuide;
