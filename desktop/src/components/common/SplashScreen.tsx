import { useEffect, useState, useRef } from 'react'
import pkg from '../../../package.json'

// ═══════════════ 狗狗叫声（真实音频文件） ═══════════════
function playDogBark() {
  try {
    const audio = new Audio('/dog.mp3')
    audio.volume = 0.45
    audio.play().catch(() => { /* 用户未交互时浏览器可能阻止 */ })
  } catch { /* 静默忽略 */ }
}

// ═══════════════ 可爱浮动装饰 ═══════════════
const decorations = [
  { emoji: '🌸', size: 'text-2xl', top: '12%', left: '8%', delay: '0s', dur: '5s' },
  { emoji: '🎵', size: 'text-lg', top: '22%', right: '12%', delay: '0.8s', dur: '6s' },
  { emoji: '✨', size: 'text-xl', top: '65%', left: '5%', delay: '0.3s', dur: '4.5s' },
  { emoji: '🐾', size: 'text-lg', top: '75%', right: '10%', delay: '1.2s', dur: '5.5s' },
  { emoji: '💖', size: 'text-sm', top: '45%', left: '85%', delay: '0.5s', dur: '4s' },
  { emoji: '🎀', size: 'text-base', top: '30%', left: '3%', delay: '1s', dur: '5.8s' },
]

// ═══════════════ SplashScreen ═══════════════
interface Props { onFinish: () => void }

