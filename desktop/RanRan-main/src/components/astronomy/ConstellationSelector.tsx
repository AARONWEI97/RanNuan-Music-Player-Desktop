import { useState, useEffect, memo } from 'react';
import localforage from 'localforage';
import type { Photo } from '../../types';
import { CONSTELLATIONS, type ConstellationKey } from './constants';

interface ConstellationSelectorProps {
  selectedConstellation: ConstellationKey | null;
  onSelect: (key: ConstellationKey | null) => void;
  isDark: boolean;
  photos: Photo[];
  constellationPhotos: Record<ConstellationKey, Photo | null>;
  onSelectPhoto: (constellationKey: ConstellationKey, photo: Photo | null) => void;
}

interface PhotoThumbnailProps {
  photo: Photo;
  isSelected: boolean;
  onClick: () => void;
  isDark: boolean;
}

const PhotoThumbnail: React.FC<PhotoThumbnailProps> = memo(({ photo, isSelected, onClick, isDark }) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const loadThumbnail = async () => {
      let url = photo.thumbnail || photo.url;
      
      if (!url && photo.id) {
        const storedUrl = await localforage.getItem<string>(`photo_${photo.id}`);
        if (storedUrl) {
          url = storedUrl;
        }
      }
      
      if (isMounted && url) {
        setThumbnailUrl(url);
      }
    };
    
    loadThumbnail();
    
    return () => {
      isMounted = false;
    };
  }, [photo]);

  return (
    <button
      onClick={onClick}
      className={`
        w-10 h-10 rounded overflow-hidden border-2 transition-all
        ${isSelected 
          ? 'border-cyber-blue scale-110 ring-2 ring-cyber-blue/50' 
          : (isDark ? 'border-white/20 hover:border-white/40' : 'border-gray-300 hover:border-gray-400')
        }
      `}
      title={photo.name || `照片`}
    >
      {thumbnailUrl ? (
        <img 
          src={thumbnailUrl} 
          alt={photo.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className={`w-full h-full flex items-center justify-center ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
          <span className="text-xs">📷</span>
        </div>
      )}
    </button>
  );
});

PhotoThumbnail.displayName = 'PhotoThumbnail';

const ConstellationSelector: React.FC<ConstellationSelectorProps> = memo(({
  selectedConstellation,
  onSelect,
  isDark,
  photos,
  constellationPhotos,
  onSelectPhoto
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedConstellation, setExpandedConstellation] = useState<ConstellationKey | null>(null);
  const [photoPages, setPhotoPages] = useState<Record<string, number>>({});
  const PHOTOS_PER_PAGE = 6;

  const getCurrentPage = (constKey: string) => photoPages[constKey] || 0;
  const getTotalPages = (totalPhotos: number) => Math.ceil(totalPhotos / PHOTOS_PER_PAGE);
  const getVisiblePhotos = (constKey: string) => {
    const page = getCurrentPage(constKey);
    const start = page * PHOTOS_PER_PAGE;
    return photos.slice(start, start + PHOTOS_PER_PAGE);
  };

  const handlePrevPage = (constKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentPage = getCurrentPage(constKey);
    if (currentPage > 0) {
      setPhotoPages(prev => ({ ...prev, [constKey]: currentPage - 1 }));
    }
  };

  const handleNextPage = (constKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentPage = getCurrentPage(constKey);
    const totalPages = getTotalPages(photos.length);
    if (currentPage < totalPages - 1) {
      setPhotoPages(prev => ({ ...prev, [constKey]: currentPage + 1 }));
    }
  };

  return (
    <div className={`
      absolute left-3 bottom-16 z-40 rounded-xl overflow-hidden
      ${isDark ? 'bg-black/70 border border-white/10' : 'bg-white/80 border border-gray-200'}
      backdrop-blur-md shadow-xl
    `}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          w-full px-3 py-2 flex items-center justify-between
          ${isDark ? 'text-white hover:bg-white/10' : 'text-gray-800 hover:bg-gray-100'}
          transition-colors
        `}
      >
        <span className="text-sm font-medium">✨ 星座</span>
        <span className="text-xs">{isExpanded ? '◀' : '▶'}</span>
      </button>
      
      {isExpanded && (
        <div className="p-2 space-y-1 max-h-96 overflow-y-auto min-w-[160px]">
          <button
            onClick={() => {
              onSelect(null);
              setExpandedConstellation(null);
            }}
            className={`
              w-full px-2 py-1.5 rounded text-xs text-left transition-colors
              ${selectedConstellation === null 
                ? (isDark ? 'bg-cyber-blue/30 text-cyber-blue' : 'bg-blue-100 text-blue-600')
                : (isDark ? 'text-gray-300 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100')
              }
            `}
          >
            全部显示
          </button>
          
          {Object.entries(CONSTELLATIONS).map(([key, constellation]) => {
            const constKey = key as ConstellationKey;
            const hasPhoto = constellationPhotos[constKey] !== null && constellationPhotos[constKey] !== undefined;
            const isExpandedItem = expandedConstellation === constKey;
            const currentPage = getCurrentPage(constKey);
            const totalPages = getTotalPages(photos.length);
            const visiblePhotos = getVisiblePhotos(constKey);
            
            return (
              <div key={key}>
                <button
                  onClick={() => {
                    onSelect(constKey);
                    setExpandedConstellation(isExpandedItem ? null : constKey);
                  }}
                  className={`
                    w-full px-2 py-1.5 rounded text-xs text-left transition-colors flex items-center justify-between
                    ${selectedConstellation === constKey 
                      ? (isDark ? 'bg-cyber-blue/30 text-cyber-blue' : 'bg-blue-100 text-blue-600')
                      : (isDark ? 'text-gray-300 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100')
                    }
                  `}
                >
                  <span>{constellation.name}</span>
                  <span className="flex items-center gap-1">
                    {hasPhoto && <span className="text-green-400">📷</span>}
                    <span className="text-[10px]">{isExpandedItem ? '▼' : '▶'}</span>
                  </span>
                </button>
                
                {isExpandedItem && photos.length > 0 && (
                  <div className={`mt-1 p-2 rounded ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className={`text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        选择背景图片 ({currentPage + 1}/{totalPages})
                      </p>
                      {totalPages > 1 && (
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => handlePrevPage(constKey, e)}
                            disabled={currentPage === 0}
                            className={`
                              w-4 h-4 flex items-center justify-center rounded text-[8px]
                              ${currentPage === 0 
                                ? 'opacity-30 cursor-not-allowed' 
                                : 'hover:bg-white/20'}
                              ${isDark ? 'text-gray-300' : 'text-gray-600'}
                            `}
                          >
                            ◀
                          </button>
                          <button
                            onClick={(e) => handleNextPage(constKey, e)}
                            disabled={currentPage >= totalPages - 1}
                            className={`
                              w-4 h-4 flex items-center justify-center rounded text-[8px]
                              ${currentPage >= totalPages - 1 
                                ? 'opacity-30 cursor-not-allowed' 
                                : 'hover:bg-white/20'}
                              ${isDark ? 'text-gray-300' : 'text-gray-600'}
                            `}
                          >
                            ▶
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-white/20">
                      {visiblePhotos.map(photo => (
                        <PhotoThumbnail
                          key={photo.id}
                          photo={photo}
                          isSelected={constellationPhotos[constKey]?.id === photo.id}
                          onClick={() => onSelectPhoto(constKey, constellationPhotos[constKey]?.id === photo.id ? null : photo)}
                          isDark={isDark}
                        />
                      ))}
                    </div>
                    {hasPhoto && (
                      <button
                        onClick={() => onSelectPhoto(constKey, null)}
                        className={`
                          w-full mt-1.5 px-2 py-1 rounded text-[10px] transition-colors
                          ${isDark 
                            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                            : 'bg-red-100 text-red-600 hover:bg-red-200'}
                        `}
                      >
                        清除此星座背景
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          
          {photos.length === 0 && (
            <div className="pt-2 mt-2 border-t border-white/10">
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                上传照片后可设置为星座背景
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

ConstellationSelector.displayName = 'ConstellationSelector';

export default ConstellationSelector;
