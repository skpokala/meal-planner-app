// Utility functions for dispatching store-related events

export const dispatchStoreAdded = (store) => {
  const event = new CustomEvent('storeAdded', { detail: store });
  window.dispatchEvent(event);
};

export const dispatchStoreUpdated = (store) => {
  const event = new CustomEvent('storeUpdated', { detail: store });
  window.dispatchEvent(event);
};

export const dispatchStoreDeleted = (storeId) => {
  const event = new CustomEvent('storeDeleted', { detail: storeId });
  window.dispatchEvent(event);
};

export const dispatchStoreRefresh = () => {
  const event = new CustomEvent('storeRefresh');
  window.dispatchEvent(event);
}; 