import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const StoresContext = createContext();

export const useStores = () => {
  const context = useContext(StoresContext);
  if (!context) {
    throw new Error('useStores must be used within a StoresProvider');
  }
  return context;
};

export const StoresProvider = ({ children }) => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState(null);

  // Fetch stores from API
  const fetchStores = useCallback(async (force = false) => {
    // Avoid refetching if we've fetched recently (within 5 seconds) unless forced
    if (!force && lastFetch && Date.now() - lastFetch < 5000) {
      return stores;
    }

    try {
      setLoading(true);
      const response = await api.get('/ingredients/stores/list');
      if (response.data.success) {
        setStores(response.data.stores);
        setLastFetch(Date.now());
        return response.data.stores;
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
      // Don't show toast error here as it might be called from multiple places
    } finally {
      setLoading(false);
    }
    return stores;
  }, [stores, lastFetch]);

  // Add a new store to the context
  const addStore = useCallback((newStore) => {
    setStores(prev => [...prev, newStore]);
    setLastFetch(Date.now());
  }, []);

  // Update an existing store in the context
  const updateStore = useCallback((updatedStore) => {
    setStores(prev => 
      prev.map(store => 
        store._id === updatedStore._id ? updatedStore : store
      )
    );
    setLastFetch(Date.now());
  }, []);

  // Remove a store from the context
  const removeStore = useCallback((storeId) => {
    setStores(prev => prev.filter(store => store._id !== storeId));
    setLastFetch(Date.now());
  }, []);

  // Listen for custom store events
  useEffect(() => {
    const handleStoreAdded = (event) => {
      const newStore = event.detail;
      addStore(newStore);
    };

    const handleStoreUpdated = (event) => {
      const updatedStore = event.detail;
      updateStore(updatedStore);
    };

    const handleStoreDeleted = (event) => {
      const storeId = event.detail;
      removeStore(storeId);
    };

    const handleStoreRefresh = () => {
      fetchStores(true);
    };

    // Add event listeners
    window.addEventListener('storeAdded', handleStoreAdded);
    window.addEventListener('storeUpdated', handleStoreUpdated);
    window.addEventListener('storeDeleted', handleStoreDeleted);
    window.addEventListener('storeRefresh', handleStoreRefresh);

    // Cleanup event listeners
    return () => {
      window.removeEventListener('storeAdded', handleStoreAdded);
      window.removeEventListener('storeUpdated', handleStoreUpdated);
      window.removeEventListener('storeDeleted', handleStoreDeleted);
      window.removeEventListener('storeRefresh', handleStoreRefresh);
    };
  }, [addStore, updateStore, removeStore, fetchStores]);

  // Initial fetch on mount
  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const value = {
    stores,
    loading,
    fetchStores,
    addStore,
    updateStore,
    removeStore,
    lastFetch
  };

  return (
    <StoresContext.Provider value={value}>
      {children}
    </StoresContext.Provider>
  );
}; 