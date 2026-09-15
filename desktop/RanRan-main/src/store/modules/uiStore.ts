import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppSettings, Theme } from '../../types';
import { defaultSettings, defaultThemes, mergeAppSettings } from '../../types';
import type { GradientName } from '../../styles/theme';

interface UiState {
  settings: AppSettings;
  currentTheme: Theme;
  currentGradient?: GradientName;
  sidebarOpen: boolean;
  modalStates: {
    upload: boolean;
    settings: boolean;
    tags: boolean;
    viewer: boolean;
  };
  notifications: NotificationItem[];
}

export interface NotificationItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: number;
  duration?: number;
}

interface UiActions {
  updateSettings: (updates: Partial<AppSettings>) => void;
  setTheme: (themeId: string) => void;
  setGradient: (gradient?: GradientName) => void;
  setSidebarOpen: (open: boolean) => void;
  setModalState: (modal: keyof UiState['modalStates'], open: boolean) => void;
  addNotification: (notification: Omit<NotificationItem, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
}

export type UiStore = UiState & UiActions;

export const useUiStore = create<UiStore>()(
  persist(
    (set, get) => ({
      // State
      settings: mergeAppSettings(defaultSettings),
      currentTheme: defaultThemes[0],
      sidebarOpen: false,
      modalStates: {
        upload: false,
        settings: false,
        tags: false,
        viewer: false,
      },
      notifications: [],

      // Actions
      updateSettings: (updates: Partial<AppSettings>) => {
        set((state) => {
          const newSettings = mergeAppSettings({ ...state.settings, ...updates });
          const newTheme = updates.theme || newSettings.theme || state.currentTheme;
          return {
            settings: newSettings,
            currentTheme: newTheme,
          };
        });
      },

      setTheme: (themeId: string) => {
        const theme = defaultThemes.find(t => t.id === themeId) || defaultThemes[0];
        set((state) => ({
          currentTheme: theme,
          settings: mergeAppSettings({ ...state.settings, theme }),
        }));
      },

      setGradient: (gradient?: GradientName) => {
        set({ currentGradient: gradient });
      },

      setSidebarOpen: (open: boolean) => {
        set({ sidebarOpen: open });
      },

      setModalState: (modal: keyof UiState['modalStates'], open: boolean) => {
        set((state) => ({
          modalStates: { ...state.modalStates, [modal]: open },
        }));
      },

      addNotification: (notification) => {
        const newNotification: NotificationItem = {
          id: Math.random().toString(36).substr(2, 9),
          ...notification,
          timestamp: Date.now(),
        };
        
        set((state) => ({
          notifications: [...state.notifications, newNotification],
        }));

        // Auto remove notification after duration
        if (notification.duration) {
          setTimeout(() => {
            get().removeNotification(newNotification.id);
          }, notification.duration);
        }
      },

      removeNotification: (id: string) => {
        set((state) => ({
          notifications: state.notifications.filter(n => n.id !== id),
        }));
      },

      clearNotifications: () => {
        set({ notifications: [] });
      },

      showSuccess: (message: string, duration?: number) => {
        get().addNotification({ type: 'success', message, duration: duration ?? 3000 });
      },

      showError: (message: string, duration?: number) => {
        get().addNotification({ type: 'error', message, duration: duration ?? 5000 });
      },

      showWarning: (message: string, duration?: number) => {
        get().addNotification({ type: 'warning', message, duration: duration ?? 4000 });
      },

      showInfo: (message: string, duration?: number) => {
        get().addNotification({ type: 'info', message, duration: duration ?? 3000 });
      },
    }),
    {
      name: 'ranran-ui-storage',
      version: 2,
      partialize: (state) => ({
        settings: state.settings,
        currentTheme: state.currentTheme,
        currentGradient: state.currentGradient,
      }),
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Partial<UiStore>;
        const settings = mergeAppSettings(state.settings);
        // v1 的自动旋转从未接到 OrbitControls，沿用旧值会突然让镜头转起来。
        if (version < 2) {
          settings.autoRotate = false;
        }
        // 返回形状必须与 partialize 一致：settings / currentTheme / currentGradient
        return {
          settings,
          currentTheme: state.currentTheme || settings.theme,
          currentGradient: state.currentGradient,
        };
      },
      merge: (persisted, current) => {
        const incoming = (persisted ?? {}) as Partial<UiStore>;
        return {
          ...current,
          ...incoming,
          settings: mergeAppSettings(incoming.settings),
          currentTheme: incoming.currentTheme || incoming.settings?.theme || current.currentTheme,
        };
      },
    }
  )
);