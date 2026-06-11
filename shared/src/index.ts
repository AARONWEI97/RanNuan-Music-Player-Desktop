// ─── Storage Adapter (injected by platform) ───
export {
  setStorageAdapter,
  getStorageAdapter,
  type StorageAdapter,
} from './storageAdapter';

// ─── Types ───
export * from './types';

// ─── Constants ───
export * from './constants';

// ─── Utils ───
export * from './utils';

// ─── API ───
export {
  default as request,
  setApiBaseUrl,
  getApiBaseUrl,
  TOKEN_KEY,
} from './api/request';
export * from './api';

// ─── Store ───
export * from './store';

// ─── Services ───
export { musicParser, parseMusicUrl } from './services/musicParser';
export { SourceConfigManager, AVAILABLE_SOURCES } from './services/SongSourceConfigManager';
