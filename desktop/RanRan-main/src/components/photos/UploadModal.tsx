import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, Image, X, FolderOpen, Images, CheckCircle2, AlertCircle } from 'lucide-react';
import { usePhotoStore } from '../../store/usePhotoStore';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';

const MAX_IMPORT = 500;

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const { albums, photos, currentAlbumId, addPhotos, addAlbum } = usePhotoStore();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<string>(currentAlbumId || 'default');
  const wasOpen = useRef(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [showNewAlbum, setShowNewAlbum] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [notice, setNotice] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen || wasOpen.current) {
      wasOpen.current = isOpen;
      return;
    }
    wasOpen.current = true;
    const selectedStillExists = Boolean(currentAlbumId && albums.some((album) => album.id === currentAlbumId));
    if (selectedStillExists && currentAlbumId) setSelectedAlbum(currentAlbumId);
    else if (albums.some((album) => album.id === 'default')) setSelectedAlbum('default');
    else if (albums[0]) setSelectedAlbum(albums[0].id);
  }, [isOpen, albums, currentAlbumId]);

  const previewUrls = useMemo(
    () => files.slice(0, 12).map((file) => ({ name: file.name, url: URL.createObjectURL(file) })),
    [files],
  );
  useEffect(() => () => {
    previewUrls.forEach((item) => URL.revokeObjectURL(item.url));
  }, [previewUrls]);

  const appendFiles = (incoming: File[]) => {
    if (uploading) return;
    const imageFiles = incoming.filter((file) => file.type.startsWith('image/'));
    const rejected = incoming.length - imageFiles.length;
    const remaining = Math.max(0, MAX_IMPORT - files.length);
    if (rejected > 0) setNotice(`${rejected} 个文件不是图片，已跳过`);
    else if (incoming.length + files.length > MAX_IMPORT) setNotice(`单次最多导入 ${MAX_IMPORT} 张，已截取前面的照片`);
    else setNotice('');
    if (remaining > 0) setFiles((prev) => [...prev, ...imageFiles.slice(0, remaining)]);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    appendFiles(Array.from(e.dataTransfer.files));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      appendFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (files.length === 0 || uploading) return;
    
    let albumId = selectedAlbum;
    
    try {
      if (showNewAlbum && newAlbumName.trim()) {
        const newAlbum = addAlbum(newAlbumName.trim());
        albumId = newAlbum.id;
      }
      
      setUploading(true);
      setUploadProgress(0);
      setCurrentFileIndex(0);
      const batch = files;
      const result = await addPhotos(batch, albumId, (done, total) => {
        setCurrentFileIndex(done);
        setUploadProgress(Math.round((done / Math.max(total, 1)) * 100));
      });
      const failedFiles = new Set(result.failed.map((index) => batch[index]).filter((file): file is File => Boolean(file)));
      if (failedFiles.size > 0) {
        setFiles((current) => current.filter((file) => failedFiles.has(file)));
        setNotice(`${failedFiles.size} 张没有写入，已留在列表里，可以再试一次`);
        return;
      }

      setFiles([]);
      setNewAlbumName('');
      setShowNewAlbum(false);
      onClose();
    } catch (error) {
      console.error('Upload critical error:', error);
      setNotice('上传失败：请检查存储空间和图片格式后重试');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setCurrentFileIndex(0);
    }
  };

  const handleClose = () => {
    setFiles([]);
    setNewAlbumName('');
    setShowNewAlbum(false);
    setNotice('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="导入照片" size="lg">
      <div className="space-y-5">
        <div className="flex items-center justify-between rounded-2xl border border-cyber-blue/15 bg-cyber-blue/[.06] px-4 py-3">
          <div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-cyber-blue/15 text-cyber-blue"><Images size={18} /></div><div><p className="text-sm font-semibold text-white">把记忆带回星空</p><p className="mt-0.5 text-[11px] text-white/45">支持 JPG、PNG、GIF、WebP · 单次最多 {MAX_IMPORT} 张，分批写入</p></div></div>
          <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-white/45">{files.length}/{MAX_IMPORT}</span>
        </div>
        <div
          className={`
            relative rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300
            ${dragActive 
              ? 'border-cyber-blue bg-cyber-blue/10' 
              : 'border-white/10 bg-white/[.025] hover:border-cyber-blue/50 hover:bg-cyber-blue/[.04]'
            }
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <motion.div
            className="flex flex-col items-center gap-4"
            animate={{ scale: dragActive ? 1.02 : 1 }}
          >
            <div className="w-16 h-16 rounded-full bg-cyber-blue/10 flex items-center justify-center">
              <Upload size={32} className="text-cyber-blue" />
            </div>
            
            <div>
              <p className="mb-1 text-lg font-semibold text-white">拖放照片到这里</p>
              <p className="text-xs text-white/40">或从设备中选择照片</p>
            </div>
            
            <Button
              variant="primary"
              onClick={() => inputRef.current?.click()}
              icon={<Image size={18} />}
            >
              选择文件
            </Button>
            
            <p className="text-[11px] text-white/30">原图会自动优化并保存到浏览器本地，不会上传到云端</p>
          </motion.div>
        </div>

        <div className="space-y-3">
            <label className="block text-[11px] font-semibold uppercase tracking-[.16em] text-white/45">
              保存位置
          </label>
          
          {showNewAlbum ? (
            <div className="flex gap-2">
              <Input
                placeholder="新相册名称"
                value={newAlbumName}
                onChange={(e) => setNewAlbumName(e.target.value)}
                icon={<FolderOpen size={18} />}
              />
              <Button variant="ghost" onClick={() => setShowNewAlbum(false)}>
                取消
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <select
                value={selectedAlbum}
                onChange={(e) => setSelectedAlbum(e.target.value)}
                className="flex-1 rounded-xl border border-white/10 bg-white/[.045] px-4 py-3 text-sm text-white outline-none focus:border-cyber-blue/50"
              >
                {albums.map((album) => (
                  <option key={album.id} value={album.id}>
                    {album.name}（{photos.filter((photo) => photo.albumId === album.id).length}）
                  </option>
                ))}
              </select>
              <Button variant="secondary" onClick={() => setShowNewAlbum(true)}>
                新建
              </Button>
            </div>
          )}
        </div>

        {files.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-semibold uppercase tracking-[.16em] text-white/45">
                已选择 {files.length} 张照片
              </label>
              <button type="button" onClick={() => setFiles([])} disabled={uploading} className="text-[11px] text-white/40 hover:text-white disabled:opacity-40">清空</button>
            </div>
            
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-40 overflow-y-auto">
              {previewUrls.map((item, index) => (
                <div key={`${item.name}-${index}`} className="group relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-white/[.04]">
                  <img src={item.url} alt={item.name} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-cyber-pink"
                    onClick={() => removeFile(index)}
                    disabled={uploading}
                  >
                    <X size={12} className="text-white" />
                  </button>
                </div>
              ))}
            </div>
            {files.length > previewUrls.length && (
              <p className="text-[11px] text-white/40">还有 {files.length - previewUrls.length} 张不在预览里，导入时会一并写入。</p>
            )}
          </div>
        )}

        {notice && <div className="flex items-center gap-2 rounded-xl border border-amber-300/20 bg-amber-300/[.07] px-3 py-2 text-xs text-amber-100"><AlertCircle size={14} />{notice}</div>}
        {uploading && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-medium text-cyber-blue"><CheckCircle2 size={14} />正在导入</span>
              <span className="text-white font-mono">{uploadProgress}%</span>
            </div>
            
            <div className="w-full h-3 bg-dark-bg rounded-full overflow-hidden border border-white/10">
              <motion.div
                className="h-full rounded-full relative overflow-hidden"
                style={{
                  background: 'linear-gradient(90deg, #00f5ff, #b829dd, #00f5ff)',
                  backgroundSize: '200% 100%',
                  width: `${uploadProgress}%`,
                }}
                animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
            </div>
            
            <p className="text-xs text-gray-400 text-center">
              正在处理 {currentFileIndex}/{files.length} 张。
            </p>
          </div>
        )}

        <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
          <Button variant="ghost" onClick={handleClose}>
            取消
          </Button>
          <Button
            variant="primary"
            onClick={handleUpload}
            isLoading={uploading}
            disabled={files.length === 0}
          >
            {uploading ? '上传中...' : `上传 ${files.length > 0 ? `(${files.length})` : ''}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
