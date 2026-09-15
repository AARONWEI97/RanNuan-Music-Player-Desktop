import { useEffect, useCallback } from 'react';

interface KeyboardShortcutsConfig {
  onEscape?: () => void;
  onPrevPhoto?: () => void;
  onNextPhoto?: () => void;
  onToggleMusic?: () => void;
  onUpload?: () => void;
  onSettings?: () => void;
  isViewerOpen?: boolean;
}

export function useKeyboardShortcuts(config: KeyboardShortcutsConfig) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
    
    if (isInput) return;

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        config.onEscape?.();
        break;
      case 'ArrowLeft':
        if (config.isViewerOpen) {
          e.preventDefault();
          config.onPrevPhoto?.();
        }
        break;
      case 'ArrowRight':
        if (config.isViewerOpen) {
          e.preventDefault();
          config.onNextPhoto?.();
        }
        break;
      case ' ':
        e.preventDefault();
        e.stopPropagation();
        config.onToggleMusic?.();
        break;
      case 'u':
      case 'U':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          config.onUpload?.();
        }
        break;
      case ',':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          config.onSettings?.();
        }
        break;
    }
  }, [config]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
