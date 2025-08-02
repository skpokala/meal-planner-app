import React, { useState } from 'react';
import { MapPin, Globe, Clock, Navigation, Loader } from 'lucide-react';

const LocationInput = ({ 
  location = {}, 
  onChange, 
  showInheritanceOption = false,
  useParentLocation = true,
  onInheritanceChange,
  label = "Location",
  className = ""
}) => {
  const [loadingLocation, setLoadingLocation] = useState(false);

  const handleAddressChange = (field, value) => {
    onChange({
      ...location,
      address: {
        ...location.address,
        [field]: value
      }
    });
  };

  const handleCoordinatesChange = (field, value) => {
    const numValue = value === '' ? null : parseFloat(value);
    onChange({
      ...location,
      coordinates: {
        ...location.coordinates,
        [field]: numValue
      }
    });
  };

  const handleTimezoneChange = (value) => {
    onChange({
      ...location,
      timezone: value
    });
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    setLoadingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Update coordinates immediately
        const updatedLocation = {
          ...location,
          coordinates: {
            latitude,
            longitude
          }
        };

        // Try to get address from coordinates (reverse geocoding)
        try {
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          
          if (response.ok) {
            const data = await response.json();
            updatedLocation.address = {
              ...location.address,
              street: data.locality || location.address?.street || '',
              city: data.city || location.address?.city || '',
              state: data.principalSubdivision || location.address?.state || '',
              zipCode: data.postcode || location.address?.zipCode || '',
              country: data.countryCode || location.address?.country || 'USA'
            };
          }
        } catch (error) {
          console.log('Reverse geocoding failed, coordinates only:', error);
          // Don't show error to user, coordinates are still useful
        }

        // Determine timezone based on coordinates
        try {
          const timezoneResponse = await fetch(
            `https://api.bigdatacloud.net/data/timezone-by-location?latitude=${latitude}&longitude=${longitude}`
          );
          
          if (timezoneResponse.ok) {
            const timezoneData = await timezoneResponse.json();
            updatedLocation.timezone = timezoneData.ianaTimeId || location.timezone || 'America/New_York';
          }
        } catch (error) {
          console.log('Timezone detection failed:', error);
          // Keep existing timezone
        }

        onChange(updatedLocation);
        setLoadingLocation(false);
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
        
        alert(errorMessage);
        setLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  const commonTimezones = [
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Phoenix', label: 'Arizona Time (MST)' },
    { value: 'America/Anchorage', label: 'Alaska Time (AKST)' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
    { value: 'UTC', label: 'UTC' }
  ];

  const countries = [
    { value: 'USA', label: 'United States' },
    { value: 'Canada', label: 'Canada' },
    { value: 'Mexico', label: 'Mexico' },
    { value: 'UK', label: 'United Kingdom' },
    { value: 'Australia', label: 'Australia' },
    { value: 'Germany', label: 'Germany' },
    { value: 'France', label: 'France' },
    { value: 'Japan', label: 'Japan' },
    { value: 'Other', label: 'Other' }
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <MapPin className="w-5 h-5 text-primary-600" />
          <h4 className="text-md font-medium text-secondary-800 dark:text-secondary-200">
            {label}
          </h4>
        </div>
        
        {/* Current Location Button */}
        {(!showInheritanceOption || !useParentLocation) && (
          <button
            type="button"
            onClick={getCurrentLocation}
            disabled={loadingLocation}
            className="flex items-center space-x-2 px-3 py-1 text-sm bg-primary-100 hover:bg-primary-200 text-primary-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Get current location"
          >
            {loadingLocation ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Navigation className="w-4 h-4" />
            )}
            <span>{loadingLocation ? 'Getting location...' : 'Use Current Location'}</span>
          </button>
        )}
      </div>

      {/* Inheritance Option */}
      {showInheritanceOption && (
        <div className="mb-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={useParentLocation}
              onChange={(e) => onInheritanceChange && onInheritanceChange(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-secondary-700 dark:text-secondary-300">
              Use same location as primary user
            </span>
          </label>
        </div>
      )}

      {/* Only show location fields if not using parent location */}
      {(!showInheritanceOption || !useParentLocation) && (
        <>
          {/* Address Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                Street Address
              </label>
              <input
                type="text"
                value={location.address?.street || ''}
                onChange={(e) => handleAddressChange('street', e.target.value)}
                placeholder="123 Main St"
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                City
              </label>
              <input
                type="text"
                value={location.address?.city || ''}
                onChange={(e) => handleAddressChange('city', e.target.value)}
                placeholder="New York"
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                State/Province
              </label>
              <input
                type="text"
                value={location.address?.state || ''}
                onChange={(e) => handleAddressChange('state', e.target.value)}
                placeholder="NY"
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                ZIP/Postal Code
              </label>
              <input
                type="text"
                value={location.address?.zipCode || ''}
                onChange={(e) => handleAddressChange('zipCode', e.target.value)}
                placeholder="10001"
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                <Globe className="w-4 h-4 inline mr-1" />
                Country
              </label>
              <select
                value={location.address?.country || 'USA'}
                onChange={(e) => handleAddressChange('country', e.target.value)}
                className="input"
              >
                {countries.map(country => (
                  <option key={country.value} value={country.value}>
                    {country.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                <Clock className="w-4 h-4 inline mr-1" />
                Timezone
              </label>
              <select
                value={location.timezone || 'America/New_York'}
                onChange={(e) => handleTimezoneChange(e.target.value)}
                className="input"
              >
                {commonTimezones.map(timezone => (
                  <option key={timezone.value} value={timezone.value}>
                    {timezone.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* GPS Coordinates (Optional) */}
          <div className="border-t border-secondary-200 dark:border-secondary-700 pt-4">
            <h5 className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-3">
              GPS Coordinates 
              {location.coordinates?.latitude && location.coordinates?.longitude && (
                <span className="text-green-600 dark:text-green-400 ml-2">✓ Detected</span>
              )}
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  min="-90"
                  max="90"
                  value={location.coordinates?.latitude || ''}
                  onChange={(e) => handleCoordinatesChange('latitude', e.target.value)}
                  placeholder="40.7128"
                  className="input"
                />
                <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
                  Range: -90 to 90
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  min="-180"
                  max="180"
                  value={location.coordinates?.longitude || ''}
                  onChange={(e) => handleCoordinatesChange('longitude', e.target.value)}
                  placeholder="-74.0060"
                  className="input"
                />
                <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
                  Range: -180 to 180
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LocationInput; 