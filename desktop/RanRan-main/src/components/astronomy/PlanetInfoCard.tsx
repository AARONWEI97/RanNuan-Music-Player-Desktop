import { memo, useMemo } from 'react';
import { Calendar, Tag } from 'lucide-react';
import type { Photo } from '../../types';

interface PlanetInfoCardProps {
  photo: Photo;
  isDark: boolean;
  albumName?: string;
}

const PlanetInfoCard: React.FC<PlanetInfoCardProps> = memo(({
  photo,
  isDark,
  albumName
}) => {
  const formattedDate = useMemo(() => {
    if (!photo.createdAt) return '';
    const date = new Date(photo.createdAt);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }, [photo.createdAt]);

  const tagCount = photo.tags?.length || 0;

  const thumbnailSrc = useMemo(() => {
    return photo.thumbnail || photo.url || '';
  }, [photo.thumbnail, photo.url]);

  return (
    <div className={`holo-pulse pointer-events-none relative w-[220px] max-w-[calc(100vw-32px)] select-none overflow-hidden rounded-[14px] border backdrop-blur-xl shadow-[0_0_24px_rgba(0,245,255,.18),inset_0_0_20px_rgba(0,245,255,.06)] ${
      isDark
        ? 'border-cyan-300/40 bg-[#061622]/90'
        : 'border-cyan-200/45 bg-[#07131c]/90'
    }`}>
      <div className="holo-scanline absolute inset-0 pointer-events-none z-10" />

      <div className="holo-glitch relative z-0 p-3">
        <div className="absolute top-0 left-0 w-3 h-3 holo-corner">
          <div className="absolute top-0 left-0 w-3 h-[1px] bg-cyan-400/60" />
          <div className="absolute top-0 left-0 w-[1px] h-3 bg-cyan-400/60" />
        </div>
        <div className="absolute top-0 right-0 w-3 h-3 holo-corner">
          <div className="absolute top-0 right-0 w-3 h-[1px] bg-cyan-400/60" />
          <div className="absolute top-0 right-0 w-[1px] h-3 bg-cyan-400/60" />
        </div>
        <div className="absolute bottom-0 left-0 w-3 h-3 holo-corner">
          <div className="absolute bottom-0 left-0 w-3 h-[1px] bg-cyan-400/60" />
          <div className="absolute bottom-0 left-0 w-[1px] h-3 bg-cyan-400/60" />
        </div>
        <div className="absolute bottom-0 right-0 w-3 h-3 holo-corner">
          <div className="absolute bottom-0 right-0 w-3 h-[1px] bg-cyan-400/60" />
          <div className="absolute bottom-0 right-0 w-[1px] h-3 bg-cyan-400/60" />
        </div>

        <div className="mb-2 flex items-center justify-between text-[9px] font-mono uppercase tracking-[.2em] text-cyan-200/55">
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_7px_rgba(103,232,249,.9)]" />HOLO // PLANET</span>
          <span>PHOTO</span>
        </div>

        <div className="flex items-start gap-2.5">
          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-cyan-300/45 bg-cyan-900/40 shadow-[0_0_10px_rgba(0,245,255,.24)]">
            {thumbnailSrc ? (
              <img
                src={thumbnailSrc}
                alt={photo.name}
                className="w-full h-full object-cover"
              />
            ) : (
                <div className="flex h-full w-full items-center justify-center bg-cyan-900/50">
                <span className="text-[10px] text-cyan-400/60">📷</span>
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3
              className="mb-1 truncate text-xs font-semibold text-cyan-100"
              style={{ textShadow: '0 0 6px rgba(0,245,255,0.5), 0 0 12px rgba(0,245,255,0.2)' }}
            >
              {photo.name || '未命名'}
            </h3>

            <div className="space-y-1">
              {formattedDate && (
                <div className="flex items-center gap-1.5 text-[10px] text-cyan-200/65">
                  <Calendar size={10} />
                  <span>{formattedDate}</span>
                </div>
              )}
              {albumName && (
                <div className="truncate text-[10px] text-cyan-200/55">{albumName}</div>
              )}
              {tagCount > 0 && (
                <div className="flex items-center gap-1.5 text-[10px] text-cyan-200/65">
                  <Tag size={10} />
                  <span>{tagCount} 个标签</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-2 h-[1px] w-full bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />

        <p
          className="mt-1 text-center text-[9px] italic text-cyan-200/55"
          style={{ animation: 'holo-flicker 2s step-end infinite' }}
        >
          点击查看详情
        </p>
      </div>
    </div>
  );
});

PlanetInfoCard.displayName = 'PlanetInfoCard';

export default PlanetInfoCard;
