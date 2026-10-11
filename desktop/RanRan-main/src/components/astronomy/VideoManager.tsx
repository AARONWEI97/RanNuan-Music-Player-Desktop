import { useState, useCallback, useEffect, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Trash2, Film, Clock, HardDrive, Play, Check, AlertCircle, Video } from 'lucide-react';
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
  const [duration, setDuration] = useState<string>('');
  const videoUrl = useMemo(() => URL.createObjectURL(video.data), [video.data]);

  useEffect(() => {
    const videoEl = document.createElement('video');
    videoEl.src = videoUrl;
    videoEl.onloadedmetadata = () => {
      const mins = Math.floor(videoEl.duration / 60);
      const secs = Math.floor(videoEl.duration % 60);
      setDuration(`${mins}:${secs.toString().padStart(2, '0')}`);
    };

    return () => {
      videoEl.onloadedmetadata = null;
      URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

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
        relative group overflow-hidden rounded-2xl border
        ${isSelected 
          ? 'border-cyan-400/60 bg-cyan-400/[.09] shadow-lg shadow-cyan-400/10'
          : 'border-white/10 bg-white/[.045] hover:border-cyan-400/50'}
        transition-all cursor-pointer
      `}
      onClick={() => onSelect(video)}
    >
      <div className="relative aspect-video overflow-hidden bg-black/50">
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
          <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-lg bg-black/70 px-2 py-1 text-[10px] font-mono text-cyan-400">
            <Clock size={10} />
            {duration}
          </div>
        )}
      </div>
      
      {isSelected && <div className="absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-cyan-400 text-slate-950"><Check size={14} strokeWidth={3} /></div>}
      <div className="p-3.5">
        <div className="mb-1 truncate text-sm font-medium text-white">{video.name}</div>
        <div className="flex items-center justify-between text-[10px] text-white/40">
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
        aria-label={`删除视频 ${video.name}`}
        className="absolute right-2 top-2 rounded-lg bg-red-500/20 p-1.5 text-red-300 opacity-0 transition-opacity hover:bg-red-500/30 group-hover:opacity-100"
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
  const [notice, setNotice] = useState('');

  const loadVideos = useCallback(async () => {
    const allVideos = await dbService.getAllCinemaVideos();
    setVideos(allVideos.sort((a, b) => b.createdAt - a.createdAt));
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadVideos();
      setSelectedVideoIds(new Set()); // 打开时清空选择
      setNotice('');
    }
  }, [isOpen, loadVideos]);

  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.type.startsWith('video/')) {
          await dbService.saveCinemaVideo(file);
        } else {
          setNotice('已跳过非视频文件，请选择 MP4、WebM 或 MOV');
        }
      }
      await loadVideos();
    } catch (error) {
      console.error('Failed to upload video:', error);
      setNotice('视频导入失败，请检查文件格式或存储空间');
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#02060d]/80 p-4 backdrop-blur-md"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(0,20,40,0.95) 0%, rgba(0,0,0,0.98) 100%)'
          }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/12 bg-[#0a1320]/[.98] shadow-2xl shadow-black/50"
            style={{
              boxShadow: '0 24px 80px rgba(0,0,0,.45)'
            }}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-400/12 text-cyan-400"><Film size={20} /></div>
                <div><h2 className="text-base font-semibold text-white">影院片库</h2><p className="mt-0.5 text-[11px] text-white/40">管理星空里的全息视频</p></div>
                <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-white/45">{videos.length} 个视频</span>
              </div>
              <motion.button
                onClick={onClose}
                aria-label="关闭视频片库"
                className="rounded-xl border border-white/10 bg-white/[.04] p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X size={20} />
              </motion.button>
            </div>

            <div
              className={`
                mx-5 mt-5 rounded-2xl border-2 border-dashed p-8 transition-all
                ${dragOver 
                  ? 'border-cyan-400 bg-cyan-400/10' 
                  : 'border-white/10 bg-white/[.025] hover:border-cyan-400/50'}
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
                  <div className={`grid h-12 w-12 place-items-center rounded-2xl ${dragOver ? 'bg-cyan-400/15 text-cyan-400' : 'bg-white/[.06] text-white/45'}`}><Upload size={22} /></div>
                </motion.div>
                  <p className="mt-3 text-sm font-medium text-white/80">
                  {isUploading ? '上传中...' : '拖拽视频文件到此处或点击上传'}
                </p>
                <p className="mt-1 text-[11px] text-white/35">支持 MP4、WebM、MOV · 建议使用 H.264 编码</p>
              </label>
            </div>

            {notice && <div className="mx-5 mt-3 flex items-center gap-2 rounded-xl border border-amber-300/20 bg-amber-300/[.07] px-3 py-2 text-xs text-amber-100"><AlertCircle size={14} />{notice}</div>}
            <div className="max-h-[44vh] flex-1 overflow-y-auto px-5 pb-5 pt-4">
              {videos.length > 0 ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-white/45">
                      已选择 {selectedVideoIds.size} 个视频
                    </span>
                    <motion.button
                      onClick={handleSelectAll}
                      className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-cyan-400 transition-colors hover:bg-cyan-400/10"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {selectedVideoIds.size === videos.length ? '取消全选' : '全选'}
                    </motion.button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
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
                  <Video size={42} className="mb-4 text-white/20" />
                  <p className="text-sm text-white/65">片库还是空的</p>
                  <p className="mt-1 text-xs text-white/35">拖入一段视频，给星空添一块全息屏</p>
                </div>
              )}
            </div>

            {selectedVideoIds.size > 0 && (
              <div className="flex items-center justify-between border-t border-white/10 px-5 py-4">
                <span className="text-sm text-gray-400">
                  已选择 {selectedVideoIds.size} 个视频
                </span>
                <motion.button
                  onClick={handleUseSelected}
                  className="rounded-xl border border-cyan-400/35 bg-cyan-400/12 px-4 py-2 text-xs font-medium text-cyan-300 transition-colors hover:bg-cyan-400/20"
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
