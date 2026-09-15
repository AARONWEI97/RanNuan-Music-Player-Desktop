import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Photo } from '../../types';

interface TimeTravelProps {
  photos: Photo[];
  onPhotoSelect: (photo: Photo) => void;
  className?: string;
}

function TimeTravel({ photos, onPhotoSelect, className = '' }: TimeTravelProps) {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const years = photos.reduce<Record<number, Photo[]>>((acc, photo) => {
    const year = new Date(photo.createdAt).getFullYear();
    if (!acc[year]) acc[year] = [];
    acc[year].push(photo);
    return acc;
  }, {});

  const sortedYears = Object.keys(years).map(Number).sort((a, b) => b - a);

  const handleYearClick = useCallback((year: number) => {
    setSelectedYear(year);
    setIsExpanded(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsExpanded(false);
    setSelectedYear(null);
  }, []);

  const handlePhotoClick = useCallback((photo: Photo) => {
    onPhotoSelect(photo);
  }, [onPhotoSelect]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  const currentPhotos = selectedYear ? years[selectedYear] || [] : [];

  return (
    <div className={`relative ${className}`}>
      <AnimatePresence>
        {!isExpanded ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="flex flex-col gap-2"
          >
            <h3 className="text-lg font-cyber text-cyber-blue mb-4">时光穿梭</h3>
            <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
              {sortedYears.map((year) => (
                <motion.button
                  key={year}
                  onClick={() => handleYearClick(year)}
                  className="flex items-center justify-between px-4 py-3 rounded-lg bg-dark-card/50 border border-dark-border/30 hover:border-cyber-blue/50 transition-all"
                  whileHover={{ x: 5 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="font-cyber text-cyber-blue">{year}</span>
                  <span className="text-sm text-gray-400">{years[year].length} 张照片</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            ref={containerRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-2xl font-cyber text-cyber-blue">{selectedYear} 回忆</h2>
              <button
                onClick={handleClose}
                className="px-4 py-2 rounded-lg border border-white/20 hover:bg-white/10 transition-all"
              >
                ✕ 关闭
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {currentPhotos.map((photo, index) => (
                  <motion.div
                    key={photo.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handlePhotoClick(photo)}
                    className="aspect-square rounded-lg overflow-hidden cursor-pointer group relative"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <img
                      src={photo.thumbnail || photo.url}
                      alt={photo.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <p className="text-sm text-white truncate">{photo.name}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(photo.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default TimeTravel;
