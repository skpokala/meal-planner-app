import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import useCurrentLocation from '../hooks/useCurrentLocation';
import { setClientLocation } from '../services/api';

const LocationContext = createContext();

export const useLocationContext = () => {
  const ctx = useContext(LocationContext);
  if (!ctx) {
    // Fallback no-op context for tests or components not wrapped by provider
    return {
      location: null,
      loading: false,
      error: null,
      isCaptured: false,
      capture: async () => null,
      clear: () => {},
      clearError: () => {},
    };
  }
  return ctx;
};

export const LocationProvider = ({ children }) => {
  const { location, loading, error, getCurrentLocation, clearError } = useCurrentLocation(false);
  const [isCaptured, setIsCaptured] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const attemptedAutoCaptureRef = useRef(false);

  // Load saved location from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('clientLocation');
      if (saved) {
        const parsed = JSON.parse(saved);
        setCurrentLocation(parsed);
        setIsCaptured(true);
        setClientLocation(parsed);
      } else if (!attemptedAutoCaptureRef.current) {
        // No saved location; attempt auto-capture once
        attemptedAutoCaptureRef.current = true;
        (async () => {
          const loc = await getCurrentLocation();
          if (loc) {
            setCurrentLocation(loc);
            setIsCaptured(true);
            setClientLocation(loc);
            localStorage.setItem('clientLocation', JSON.stringify(loc));
          }
        })();
      }
    } catch (_) {
      // Ignore parse errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync hook-provided location into our state and persist
  useEffect(() => {
    if (location) {
      setCurrentLocation(location);
      setIsCaptured(true);
      setClientLocation(location);
      try {
        localStorage.setItem('clientLocation', JSON.stringify(location));
      } catch (_) {}
    }
  }, [location]);

  const value = {
    location: currentLocation,
    loading,
    error,
    isCaptured,
    capture: async () => {
      const loc = await getCurrentLocation();
      if (loc) {
        setCurrentLocation(loc);
        setClientLocation(loc);
        setIsCaptured(true);
        try { localStorage.setItem('clientLocation', JSON.stringify(loc)); } catch (_) {}
      }
      return loc;
    },
    clear: () => {
      setCurrentLocation(null);
      setClientLocation(null);
      setIsCaptured(false);
      try { localStorage.removeItem('clientLocation'); } catch (_) {}
    },
    clearError,
  };

  return (
    <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
  );
};

export default LocationContext;


