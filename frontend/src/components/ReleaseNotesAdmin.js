import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Edit, Calendar, User, Eye, Github } from 'lucide-react';
import api from '../services/api';

const ReleaseNotesAdmin = ({ isOpen, onClose, editingRelease = null }) => {
  const [formData, setFormData] = useState({
    version: '',
    title: '',
    content: '',
    type: 'patch',
    author: '',
    showModal: true,
    features: [],
    bugFixes: [],
    improvements: [],
    githubPullRequests: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (editingRelease) {
      setFormData({
        version: editingRelease.version || '',
        title: editingRelease.title || '',
        content: editingRelease.content || '',
        type: editingRelease.type || 'patch',
        author: editingRelease.author || '',
        showModal: editingRelease.showModal !== undefined ? editingRelease.showModal : true,
        features: editingRelease.features || [],
        bugFixes: editingRelease.bugFixes || [],
        improvements: editingRelease.improvements || [],
        githubPullRequests: editingRelease.githubPullRequests || []
      });
    } else {
      resetForm();
    }
  }, [editingRelease]);

  const resetForm = () => {
    setFormData({
      version: '',
      title: '',
      content: '',
      type: 'patch',
      author: '',
      showModal: true,
      features: [],
      bugFixes: [],
      improvements: [],
      githubPullRequests: []
    });
    setError(null);
    setSuccess(null);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleArrayItemChange = (arrayName, index, field, value) => {
    setFormData(prev => ({
      ...prev,
      [arrayName]: prev[arrayName].map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const addArrayItem = (arrayName) => {
    const newItem = arrayName === 'githubPullRequests' 
      ? { number: '', title: '', url: '' }
      : { type: '', description: '' };
    
    setFormData(prev => ({
      ...prev,
      [arrayName]: [...prev[arrayName], newItem]
    }));
  };

  const removeArrayItem = (arrayName, index) => {
    setFormData(prev => ({
      ...prev,
      [arrayName]: prev[arrayName].filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const endpoint = editingRelease 
        ? `/release-notes/${editingRelease._id}`
        : '/release-notes';
      
      const method = editingRelease ? 'put' : 'post';
      
      const response = await api[method](endpoint, formData);
      
      if (response.data.success) {
        setSuccess(`Release notes ${editingRelease ? 'updated' : 'created'} successfully!`);
        if (!editingRelease) {
          resetForm();
        }
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } catch (err) {
      console.error('Error saving release notes:', err);
      setError(err.response?.data?.message || 'Failed to save release notes');
    } finally {
      setLoading(false);
    }
  };

  const renderArraySection = (arrayName, title, fields) => (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        <button
          type="button"
          onClick={() => addArrayItem(arrayName)}
          className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2 inline" />
          Add {title.slice(0, -1)}
        </button>
      </div>

      {/* Items */}
      <div className="space-y-4">
        {formData[arrayName].map((item, index) => (
          <div key={index} className="bg-gray-50 dark:bg-secondary-700 p-4 rounded-lg border border-gray-200 dark:border-secondary-600">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">{title.slice(0, -1)} {index + 1}</h4>
              <button
                type="button"
                onClick={() => removeArrayItem(arrayName, index)}
                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            
            <div className="grid grid-cols-1 gap-3">
              {fields.map((field) => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {field.label}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      value={item[field.name] || ''}
                      onChange={(e) => handleArrayItemChange(arrayName, index, field.name, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-secondary-700 dark:text-gray-100"
                      rows="2"
                      placeholder={field.placeholder}
                    />
                  ) : (
                    <input
                      type={field.type || 'text'}
                      value={item[field.name] || ''}
                      onChange={(e) => handleArrayItemChange(arrayName, index, field.name, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-secondary-700 dark:text-gray-100"
                      placeholder={field.placeholder}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        
        {formData[arrayName].length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>No {title.toLowerCase()} added yet.</p>
            <p className="text-sm">Click "Add {title.slice(0, -1)}" to get started.</p>
          </div>
        )}
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">
                {editingRelease ? 'Edit Release Notes' : 'Create Release Notes'}
              </h2>
              <p className="text-blue-100 mt-1">
                {editingRelease ? `Editing v${editingRelease.version}` : 'Add a new release with features, fixes, and improvements'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          {/* Success/Error Messages */}
          {success && (
            <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-400 px-4 py-3 rounded">
              {success}
            </div>
          )}
          
          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-400 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Version *
              </label>
              <input
                type="text"
                name="version"
                value={formData.version}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-secondary-700 dark:text-gray-100"
                placeholder="e.g., 1.2.0"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Release Type *
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-secondary-700 dark:text-gray-100"
                required
              >
                <option value="patch">Patch</option>
                <option value="minor">Minor</option>
                <option value="major">Major</option>
                <option value="hotfix">Hotfix</option>
              </select>
            </div>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-secondary-700 dark:text-gray-100"
              placeholder="e.g., New Features and Bug Fixes"
              required
            />
          </div>

          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Content *
            </label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-secondary-700 dark:text-gray-100"
              rows="4"
              placeholder="Describe the main highlights of this release..."
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Author
              </label>
              <input
                type="text"
                name="author"
                value={formData.author}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-secondary-700 dark:text-gray-100"
                placeholder="Leave empty to use current user"
              />
            </div>
            
            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="showModal"
                  checked={formData.showModal}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Show modal popup to users
                </span>
              </label>
            </div>
          </div>

          {/* Features */}
          <div className="mb-8">
            {renderArraySection('features', 'Features', [
              { name: 'type', label: 'Feature Type', placeholder: 'e.g., User Interface, Performance' },
              { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Describe the feature...' }
            ])}
          </div>

          {/* Bug Fixes */}
          <div className="mb-8">
            {renderArraySection('bugFixes', 'Bug Fixes', [
              { name: 'type', label: 'Bug Type', placeholder: 'e.g., Authentication, Data Sync' },
              { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Describe the bug fix...' }
            ])}
          </div>

          {/* Improvements */}
          <div className="mb-8">
            {renderArraySection('improvements', 'Improvements', [
              { name: 'type', label: 'Improvement Type', placeholder: 'e.g., Performance, UX' },
              { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Describe the improvement...' }
            ])}
          </div>

          {/* GitHub Pull Requests */}
          <div className="mb-8">
            {renderArraySection('githubPullRequests', 'GitHub Pull Requests', [
              { name: 'number', label: 'PR Number', type: 'number', placeholder: 'e.g., 123' },
              { name: 'url', label: 'PR URL', placeholder: 'https://github.com/...' }
            ])}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-600">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {editingRelease ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {editingRelease ? 'Update Release' : 'Create Release'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReleaseNotesAdmin; 