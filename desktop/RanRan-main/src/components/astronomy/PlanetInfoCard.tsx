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

  if (!isDark) {
    return (
      <div className="pointer-events-none select-none min-w-[140px] max-w-[200px] px-3 py-2.5 rounded-xl bg-white/80 border border-gray-200 shadow-lg">
        <h3 className="text-xs font-semibold truncate mb-1.5 text-gray-800">
          {photo.name || '未命名'}
        </h3>
        <div className="space-y-1">
          {formattedDate && (
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
              <Calendar size={10} />
              <span>{formattedDate}</span>
            </div>
          )}
          {albumName && (
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
              <span className="truncate">{albumName}</span>
            </div>
          )}
          {tagCount > 0 && (
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
              <Tag size={10} />
              <span>{tagCount} 个标签</span>
            </div>
          )}
        </div>
        <div className="mt-1.5 h-[1px] w-full bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
        <p className="mt-1 text-[9px] italic text-gray-400">点击查看详情</p>
      </div>
    );
  }

  return (
    <div className="holo-pulse pointer-events-none select-none relative min-w-[180px] max-w-[240px] rounded-lg bg-cyan-950/40 border border-cyan-400/20 backdrop-blur-md overflow-hidden">
      <div className="holo-scanline absolute inset-0 pointer-events-none z-10" />

      <div className="holo-glitch relative z-0 p-2.5">
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

        <div className="flex items-start gap-2.5">
          <div className="shrink-0 w-10 h-10 rounded overflow-hidden border border-cyan-400/40 shadow-[0_0_8px_rgba(0,245,255,0.3)]">
            {thumbnailSrc ? (
              <img
                src={thumbnailSrc}
                alt={photo.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-cyan-900/50 flex items-center justify-center">
                <span className="text-[10px] text-cyan-400/60">📷</span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3
              className="text-xs font-semibold truncate mb-1 text-cyan-300"
              style={{ textShadow: '0 0 6px rgba(0,245,255,0.5), 0 0 12px rgba(0,245,255,0.2)' }}
            >
              {photo.name || '未命名'}
            </h3>

            <div className="space-y-0.5">
              {formattedDate && (
                <div className="flex items-center gap-1.5 text-[10px] text-cyan-400/70">
                  <Calendar size={10} />
                  <span>{formattedDate}</span>
                </div>
              )}
              {tagCount > 0 && (
                <div className="flex items-center gap-1.5 text-[10px] text-cyan-400/70">
                  <Tag size={10} />
                  <span>{tagCount} 个标签</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-2 h-[1px] w-full bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />

        <p
          className="mt-1 text-[9px] italic text-cyan-500/60 text-center"
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
