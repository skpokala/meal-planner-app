import React, { useState, useEffect } from 'react';
import { Download, Database, Shield, Info, AlertTriangle, CheckCircle, Clock, HardDrive, Upload, FileText, Play, AlertCircle, CheckSquare } from 'lucide-react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

// Enhanced Console Component for Script Execution
const ScriptExecutionConsole = ({ results }) => {
  const isMongoScript = results.importResults?.type === 'mongodb_script';
  const hasOutput = results.importResults?.output && results.importResults.output.length > 0;
  
  // Generate console logs from different sources
  const generateConsoleLogs = () => {
    const logs = [];
    const timestamp = new Date().toLocaleTimeString();
    
    // Initial connection message
    if (isMongoScript) {
      logs.push({
        type: 'info',
        text: `mongosh 1.10.6 connecting to: mongodb://localhost:27017/meal_planner`,
        timestamp: timestamp,
        color: 'text-blue-400'
      });
      logs.push({
        type: 'info', 
        text: `Using MongoDB: 7.0.8`,
        timestamp: timestamp,
        color: 'text-yellow-300'
      });
      logs.push({
        type: 'separator',
        text: '──────────────────────────────────────────────────',
        color: 'text-secondary-500'
      });
    } else {
      logs.push({
        type: 'info',
        text: `Script Import Console - Starting execution...`,
        timestamp: timestamp,
        color: 'text-cyan-400'
      });
      logs.push({
        type: 'separator',
        text: '──────────────────────────────────────────────────',
        color: 'text-secondary-500'
      });
    }
    
    // Script execution start
    const scriptName = results.importResults?.scriptName || 'backup_script.js';
    logs.push({
      type: 'command',
      text: isMongoScript ? `load('/tmp/${scriptName}')` : `Executing: ${scriptName}`,
      timestamp: timestamp,
      color: 'text-cyan-400'
    });
    
    // Process output or show manual instructions
    if (hasOutput) {
      // Process script output
      results.importResults.output.forEach((line, index) => {
        const cleanLine = line.trim();
        if (!cleanLine) return;
        
        let logType = 'output';
        let color = 'text-gray-300';
        let prefix = '';
        
        if (cleanLine.includes('Error:') || cleanLine.includes('error:')) {
          logType = 'error';
          color = 'text-red-400';
          prefix = '❌ ';
        } else if (cleanLine.includes('version') || cleanLine.includes('MongoDB')) {
          logType = 'info';
          color = 'text-blue-400';
          prefix = 'ℹ️  ';
        } else if (cleanLine.includes('Processing') || cleanLine.includes('Found') || cleanLine.includes('Importing')) {
          logType = 'processing';
          color = 'text-yellow-300';
          prefix = '📊 ';
        } else if (cleanLine.includes('completed') || cleanLine.includes('success') || cleanLine.includes('Successfully')) {
          logType = 'success';
          color = 'text-green-400';
          prefix = '✅ ';
        } else if (cleanLine.includes('Total') || cleanLine.includes('Generated') || cleanLine.includes('Inserted')) {
          logType = 'stats';
          color = 'text-cyan-400';
          prefix = '📈 ';
        } else if (cleanLine.startsWith('//') || cleanLine.includes('backup script') || cleanLine.includes('comment')) {
          logType = 'comment';
          color = 'text-purple-400';
          prefix = '📝 ';
        }
        
        logs.push({
          type: logType,
          text: `${prefix}${cleanLine}`,
          color: color,
          timestamp: timestamp
        });
      });
    } else if (results.importResults?.totalImported !== undefined) {
      // JSON import results
      logs.push({
        type: 'processing',
        text: `📊 Processing JSON import...`,
        color: 'text-yellow-300'
      });
      logs.push({
        type: 'success',
        text: `✅ Successfully imported ${results.importResults.totalImported} records`,
        color: 'text-green-400'
      });
      if (results.importResults.collectionsUpdated) {
        results.importResults.collectionsUpdated.forEach(collection => {
          logs.push({
            type: 'stats',
            text: `📈 Updated collection: ${collection}`,
            color: 'text-cyan-400'
          });
        });
      }
    } else {
      logs.push({
        type: 'warning',
        text: '⚠️  No output received from script execution',
        color: 'text-yellow-400'
      });
    }
    
    // Execution completion
    logs.push({
      type: 'separator',
      text: '──────────────────────────────────────────────────',
      color: 'text-secondary-500'
    });
    
    const success = results.importResults?.success !== false;
    logs.push({
      type: success ? 'success' : 'error',
      text: `${success ? '✅' : '❌'} Script execution ${success ? 'completed successfully' : 'failed'}`,
      color: success ? 'text-green-400' : 'text-red-400',
      timestamp: results.executedAt || timestamp
    });
    
    return logs;
  };
  
  const consoleLogs = generateConsoleLogs();
  
  return (
    <div>
      <p className="font-medium text-secondary-900 dark:text-secondary-100 mb-3">
        Script Execution Console:
      </p>
      <div className="bg-black border border-secondary-300 dark:border-secondary-600 rounded-lg overflow-hidden font-mono text-sm">
        {/* Console Header */}
        <div className="bg-secondary-200 dark:bg-secondary-700 px-4 py-2 border-b border-secondary-300 dark:border-secondary-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <span className="text-sm text-secondary-600 dark:text-secondary-400 font-mono">
                {isMongoScript ? 'MongoDB Shell' : 'Script Import'} - Execution Console
              </span>
            </div>
            <div className="text-xs text-secondary-500">
              {new Date().toLocaleString()}
            </div>
          </div>
        </div>
        
        {/* Console Content */}
        <div className="p-4 max-h-96 overflow-y-auto">
          {consoleLogs.map((log, index) => (
            <div key={index} className={`py-0.5 ${log.type === 'separator' ? 'py-1' : ''}`}>
              {log.type === 'separator' ? (
                <div className={`${log.color} select-none`}>{log.text}</div>
              ) : log.type === 'command' ? (
                <div className="flex items-start">
                  <span className="text-green-400 mr-2 flex-shrink-0">
                    {isMongoScript ? 'meal_planner>' : '$'}
                  </span>
                  <span className={`${log.color} break-all`}>{log.text}</span>
                </div>
              ) : (
                <div className="flex items-start">
                  <span className="text-green-400 mr-2 flex-shrink-0">
                    {isMongoScript ? 'meal_planner>' : '$'}
                  </span>
                  <span className={`${log.color} break-all`}>{log.text}</span>
                  {log.timestamp && (
                    <span className="text-secondary-600 text-xs ml-auto flex-shrink-0 pl-2">
                      {log.timestamp}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
          
          {/* Show cursor */}
          <div className="flex items-center mt-2">
            <span className="text-green-400">
              {isMongoScript ? 'meal_planner>' : '$'}
            </span>
            <span className="ml-2 w-2 h-4 bg-green-400 animate-pulse"></span>
          </div>
        </div>
      </div>
      
      {/* Manual Instructions Section */}
      {/* Removed as scripts will now always execute directly */}
      
      {/* Additional Info/Notice */}
      {results.importResults?.notice && (
        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200 flex items-center">
            <Info className="w-4 h-4 mr-2" />
            {results.importResults.notice}
          </p>
        </div>
      )}
    </div>
  );
};

const BackupManagement = () => {
  const [databaseInfo, setDatabaseInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [activeTab, setActiveTab] = useState('generate');
  const [backupOptions, setBackupOptions] = useState({
    format: 'mongodb',
    collections: [],
    includeIndexes: true,
    includeData: true
  });
  const [importState, setImportState] = useState({
    file: null,
    validation: null,
    options: {
      clearExisting: false,
      createBackup: true
    },
    confirmed: false,
    results: null
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

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setImportState(prev => ({
        ...prev,
        file,
        validation: null,
        confirmed: false,
        results: null
      }));
    }
  };

  const validateScript = async () => {
    if (!importState.file) {
      toast.error('Please select a script file first');
      return;
    }

    try {
      setValidating(true);
      const formData = new FormData();
      formData.append('script', importState.file);

      const response = await api.post('/backup/validate-script', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setImportState(prev => ({
        ...prev,
        validation: response.data.data
      }));

      if (response.data.data.validation.isValid) {
        toast.success('Script validation completed successfully');
      } else {
        toast.error('Script validation failed - see details below');
      }

    } catch (error) {
      console.error('Error validating script:', error);
      toast.error('Failed to validate script');
      setImportState(prev => ({
        ...prev,
        validation: {
          validation: {
            isValid: false,
            errors: ['Failed to validate script: ' + (error.response?.data?.message || error.message)],
            warnings: []
          }
        }
      }));
    } finally {
      setValidating(false);
    }
  };

  const executeImport = async () => {
    if (!importState.file || !importState.validation || !importState.confirmed) {
      toast.error('Please complete validation and confirm the import');
      return;
    }

    try {
      setImporting(true);
      
      const formData = new FormData();
      formData.append('script', importState.file);
      formData.append('confirmed', 'true');
      formData.append('options', JSON.stringify(importState.options));

      const response = await api.post('/backup/import-script', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const results = response.data.data || response.data;
      
      setImportState(prev => ({
        ...prev,
        results: results
      }));

      if (response.data.success) {
        toast.success('Script imported successfully!');
        // Refresh database info to reflect changes
        fetchDatabaseInfo();
      } else {
        toast.error('Script import completed with errors - see details below');
      }

    } catch (error) {
      console.error('Error importing script:', error);
      const errorMessage = error.response?.data?.message || error.message;
      
      toast.error(`Failed to import script: ${errorMessage}`);
      
      setImportState(prev => ({
        ...prev,
        results: {
          importResults: {
            success: false,
            errors: [errorMessage],
            totalImported: 0,
            collections: {}
          }
        }
      }));
    } finally {
      setImporting(false);
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

  const resetImportState = () => {
    setImportState({
      file: null,
      validation: null,
      options: {
        clearExisting: false,
        createBackup: true
      },
      confirmed: false,
      results: null
    });
    // Reset file input
    const fileInput = document.getElementById('script-file-input');
    if (fileInput) {
      fileInput.value = '';
    }
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
              Generate, import, and manage database backup scripts with version compatibility
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-secondary-800 shadow rounded-lg">
        <div className="border-b border-secondary-200 dark:border-secondary-700">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('generate')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'generate'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-secondary-500 hover:text-secondary-700 dark:text-secondary-400 dark:hover:text-secondary-200'
              }`}
            >
              <Download className="w-4 h-4 inline mr-2" />
              Generate Scripts
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'import'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-secondary-500 hover:text-secondary-700 dark:text-secondary-400 dark:hover:text-secondary-200'
              }`}
            >
              <Upload className="w-4 h-4 inline mr-2" />
              Import Scripts
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'generate' && (
            <div className="space-y-6">
              {/* Database Overview */}
              <div>
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
              <div>
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
          )}

          {activeTab === 'import' && (
            <div className="space-y-6">
              {/* File Upload Section */}
              <div>
                <h2 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-4">
                  Upload Script File
                </h2>
                
                <div className="border-2 border-dashed border-secondary-300 dark:border-secondary-600 rounded-lg p-6">
                  <div className="text-center">
                    <FileText className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
                    <div className="space-y-2">
                      <p className="text-sm text-secondary-600 dark:text-secondary-400">
                        Upload a backup script (.js or .json file)
                      </p>
                      <div className="flex items-center justify-center space-x-2">
                        <input
                          id="script-file-input"
                          type="file"
                          accept=".js,.json"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                        <label
                          htmlFor="script-file-input"
                          className="cursor-pointer bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          Choose File
                        </label>
                        {importState.file && (
                          <button
                            onClick={resetImportState}
                            className="text-secondary-500 hover:text-secondary-700 text-sm"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {importState.file && (
                    <div className="mt-4 p-4 bg-secondary-50 dark:bg-secondary-700 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <FileText className="w-5 h-5 text-secondary-500" />
                          <div>
                            <p className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
                              {importState.file.name}
                            </p>
                            <p className="text-xs text-secondary-500">
                              {formatBytes(importState.file.size)} • {importState.file.type || 'Unknown type'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={validateScript}
                          disabled={validating}
                          className="btn-secondary text-sm"
                        >
                          {validating ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2"></div>
                              Validating...
                            </>
                          ) : (
                            <>
                              <CheckSquare className="w-3 h-3 mr-2" />
                              Validate
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Validation Results */}
              {importState.validation && (
                <div>
                  <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-4">
                    Validation Results
                  </h3>
                  
                  <div className={`border rounded-lg p-4 ${
                    importState.validation.validation.isValid
                      ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                      : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                  }`}>
                    <div className="flex items-center mb-3">
                      {importState.validation.validation.isValid ? (
                        <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                      )}
                      <h4 className={`font-medium ${
                        importState.validation.validation.isValid
                          ? 'text-green-800 dark:text-green-200'
                          : 'text-red-800 dark:text-red-200'
                      }`}>
                        {importState.validation.validation.isValid ? 'Script is Valid' : 'Script Validation Failed'}
                      </h4>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-secondary-600 dark:text-secondary-400">Type:</span>
                          <span className="ml-2 font-medium text-secondary-900 dark:text-secondary-100">
                            {importState.validation.type.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <span className="text-secondary-600 dark:text-secondary-400">Size:</span>
                          <span className="ml-2 font-medium text-secondary-900 dark:text-secondary-100">
                            {formatBytes(importState.validation.size)}
                          </span>
                        </div>
                        {importState.validation.validation.metadata?.version && (
                          <div>
                            <span className="text-secondary-600 dark:text-secondary-400">Version:</span>
                            <span className="ml-2 font-medium text-secondary-900 dark:text-secondary-100">
                              {importState.validation.validation.metadata.version}
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="text-secondary-600 dark:text-secondary-400">Uploaded:</span>
                          <span className="ml-2 font-medium text-secondary-900 dark:text-secondary-100">
                            {new Date(importState.validation.uploadedAt).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                      
                      {importState.validation.validation.errors.length > 0 && (
                        <div>
                          <p className="font-medium text-red-800 dark:text-red-200 mb-2">Errors:</p>
                          <ul className="list-disc list-inside space-y-1 text-sm text-red-700 dark:text-red-300">
                            {importState.validation.validation.errors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {importState.validation.validation.warnings.length > 0 && (
                        <div>
                          <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">Warnings:</p>
                          <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
                            {importState.validation.validation.warnings.map((warning, index) => (
                              <li key={index}>{warning}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Import Options */}
              {importState.validation && importState.validation.validation.isValid && (
                <div>
                  <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-4">
                    Import Options
                  </h3>
                  
                  <div className="bg-secondary-50 dark:bg-secondary-700 rounded-lg p-4 space-y-4">
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={importState.options.createBackup}
                          onChange={(e) => setImportState(prev => ({
                            ...prev,
                            options: { ...prev.options, createBackup: e.target.checked }
                          }))}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                        />
                        <span className="ml-2 text-sm text-secondary-700 dark:text-secondary-300">
                          Create backup before import (recommended)
                        </span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={importState.options.clearExisting}
                          onChange={(e) => setImportState(prev => ({
                            ...prev,
                            options: { ...prev.options, clearExisting: e.target.checked }
                          }))}
                          className="h-4 w-4 text-red-600 focus:ring-red-500 border-secondary-300 rounded"
                        />
                        <span className="ml-2 text-sm text-red-700 dark:text-red-300">
                          Clear existing data before import (destructive operation)
                        </span>
                      </label>

                      {/* MongoDB Script Execution Option - Now always enabled for admin users */}
                      {importState.validation.type === 'mongodb' && (
                        <div className="border-t border-secondary-200 dark:border-secondary-600 pt-3">
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <p className="text-sm text-blue-800 dark:text-blue-200 flex items-center">
                              <CheckCircle className="w-4 h-4 mr-2" />
                              MongoDB scripts will be executed automatically in the container environment
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="border-t border-secondary-200 dark:border-secondary-600 pt-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={importState.confirmed}
                          onChange={(e) => setImportState(prev => ({ ...prev, confirmed: e.target.checked }))}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                        />
                        <span className="ml-2 text-sm font-medium text-secondary-900 dark:text-secondary-100">
                          I confirm that I want to execute this script and understand the risks
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Execute Button */}
              {importState.validation && importState.validation.validation.isValid && (
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={resetImportState}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={executeImport}
                    disabled={!importState.confirmed || importing}
                    className="btn-primary"
                  >
                    {importing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Importing...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Execute Import
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Import Results */}
              {importState.results && (
                <div>
                  <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-4">
                    Import Results
                  </h3>
                  
                  {/* Regular import results for all script executions */}
                  <div className={`border rounded-lg p-4 ${
                    importState.results.importResults?.success
                      ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                      : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                  }`}>
                    <div className="flex items-center mb-3">
                      {importState.results.importResults?.success ? (
                        <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                      )}
                      <h4 className={`font-medium ${
                        importState.results.importResults?.success
                          ? 'text-green-800 dark:text-green-200'
                          : 'text-red-800 dark:text-red-200'
                      }`}>
                        {importState.results.importResults?.success ? 'Import Successful' : 'Import Failed'}
                        {importState.results.importResults?.type === 'mongodb_script' && ' (MongoDB Script)'}
                      </h4>
                    </div>
                    
                    <div className="space-y-3">
                      {/* Enhanced Console View for All Script Types */}
                      {importState.results ? (
                        <ScriptExecutionConsole results={importState.results} />
                      ) : (
                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                          <p className="text-yellow-800 dark:text-yellow-200">
                            ⚠️ No results to display. Execute a script to see the console output.
                          </p>
                        </div>
                      )}
                      
                      {/* Regular import statistics */}
                      {importState.results.importResults?.totalImported !== undefined && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-secondary-600 dark:text-secondary-400">Total Imported:</span>
                            <span className="ml-2 font-medium text-secondary-900 dark:text-secondary-100">
                              {importState.results.importResults.totalImported}
                            </span>
                          </div>
                          <div>
                            <span className="text-secondary-600 dark:text-secondary-400">Collections:</span>
                            <span className="ml-2 font-medium text-secondary-900 dark:text-secondary-100">
                              {Object.keys(importState.results.importResults.collections || {}).length}
                            </span>
                          </div>
                          <div>
                            <span className="text-secondary-600 dark:text-secondary-400">Executed At:</span>
                            <span className="ml-2 font-medium text-secondary-900 dark:text-secondary-100">
                              {importState.results.executedAt ? new Date(importState.results.executedAt).toLocaleString() : 'N/A'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Information Panel */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 mr-3 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                      Import Safety Information
                    </h3>
                    <div className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                      <p>• Only import scripts from trusted sources</p>
                      <p>• JSON exports can be imported directly through the web interface</p>
                      <p>• MongoDB scripts will be executed automatically in the container environment</p>
                      <p>• Always create a backup before importing data</p>
                      <p>• Test imports in a development environment first</p>
                      <p>• Clear existing data option will permanently delete current data</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BackupManagement; 