export default function SplashScreen({ onFinish }: Props) {
  const [exiting, setExiting] = useState(false)
  const [contentVisible, setContentVisible] = useState(false)
  const barked = useRef(false)

  useEffect(() => {
    const t1 = setTimeout(() => setContentVisible(true), 200)
    const t2 = setTimeout(() => {
      if (!barked.current) { barked.current = true; playDogBark() }
    }, 1000)
    const t3 = setTimeout(() => setExiting(true), 2500)
    const t4 = setTimeout(() => onFinish(), 3000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [onFinish])

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden select-none
        ${exiting ? 'animate-splash-exit' : ''}`}
      style={{
        background: 'linear-gradient(160deg, #fef9f0 0%, #fdf2f8 35%, #f0f4ff 70%, #fefce8 100%)',
      }}
    >
      {/* ═══ 流体 blob 背景（马卡龙色系） ═══ */}
      {/* blob 1: 蜜桃 */}
      <div
        className="absolute w-[480px] h-[480px] rounded-full"
        style={{
          background: 'radial-gradient(circle at 35% 35%, rgba(255,175,145,0.55), transparent)',
          filter: 'blur(90px)',
          animation: 'blobFloat1 8s ease-in-out infinite',
          top: '-5%',
          left: '8%',
        }}
      />
      {/* blob 2: 樱花粉 */}
      <div
        className="absolute w-[400px] h-[400px] rounded-full"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(255,185,200,0.5), transparent)',
          filter: 'blur(75px)',
          animation: 'blobFloat2 7s ease-in-out infinite',
          top: '35%',
          right: '-2%',
        }}
      />
      {/* blob 3: 淡紫 */}
      <div
        className="absolute w-[340px] h-[340px] rounded-full"
        style={{
          background: 'radial-gradient(circle at 55% 45%, rgba(195,175,255,0.4), transparent)',
          filter: 'blur(65px)',
          animation: 'blobFloat3 9s ease-in-out infinite',
          bottom: '-8%',
          left: '25%',
        }}
      />
      {/* blob 4: 鹅黄 */}
      <div
        className="absolute w-[260px] h-[260px] rounded-full"
        style={{
          background: 'radial-gradient(circle at 45% 55%, rgba(255,225,140,0.45), transparent)',
          filter: 'blur(55px)',
          animation: 'blobFloat4 6s ease-in-out infinite',
          top: '15%',
          right: '18%',
        }}
      />
      {/* blob 5: 薄荷 */}
      <div
        className="absolute w-[220px] h-[220px] rounded-full"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(155,225,210,0.35), transparent)',
          filter: 'blur(50px)',
          animation: 'blobFloat1 7.5s ease-in-out infinite reverse',
          bottom: '15%',
          right: '25%',
        }}
      />

      {/* ═══ 可爱浮动装饰 ═══ */}
      {decorations.map((d, i) => (
        <span
          key={i}
          className={`absolute ${d.size} pointer-events-none select-none`}
          style={{
            top: d.top,
            left: d.left,
            right: d.right,
            animation: `floatDeco ${d.dur} ease-in-out infinite`,
            animationDelay: d.delay,
            opacity: contentVisible ? 0.7 : 0,
            transition: 'opacity 0.6s ease-out',
          }}
        >
          {d.emoji}
        </span>
      ))}

      {/* ═══ 中央内容 ═══ */}
      <div
        className={`relative z-10 flex flex-col items-center gap-6 transition-all duration-700
          ${contentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        style={{ perspective: '1000px' }}
      >
        {/* Logo 3D 浮动 */}
        <div
          className="relative"
          style={{
            animation: 'logo3dFloat 2.5s ease-in-out infinite',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* 外圈柔光 */}
          <div
            className="absolute inset-[-24px] rounded-full"
            style={{
              background: 'conic-gradient(from 0deg, transparent, rgba(255,150,180,0.35), rgba(255,180,130,0.3), rgba(200,170,255,0.25), transparent)',
              animation: 'glowSpin 5s linear infinite',
              filter: 'blur(18px)',
            }}
          />
          {/* Logo */}
          <img
            src="/logo.png"
            alt="RanNuan Music"
            className="relative w-28 h-28 rounded-2xl object-cover"
            style={{
              animation: 'logoPulse 2s ease-in-out infinite',
              boxShadow: '0 0 40px rgba(255,140,160,0.4), 0 0 80px rgba(255,180,140,0.15), 0 8px 24px rgba(0,0,0,0.08)',
            }}
          />
        </div>

        {/* 标题 */}
        <div className="text-center space-y-1.5">
          <h1
            className="text-3xl font-black tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #f472b6 0%, #fb923c 35%, #e60026 65%, #f472b6 100%)',
              backgroundSize: '200% 200%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'titleShimmer 3s ease-in-out infinite',
            }}
          >
            RanNuan Music
          </h1>
          <p
            className="text-[11px] text-gray-400 font-medium tracking-[0.25em] uppercase"
            style={{ animation: 'fadeInUp 0.8s ease-out 0.6s both' }}
          >
            MUSIC PLAYER
          </p>
        </div>

        {/* 版本号 */}
        <p
          className="text-[10px] text-gray-300 font-mono"
          style={{ animation: 'fadeInUp 0.8s ease-out 0.9s both' }}
        >
          v{pkg.version || '1.0.0'}
        </p>
      </div>

      {/* ═══ CSS Animations ═══ */}
      <style>{`
        @keyframes blobFloat1 {
          0%,100%{transform:translate(0,0)scale(1)} 25%{transform:translate(40px,-30px)scale(1.08)}
          50%{transform:translate(-10px,-60px)scale(0.95)} 75%{transform:translate(-30px,20px)scale(1.05)}
        }
        @keyframes blobFloat2 {
          0%,100%{transform:translate(0,0)scale(1)} 33%{transform:translate(-50px,30px)scale(1.1)}
          66%{transform:translate(20px,-40px)scale(0.92)}
        }
        @keyframes blobFloat3 {
          0%,100%{transform:translate(0,0)scale(1)} 50%{transform:translate(30px,50px)scale(1.12)}
        }
        @keyframes blobFloat4 {
          0%,100%{transform:translate(0,0)scale(1)} 25%{transform:translate(-20px,-20px)scale(1.05)}
          75%{transform:translate(25px,15px)scale(0.96)}
        }
        @keyframes floatDeco {
          0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-12px) rotate(6deg)}
        }
        @keyframes logo3dFloat {
          0%,100%{transform:rotateY(0deg) rotateX(0deg) translateY(0)}
          25%{transform:rotateY(8deg) rotateX(-3deg) translateY(-6px)}
          50%{transform:rotateY(0deg) rotateX(0deg) translateY(0)}
          75%{transform:rotateY(-8deg) rotateX(3deg) translateY(6px)}
        }
        @keyframes logoPulse {
          0%,100%{transform:scale(1)} 50%{transform:scale(1.06)}
        }
        @keyframes glowSpin {
          from{transform:rotate(0deg)} to{transform:rotate(360deg)}
        }
        @keyframes titleShimmer {
          0%,100%{background-position:0% 50%} 50%{background-position:100% 50%}
        }
        @keyframes fadeInUp {
          from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)}
        }
        .animate-splash-exit {
          animation:splashExit 0.5s cubic-bezier(0.4,0,0.2,1) forwards;
        }
        @keyframes splashExit {
          0%{opacity:1;transform:scale(1);filter:blur(0)}
          100%{opacity:0;transform:scale(1.06);filter:blur(8px)}
        }
      `}</style>
    </div>
  )
}
