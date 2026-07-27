/**
 * Abstract storage adapter — injected by the platform at runtime.
 * Mobile uses AsyncStorage, Desktop uses localStorage.
 */

export interface StorageAdapter {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  getAllKeys: () => Promise<string[]>;
  multiRemove: (keys: string[]) => Promise<void>;
}

let globalStorageAdapter: StorageAdapter | null = null;

export function setStorageAdapter(adapter: StorageAdapter) {
  globalStorageAdapter = adapter;
}

export function getStorageAdapter(): StorageAdapter {
  if (!globalStorageAdapter) {
    throw new Error(
      'Storage adapter not set. Call setStorageAdapter() before using stores.'
    );
  }
  return globalStorageAdapter;
}

/**
 * 给 zustand `createJSONStorage` 用的惰性适配器。
 *
 * 为什么必须惰性：`createJSONStorage(getStorage)` 会在 **模块求值那一刻**
 * 立即调用 `getStorage()`，并且 `catch` 掉异常后返回 `undefined`
 * （见 zustand/esm/middleware.mjs L278-284）。而 `@shared` 的 barrel
 * 会连带求值 `./store`，此时平台层还没来得及调用 `setStorageAdapter`，
 * 于是 `getStorageAdapter()` 抛错 → storage 变 undefined → persist
 * **永久静默失效**，控制台只剩 "storage is currently unavailable"。
 *
 * 这里返回一个永远不抛的稳定对象，把适配器的解析推迟到每次真实读写时；
 * 适配器尚未注册时按「空存储」处理，注册后自动生效。
 */
export const lazyStorageAdapter: StorageAdapter = {
  async getItem(key) {
    return globalStorageAdapter ? globalStorageAdapter.getItem(key) : null;
  },
  async setItem(key, value) {
    if (globalStorageAdapter) await globalStorageAdapter.setItem(key, value);
  },
  async removeItem(key) {
    if (globalStorageAdapter) await globalStorageAdapter.removeItem(key);
  },
  async getAllKeys() {
    return globalStorageAdapter ? globalStorageAdapter.getAllKeys() : [];
  },
  async multiRemove(keys) {
    if (globalStorageAdapter) await globalStorageAdapter.multiRemove(keys);
  },
};
