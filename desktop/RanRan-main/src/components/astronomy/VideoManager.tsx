import { useState, useCallback, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Trash2, Film, Clock, HardDrive, Play } from 'lucide-react';
import { dbService, type CinemaVideo } from '../../services/database';

interface VideoManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectVideo?: (videoUrl: string) => void;
  onSelectMultipleVideos?: (videoUrls: string[]) => void;
}

const VideoItem: React.FC<{
  video: CinemaVideo;
  onDelete: (id: string) => void;
  onSelect: (video: CinemaVideo) => void;
  isSelected: boolean;
}> = memo(({ video, onDelete, onSelect, isSelected }) => {
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [duration, setDuration] = useState<string>('');

  useEffect(() => {
    const url = URL.createObjectURL(video.data);
    setVideoUrl(url);

    const videoEl = document.createElement('video');
    videoEl.src = url;
    videoEl.onloadedmetadata = () => {
      const mins = Math.floor(videoEl.duration / 60);
      const secs = Math.floor(videoEl.duration % 60);
      setDuration(`${mins}:${secs.toString().padStart(2, '0')}`);
    };

    return () => URL.revokeObjectURL(url);
  }, [video.data]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`
        relative group rounded-lg overflow-hidden border
        ${isSelected 
          ? 'border-cyan-400 bg-cyan-400/10' 
          : 'border-white/10 bg-white/5 hover:border-cyan-400/50'}
        transition-all cursor-pointer
      `}
      onClick={() => onSelect(video)}
    >
      <div className="aspect-video bg-black/50 relative overflow-hidden">
        {videoUrl && (
          <video
            src={videoUrl}
            className="w-full h-full object-cover opacity-70"
            muted
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-cyan-400/20 border border-cyan-400 flex items-center justify-center">
            <Play size={20} className="text-cyan-400 ml-1" />
          </div>
        </div>
        {duration && (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-cyan-400 text-xs font-mono flex items-center gap-1">
            <Clock size={10} />
            {duration}
          </div>
        )}
      </div>
      
      <div className="p-3">
        <div className="text-sm text-white truncate mb-1">{video.name}</div>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <HardDrive size={10} />
            {formatSize(video.size)}
          </span>
          <span>{new Date(video.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      <motion.button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(video.id);
        }}
        className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500/20 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/30"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Trash2 size={14} />
      </motion.button>
    </motion.div>
  );
});

VideoItem.displayName = 'VideoItem';

const VideoManager: React.FC<VideoManagerProps> = ({ isOpen, onClose, onSelectVideo, onSelectMultipleVideos }) => {
  const [videos, setVideos] = useState<CinemaVideo[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());
  const [dragOver, setDragOver] = useState(false);

  const loadVideos = useCallback(async () => {
    const allVideos = await dbService.getAllCinemaVideos();
    setVideos(allVideos.sort((a, b) => b.createdAt - a.createdAt));
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadVideos();
      setSelectedVideoIds(new Set()); // 打开时清空选择
    }
  }, [isOpen, loadVideos]);

  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.type.startsWith('video/')) {
          await dbService.saveCinemaVideo(file);
        }
      }
      await loadVideos();
    } catch (error) {
      console.error('Failed to upload video:', error);
    } finally {
      setIsUploading(false);
    }
  }, [loadVideos]);

  const handleDelete = useCallback(async (id: string) => {
    await dbService.deleteCinemaVideo(id);
    setVideos(prev => prev.filter(v => v.id !== id));
    setSelectedVideoIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  }, []);

  const handleSelect = useCallback((video: CinemaVideo) => {
    setSelectedVideoIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(video.id)) {
        newSet.delete(video.id);
      } else {
        newSet.add(video.id);
      }
      return newSet;
    });
  }, []);

  const handleUseSelected = useCallback(() => {
    if (selectedVideoIds.size === 0) return;
    
    // 获取所有选中的视频
    const selectedVideos = videos.filter(v => selectedVideoIds.has(v.id));
    const urls = selectedVideos.map(v => URL.createObjectURL(v.data));
    
    console.log('VideoManager: Using', urls.length, 'videos');
    
    // 如果有多选回调，使用多选
    if (onSelectMultipleVideos && urls.length > 1) {
      onSelectMultipleVideos(urls);
    } else if (onSelectVideo && urls.length > 0) {
      // 否则使用单选（第一个视频）
      onSelectVideo(urls[0]);
    }
    
    onClose();
  }, [selectedVideoIds, videos, onSelectVideo, onSelectMultipleVideos, onClose]);

  const handleSelectAll = useCallback(() => {
    if (selectedVideoIds.size === videos.length) {
      setSelectedVideoIds(new Set());
    } else {
      setSelectedVideoIds(new Set(videos.map(v => v.id)));
    }
  }, [selectedVideoIds.size, videos]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  }, [handleUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(0,20,40,0.95) 0%, rgba(0,0,0,0.98) 100%)'
          }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-4xl max-h-[80vh] rounded-xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(0,30,50,0.9) 0%, rgba(0,10,30,0.95) 100%)',
              border: '1px solid rgba(0,255,255,0.2)',
              boxShadow: '0 0 40px rgba(0,255,255,0.1)'
            }}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <Film className="text-cyan-400" size={24} />
                <h2 className="text-xl font-bold text-white">视频管理</h2>
                <span className="text-sm text-gray-400">({videos.length} 个视频)</span>
              </div>
              <motion.button
                onClick={onClose}
                className="p-2 rounded-lg bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X size={20} />
              </motion.button>
            </div>

            <div
              className={`
                m-4 p-8 rounded-lg border-2 border-dashed transition-all
                ${dragOver 
                  ? 'border-cyan-400 bg-cyan-400/10' 
                  : 'border-white/20 bg-white/5 hover:border-cyan-400/50'}
              `}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <input
                type="file"
                accept="video/*"
                multiple
                className="hidden"
                id="video-upload"
                onChange={(e) => handleUpload(e.target.files)}
              />
              <label
                htmlFor="video-upload"
                className="flex flex-col items-center justify-center cursor-pointer"
              >
                <motion.div
                  animate={{ y: isUploading ? 0 : [0, -5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Upload size={40} className={dragOver ? 'text-cyan-400' : 'text-gray-400'} />
                </motion.div>
                <p className="mt-3 text-gray-300">
                  {isUploading ? '上传中...' : '拖拽视频文件到此处或点击上传'}
                </p>
                <p className="mt-1 text-xs text-gray-500">支持 MP4, WebM, MOV 等格式</p>
              </label>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 max-h-[40vh]">
              {videos.length > 0 ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-400">
                      已选择 {selectedVideoIds.size} 个视频
                    </span>
                    <motion.button
                      onClick={handleSelectAll}
                      className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {selectedVideoIds.size === videos.length ? '取消全选' : '全选'}
                    </motion.button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <AnimatePresence>
                      {videos.map(video => (
                        <VideoItem
                          key={video.id}
                          video={video}
                          onDelete={handleDelete}
                          onSelect={handleSelect}
                          isSelected={selectedVideoIds.has(video.id)}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Film size={48} className="mb-4 opacity-50" />
                  <p>暂无视频</p>
                  <p className="text-sm mt-1">上传视频后可在此管理</p>
                </div>
              )}
            </div>

            {selectedVideoIds.size > 0 && (
              <div className="p-4 border-t border-white/10 flex justify-between items-center">
                <span className="text-sm text-gray-400">
                  已选择 {selectedVideoIds.size} 个视频
                </span>
                <motion.button
                  onClick={handleUseSelected}
                  className="px-4 py-2 rounded-lg bg-cyan-400/20 text-cyan-400 border border-cyan-400/30 hover:bg-cyan-400/30 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  使用选中的视频
                </motion.button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VideoManager;
