import { useState, useCallback, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Image, Calendar, FolderOpen, Check } from 'lucide-react';
import { usePhotoStore } from '../../store/usePhotoStore';

interface PhotoManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PhotoItemProps {
  photoId: string;
  photoName: string;
  photoThumbnail: string;
  albumName: string;
  createdAt: number;
  isSelected: boolean;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
}

const PhotoItem: React.FC<PhotoItemProps> = memo(({ 
  photoId, 
  photoName, 
  photoThumbnail, 
  albumName,
  createdAt,
  isSelected,
  onDelete, 
  onSelect 
}) => {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`
        relative group rounded-lg overflow-hidden border-2 transition-all cursor-pointer
        ${isSelected 
          ? 'border-cyan-400 bg-cyan-400/10' 
          : 'border-white/10 bg-dark-card hover:border-cyber-blue/50'
        }
      `}
      onClick={() => onSelect(photoId)}
    >
      <div className="aspect-square relative">
        <img
          src={photoThumbnail}
          alt={photoName}
          className="w-full h-full object-cover"
        />
        
        {isSelected && (
          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-cyan-400 flex items-center justify-center">
            <Check size={14} className="text-black" />
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <p className="text-sm font-medium truncate text-white">{photoName}</p>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
              <FolderOpen size={12} />
              <span>{albumName}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Calendar size={12} />
          <span>{formatDate(createdAt)}</span>
        </div>
        
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(photoId);
          }}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Trash2 size={14} />
          <span className="text-sm">删除</span>
        </motion.button>
      </div>
    </motion.div>
  );
});

PhotoItem.displayName = 'PhotoItem';

const PhotoManager: React.FC<PhotoManagerProps> = ({ isOpen, onClose }) => {
  const { photos, albums, removePhoto } = usePhotoStore();
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [filterAlbumId, setFilterAlbumId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedPhotoIds(new Set());
    }
  }, [isOpen]);

  const handleDelete = useCallback((id: string) => {
    removePhoto(id);
    setSelectedPhotoIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  }, [removePhoto]);

  const handleSelect = useCallback((id: string) => {
    setSelectedPhotoIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleDeleteSelected = useCallback(() => {
    selectedPhotoIds.forEach(id => {
      removePhoto(id);
    });
    setSelectedPhotoIds(new Set());
  }, [selectedPhotoIds, removePhoto]);

  const handleSelectAll = useCallback(() => {
    const filteredPhotos = filterAlbumId 
      ? photos.filter(p => p.albumId === filterAlbumId)
      : photos;
    
    if (selectedPhotoIds.size === filteredPhotos.length) {
      setSelectedPhotoIds(new Set());
    } else {
      setSelectedPhotoIds(new Set(filteredPhotos.map(p => p.id)));
    }
  }, [selectedPhotoIds.size, photos, filterAlbumId]);

  const getAlbumName = (albumId: string) => {
    const album = albums.find(a => a.id === albumId);
    return album?.name || '未知相册';
  };

  const filteredPhotos = filterAlbumId 
    ? photos.filter(p => p.albumId === filterAlbumId)
    : photos;

  const sortedPhotos = [...filteredPhotos].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.8)' }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-4xl max-h-[80vh] rounded-xl overflow-hidden cyber-glass border border-cyber-blue/20"
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <Image className="text-cyber-blue" size={24} />
                <h2 className="text-xl font-cyber cyber-text">图片管理</h2>
                <span className="text-sm text-gray-400">共 {photos.length} 张图片</span>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 border-b border-white/10">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-400">筛选相册：</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFilterAlbumId(null)}
                    className={`
                      px-3 py-1.5 rounded-lg text-sm transition-colors
                      ${filterAlbumId === null 
                        ? 'bg-cyber-blue/20 text-cyber-blue border border-cyber-blue/30' 
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      }
                    `}
                  >
                    全部
                  </button>
                  {albums.map(album => (
                    <button
                      key={album.id}
                      onClick={() => setFilterAlbumId(album.id)}
                      className={`
                        px-3 py-1.5 rounded-lg text-sm transition-colors
                        ${filterAlbumId === album.id 
                          ? 'bg-cyber-blue/20 text-cyber-blue border border-cyber-blue/30' 
                          : 'bg-white/5 text-gray-400 hover:bg-white/10'
                        }
                      `}
                    >
                      {album.name} ({album.photoCount})
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 max-h-[40vh]">
              {sortedPhotos.length > 0 ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-400">
                      已选择 {selectedPhotoIds.size} 张图片
                    </span>
                    <motion.button
                      onClick={handleSelectAll}
                      className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {selectedPhotoIds.size === sortedPhotos.length ? '取消全选' : '全选'}
                    </motion.button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    <AnimatePresence>
                      {sortedPhotos.map(photo => (
                        <PhotoItem
                          key={photo.id}
                          photoId={photo.id}
                          photoName={photo.name}
                          photoThumbnail={photo.thumbnail || ''}
                          albumName={getAlbumName(photo.albumId)}
                          createdAt={photo.createdAt}
                          isSelected={selectedPhotoIds.has(photo.id)}
                          onDelete={handleDelete}
                          onSelect={handleSelect}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Image size={48} className="mb-4 opacity-50" />
                  <p>暂无图片</p>
                  <p className="text-sm mt-1">上传图片后可在此管理</p>
                </div>
              )}
            </div>

            {selectedPhotoIds.size > 0 && (
              <div className="p-4 border-t border-white/10 flex justify-between items-center">
                <span className="text-sm text-gray-400">
                  已选择 {selectedPhotoIds.size} 张图片
                </span>
                <motion.button
                  onClick={handleDeleteSelected}
                  className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  删除选中的图片
                </motion.button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PhotoManager;
