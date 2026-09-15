import { usePhotoStore } from './modules/photoStore';
import { useUiStore } from './modules/uiStore';

export const useStore = () => {
  const photoStore = usePhotoStore();
  const uiStore = useUiStore();
  
  return {
    ...photoStore,
    ...uiStore,
    
    get filteredPhotos() {
      return photoStore.getFilteredPhotos();
    },
    
    get photoCount() {
      return photoStore.photos.length;
    },
    
    get albumCount() {
      return photoStore.albums.length;
    },
    
    get tagCount() {
      return photoStore.tags.length;
    },
    
    openModal(modal: keyof typeof uiStore.modalStates) {
      uiStore.setModalState(modal, true);
    },
    
    closeModal(modal: keyof typeof uiStore.modalStates) {
      uiStore.setModalState(modal, false);
    },
    
    toggleModal(modal: keyof typeof uiStore.modalStates) {
      uiStore.setModalState(modal, !uiStore.modalStates[modal]);
    },
    
    showSuccess(message: string, duration = 3000) {
      uiStore.addNotification({ type: 'success', message, duration });
    },
    
    showError(message: string, duration = 5000) {
      uiStore.addNotification({ type: 'error', message, duration });
    },
    
    showWarning(message: string, duration = 4000) {
      uiStore.addNotification({ type: 'warning', message, duration });
    },
    
    showInfo(message: string, duration = 3000) {
      uiStore.addNotification({ type: 'info', message, duration });
    },
  };
};

export { usePhotoStore, useUiStore };

export type { PhotoStore } from './modules/photoStore';
export type { UiStore } from './modules/uiStore';
