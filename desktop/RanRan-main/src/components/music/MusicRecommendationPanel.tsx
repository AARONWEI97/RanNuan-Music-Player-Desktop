import { useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Sparkles, X } from 'lucide-react';
import { getMoodQueryForPhotos } from '../../services/musicRecommendation';
import type { Photo } from '../../types';
import { isEmbedded, playUniverseSong, requestUniverseSearch, useUniverseHostStore } from '../../bridge/universeHost';

interface MusicRecommendationPanelProps {
  photos: Photo[];
  isOpen: boolean;
  onClose: () => void;
  searchHint?: string;
}

function MusicRecommendationPanel({ photos, isOpen, onClose, searchHint }: MusicRecommendationPanelProps) {
  const query = useMemo(
    () => getMoodQueryForPhotos(photos, searchHint),
    [photos, searchHint]
  );
  const keywordText = query.keywords.join(' ');
  const search = useUniverseHostStore((s) => s.search);
  const searching = useUniverseHostStore((s) => s.searching);
  const songs = search?.songs ?? [];

  useEffect(() => {
    if (!isOpen || !isEmbedded) return;
    requestUniverseSearch(keywordText);
  }, [isOpen, keywordText]);

  const handlePlay = useCallback((song: (typeof songs)[number]) => {
    playUniverseSong(song);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-2xl mx-4 bg-dark-card/90 border border-cyber-blue/30 rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <Music className="w-6 h-6 text-cyber-blue" />
                <h2 className="text-xl font-cyber text-cyber-blue">情绪音乐推荐</h2>
                <Sparkles className="w-4 h-4 text-cyber-purple" />
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-sm text-gray-400 mb-4">
                {searchHint
                  ? `根据这张照片搜索：${query.keywords.join(' / ')}`
                  : `当前心情「${query.description}」，关键词：${query.keywords.join(' / ')}`}
              </p>

              {!isEmbedded && (
                <div className="text-center py-10 text-gray-400">
                  <Music className="w-14 h-14 mx-auto mb-4 opacity-50" />
                  <p>在桌面端播放器中打开宇宙相册，即可用这些关键词搜索真实曲库。</p>
                </div>
              )}

              {isEmbedded && searching && songs.length === 0 && (
                <div className="text-center py-10 text-gray-400 text-sm">正在搜索你的曲库…</div>
              )}

              {isEmbedded && !searching && songs.length === 0 && (
                <div className="text-center py-10 text-gray-400">
                  <Music className="w-14 h-14 mx-auto mb-4 opacity-50" />
                  <p>没有找到匹配歌曲。先听几首歌或给照片加上标签再试试。</p>
                </div>
              )}

              {isEmbedded && songs.length > 0 && (
                <div className="grid gap-3 max-h-[50vh] overflow-y-auto pr-1">
                  {songs.map((song, index) => (
                    <motion.button
                      key={`${song.id}-${index}`}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.04, 0.3) }}
                      onClick={() => handlePlay(song)}
                      className="flex items-center gap-4 p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyber-blue/30 transition-all text-left"
                    >
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-br from-cyber-blue/20 to-cyber-purple/20 flex-shrink-0">
                        {song.picUrl ? (
                          <img src={song.picUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Music className="w-5 h-5 text-cyber-blue" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-white truncate">{song.name}</h3>
                        <p className="text-sm text-gray-400 truncate">{song.artist}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default MusicRecommendationPanel;
