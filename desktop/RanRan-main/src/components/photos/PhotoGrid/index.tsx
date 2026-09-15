import { memo } from 'react';
import { motion } from 'framer-motion';
import { usePhotoStore } from '../../../store/usePhotoStore';
import UniverseView from '../../astronomy/UniverseView';
import CyberSkeleton from '../../ui/CyberSkeleton';

interface PhotoGridProps {
  onPhotoClick: (photoId: string) => void;
}

const PhotoGrid = memo(({ onPhotoClick }: PhotoGridProps) => {
  const { getFilteredPhotos, isLoading } = usePhotoStore();
  const photos = getFilteredPhotos();  // fix: useMemo 依赖稳定引用导致不更新

  return (
    <div className="h-full relative">
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <CyberSkeleton variant="planet" count={8} />
        </div>
      )}

      <UniverseView photos={photos} onPhotoClick={onPhotoClick} />

      {!isLoading && photos.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4 text-center pointer-events-auto"
          >
            <div className="px-6 py-4 rounded-xl bg-black/60 backdrop-blur-md border border-white/10">
              <h3 className="text-xl font-cyber text-gray-300 mb-2">🌌 宇宙等待探索</h3>
              <p className="text-gray-400">上传照片，让它们环绕正在播放的恒星</p>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
});

PhotoGrid.displayName = 'PhotoGrid';

export default PhotoGrid;
