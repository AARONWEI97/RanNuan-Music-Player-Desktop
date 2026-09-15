import { useEffect, useRef, useState, memo } from 'react';
import { useUniverseHostStore } from '../../bridge/universeHost';

interface MeteorData {
  id: number;
  text: string;
  sub?: string;
  left: number;
  duration: number;
  drift: number;
  tilt: number;
}

const SPARKS = [0, 1, 2, 3, 4, 5, 6, 7, 8];

const LyricMeteors: React.FC = () => {
  const lyric = useUniverseHostStore((s) => s.snapshot.lyric);
  const isPlay = useUniverseHostStore((s) => s.snapshot.isPlay);
  const [meteors, setMeteors] = useState<MeteorData[]>([]);
  const lastKey = useRef('');

  const current = lyric && lyric.index >= 0 ? lyric.lines[lyric.index] : null;
  const lineKey = current ? `${current.text}\n${current.sub || ''}` : '';

  useEffect(() => {
    if (!isPlay || !current?.text.trim()) return;
    if (lineKey === lastKey.current) return;
    lastKey.current = lineKey;

    const id = Date.now() + Math.floor(Math.random() * 1000);
    const duration = 4200 + Math.random() * 900;
    setMeteors((prev) => [
      ...prev.slice(-2),
      {
        id,
        text: current.text,
        sub: current.sub,
        left: 18 + Math.random() * 54,
        duration,
        drift: -8 + Math.random() * 16,
        tilt: 8 + Math.random() * 10,
      },
    ]);

    const timer = window.setTimeout(() => {
      setMeteors((prev) => prev.filter((item) => item.id !== id));
    }, duration + 120);

    return () => window.clearTimeout(timer);
  }, [current, isPlay, lineKey]);

  if (meteors.length === 0) return null;

  return (
    <div className="lyric-meteor-layer" aria-hidden>
      {meteors.map((meteor) => (
        <div
          key={meteor.id}
          className="lyric-meteor"
          style={{
            left: `${meteor.left}%`,
            animationDuration: `${meteor.duration}ms`,
            ['--meteor-drift' as string]: `${meteor.drift}vw`,
            ['--meteor-tilt' as string]: `${meteor.tilt}deg`,
            ['--burst-delay' as string]: `${Math.round(meteor.duration * 0.72)}ms`,
          }}
        >
          <span className="lyric-meteor-trail" />
          <span className="lyric-meteor-head" />
          <span className="lyric-meteor-copy">
            <span className="lyric-meteor-text">{meteor.text}</span>
            {meteor.sub ? <span className="lyric-meteor-sub">{meteor.sub}</span> : null}
          </span>
          <span className="lyric-meteor-burst">
            {SPARKS.map((spark) => (
              <i
                key={spark}
                className="lyric-meteor-spark"
                style={{ ['--spark-i' as string]: String(spark) }}
              />
            ))}
            <i className="lyric-meteor-flash" />
            <i className="lyric-meteor-ring" />
          </span>
        </div>
      ))}
    </div>
  );
};

export default memo(LyricMeteors);
