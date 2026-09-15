import { useMemo, useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Calendar, X } from 'lucide-react';
import type { Photo } from '../../types';

interface TimelineViewProps {
  photos: Photo[];
  onPhotoClick: (photoId: string) => void;
  isDark: boolean;
  isOpen: boolean;
  onClose: () => void;
}

interface TimelineGroup {
  label: string;
  year: number;
  month: number;
  photos: Photo[];
}

const TimelineView: React.FC<TimelineViewProps> = memo(({
  photos,
  onPhotoClick,
  isDark,
  isOpen,
  onClose,
}) => {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const timelineGroups = useMemo(() => {
    const groups: Map<string, TimelineGroup> = new Map();
    
    const sorted = [...photos].sort((a, b) => b.createdAt - a.createdAt);
    
    for (const photo of sorted) {
      const date = new Date(photo.createdAt);
      const year = date.getFullYear();
      const month = date.getMonth();
      const key = `${year}-${month}`;
      
      if (!groups.has(key)) {
        groups.set(key, {
          label: `${year}年${month + 1}月`,
          year,
          month,
          photos: [],
        });
      }
      groups.get(key)!.photos.push(photo);
    }
    
    return Array.from(groups.values());
  }, [photos]);

  const years = useMemo(() => {
    const yearSet = new Set(timelineGroups.map(g => g.year));
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [timelineGroups]);

  const filteredGroups = useMemo(() => {
    if (selectedYear === null) return timelineGroups;
    return timelineGroups.filter(g => g.year === selectedYear);
  }, [timelineGroups, selectedYear]);

  const handleYearFilter = useCallback((year: number | null) => {
    setSelectedYear(year);
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className={`
            fixed top-0 right-0 h-full w-full sm:w-96 z-50
            ${isDark ? 'bg-black/90 border-l border-cyan-500/10' : 'bg-white/95 border-l border-gray-200'}
            backdrop-blur-xl overflow-hidden flex flex-col
          `}
        >
          <div className={`
            flex items-center justify-between p-4 border-b
            ${isDark ? 'border-cyan-500/10' : 'border-gray-200'}
          `}>
            <div className="flex items-center gap-2">
              <Calendar size={18} className={isDark ? 'text-cyan-400' : 'text-blue-500'} />
              <h2 className={`text-lg font-cyber ${isDark ? 'text-white' : 'text-gray-800'}`}>
                时间轴
              </h2>
              <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {photos.length} 张照片
              </span>
            </div>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors ${
                isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
              }`}
            >
              <X size={18} />
            </button>
          </div>

          <div className={`
            flex items-center gap-1 px-4 py-2 overflow-x-auto border-b
            ${isDark ? 'border-cyan-500/5' : 'border-gray-100'}
          `}>
            <button
              onClick={() => handleYearFilter(null)}
              className={`
                px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all
                ${selectedYear === null
                  ? isDark ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-blue-100 text-blue-600 border border-blue-200'
                  : isDark ? 'bg-white/5 text-gray-400 hover:bg-white/10' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }
              `}
            >
              全部
            </button>
            {years.map(year => (
              <button
                key={year}
                onClick={() => handleYearFilter(year)}
                className={`
                  px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all
                  ${selectedYear === year
                    ? isDark ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-blue-100 text-blue-600 border border-blue-200'
                    : isDark ? 'bg-white/5 text-gray-400 hover:bg-white/10' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  }
                `}
              >
                {year}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {filteredGroups.length === 0 ? (
              <div className={`text-center py-12 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                <Calendar size={48} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">暂无照片</p>
              </div>
            ) : (
              filteredGroups.map((group) => (
                <div key={`${group.year}-${group.month}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`
                      w-2 h-2 rounded-full
                      ${isDark ? 'bg-cyan-400 shadow-[0_0_8px_rgba(0,245,255,0.5)]' : 'bg-blue-500'}
                    `} />
                    <h3 className={`text-sm font-semibold ${isDark ? 'text-cyan-300' : 'text-blue-600'}`}>
                      {group.label}
                    </h3>
                    <span className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                      {group.photos.length}
                    </span>
                    <div className={`
                      flex-1 h-px
                      ${isDark ? 'bg-gradient-to-r from-cyan-500/20 to-transparent' : 'bg-gradient-to-r from-blue-200 to-transparent'}
                    `} />
                  </div>

                  <div className="ml-1 pl-4 border-l border-dashed space-y-2"
                    style={{ borderColor: isDark ? 'rgba(0,245,255,0.1)' : 'rgba(200,200,200,0.5)' }}
                  >
                    {group.photos.map((photo, idx) => {
                      const date = new Date(photo.createdAt);
                      const day = date.getDate();
                      const timeStr = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
                      
                      return (
                        <motion.button
                          key={photo.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          onClick={() => onPhotoClick(photo.id)}
                          className={`
                            w-full flex items-center gap-3 p-2 rounded-lg text-left transition-all
                            ${isDark 
                              ? 'hover:bg-white/5 active:bg-white/10' 
                              : 'hover:bg-gray-50 active:bg-gray-100'}
                          `}
                        >
                          {photo.thumbnail ? (
                            <div className={`
                              w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border
                              ${isDark ? 'border-cyan-500/10' : 'border-gray-200'}
                            `}>
                              <img
                                src={photo.thumbnail}
                                alt={photo.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            </div>
                          ) : (
                            <div className={`
                              w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 border
                              ${isDark ? 'bg-gray-800 border-cyan-500/10 text-cyan-400' : 'bg-gray-100 border-gray-200 text-blue-400'}
                            `}>
                              <Calendar size={16} />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                              {photo.name || '未命名'}
                            </p>
                            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                              {day}日 {timeStr}
                              {photo.tags && photo.tags.length > 0 && ` · ${photo.tags.length}个标签`}
                            </p>
                          </div>

                          <ChevronRight size={14} className={isDark ? 'text-gray-600' : 'text-gray-300'} />
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

TimelineView.displayName = 'TimelineView';

export default TimelineView;
