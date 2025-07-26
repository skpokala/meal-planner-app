import React, { useState, useEffect } from 'react';
import { Download, Database, Shield, Info, AlertTriangle, CheckCircle, Clock, HardDrive } from 'lucide-react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

const BackupManagement = () => {
  const [databaseInfo, setDatabaseInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [backupOptions, setBackupOptions] = useState({
    format: 'mongodb',
    collections: [],
    includeIndexes: true,
    includeData: true
  });

  useEffect(() => {
    fetchDatabaseInfo();
  }, []);

  const fetchDatabaseInfo = async () => {
    try {
      setLoading(true);
      const response = await api.get('/backup/database-info');
      setDatabaseInfo(response.data.data);
    } catch (error) {
      console.error('Error fetching database info:', error);
      toast.error('Failed to load database information');
    } finally {
      setLoading(false);
    }
  };

  const generateBackupScript = async () => {
    try {
      setGenerating(true);
      
      const response = await api.post('/backup/generate-script', backupOptions, {
        responseType: 'blob'
      });
      
      // Create download link
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from response headers or use default
      const contentDisposition = response.headers['content-disposition'];
      let filename = `meal-planner-backup-${new Date().toISOString().split('T')[0]}`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      } else {
        filename += backupOptions.format === 'json' ? '.json' : '.js';
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`Backup script generated successfully: ${filename}`);
      
    } catch (error) {
      console.error('Error generating backup script:', error);
      toast.error('Failed to generate backup script');
    } finally {
      setGenerating(false);
    }
  };

  const handleCollectionToggle = (collection) => {
    setBackupOptions(prev => ({
      ...prev,
      collections: prev.collections.includes(collection)
        ? prev.collections.filter(c => c !== collection)
        : [...prev.collections, collection]
    }));
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCollectionIcon = (collection) => {
    const icons = {
      User: Shield,
      FamilyMember: Shield,
      Meal: HardDrive,
      MealPlan: HardDrive,
      Ingredient: HardDrive,
      Store: HardDrive,
      Bug: AlertTriangle,
      Audit: Info
    };
    return icons[collection] || Database;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        <span className="ml-3 text-secondary-600 dark:text-secondary-400">Loading database information...</span>
      </div>
    );
  }

  if (!databaseInfo) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-2">
          Unable to Load Database Information
        </h3>
        <p className="text-secondary-600 dark:text-secondary-400 mb-4">
          There was an error retrieving database information.
        </p>
        <button
          onClick={fetchDatabaseInfo}
          className="btn-primary"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-secondary-800 shadow rounded-lg p-6">
        <div className="flex items-center">
          <Database className="w-8 h-8 text-primary-600 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
              Database Backup Management
            </h1>
            <p className="text-secondary-600 dark:text-secondary-400 mt-1">
              Generate and download database backup scripts with version compatibility
            </p>
          </div>
        </div>
      </div>

      {/* Database Overview */}
      <div className="bg-white dark:bg-secondary-800 shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-4">
          Database Overview
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-secondary-50 dark:bg-secondary-700 p-4 rounded-lg">
            <div className="flex items-center">
              <Database className="w-5 h-5 text-blue-500 mr-2" />
              <div>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">App Version</p>
                <p className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
                  {databaseInfo.appVersion}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-secondary-50 dark:bg-secondary-700 p-4 rounded-lg">
            <div className="flex items-center">
              <HardDrive className="w-5 h-5 text-green-500 mr-2" />
              <div>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">Total Documents</p>
                <p className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
                  {databaseInfo.totalDocuments.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-secondary-50 dark:bg-secondary-700 p-4 rounded-lg">
            <div className="flex items-center">
              <Shield className="w-5 h-5 text-purple-500 mr-2" />
              <div>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">MongoDB</p>
                <p className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
                  {databaseInfo.mongodb.version}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-secondary-50 dark:bg-secondary-700 p-4 rounded-lg">
            <div className="flex items-center">
              <Clock className="w-5 h-5 text-orange-500 mr-2" />
              <div>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">Last Updated</p>
                <p className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
                  {new Date(databaseInfo.timestamp).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Collections Overview */}
        <div>
          <h3 className="text-md font-medium text-secondary-900 dark:text-secondary-100 mb-3">
            Collections
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(databaseInfo.collections).map(([collection, stats]) => {
              const IconComponent = getCollectionIcon(collection);
              return (
                <div
                  key={collection}
                  className="flex items-center justify-between p-3 bg-secondary-50 dark:bg-secondary-700 rounded-lg"
                >
                  <div className="flex items-center">
                    <IconComponent className="w-4 h-4 text-secondary-500 mr-3" />
                    <div>
                      <p className="font-medium text-secondary-900 dark:text-secondary-100">
                        {collection}
                      </p>
                      <p className="text-sm text-secondary-600 dark:text-secondary-400">
                        {stats.count} documents
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {stats.hasData ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-secondary-300 dark:bg-secondary-600" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Backup Configuration */}
      <div className="bg-white dark:bg-secondary-800 shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-4">
          Backup Configuration
        </h2>
        
        <div className="space-y-6">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              Export Format
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="relative">
                <input
                  type="radio"
                  value="mongodb"
                  checked={backupOptions.format === 'mongodb'}
                  onChange={(e) => setBackupOptions(prev => ({ ...prev, format: e.target.value }))}
                  className="sr-only"
                />
                <div className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                  backupOptions.format === 'mongodb'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-secondary-200 dark:border-secondary-600'
                }`}>
                  <div className="flex items-center">
                    <Database className="w-5 h-5 text-primary-600 mr-3" />
                    <div>
                      <p className="font-medium text-secondary-900 dark:text-secondary-100">
                        MongoDB Script
                      </p>
                      <p className="text-sm text-secondary-600 dark:text-secondary-400">
                        Executable JavaScript for MongoDB shell
                      </p>
                    </div>
                  </div>
                </div>
              </label>
              
              <label className="relative">
                <input
                  type="radio"
                  value="json"
                  checked={backupOptions.format === 'json'}
                  onChange={(e) => setBackupOptions(prev => ({ ...prev, format: e.target.value }))}
                  className="sr-only"
                />
                <div className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                  backupOptions.format === 'json'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-secondary-200 dark:border-secondary-600'
                }`}>
                  <div className="flex items-center">
                    <HardDrive className="w-5 h-5 text-primary-600 mr-3" />
                    <div>
                      <p className="font-medium text-secondary-900 dark:text-secondary-100">
                        JSON Export
                      </p>
                      <p className="text-sm text-secondary-600 dark:text-secondary-400">
                        Structured data with metadata
                      </p>
                    </div>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Options */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-3">
              Backup Options
            </label>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={backupOptions.includeIndexes}
                  onChange={(e) => setBackupOptions(prev => ({ ...prev, includeIndexes: e.target.checked }))}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                />
                <span className="ml-2 text-sm text-secondary-700 dark:text-secondary-300">
                  Include database indexes
                </span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={backupOptions.includeData}
                  onChange={(e) => setBackupOptions(prev => ({ ...prev, includeData: e.target.checked }))}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                />
                <span className="ml-2 text-sm text-secondary-700 dark:text-secondary-300">
                  Include data (recommended)
                </span>
              </label>
            </div>
          </div>

          {/* Collection Selection */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-3">
              Collections to Backup
              <span className="text-xs text-secondary-500 ml-2">(Leave empty to backup all)</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(databaseInfo.collections).map(([collection, stats]) => (
                <label key={collection} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={backupOptions.collections.includes(collection)}
                    onChange={() => handleCollectionToggle(collection)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                  />
                  <span className="ml-2 text-sm text-secondary-700 dark:text-secondary-300">
                    {collection} ({stats.count})
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Information Panel */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex">
          <Info className="w-5 h-5 text-blue-500 mr-3 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
              Backup Information
            </h3>
            <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <p>• Generated scripts include version compatibility checks</p>
              <p>• MongoDB scripts can be executed directly in MongoDB shell</p>
              <p>• JSON exports include metadata for restoration validation</p>
              <p>• Always test backups in a development environment first</p>
              <p>• Backup scripts preserve ObjectIds and maintain data relationships</p>
            </div>
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <div className="flex justify-end">
        <button
          onClick={generateBackupScript}
          disabled={generating}
          className="btn-primary"
        >
          {generating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Generating...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Generate Backup Script
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default BackupManagement; 