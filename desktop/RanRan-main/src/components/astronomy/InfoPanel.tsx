import { memo } from 'react';
import type { Photo } from '../../types';

interface InfoPanelProps {
  photo: Photo | null;
  onClose: () => void;
  isDark: boolean;
}

const InfoPanel: React.FC<InfoPanelProps> = memo(({ photo, onClose, isDark }) => {
  if (!photo) return null;

  return (
    <div 
      className={`
        fixed top-4 right-4 z-50 w-72 rounded-xl overflow-hidden
        ${isDark ? 'bg-black/80 border border-white/10' : 'bg-white/90 border border-gray-200'}
        backdrop-blur-md shadow-2xl
      `}
    >
      <div className="p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
            🪐 行星信息
          </h3>
          <button 
            onClick={onClose}
            className={`
              w-6 h-6 rounded-full flex items-center justify-center
              ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}
              transition-colors
            `}
          >
            ×
          </button>
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>名称</span>
            <span className={isDark ? 'text-white' : 'text-gray-800'}>{photo.name || '未知'}</span>
          </div>
          <div className="flex justify-between">
            <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>类型</span>
            <span className={isDark ? 'text-white' : 'text-gray-800'}>{photo.type || '图片'}</span>
          </div>
          <div className="flex justify-between">
            <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>创建时间</span>
            <span className={isDark ? 'text-white' : 'text-gray-800'}>
              {photo.createdAt ? new Date(photo.createdAt).toLocaleDateString() : '未知'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

InfoPanel.displayName = 'InfoPanel';

export default InfoPanel;
