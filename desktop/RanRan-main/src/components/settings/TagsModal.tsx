import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePhotoStore } from '../../store/usePhotoStore';
import { Tag as TagIcon, Plus, Trash2 } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';

interface TagsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const tagColors = [
  '#00f5ff', '#ff2d75', '#b829dd', '#39ff14', '#ff6b35',
  '#f7931e', '#00ff88', '#ff6b9d', '#8b5cf6', '#06b6d4',
];

export default function TagsModal({ isOpen, onClose }: TagsModalProps) {
  const { tags, addTag, removeTag, photos } = usePhotoStore();
  const [newTagName, setNewTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(tagColors[0]);

  const handleAddTag = () => {
    if (newTagName.trim()) {
      addTag(newTagName.trim(), selectedColor);
      setNewTagName('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTag();
    }
  };

  const getTagPhotoCount = (tagId: string) => {
    return photos.filter((p) => p.tags.includes(tagId)).length;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="标签管理" size="md">
      <div className="space-y-6">
        <div className="flex gap-2">
          <Input
            placeholder="新标签名称"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={handleKeyDown}
            icon={<TagIcon size={18} />}
          />
          
          <div className="flex gap-1 items-center">
            {tagColors.slice(0, 5).map((color) => (
              <button
                key={color}
                className={`w-6 h-6 rounded-full transition-transform ${
                  selectedColor === color ? 'scale-125 ring-2 ring-white/50' : ''
                }`}
                style={{ backgroundColor: color }}
                onClick={() => setSelectedColor(color)}
              />
            ))}
          </div>
          
          <Button variant="primary" onClick={handleAddTag} icon={<Plus size={18} />}>
            添加
          </Button>
        </div>

        {tags.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-dark-card flex items-center justify-center mx-auto mb-4">
              <TagIcon size={32} className="text-gray-500" />
            </div>
            <p className="text-gray-400">暂无标签</p>
            <p className="text-gray-500 text-sm mt-1">创建标签来组织您的照片</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            <AnimatePresence>
              {tags.map((tag) => (
                <motion.div
                  key={tag.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center justify-between p-3 bg-dark-card rounded-lg border border-dark-border hover:border-cyber-blue/30 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="text-white font-body">{tag.name}</span>
                    <span className="text-gray-500 text-sm">
                      {getTagPhotoCount(tag.id)} 张照片
                    </span>
                  </div>
                  
                  <button
                    className="p-2 opacity-0 group-hover:opacity-100 hover:bg-cyber-pink/20 rounded-lg transition-all text-cyber-pink"
                    onClick={() => removeTag(tag.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-cyber-blue/10">
          <Button variant="ghost" onClick={onClose}>
            完成
          </Button>
        </div>
      </div>
    </Modal>
  );
}
