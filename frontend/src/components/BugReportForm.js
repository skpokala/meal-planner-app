import React, { useState, useEffect } from 'react';
import { Bug, AlertCircle, Send, X, Plus, Minus, Monitor, Smartphone, Tablet } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const BugReportForm = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    stepsToReproduce: '',
    expectedBehavior: '',
    actualBehavior: '',
    priority: 'medium',
    severity: 'moderate',
    category: 'functionality',
    environment: {
      browser: '',
      browserVersion: '',
      operatingSystem: '',
      deviceType: 'desktop',
      screenResolution: '',
      appVersion: ''
    },
    tags: []
  });
  const [tagInput, setTagInput] = useState('');

  // Auto-detect environment information
  useEffect(() => {
    if (isOpen) {
      const detectEnvironment = () => {
        const userAgent = navigator.userAgent;
        const screen = window.screen;
        
        // Detect browser
        let browser = 'Unknown';
        let browserVersion = '';
        
        if (userAgent.includes('Chrome')) {
          browser = 'Chrome';
          const chromeMatch = userAgent.match(/Chrome\/(\d+\.\d+)/);
          browserVersion = chromeMatch ? chromeMatch[1] : '';
        } else if (userAgent.includes('Firefox')) {
          browser = 'Firefox';
          const firefoxMatch = userAgent.match(/Firefox\/(\d+\.\d+)/);
          browserVersion = firefoxMatch ? firefoxMatch[1] : '';
        } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
          browser = 'Safari';
          const safariMatch = userAgent.match(/Version\/(\d+\.\d+)/);
          browserVersion = safariMatch ? safariMatch[1] : '';
        } else if (userAgent.includes('Edge')) {
          browser = 'Edge';
          const edgeMatch = userAgent.match(/Edge\/(\d+\.\d+)/);
          browserVersion = edgeMatch ? edgeMatch[1] : '';
        }
        
        // Detect OS
        let operatingSystem = 'Unknown';
        if (userAgent.includes('Windows')) operatingSystem = 'Windows';
        else if (userAgent.includes('Mac')) operatingSystem = 'macOS';
        else if (userAgent.includes('Linux')) operatingSystem = 'Linux';
        else if (userAgent.includes('Android')) operatingSystem = 'Android';
        else if (userAgent.includes('iOS')) operatingSystem = 'iOS';
        
        // Detect device type
        let deviceType = 'desktop';
        if (/Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
          deviceType = /iPad|Tablet/i.test(userAgent) ? 'tablet' : 'mobile';
        }
        
        // Get screen resolution
        const screenResolution = `${screen.width}x${screen.height}`;
        
        setFormData(prev => ({
          ...prev,
          environment: {
            browser,
            browserVersion,
            operatingSystem,
            deviceType,
            screenResolution,
            appVersion: process.env.REACT_APP_VERSION || '1.0.0'
          }
        }));
      };
      
      detectEnvironment();
    }
  }, [isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('environment.')) {
      const envField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        environment: {
          ...prev.environment,
          [envField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim().toLowerCase())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim().toLowerCase()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error('Please fill in the title and description');
      return;
    }

    setLoading(true);

    try {
      // Clean up the form data - convert empty strings to null for optional fields
      const cleanedFormData = {
        ...formData,
        stepsToReproduce: formData.stepsToReproduce.trim() || null,
        expectedBehavior: formData.expectedBehavior.trim() || null,
        actualBehavior: formData.actualBehavior.trim() || null,
        environment: {
          ...formData.environment,
          browser: formData.environment.browser.trim() || null,
          browserVersion: formData.environment.browserVersion.trim() || null,
          operatingSystem: formData.environment.operatingSystem.trim() || null,
          screenResolution: formData.environment.screenResolution.trim() || null,
          appVersion: formData.environment.appVersion.trim() || null
        },
        tags: formData.tags.length > 0 ? formData.tags : []
      };

      console.log('Submitting bug report with data:', cleanedFormData);
      const response = await api.post('/bugs', cleanedFormData);
      
      if (response.data.success) {
        toast.success('Bug report submitted successfully!');
        
        // Reset form
        setFormData({
          title: '',
          description: '',
          stepsToReproduce: '',
          expectedBehavior: '',
          actualBehavior: '',
          priority: 'medium',
          severity: 'moderate',
          category: 'functionality',
          environment: {
            browser: '',
            browserVersion: '',
            operatingSystem: '',
            deviceType: 'desktop',
            screenResolution: '',
            appVersion: ''
          },
          tags: []
        });
        
        if (onSuccess) onSuccess(response.data.data);
        if (onClose) onClose();
      }
    } catch (error) {
      console.error('Error submitting bug report:', error);
      
      // Handle validation errors with specific field messages
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        const validationErrors = error.response.data.errors;
        const fieldErrors = validationErrors.map(err => {
          const field = err.path || err.param || 'field';
          const message = err.msg || err.message || 'Invalid value';
          return `${field}: ${message}`;
        }).join(', ');
        
        toast.error(`Validation failed: ${fieldErrors}`);
      } else {
        const errorMessage = error.response?.data?.message || 'Failed to submit bug report';
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'blocker': return 'text-red-600 bg-red-50 border-red-200';
      case 'major': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'moderate': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'minor': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getDeviceIcon = (deviceType) => {
    switch (deviceType) {
      case 'mobile': return <Smartphone className="w-4 h-4" />;
      case 'tablet': return <Tablet className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-secondary-200 dark:border-secondary-700">
          <div className="flex items-center">
            <Bug className="w-6 h-6 text-primary-600 mr-3" />
            <h2 className="text-xl font-semibold text-secondary-900 dark:text-secondary-100">
              Report a Bug
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-secondary-500 hover:text-secondary-700 dark:text-secondary-400 dark:hover:text-secondary-200"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100">
              Basic Information
            </h3>
            
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                Bug Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Brief description of the issue"
                className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-secondary-700 dark:text-secondary-100"
                maxLength={200}
                required
              />
              <div className="text-xs text-secondary-500 mt-1">
                {formData.title.length}/200 characters
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                Description *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Detailed description of the bug..."
                rows={4}
                className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-secondary-700 dark:text-secondary-100"
                maxLength={2000}
                required
              />
              <div className="text-xs text-secondary-500 mt-1">
                {formData.description.length}/2000 characters
              </div>
            </div>

            {/* Category, Priority, Severity */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Category
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-secondary-700 dark:text-secondary-100"
                >
                  <option value="ui">UI/Visual</option>
                  <option value="functionality">Functionality</option>
                  <option value="performance">Performance</option>
                  <option value="security">Security</option>
                  <option value="data">Data</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Priority
                </label>
                <select
                  id="priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${getPriorityColor(formData.priority)}`}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label htmlFor="severity" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Severity
                </label>
                <select
                  id="severity"
                  name="severity"
                  value={formData.severity}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${getSeverityColor(formData.severity)}`}
                >
                  <option value="minor">Minor</option>
                  <option value="moderate">Moderate</option>
                  <option value="major">Major</option>
                  <option value="blocker">Blocker</option>
                </select>
              </div>
            </div>
          </div>

          {/* Detailed Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100">
              Detailed Information
            </h3>

            {/* Steps to Reproduce */}
            <div>
              <label htmlFor="stepsToReproduce" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                Steps to Reproduce
              </label>
              <textarea
                id="stepsToReproduce"
                name="stepsToReproduce"
                value={formData.stepsToReproduce}
                onChange={handleInputChange}
                placeholder="1. Go to...&#10;2. Click on...&#10;3. See error..."
                rows={3}
                className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-secondary-700 dark:text-secondary-100"
                maxLength={1000}
              />
              <div className="text-xs text-secondary-500 mt-1">
                {formData.stepsToReproduce.length}/1000 characters
              </div>
            </div>

            {/* Expected vs Actual Behavior */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="expectedBehavior" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Expected Behavior
                </label>
                <textarea
                  id="expectedBehavior"
                  name="expectedBehavior"
                  value={formData.expectedBehavior}
                  onChange={handleInputChange}
                  placeholder="What should happen..."
                  rows={3}
                  className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-secondary-700 dark:text-secondary-100"
                  maxLength={500}
                />
                <div className="text-xs text-secondary-500 mt-1">
                  {formData.expectedBehavior.length}/500 characters
                </div>
              </div>

              <div>
                <label htmlFor="actualBehavior" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Actual Behavior
                </label>
                <textarea
                  id="actualBehavior"
                  name="actualBehavior"
                  value={formData.actualBehavior}
                  onChange={handleInputChange}
                  placeholder="What actually happens..."
                  rows={3}
                  className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-secondary-700 dark:text-secondary-100"
                  maxLength={500}
                />
                <div className="text-xs text-secondary-500 mt-1">
                  {formData.actualBehavior.length}/500 characters
                </div>
              </div>
            </div>
          </div>

          {/* Environment Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100 flex items-center">
              Environment Information
              <span className="ml-2 text-xs text-secondary-500">(Auto-detected)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label htmlFor="environment.browser" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Browser
                </label>
                <input
                  type="text"
                  id="environment.browser"
                  name="environment.browser"
                  value={formData.environment.browser}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-secondary-700 dark:text-secondary-100"
                />
              </div>

              <div>
                <label htmlFor="environment.browserVersion" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Browser Version
                </label>
                <input
                  type="text"
                  id="environment.browserVersion"
                  name="environment.browserVersion"
                  value={formData.environment.browserVersion}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-secondary-700 dark:text-secondary-100"
                />
              </div>

              <div>
                <label htmlFor="environment.operatingSystem" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Operating System
                </label>
                <input
                  type="text"
                  id="environment.operatingSystem"
                  name="environment.operatingSystem"
                  value={formData.environment.operatingSystem}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-secondary-700 dark:text-secondary-100"
                />
              </div>

              <div>
                <label htmlFor="environment.deviceType" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Device Type
                </label>
                <select
                  id="environment.deviceType"
                  name="environment.deviceType"
                  value={formData.environment.deviceType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-secondary-700 dark:text-secondary-100"
                >
                  <option value="desktop">Desktop</option>
                  <option value="tablet">Tablet</option>
                  <option value="mobile">Mobile</option>
                </select>
              </div>

              <div>
                <label htmlFor="environment.screenResolution" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Screen Resolution
                </label>
                <input
                  type="text"
                  id="environment.screenResolution"
                  name="environment.screenResolution"
                  value={formData.environment.screenResolution}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-secondary-700 dark:text-secondary-100"
                />
              </div>

              <div>
                <label htmlFor="environment.appVersion" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  App Version
                </label>
                <input
                  type="text"
                  id="environment.appVersion"
                  name="environment.appVersion"
                  value={formData.environment.appVersion}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-secondary-700 dark:text-secondary-100"
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100">
              Tags (Optional)
            </h3>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Add a tag..."
                className="flex-1 px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-secondary-700 dark:text-secondary-100"
                maxLength={50}
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                aria-label="Add tag"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200 rounded-full text-sm"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-2 text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
                      aria-label="Remove tag"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Warning */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                  Before submitting
                </h4>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• Please search existing bugs to avoid duplicates</li>
                  <li>• Include as much detail as possible for faster resolution</li>
                  <li>• Screenshots or videos can be helpful (you can add them in comments later)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-secondary-200 dark:border-secondary-700">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-secondary-700 dark:text-secondary-300 hover:text-secondary-900 dark:hover:text-secondary-100 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.title.trim() || !formData.description.trim()}
              className="px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-secondary-400 text-white rounded-lg transition-colors flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Bug Report
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BugReportForm; 