import React, { useState } from 'react';
import { MapPin, Navigation, X, AlertCircle } from 'lucide-react';
import useCurrentLocation from '../hooks/useCurrentLocation';

const LocationPrompt = ({ 
  onLocationDetected, 
  onDismiss, 
  title = "Enable Location Services",
  description = "We can automatically fill in your location information to make setup easier."
}) => {
  const [dismissed, setDismissed] = useState(false);
  const { getCurrentLocation, loading, error } = useCurrentLocation();

  const handleGetLocation = async () => {
    const locationData = await getCurrentLocation();
    if (locationData && onLocationDetected) {
      onLocationDetected(locationData);
      handleDismiss();
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    if (onDismiss) {
      onDismiss();
    }
  };

  const handleNotNow = () => {
    // Store preference to not show again for this session
    sessionStorage.setItem('locationPromptDismissed', 'true');
    handleDismiss();
  };

  if (dismissed) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 border border-primary-200 dark:border-primary-700 rounded-lg p-4 mb-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <MapPin className="w-6 h-6 text-primary-600 dark:text-primary-400" />
        </div>
        
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-primary-800 dark:text-primary-200">
            {title}
          </h3>
          <p className="mt-1 text-sm text-primary-700 dark:text-primary-300">
            {description}
          </p>
          
          {error && (
            <div className="mt-2 flex items-center text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 mr-1" />
              {error}
            </div>
          )}
          
          <div className="mt-3 flex items-center space-x-3">
            <button
              type="button"
              onClick={handleGetLocation}
              disabled={loading}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-primary-700 bg-white hover:bg-primary-50 border border-primary-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed dark:bg-primary-800 dark:text-primary-200 dark:border-primary-600 dark:hover:bg-primary-700"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-2"></div>
                  Getting location...
                </>
              ) : (
                <>
                  <Navigation className="w-4 h-4 mr-1" />
                  Use Current Location
                </>
              )}
            </button>
            
            <button
              type="button"
              onClick={handleNotNow}
              className="text-sm text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
            >
              Not now
            </button>
          </div>
        </div>
        
        <div className="flex-shrink-0 ml-4">
          <button
            type="button"
            onClick={handleDismiss}
            className="text-primary-400 hover:text-primary-600 dark:text-primary-500 dark:hover:text-primary-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationPrompt; 