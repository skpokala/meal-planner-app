import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Info } from 'lucide-react';

const Version = ({ sidebarCollapsed }) => {
  const [backendVersion, setBackendVersion] = useState(null);
  
  useEffect(() => {
    const fetchBackendVersion = async () => {
      try {
        const response = await api.get('/api/version');
        setBackendVersion(response.data.version);
      } catch (err) {
        console.error('Failed to fetch backend version:', err);
      }
    };
    
    fetchBackendVersion();
  }, []);

  const frontendVersion = process.env.REACT_APP_VERSION || 'dev';
  
  // Only show version if frontend and backend versions differ
  const shouldShowBothVersions = backendVersion && frontendVersion !== backendVersion;
  
  if (sidebarCollapsed) {
    return (
      <div 
        className="flex items-center justify-center w-full"
        title={shouldShowBothVersions ? `Frontend: v${frontendVersion}, Backend: v${backendVersion}` : `Version: v${frontendVersion}`}
      >
        <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center">
          <Info className="w-4 h-4 text-primary-600 dark:text-primary-400" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex items-center text-sm text-secondary-600 dark:text-secondary-400 min-w-0 w-full">
      <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center flex-shrink-0">
        <Info className="w-4 h-4 text-primary-600 dark:text-primary-400" />
      </div>
      <div className="ml-3 min-w-0 flex-1">
        <p className="font-medium text-secondary-900 dark:text-secondary-100 truncate text-xs">
          {shouldShowBothVersions ? (
            <span>Frontend: v{frontendVersion}</span>
          ) : (
            <span>Version: v{frontendVersion}</span>
          )}
        </p>
        {shouldShowBothVersions && (
          <p className="text-xs text-secondary-500 dark:text-secondary-400 truncate">
            Backend: v{backendVersion}
          </p>
        )}
      </div>
    </div>
  );
};

export default Version; 