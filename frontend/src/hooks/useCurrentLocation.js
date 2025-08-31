import { useState, useEffect } from 'react';
import api from '../services/api';

export const useCurrentLocation = (autoDetect = false) => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      const error = 'Geolocation is not supported by this browser.';
      setError(error);
      return null;
    }

    setLoading(true);
    setError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          // Create base location object
          const locationData = {
            address: {
              street: '',
              city: '',
              state: '',
              zipCode: '',
              country: 'USA'
            },
            coordinates: {
              latitude,
              longitude
            },
            timezone: 'America/New_York'
          };

          // Try to get address from coordinates (reverse geocoding via backend -> Google)
          try {
            const { data } = await api.get(`/location/reverse-geocode`, {
              params: { lat: latitude, lng: longitude }
            });
            
            if (data.success && data.location) {
              locationData.address = data.location.address;
              console.log('Reverse geocoding successful:', data.location);
            } else {
              console.log('Reverse geocoding returned no location data');
            }
          } catch (error) {
            console.error('Reverse geocoding failed:', error.response?.data || error);
            // Don't set error state, coordinates are still useful
          }

          // Try to get timezone
          try {
            const timezoneResponse = await fetch(
              `https://api.bigdatacloud.net/data/timezone-by-location?latitude=${latitude}&longitude=${longitude}`
            );
            
            if (timezoneResponse.ok) {
              const timezoneData = await timezoneResponse.json();
              locationData.timezone = timezoneData.ianaTimeId || 'America/New_York';
            }
          } catch (error) {
            console.log('Timezone detection failed:', error);
            // Keep default timezone
          }

          setLocation(locationData);
          setLoading(false);
          resolve(locationData);
        },
        (error) => {
          console.error('Error getting location:', error);
          let errorMessage = 'Unable to retrieve your location. ';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage += 'Please allow location access and try again.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage += 'Location information is unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage += 'Location request timed out.';
              break;
            default:
              errorMessage += 'An unknown error occurred.';
              break;
          }
          
          setError(errorMessage);
          setLoading(false);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  };

  // Auto-detect location on mount if requested
  useEffect(() => {
    if (autoDetect) {
      getCurrentLocation();
    }
  }, [autoDetect]);

  return {
    location,
    loading,
    error,
    getCurrentLocation,
    clearError: () => setError(null)
  };
};

export default useCurrentLocation; 