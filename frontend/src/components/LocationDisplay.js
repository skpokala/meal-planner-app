import React from 'react';
import { MapPin, Globe, Clock, Navigation } from 'lucide-react';

const LocationDisplay = ({ 
  location, 
  showInheritance = false, 
  useParentLocation = false,
  className = "",
  compact = false 
}) => {
  if (!location && !useParentLocation) {
    return null;
  }

  if (useParentLocation) {
    return (
      <div className={`flex items-center space-x-2 text-sm text-secondary-600 dark:text-secondary-400 ${className}`}>
        <MapPin className="w-4 h-4" />
        <span>Using primary user location</span>
      </div>
    );
  }

  // Check if location has any meaningful data
  const hasAddress = location?.address && (
    location.address.street || 
    location.address.city || 
    location.address.state || 
    location.address.zipCode
  );

  const hasCoordinates = location?.coordinates && (
    location.coordinates.latitude !== null && 
    location.coordinates.longitude !== null
  );

  if (!hasAddress && !hasCoordinates) {
    return (
      <div className={`flex items-center space-x-2 text-sm text-secondary-500 dark:text-secondary-400 ${className}`}>
        <MapPin className="w-4 h-4" />
        <span>No location specified</span>
      </div>
    );
  }

  const formatAddress = () => {
    if (!hasAddress) return null;
    
    const address = location.address;
    const parts = [
      address.street,
      address.city,
      address.state,
      address.zipCode,
      address.country !== 'USA' ? address.country : null
    ].filter(Boolean);
    
    return parts.join(', ');
  };

  const formatCoordinates = () => {
    if (!hasCoordinates) return null;
    const { latitude, longitude } = location.coordinates;
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  };

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 text-sm text-secondary-600 dark:text-secondary-400 ${className}`}>
        <MapPin className="w-4 h-4" />
        <span>{formatAddress() || formatCoordinates()}</span>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center space-x-2 mb-2">
        <MapPin className="w-5 h-5 text-primary-600" />
        <h4 className="text-md font-medium text-secondary-800 dark:text-secondary-200">
          Location
        </h4>
      </div>
      
      {hasAddress && (
        <div className="flex items-start space-x-2 text-sm">
          <Globe className="w-4 h-4 text-secondary-500 mt-0.5" />
          <div>
            <span className="text-secondary-700 dark:text-secondary-300">
              {formatAddress()}
            </span>
          </div>
        </div>
      )}

      {hasCoordinates && (
        <div className="flex items-center space-x-2 text-sm">
          <Navigation className="w-4 h-4 text-secondary-500" />
          <div>
            <span className="text-secondary-700 dark:text-secondary-300">
              {formatCoordinates()}
            </span>
          </div>
        </div>
      )}

      {location?.timezone && location.timezone !== 'America/New_York' && (
        <div className="flex items-center space-x-2 text-sm">
          <Clock className="w-4 h-4 text-secondary-500" />
          <div>
            <span className="text-secondary-700 dark:text-secondary-300">
              {location.timezone}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationDisplay; 