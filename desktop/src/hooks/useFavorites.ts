import { useSyncExternalStore } from 'react'
import { getFavorites, isFavorite, subscribeFavorites } from '@/store/favoritesStore'

export function useFavorites() {
  return useSyncExternalStore(subscribeFavorites, getFavorites)
}

export function useIsFavorite(id?: string | number) {
  return useSyncExternalStore(subscribeFavorites, () => id !== undefined && isFavorite(id))
}
