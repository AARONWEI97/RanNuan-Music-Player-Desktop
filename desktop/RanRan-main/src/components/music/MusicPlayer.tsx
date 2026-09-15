import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { 
  Play, Pause, SkipBack, SkipForward, 
  Volume2, VolumeX, Repeat, Shuffle, 
  Trash2, Upload, Music, MoreHorizontal, AlertCircle, X, FileText
} from 'lucide-react';
import { useMusicPlayer } from '../../services/musicPlayer';
import { parseLrc, findCurrentLine, type LrcLine } from '../../services/lrcParser';
import type { BackgroundMusic } from '../../services/database';

interface MusicPlayerProps {
  className?: string;
}

const ProgressBar: React.FC<{
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  disabled?: boolean;
}> = memo(({ currentTime, duration, onSeek, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);
  const percentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled || !progressRef.current) return;
    setIsDragging(true);
    updateSeek(e);
  }, [disabled]);

  const updateSeek = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!progressRef.current || disabled) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    onSeek(percentage * duration);
  }, [duration, onSeek, disabled]);

  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => updateSeek(e);
      const handleMouseUp = () => setIsDragging(false);

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, updateSeek]);

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-400 w-12 text-right font-mono">
        {formatTime(currentTime)}
      </span>
      
      <div
        ref={progressRef}
        className={`flex-1 h-1.5 bg-gray-700 rounded-full relative group ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onMouseDown={handleMouseDown}
      >
        <motion.div
          className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-cyber-blue to-purple-400"
          style={{ width: `${percentage}%` }}
          transition={{ duration: isDragging ? 0 : 0.1 }}
        />
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `${percentage}%`, transform: 'translate(-50%, -50%)' }}
          animate={{ scale: isDragging ? 1.3 : 1 }}
          transition={{ duration: 0.15 }}
        />
      </div>
      
      <span className="text-xs text-gray-400 w-12 font-mono">
        {formatTime(duration)}
      </span>
    </div>
  );
});

ProgressBar.displayName = 'ProgressBar';

const VolumeControl: React.FC<{
  volume: number;
  onVolumeChange: (volume: number) => void;
}> = memo(({ volume, onVolumeChange }) => {
  const [showSlider, setShowSlider] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSlider(false);
      }
    };

    if (showSlider) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSlider]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setShowSlider(!showSlider)}
        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        title={volume === 0 ? '静音' : `音量 ${Math.round(volume * 100)}%`}
      >
        {volume === 0 ? (
          <VolumeX size={18} className="text-gray-400" />
        ) : (
          <Volume2 size={18} className="text-gray-300" />
        )}
      </button>
      
      <AnimatePresence>
        {showSlider && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 rounded-xl bg-gray-800 border border-gray-700 shadow-xl"
          >
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs text-gray-400 font-mono">
                {Math.round(volume * 100)}%
              </span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="w-28 h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #00f5ff 0%, #00f5ff ${volume * 100}%, #374151 ${volume * 100}%, #374151 100%)`
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

VolumeControl.displayName = 'VolumeControl';

const MusicItem: React.FC<{
  music: BackgroundMusic;
  isPlaying: boolean;
  onPlay: () => void;
  onRemove: () => void;
}> = memo(({ music, isPlaying, onPlay, onRemove }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Reorder.Item
      value={music}
      id={music.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
      className={`
        relative group flex items-center gap-3 p-3 rounded-xl cursor-grab active:cursor-grabbing
        ${isPlaying 
          ? 'bg-gradient-to-r from-cyber-blue/20 to-purple-400/20 border border-cyber-blue/50' 
          : 'bg-gray-800/50 border border-gray-700/50 hover:border-gray-600'}
        backdrop-blur-sm transition-all
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onPlay();
        }}
        className="flex-shrink-0 w-10 h-10 rounded-full bg-cyber-blue/20 hover:bg-cyber-blue/30 flex items-center justify-center transition-colors"
      >
        {isPlaying ? (
          <Pause size={16} className="text-cyber-blue" />
        ) : (
          <Play size={16} className="text-cyber-blue ml-0.5" />
        )}
      </button>
      
      <div className="flex-1 min-w-0">
        <h3 className={`
          text-sm font-medium truncate
          ${isPlaying ? 'text-cyber-blue' : 'text-gray-200'}
        `}>
          {music.name}
        </h3>
        {music.artist && (
          <p className="text-xs text-gray-400 truncate">
            {music.artist}
          </p>
        )}
      </div>
      
      {music.duration && (
        <span className="text-xs text-gray-500 flex-shrink-0 font-mono">
          {Math.floor(music.duration / 60)}:{Math.floor(music.duration % 60).toString().padStart(2, '0')}
        </span>
      )}
      
      <AnimatePresence>
        {isHovered && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.1 }}
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="flex-shrink-0 p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
          >
            <Trash2 size={14} />
          </motion.button>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
});

MusicItem.displayName = 'MusicItem';

const MusicPlayer: React.FC<MusicPlayerProps> = memo(({ className = '' }) => {
  const {
    musicList,
    currentMusic,
    isPlaying,
    currentTime,
    duration,
    volume,
    loop,
    shuffle,
    isLoading,
    error,
    loadMusicList,
    addMusic,
    removeMusic,
    reorderMusic,
    playMusic,
    pauseMusic,
    resumeMusic,
    playNext,
    playPrevious,
    seekTo,
    setVolume,
    toggleLoop,
    toggleShuffle,
    clearPlaylist,
    clearError
  } = useMusicPlayer();

  const [isExpanded, setIsExpanded] = useState(false);
  const [lrcLines, setLrcLines] = useState<LrcLine[]>([]);
  const [showLyrics, setShowLyrics] = useState(false);
  const lrcInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMusicList();
  }, [loadMusicList]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      for (const file of files) {
        if (file.type.startsWith('audio/')) {
          await addMusic(file);
        }
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Failed to upload music:', error);
    }
  }, [addMusic]);

  const handleReorder = useCallback(async (newOrder: BackgroundMusic[]) => {
    const newIds = newOrder.map(m => m.id);
    await reorderMusic(newIds);
  }, [reorderMusic]);

  const handlePlayPause = useCallback(async () => {
    if (isLoading) return;
    
    if (isPlaying) {
      pauseMusic();
    } else if (currentMusic) {
      await resumeMusic();
    } else if (musicList.length > 0) {
      await playMusic(musicList[0].id);
    }
  }, [isPlaying, currentMusic, musicList, isLoading, pauseMusic, resumeMusic, playMusic]);

  const handleLrcUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      const lines = parseLrc(content);
      if (lines.length > 0) {
        setLrcLines(lines);
        setShowLyrics(true);
      }
    };
    reader.readAsText(file);
    
    if (lrcInputRef.current) {
      lrcInputRef.current.value = '';
    }
  }, []);

  return (
    <div className={className}>
      <motion.div
        animate={{ height: isExpanded ? 'auto' : '72px' }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-gray-900 via-gray-900/98 to-transparent border-t border-gray-800 backdrop-blur-xl"
      >
        <div className="p-3 sm:p-4">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mb-3 p-2 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-between"
            >
              <div className="flex items-center gap-2 text-red-400 text-xs">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
              <button
                onClick={clearError}
                className="p-1 hover:bg-red-500/20 rounded transition-colors"
              >
                <X size={14} className="text-red-400" />
              </button>
            </motion.div>
          )}

          <div className="flex items-center gap-2 sm:gap-4 mb-3">
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={playPrevious}
                disabled={musicList.length === 0 || isLoading}
                className="p-1.5 sm:p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="上一首"
              >
                <SkipBack size={18} className="text-gray-300" />
              </button>
              
              <button
                onClick={handlePlayPause}
                disabled={musicList.length === 0 && !currentMusic}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r from-cyber-blue to-purple-400 hover:from-cyber-blue/80 hover:to-purple-400/80 flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyber-blue/20"
                title={isPlaying ? '暂停' : '播放'}
              >
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-transparent rounded-full"
                  />
                ) : isPlaying ? (
                  <Pause size={18} className="text-white" />
                ) : (
                  <Play size={18} className="text-white ml-0.5" />
                )}
              </button>
              
              <button
                onClick={playNext}
                disabled={musicList.length === 0 || isLoading}
                className="p-1.5 sm:p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="下一首"
              >
                <SkipForward size={18} className="text-gray-300" />
              </button>
            </div>
            
            <div className="flex-1 min-w-0">
              {currentMusic && (
                <div className="text-center">
                  <h3 className="text-xs sm:text-sm font-medium text-gray-200 truncate">
                    {currentMusic.name}
                  </h3>
                  {currentMusic.artist && (
                    <p className="text-[10px] sm:text-xs text-gray-400 truncate">
                      {currentMusic.artist}
                    </p>
                  )}
                </div>
              )}
              {!currentMusic && (
                <p className="text-center text-xs sm:text-sm text-gray-500">
                  {musicList.length === 0 ? '暂无音乐' : '选择一首音乐播放'}
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-1 sm:gap-2">
              <VolumeControl volume={volume} onVolumeChange={setVolume} />
              
              <button
                onClick={toggleLoop}
                className={`p-1.5 sm:p-2 rounded-lg transition-colors ${loop ? 'bg-cyber-blue/20 text-cyber-blue' : 'hover:bg-white/10 text-gray-400'}`}
                title={loop ? '单曲循环' : '顺序播放'}
              >
                <Repeat size={16} className="sm:w-[18px] sm:h-[18px]" />
              </button>
              
              <button
                onClick={toggleShuffle}
                className={`p-1.5 sm:p-2 rounded-lg transition-colors ${shuffle ? 'bg-purple-400/20 text-purple-400' : 'hover:bg-white/10 text-gray-400'}`}
                title={shuffle ? '随机播放' : '顺序播放'}
              >
                <Shuffle size={16} className="sm:w-[18px] sm:h-[18px]" />
              </button>
              
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 sm:p-2 rounded-lg hover:bg-white/10 transition-colors"
                title={isExpanded ? '收起' : '展开'}
              >
                <MoreHorizontal size={16} className={`text-gray-400 transition-transform sm:w-[18px] sm:h-[18px] ${isExpanded ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
          
          <ProgressBar
            currentTime={currentTime}
            duration={duration}
            onSeek={seekTo}
            disabled={!currentMusic}
          />
          
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs sm:text-sm font-medium text-gray-300">
                    🎵 播放列表 ({musicList.length})
                  </h4>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLoading}
                      className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-cyber-blue/20 hover:bg-cyber-blue/30 text-cyber-blue text-[10px] sm:text-xs font-medium flex items-center gap-1 sm:gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <Upload size={12} className="sm:w-[14px] sm:h-[14px]" />
                      添加音乐
                    </button>
                    
                    {musicList.length > 0 && (
                      <button
                        onClick={clearPlaylist}
                        className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-[10px] sm:text-xs font-medium flex items-center gap-1 sm:gap-1.5 transition-colors"
                      >
                        <Trash2 size={12} className="sm:w-[14px] sm:h-[14px]" />
                        清空
                      </button>
                    )}
                  </div>
                </div>
                
                {musicList.length > 0 ? (
                  <Reorder.Group
                    axis="y"
                    values={musicList}
                    onReorder={handleReorder}
                    className="space-y-2 max-h-48 sm:max-h-60 overflow-y-auto pr-2"
                  >
                    {musicList.map((music) => (
                      <MusicItem
                        key={music.id}
                        music={music}
                        isPlaying={currentMusic?.id === music.id && isPlaying}
                        onPlay={() => playMusic(music.id)}
                        onRemove={() => removeMusic(music.id)}
                      />
                    ))}
                  </Reorder.Group>
                ) : (
                  <div className="text-center py-6 sm:py-8">
                    <Music size={36} className="mx-auto text-gray-600 mb-2 sm:mb-3 sm:w-[48px] sm:h-[48px]" />
                    <p className="text-xs sm:text-sm text-gray-500 mb-1 sm:mb-2">
                      暂无背景音乐
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-600">
                      点击"添加音乐"上传你的音乐文件
                    </p>
                  </div>
                )}

                {/* 歌词展示区域 */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs sm:text-sm font-medium text-gray-300">
                      🎤 歌词
                    </h4>
                    <div className="flex items-center gap-2">
                      {showLyrics && lrcLines.length > 0 && (
                        <button
                          onClick={() => { setShowLyrics(false); setLrcLines([]); }}
                          className="px-2 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-[10px] sm:text-xs font-medium flex items-center gap-1 transition-colors"
                        >
                          <X size={12} />
                          清除歌词
                        </button>
                      )}
                      <button
                        onClick={() => lrcInputRef.current?.click()}
                        className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-cyber-blue/20 hover:bg-cyber-blue/30 text-cyber-blue text-[10px] sm:text-xs font-medium flex items-center gap-1 sm:gap-1.5 transition-colors"
                      >
                        <FileText size={12} className="sm:w-[14px] sm:h-[14px]" />
                        导入歌词
                      </button>
                    </div>
                  </div>
                  {showLyrics && lrcLines.length > 0 ? (
                    <div className="max-h-40 sm:max-h-52 overflow-y-auto pr-2 space-y-1">
                      {(() => {
                        const currentLineIndex = findCurrentLine(lrcLines, currentTime);
                        return lrcLines.map((line, index) => (
                          <motion.p
                            key={index}
                            animate={{
                              color: index === currentLineIndex ? '#00f5ff' : '#9ca3af',
                              scale: index === currentLineIndex ? 1.02 : 1,
                            }}
                            transition={{ duration: 0.3 }}
                            className={`text-xs sm:text-sm leading-relaxed ${index === currentLineIndex ? 'font-medium' : ''}`}
                          >
                            {line.text}
                          </motion.p>
                        ));
                      })()}
                    </div>
                  ) : (
                    <p className="text-[10px] sm:text-xs text-gray-600 text-center py-3">
                      点击"导入歌词"加载LRC歌词文件
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />
      <input
        ref={lrcInputRef}
        type="file"
        accept=".lrc,.txt"
        onChange={handleLrcUpload}
        className="hidden"
      />
    </div>
  );
});

MusicPlayer.displayName = 'MusicPlayer';

export default MusicPlayer;
