import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, FolderOpen, Image as ImageIcon, Images, X, Plus, Trash2, Pencil, Check, Search, Star } from 'lucide-react';
import { usePhotoStore } from '../../store/usePhotoStore';
import PhotoManager from '../photos/PhotoManager';
import AlbumDetail from './AlbumDetail';
import type { Album, Photo } from '../../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPhoto: (photoId: string) => void;
}

type AlbumSort = 'recent' | 'count' | 'name';

const ACCENTS = ['#00f5ff', '#b829dd', '#ff2d75', '#39ff14'];

function accentFor(id: string) {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) hash = (hash + id.charCodeAt(index)) % ACCENTS.length;
  return ACCENTS[hash] ?? ACCENTS[0];
}

function formatAlbumDate(timestamp: number) {
  const date = new Date(timestamp);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString('zh-CN', sameYear
    ? { month: 'numeric', day: 'numeric' }
    : { year: 'numeric', month: 'numeric', day: 'numeric' });
}

function Thumb({ photo, cover, onSetCover }: { photo: Photo; cover: boolean; onSetCover: () => void }) {
  return (
    <button
      type="button"
      title={cover ? '当前封面' : '设为封面'}
      aria-label={cover ? `${photo.name}，当前封面` : `把${photo.name}设为封面`}
      onClick={(event) => {
        event.stopPropagation();
        onSetCover();
      }}
      className={`relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border ${cover ? 'border-cyber-blue shadow-[0_0_10px_rgba(0,245,255,.35)]' : 'border-white/10 hover:border-white/30'}`}
    >
      {photo.thumbnail ? (
        <img src={photo.thumbnail} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="grid h-full w-full place-items-center bg-white/5 text-white/30"><ImageIcon size={14} /></span>
      )}
      {cover && <Star size={10} className="absolute right-0.5 top-0.5 fill-cyber-blue text-cyber-blue" />}
    </button>
  );
}

