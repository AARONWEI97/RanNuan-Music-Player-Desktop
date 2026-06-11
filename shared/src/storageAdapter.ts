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
