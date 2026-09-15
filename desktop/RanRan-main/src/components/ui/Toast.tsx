import { useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUiStore } from '../../store/modules/uiStore';
import type { NotificationItem } from '../../store/modules/uiStore';

const iconMap: Record<NotificationItem['type'], string> = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
};

const colorMap: Record<NotificationItem['type'], string> = {
  success: 'border-green-500/30 bg-green-500/10',
  error: 'border-red-500/30 bg-red-500/10',
  warning: 'border-yellow-500/30 bg-yellow-500/10',
  info: 'border-blue-500/30 bg-blue-500/10',
};

const textColorMap: Record<NotificationItem['type'], string> = {
  success: 'text-green-400',
  error: 'text-red-400',
  warning: 'text-yellow-400',
  info: 'text-blue-400',
};

const ToastItem: React.FC<{ notification: NotificationItem }> = memo(({ notification }) => {
  const removeNotification = useUiStore(s => s.removeNotification);

  useEffect(() => {
    const duration = notification.duration || 3000;
    const timer = setTimeout(() => {
      removeNotification(notification.id);
    }, duration);
    return () => clearTimeout(timer);
  }, [notification.id, notification.duration, removeNotification]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl 
        border backdrop-blur-md shadow-xl min-w-[280px] max-w-[400px]
        ${colorMap[notification.type]}
      `}
    >
      <span className="text-lg flex-shrink-0">{iconMap[notification.type]}</span>
      <span className={`text-sm font-medium flex-1 ${textColorMap[notification.type]}`}>
        {notification.message}
      </span>
      <button
        onClick={() => removeNotification(notification.id)}
        className="text-gray-400 hover:text-white transition-colors flex-shrink-0 text-xs"
      >
        ✕
      </button>
    </motion.div>
  );
});

ToastItem.displayName = 'ToastItem';

const Toast: React.FC = memo(() => {
  const notifications = useUiStore(s => s.notifications);

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {notifications.map((notification) => (
          <div key={notification.id} className="pointer-events-auto">
            <ToastItem notification={notification} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
});

Toast.displayName = 'Toast';

export default Toast;
