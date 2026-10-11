import { memo, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Upload, FolderOpen, Tag, Search, Menu, X, ImagePlus } from 'lucide-react';
import { usePhotoStore } from '../../store/usePhotoStore';
import SortControl from './SortControl';

interface NavbarProps {
  embedded?: boolean;
  onOpenSettings: () => void;
  onOpenUpload: () => void;
  onOpenAlbums: () => void;
  onOpenTags: () => void;
}

const ActionButton = ({ icon, label, onClick, primary = false }: { icon: React.ReactNode; label: string; onClick: () => void; primary?: boolean }) => (
  <button type="button" onClick={onClick} className={`group inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-cyber-blue/25 ${primary ? 'border-cyber-blue/50 bg-cyber-blue/12 text-cyber-blue hover:bg-cyber-blue/20' : 'border-white/10 bg-white/[.045] text-white/65 hover:border-white/20 hover:bg-white/[.09] hover:text-white'}`}>
    {icon}<span>{label}</span>
  </button>
);

const SearchBox = ({ embedded = false }: { embedded?: boolean }) => {
  const { searchQuery, setSearchQuery, getFilteredPhotos } = usePhotoStore();
  const visibleCount = getFilteredPhotos().length;
  return (
    <div className={`group relative flex min-w-0 items-center rounded-xl border border-white/10 bg-black/25 transition focus-within:border-cyber-blue/45 focus-within:bg-black/35 ${embedded ? 'h-8 flex-1' : 'h-10 w-full max-w-[310px]'}`}>
      <Search size={embedded ? 14 : 16} className="pointer-events-none ml-3 shrink-0 text-white/35 transition group-focus-within:text-cyber-blue" />
      <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="搜索照片、标签或描述" className={`min-w-0 flex-1 bg-transparent px-2 text-white outline-none placeholder:text-white/30 ${embedded ? 'text-[11px]' : 'text-xs'}`} aria-label="搜索照片、标签或描述" />
      {searchQuery ? <button type="button" onClick={() => setSearchQuery('')} className="mr-2 rounded-md p-1 text-white/35 hover:bg-white/10 hover:text-white" aria-label="清空搜索"><X size={13} /></button> : !embedded && <span className="mr-2 hidden text-[10px] text-white/25 sm:block">{visibleCount} 项</span>}
    </div>
  );
};

const Navbar = memo(({ embedded = false, onOpenSettings, onOpenUpload, onOpenAlbums, onOpenTags }: NavbarProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const toggleMobileMenu = useCallback(() => setMobileMenuOpen((prev) => !prev), []);

  if (embedded) {
    return (
      <motion.nav initial={{ y: -18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="absolute left-0 right-0 top-0 z-40" role="navigation" aria-label="照片工具">
        <div className="mx-3 mt-3 flex min-h-12 items-center gap-2 rounded-2xl border border-white/12 bg-[#09111d]/80 px-2.5 shadow-xl shadow-black/20 backdrop-blur-xl">
          <div className="hidden items-center gap-2 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45 lg:flex"><ImagePlus size={14} className="text-cyber-blue" />照片库</div>
          <SearchBox embedded />
          <SortControl compact className="shrink-0" />
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={onOpenUpload} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-cyber-blue/35 bg-cyber-blue/10 px-2.5 text-[11px] font-medium text-cyber-blue hover:bg-cyber-blue/20" aria-label="上传照片"><Upload size={14} /><span className="hidden sm:inline">导入</span></button>
            <button type="button" onClick={onOpenAlbums} className="grid h-8 w-8 place-items-center rounded-lg text-white/55 hover:bg-white/10 hover:text-white" aria-label="相册"><FolderOpen size={15} /></button>
            <button type="button" onClick={onOpenTags} className="grid h-8 w-8 place-items-center rounded-lg text-white/55 hover:bg-white/10 hover:text-white" aria-label="标签"><Tag size={15} /></button>
            <button type="button" onClick={onOpenSettings} className="grid h-8 w-8 place-items-center rounded-lg text-white/55 hover:bg-white/10 hover:text-white" aria-label="设置"><Settings size={15} /></button>
          </div>
        </div>
      </motion.nav>
    );
  }

  return (
    <motion.nav initial={{ y: -24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="fixed left-0 right-0 top-0 z-40" role="navigation" aria-label="主导航栏">
      <div className="border-b border-white/[.08] bg-[#07101b]/80 shadow-lg shadow-black/10 backdrop-blur-2xl">
        <div className="mx-auto flex min-h-[72px] max-w-7xl items-center gap-4 px-4 sm:px-6">
          <div className="flex shrink-0 items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl border border-cyber-blue/35 bg-gradient-to-br from-cyber-blue/90 to-cyber-purple shadow-lg shadow-cyber-blue/15"><span className="font-cyber text-xl font-bold text-[#07101b]">R</span></div><div className="hidden sm:block"><div className="font-cyber text-sm font-semibold tracking-[.14em] text-white">RANRAN</div><div className="mt-0.5 text-[10px] uppercase tracking-[.18em] text-white/35">Universe library</div></div></div>
          <div className="hidden min-w-0 flex-1 items-center justify-end gap-2 md:flex"><SearchBox /><SortControl /><ActionButton primary icon={<Upload size={16} />} label="导入照片" onClick={onOpenUpload} /><ActionButton icon={<FolderOpen size={16} />} label="相册" onClick={onOpenAlbums} /><ActionButton icon={<Tag size={16} />} label="标签" onClick={onOpenTags} /><ActionButton icon={<Settings size={16} />} label="设置" onClick={onOpenSettings} /></div>
          <button className="ml-auto rounded-xl border border-white/10 bg-white/[.04] p-2 text-white/55 hover:text-white md:hidden" onClick={toggleMobileMenu} aria-label={mobileMenuOpen ? '关闭菜单' : '打开菜单'} aria-expanded={mobileMenuOpen}>{mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </div>
      {mobileMenuOpen && <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="border-b border-white/10 bg-[#09111d]/95 p-4 shadow-2xl backdrop-blur-xl md:hidden"><div className="space-y-3"><SearchBox /><div className="flex items-center gap-2"><SortControl className="flex-1" /><ActionButton primary icon={<Upload size={15} />} label="导入" onClick={onOpenUpload} /></div><div className="grid grid-cols-3 gap-2"><ActionButton icon={<FolderOpen size={15} />} label="相册" onClick={onOpenAlbums} /><ActionButton icon={<Tag size={15} />} label="标签" onClick={onOpenTags} /><ActionButton icon={<Settings size={15} />} label="设置" onClick={onOpenSettings} /></div></div></motion.div>}
    </motion.nav>
  );
});

Navbar.displayName = 'Navbar';
export default Navbar;
