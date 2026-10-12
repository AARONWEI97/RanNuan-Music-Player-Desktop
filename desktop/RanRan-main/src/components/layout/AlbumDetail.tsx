import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, Image as ImageIcon, Search, Trash2, X } from 'lucide-react';
import { usePhotoStore } from '../../store/usePhotoStore';
import type { Photo } from '../../types';

interface AlbumDetailProps {
  title: string;
  description?: string;
  photos: Photo[];
  onBack: () => void;
  onClose: () => void;
  onOpenPhoto: (photoId: string) => void;
}

const ROW_HEIGHT = 68;

function formatPhotoDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export default function AlbumDetail({ title, description, photos, onBack, onClose, onOpenPhoto }: AlbumDetailProps) {
  const removePhotos = usePhotoStore((state) => state.removePhotos);
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(480);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const visiblePhotos = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return photos;
    return photos.filter((photo) => photo.name.toLowerCase().includes(keyword)
      || (photo.description ?? '').toLowerCase().includes(keyword));
  }, [photos, query]);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;
    const observer = new ResizeObserver(() => {
      if (node.clientHeight > 0) setViewportHeight(node.clientHeight);
    });
    observer.observe(node);
    setViewportHeight(node.clientHeight);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: 0 });
    setScrollTop(0);
  }, [query, title]);

  useEffect(() => {
    const alive = new Set(photos.map((photo) => photo.id));
    setSelectedIds((current) => {
      const next = new Set([...current].filter((id) => alive.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [photos]);

  const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 6);
  const count = Math.ceil(viewportHeight / ROW_HEIGHT) + 12;
  const rows = visiblePhotos.slice(start, start + count);
  const selectedCount = selectedIds.size;
  const allVisibleSelected = visiblePhotos.length > 0 && visiblePhotos.every((photo) => selectedIds.has(photo.id));

  const toggle = (photoId: string) => {
    setConfirming(false);
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  };

  const toggleVisible = () => {
    setConfirming(false);
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) visiblePhotos.forEach((photo) => next.delete(photo.id));
      else visiblePhotos.forEach((photo) => next.add(photo.id));
      return next;
    });
  };

  const deleteSelected = () => {
    removePhotos([...selectedIds]);
    setSelectedIds(new Set());
    setConfirming(false);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-white/10 px-3 pb-3 pt-3">
        <div className="flex items-center gap-1">
          <button type="button" onClick={onBack} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs text-white/60 hover:bg-white/10 hover:text-white">
            <ChevronLeft size={16} /> 相册
          </button>
          <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white" aria-label="关闭相册列表">
            <X size={16} />
          </button>
        </div>
        <p className="mt-1 truncate px-2 text-[11px] text-white/40">
          {photos.length} 张{description ? ` · ${description}` : ''}
        </p>
        <div className="relative mt-2">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="在这个相册里搜索"
            aria-label="搜索相册中的照片"
            className="h-9 w-full rounded-xl border border-white/10 bg-black/30 pl-8 pr-8 text-xs text-white outline-none placeholder:text-white/30 focus:border-cyber-blue/50"
          />
          {query && (
            <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-white/40 hover:text-white" onClick={() => setQuery('')} aria-label="清空照片搜索">
              <X size={12} />
            </button>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 px-1">
          <button type="button" onClick={toggleVisible} className="text-[11px] text-cyber-blue hover:text-cyan-200" disabled={visiblePhotos.length === 0}>
            {allVisibleSelected ? '取消全选' : '全选'}
          </button>
          <span className="text-[11px] text-white/35">{selectedCount > 0 ? `已选 ${selectedCount} 张` : `${visiblePhotos.length} 张`}</span>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="min-h-0 flex-1 overflow-y-auto"
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      >
        {visiblePhotos.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm text-white/70">{query.trim() ? '没有匹配的照片' : '这个相册还是空的'}</p>
            <p className="mt-1 text-[11px] text-white/35">
              {query.trim() ? '换个名称再找。' : '从顶部导入后，照片会出现在这里。'}
            </p>
          </div>
        ) : (
          <div className="relative" style={{ height: visiblePhotos.length * ROW_HEIGHT }}>
            {rows.map((photo, index) => {
              const selected = selectedIds.has(photo.id);
              return (
                <div
                  key={photo.id}
                  className="absolute left-0 right-0 flex items-center gap-2 px-3"
                  style={{ top: (start + index) * ROW_HEIGHT, height: ROW_HEIGHT }}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggle(photo.id)}
                    aria-label={`选择${photo.name}`}
                    className="h-3.5 w-3.5 shrink-0 accent-cyan-300"
                  />
                  <button
                    type="button"
                    onClick={() => onOpenPhoto(photo.id)}
                    className={`flex min-w-0 flex-1 items-center gap-2 rounded-xl border px-2 py-1.5 text-left ${selected ? 'border-cyber-blue/40 bg-cyber-blue/10' : 'border-transparent hover:bg-white/[.04]'}`}
                  >
                    <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/30">
                      {photo.thumbnail ? (
                        <img src={photo.thumbnail} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="grid h-full w-full place-items-center text-white/30"><ImageIcon size={14} /></span>
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs text-white">{photo.name}</span>
                      <span className="mt-0.5 block text-[10px] text-white/35">{formatPhotoDate(photo.createdAt)}</span>
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedCount > 0 && (
        <div className="border-t border-white/10 p-3">
          {confirming ? (
            <div className="rounded-xl border border-cyber-pink/30 bg-cyber-pink/10 p-2.5">
              <p className="text-[11px] text-white/75">删除选中的 {selectedCount} 张照片？照片会从相册和星图里一起去掉。</p>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={deleteSelected} className="h-8 flex-1 rounded-lg bg-cyber-pink/20 text-xs text-cyber-pink hover:bg-cyber-pink/30">确认删除</button>
                <button type="button" onClick={() => setConfirming(false)} className="h-8 rounded-lg px-3 text-xs text-white/50 hover:bg-white/10 hover:text-white">取消</button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-cyber-pink/15 text-sm text-cyber-pink hover:bg-cyber-pink/25">
              <Trash2 size={14} /> 删除选中的 {selectedCount} 张
            </button>
          )}
        </div>
      )}
    </div>
  );
}
