import { motion, AnimatePresence } from 'framer-motion';
import { usePhotoStore } from '../../store/usePhotoStore';
import { FolderOpen, Image, X, Plus, Trash2, Settings } from 'lucide-react';
import { useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import PhotoManager from '../photos/PhotoManager';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { albums, currentAlbumId, setCurrentAlbum, addAlbum, removeAlbum, photos } = usePhotoStore();
  const [showNewAlbum, setShowNewAlbum] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [showPhotoManager, setShowPhotoManager] = useState(false);

  const handleCreateAlbum = () => {
    if (newAlbumName.trim()) {
      addAlbum(newAlbumName.trim());
      setNewAlbumName('');
      setShowNewAlbum(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
            onClick={onClose}
          />
          
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 bottom-0 w-72 z-50 cyber-glass border-r border-cyber-blue/10 overflow-hidden"
          >
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-cyber-blue/10">
                <h2 className="text-lg font-cyber cyber-text flex items-center gap-2">
                  <FolderOpen size={20} />
                  相册列表
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    className="p-2 hover:bg-cyber-blue/10 rounded-lg transition-colors text-gray-400 hover:text-cyber-blue"
                    onClick={() => setShowPhotoManager(true)}
                    title="图片管理"
                  >
                    <Settings size={18} />
                  </button>
                  <button
                    className="p-2 hover:bg-cyber-blue/10 rounded-lg transition-colors text-gray-400 hover:text-cyber-blue"
                    onClick={onClose}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                <motion.button
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300
                    ${currentAlbumId === null 
                      ? 'bg-cyber-blue/20 text-cyber-blue border border-cyber-blue/30' 
                      : 'text-gray-400 hover:text-white hover:bg-dark-card'
                    }
                  `}
                  onClick={() => setCurrentAlbum(null)}
                  whileHover={{ x: 4 }}
                >
                  <Image size={20} />
                  <span className="font-body">全部照片</span>
                  <span className="ml-auto text-sm opacity-60">{photos.length}</span>
                </motion.button>

                {albums.map((album) => (
                  <motion.div
                    key={album.id}
                    className={`
                      group flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 cursor-pointer
                      ${currentAlbumId === album.id 
                        ? 'bg-cyber-blue/20 text-cyber-blue border border-cyber-blue/30' 
                        : 'text-gray-400 hover:text-white hover:bg-dark-card'
                      }
                    `}
                    onClick={() => setCurrentAlbum(album.id)}
                    whileHover={{ x: 4 }}
                  >
                    <FolderOpen size={20} />
                    <span className="font-body flex-1 truncate">{album.name}</span>
                    <span className="text-sm opacity-60">{album.photoCount}</span>
                    
                    {album.id !== 'default' && (
                      <button
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-cyber-pink/20 rounded transition-all text-cyber-pink"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeAlbum(album.id);
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </motion.div>
                ))}
              </div>

              <div className="p-4 border-t border-cyber-blue/10">
                {showNewAlbum ? (
                  <div className="space-y-2">
                    <Input
                      placeholder="相册名称"
                      value={newAlbumName}
                      onChange={(e) => setNewAlbumName(e.target.value)}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleCreateAlbum} className="flex-1">
                        创建
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowNewAlbum(false)}>
                        取消
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    className="w-full justify-center"
                    onClick={() => setShowNewAlbum(true)}
                    icon={<Plus size={18} />}
                  >
                    新建相册
                  </Button>
                )}
              </div>
            </div>
          </motion.aside>
          
          <PhotoManager 
            isOpen={showPhotoManager} 
            onClose={() => setShowPhotoManager(false)} 
          />
        </>
      )}
    </AnimatePresence>
  );
}