export default function Sidebar({ isOpen, onClose, onOpenPhoto }: SidebarProps) {
  const {
    albums,
    photos,
    currentAlbumId,
    setCurrentAlbum,
    addAlbum,
    removeAlbum,
    updateAlbum,
    movePhotos,
  } = usePhotoStore();
  const [showPhotoManager, setShowPhotoManager] = useState(false);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<AlbumSort>('recent');
  const [showNewAlbum, setShowNewAlbum] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [newAlbumDescription, setNewAlbumDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [openedAlbumId, setOpenedAlbumId] = useState<string | null>(null);

  const photosByAlbum = useMemo(() => {
    const grouped = new Map<string, Photo[]>();
    photos.forEach((photo) => {
      const list = grouped.get(photo.albumId);
      if (list) list.push(photo);
      else grouped.set(photo.albumId, [photo]);
    });
    grouped.forEach((list) => list.sort((a, b) => b.createdAt - a.createdAt));
    return grouped;
  }, [photos]);

  const recentPhotos = useMemo(
    () => [...photos].sort((a, b) => b.createdAt - a.createdAt).slice(0, 4),
    [photos],
  );

  const defaultAlbum = albums.find((album) => album.id === 'default');
  const defaultAlbumName = defaultAlbum?.name ?? '默认相册';

  const visibleAlbums = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const matched = albums.filter((album) => {
      if (!keyword) return true;
      return album.name.toLowerCase().includes(keyword)
        || (album.description ?? '').toLowerCase().includes(keyword);
    });
    const countOf = (album: Album) => photosByAlbum.get(album.id)?.length ?? 0;
    return [...matched].sort((a, b) => {
      if (a.id === 'default') return -1;
      if (b.id === 'default') return 1;
      if (sort === 'name') return a.name.localeCompare(b.name, 'zh');
      if (sort === 'count') return countOf(b) - countOf(a) || b.createdAt - a.createdAt;
      return b.createdAt - a.createdAt;
    });
  }, [albums, photosByAlbum, query, sort]);

  const beginEdit = (album: Album) => {
    setEditingId(album.id);
    setEditName(album.name);
    setEditDescription(album.description ?? '');
    setPendingDeleteId(null);
  };

  const saveEdit = () => {
    if (!editingId || !editName.trim()) return;
    updateAlbum(editingId, {
      name: editName.trim(),
      description: editDescription.trim(),
    });
    setEditingId(null);
  };

  const createAlbum = () => {
    const name = newAlbumName.trim();
    if (!name) return;
    const created = addAlbum(name, newAlbumDescription.trim() || undefined);
    setCurrentAlbum(created.id);
    setNewAlbumName('');
    setNewAlbumDescription('');
    setShowNewAlbum(false);
  };

  const moveTargetFor = (albumId: string) => (
    albums.find((item) => item.id !== albumId && item.id === 'default')
    ?? albums.find((item) => item.id !== albumId)
  );

  const openAlbum = (albumId: string | null) => {
    setCurrentAlbum(albumId);
    setOpenedAlbumId(albumId ?? 'all');
    setEditingId(null);
    setPendingDeleteId(null);
    setShowNewAlbum(false);
  };

  useEffect(() => {
    if (openedAlbumId && openedAlbumId !== 'all' && !albums.some((album) => album.id === openedAlbumId)) {
      setOpenedAlbumId(null);
    }
  }, [albums, openedAlbumId]);

  const keepPhotosAndRemove = async (album: Album) => {
    const moving = photos.filter((photo) => photo.albumId === album.id).map((photo) => photo.id);
    const target = moveTargetFor(album.id);
    if (!target) return;
    if (moving.length > 0) await movePhotos(moving, target.id);
    removeAlbum(album.id);
    setPendingDeleteId(null);
    if (openedAlbumId === album.id) setOpenedAlbumId(null);
  };

  const fieldClass = 'w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyber-blue/50';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />

          <motion.aside
            initial={{ x: -360 }}
            animate={{ x: 0 }}
            exit={{ x: -360 }}
            transition={{ type: 'spring', damping: 26, stiffness: 240 }}
            className="fixed bottom-0 left-0 top-0 z-50 flex w-[min(100vw,22.5rem)] flex-col border-r border-white/10 bg-[#07101b]/95 shadow-2xl shadow-black/40 backdrop-blur-2xl"
            aria-label="相册列表"
          >
            {openedAlbumId ? (
              <AlbumDetail
                title={openedAlbumId === 'all' ? '全部照片' : (albums.find((album) => album.id === openedAlbumId)?.name ?? '相册')}
                description={openedAlbumId === 'all' ? '星图显示每一个相册' : albums.find((album) => album.id === openedAlbumId)?.description}
                photos={openedAlbumId === 'all' ? [...photos].sort((a, b) => b.createdAt - a.createdAt) : (photosByAlbum.get(openedAlbumId) ?? [])}
                onBack={() => setOpenedAlbumId(null)}
                onClose={onClose}
                onOpenPhoto={onOpenPhoto}
              />
            ) : (
            <>
            <div className="border-b border-white/10 px-4 pb-3 pt-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-semibold text-white">
                    <FolderOpen size={18} className="text-cyber-blue" />
                    相册列表
                  </h2>
                  <p className="mt-1 text-[11px] text-white/40">
                    {albums.length} 个相册 · {photos.length} 张照片
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="rounded-lg px-2 py-1.5 text-[11px] text-white/55 hover:bg-white/10 hover:text-white"
                    onClick={() => setShowPhotoManager(true)}
                  >
                    照片
                  </button>
                  <button
                    type="button"
                    className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white"
                    onClick={onClose}
                    aria-label="关闭相册列表"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="relative mt-3">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索相册名称或说明"
                  aria-label="搜索相册"
                  className={`${fieldClass} h-9 pl-8 pr-8 text-xs`}
                />
                {query && (
                  <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-white/40 hover:text-white" onClick={() => setQuery('')} aria-label="清空相册搜索">
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="mt-2 flex gap-1">
                {([
                  ['recent', '最近'],
                  ['count', '照片最多'],
                  ['name', '名称'],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={sort === key}
                    onClick={() => setSort(key)}
                    className={`rounded-full px-2.5 py-1 text-[11px] ${sort === key ? 'bg-cyber-blue/15 text-cyber-blue' : 'text-white/40 hover:bg-white/5 hover:text-white/70'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
              <button
                type="button"
                onClick={() => openAlbum(null)}
                className={`w-full rounded-2xl border px-3 py-3 text-left transition ${currentAlbumId === null ? 'border-cyber-blue/40 bg-cyber-blue/10' : 'border-white/10 bg-white/[.03] hover:border-white/20'}`}
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-white/10 bg-black/30 text-cyber-blue">
                    <Images size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-white">全部照片</span>
                    <span className="mt-0.5 block text-[11px] text-white/40">星图显示每一个相册 · {photos.length} 张</span>
                  </span>
                </div>
                {recentPhotos.length > 0 && (
                  <span className="mt-3 flex gap-1.5">
                    {recentPhotos.map((photo) => (
                      <span key={photo.id} className="h-10 w-10 overflow-hidden rounded-lg border border-white/10">
                        {photo.thumbnail ? <img src={photo.thumbnail} alt="" className="h-full w-full object-cover" /> : null}
                      </span>
                    ))}
                  </span>
                )}
                {currentAlbumId === null && (
                  <span className="mt-2 block text-[11px] leading-relaxed text-white/45">
                    导入时如果不再另选，照片会进入「{defaultAlbumName}」。
                  </span>
                )}
              </button>

              {visibleAlbums.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center">
                  <p className="text-sm text-white/70">{query.trim() ? '没有匹配的相册' : '还没有相册'}</p>
                  <p className="mt-1 text-[11px] text-white/35">
                    {query.trim() ? '换个关键词，或在下方新建一个相册。' : '在下方创建一个相册，再把照片导入进去。'}
                  </p>
                </div>
              )}

              {visibleAlbums.map((album) => {
                const albumPhotos = photosByAlbum.get(album.id) ?? [];
                const cover = albumPhotos.find((photo) => photo.id === album.coverPhotoId) ?? albumPhotos[0];
                const selected = currentAlbumId === album.id;
                const editing = editingId === album.id;
                const confirming = pendingDeleteId === album.id;
                const moveTarget = moveTargetFor(album.id);
                const accent = accentFor(album.id);

                return (
                  <div
                    key={album.id}
                    className={`rounded-2xl border px-3 py-3 ${selected ? 'border-cyber-blue/40 bg-cyber-blue/10' : 'border-white/10 bg-white/[.03]'}`}
                    style={{ boxShadow: `inset 3px 0 0 ${accent}` }}
                  >
                    {editing ? (
                      <div className="space-y-2">
                        <input
                          value={editName}
                          onChange={(event) => setEditName(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') saveEdit();
                          }}
                          aria-label="相册名称"
                          className={`${fieldClass} h-9`}
                          autoFocus
                        />
                        <textarea
                          value={editDescription}
                          onChange={(event) => setEditDescription(event.target.value)}
                          placeholder="相册说明，可以留空"
                          aria-label="相册说明"
                          rows={2}
                          className={`${fieldClass} resize-none py-2 text-xs`}
                        />
                        <div className="flex gap-2">
                          <button type="button" onClick={saveEdit} className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-lg bg-cyber-blue/15 text-xs text-cyber-blue hover:bg-cyber-blue/25">
                            <Check size={13} /> 保存
                          </button>
                          <button type="button" onClick={() => setEditingId(null)} className="h-8 rounded-lg px-3 text-xs text-white/50 hover:bg-white/10 hover:text-white">
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button type="button" onClick={() => openAlbum(album.id)} className="flex w-full items-center gap-3 text-left">
                          <span className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/30">
                            {cover?.thumbnail ? (
                              <img src={cover.thumbnail} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span className="grid h-full w-full place-items-center text-white/30"><FolderOpen size={16} /></span>
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5">
                              <span className="truncate text-sm font-medium text-white">{album.name}</span>
                              {album.id === 'default' && <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/50">默认</span>}
                            </span>
                            <span className="mt-0.5 block truncate text-[11px] text-white/40">
                              {albumPhotos.length} 张 · {formatAlbumDate(album.createdAt)}
                              {album.description ? ` · ${album.description}` : ''}
                            </span>
                          </span>
                          <ChevronRight size={16} className="shrink-0 text-white/30" />
                        </button>

                        {albumPhotos.length > 0 && (
                          <div className="mt-3 flex items-center gap-1.5">
                            {albumPhotos.slice(0, 4).map((photo) => (
                              <Thumb
                                key={photo.id}
                                photo={photo}
                                cover={cover?.id === photo.id}
                                onSetCover={() => updateAlbum(album.id, { coverPhotoId: photo.id })}
                              />
                            ))}
                            {albumPhotos.length > 4 && (
                              <span className="text-[11px] text-white/35">+{albumPhotos.length - 4}</span>
                            )}
                          </div>
                        )}

                        {selected && (
                          <p className="mt-2 text-[11px] leading-relaxed text-cyan-100/70">
                            星图只显示这个相册，接下来导入的照片也会放进来。
                          </p>
                        )}

                        {confirming ? (
                          <div className="mt-3 rounded-xl border border-cyber-pink/30 bg-cyber-pink/10 p-2.5">
                            <p className="text-[11px] leading-relaxed text-white/75">
                              {albumPhotos.length === 0
                                ? `「${album.name}」里没有照片。`
                                : moveTarget
                                  ? `「${album.name}」里有 ${albumPhotos.length} 张照片。可以先挪到「${moveTarget.name}」，再删掉这个相册。`
                                  : `「${album.name}」里有 ${albumPhotos.length} 张照片，删掉相册时会一并删除。`}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {albumPhotos.length > 0 && moveTarget && (
                                <button type="button" onClick={() => keepPhotosAndRemove(album)} className="rounded-lg bg-white/10 px-2 py-1.5 text-[11px] text-white hover:bg-white/15">
                                  保留照片
                                </button>
                              )}
                              <button type="button" onClick={() => { removeAlbum(album.id); setPendingDeleteId(null); }} className="rounded-lg bg-cyber-pink/20 px-2 py-1.5 text-[11px] text-cyber-pink hover:bg-cyber-pink/30">
                                {albumPhotos.length > 0 ? '连照片删除' : '删除相册'}
                              </button>
                              <button type="button" onClick={() => setPendingDeleteId(null)} className="rounded-lg px-2 py-1.5 text-[11px] text-white/45 hover:text-white">
                                取消
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2 flex gap-1">
                            <button type="button" onClick={() => beginEdit(album)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-white/45 hover:bg-white/10 hover:text-white">
                              <Pencil size={12} /> 编辑
                            </button>
                            {album.id !== 'default' && (
                              <button type="button" onClick={() => { setPendingDeleteId(album.id); setEditingId(null); }} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-white/45 hover:bg-cyber-pink/15 hover:text-cyber-pink">
                                <Trash2 size={12} /> 删除
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="border-t border-white/10 p-3">
              {showNewAlbum ? (
                <div className="space-y-2">
                  <input
                    value={newAlbumName}
                    onChange={(event) => setNewAlbumName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') createAlbum();
                    }}
                    placeholder="相册名称"
                    aria-label="新相册名称"
                    autoFocus
                    className={`${fieldClass} h-9`}
                  />
                  <input
                    value={newAlbumDescription}
                    onChange={(event) => setNewAlbumDescription(event.target.value)}
                    placeholder="一句说明，可选"
                    aria-label="新相册说明"
                    className={`${fieldClass} h-9 text-xs`}
                  />
                  <div className="flex gap-2">
                    <button type="button" onClick={createAlbum} className="inline-flex h-9 flex-1 items-center justify-center gap-1 rounded-xl bg-cyber-blue/15 text-sm text-cyber-blue hover:bg-cyber-blue/25">
                      <Plus size={14} /> 创建
                    </button>
                    <button type="button" onClick={() => setShowNewAlbum(false)} className="h-9 rounded-xl px-3 text-sm text-white/50 hover:bg-white/10 hover:text-white">
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowNewAlbum(true)}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 text-sm text-white/70 hover:border-cyber-blue/40 hover:bg-cyber-blue/10 hover:text-cyber-blue"
                >
                  <Plus size={16} /> 新建相册
                </button>
              )}
            </div>
            </>
            )}
          </motion.aside>

          <PhotoManager isOpen={showPhotoManager} onClose={() => setShowPhotoManager(false)} />
        </>
      )}
    </AnimatePresence>
  );
}
