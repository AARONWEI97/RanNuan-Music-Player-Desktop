import { memo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, 
  Upload, 
  FolderOpen, 
  Tag, 
  Search,
  Menu,
  X
} from 'lucide-react';
import { usePhotoStore } from '../../store/usePhotoStore';
import Button from '../ui/Button';
import Input from '../ui/Input';
import SortControl from './SortControl';

interface NavbarProps {
  embedded?: boolean;
  onOpenSettings: () => void;
  onOpenUpload: () => void;
  onOpenAlbums: () => void;
  onOpenTags: () => void;
}

const Navbar = memo(({ embedded = false, onOpenSettings, onOpenUpload, onOpenAlbums, onOpenTags }: NavbarProps) => {
  const { searchQuery, setSearchQuery } = usePhotoStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, [setSearchQuery]);

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen(prev => !prev);
  }, []);

  if (embedded) {
    return (
      <motion.nav
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute top-0 left-0 right-0 z-40"
        role="navigation"
        aria-label="照片工具"
      >
        <div className="mx-3 mt-2 flex h-10 items-center gap-2 rounded-xl border border-cyber-blue/15 bg-black/45 px-2 backdrop-blur-md">
          <div className="relative min-w-0 flex-1">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="搜索照片"
              className="h-8 w-full rounded-lg border border-white/10 bg-black/30 pl-8 pr-2 text-xs text-white placeholder:text-white/35 outline-none focus:border-cyber-blue/40"
            />
          </div>
          <SortControl className="shrink-0 scale-90 origin-right" />
          <div className="flex shrink-0 items-center gap-0.5">
            <button type="button" onClick={onOpenUpload} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] text-cyber-blue hover:bg-white/10" aria-label="上传照片">
              <Upload size={14} />
              <span>上传</span>
            </button>
            <button type="button" onClick={onOpenAlbums} className="grid h-8 w-8 place-items-center rounded-lg text-white/70 hover:bg-white/10" aria-label="相册管理">
              <FolderOpen size={15} />
            </button>
            <button type="button" onClick={onOpenTags} className="grid h-8 w-8 place-items-center rounded-lg text-white/70 hover:bg-white/10" aria-label="标签管理">
              <Tag size={15} />
            </button>
            <button type="button" onClick={onOpenSettings} className="grid h-8 w-8 place-items-center rounded-lg text-white/70 hover:bg-white/10" aria-label="设置">
              <Settings size={15} />
            </button>
          </div>
        </div>
      </motion.nav>
    );
  }

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-40"
      role="navigation"
      aria-label="主导航栏"
    >
      <div className="cyber-glass border-b border-cyber-blue/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <motion.div
                className="flex items-center gap-2"
                whileHover={{ scale: 1.02 }}
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyber-blue to-cyber-purple flex items-center justify-center">
                  <span className="text-xl font-cyber font-bold text-dark-bg">R</span>
                </div>
                <span className="hidden sm:block text-xl font-cyber cyber-text">RanRan</span>
              </motion.div>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <SortControl />

              <div className="relative w-64">
                <Input
                  placeholder="搜索照片..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  icon={<Search size={18} />}
                />
              </div>
              
              <Button variant="primary" size="sm" onClick={onOpenUpload} icon={<Upload size={16} />} aria-label="上传照片">
                上传
              </Button>
              
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={onOpenAlbums} icon={<FolderOpen size={18} />} aria-label="相册管理" />
                <Button variant="ghost" size="sm" onClick={onOpenTags} icon={<Tag size={18} />} aria-label="标签管理" />
                <Button variant="ghost" size="sm" onClick={onOpenSettings} icon={<Settings size={18} />} aria-label="设置" />
              </div>
            </div>

            <button
              className="md:hidden p-2 text-gray-400 hover:text-cyber-blue"
              onClick={toggleMobileMenu}
              aria-label={mobileMenuOpen ? '关闭菜单' : '打开菜单'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="md:hidden cyber-glass border-b border-cyber-blue/10"
        >
          <div className="px-4 py-4 space-y-4">
            <Input
              placeholder="搜索照片..."
              value={searchQuery}
              onChange={handleSearchChange}
              icon={<Search size={18} />}
            />
            
            <div className="flex justify-center gap-2">
              <SortControl />
            </div>

            <div className="flex gap-2">
              <Button variant="primary" size="sm" onClick={onOpenUpload} icon={<Upload size={16} />} className="flex-1">
                上传
              </Button>
            </div>
            
            <div className="flex justify-center gap-2">
              <Button variant="ghost" size="sm" onClick={onOpenAlbums} icon={<FolderOpen size={18} />} />
              <Button variant="ghost" size="sm" onClick={onOpenTags} icon={<Tag size={18} />} />
              <Button variant="ghost" size="sm" onClick={onOpenSettings} icon={<Settings size={18} />} />
            </div>
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
});

Navbar.displayName = 'Navbar';

export default Navbar;
