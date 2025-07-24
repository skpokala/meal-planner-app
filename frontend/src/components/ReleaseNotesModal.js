import React, { useState, useEffect } from 'react';
import { X, Tag, Wrench, Zap, Bug, Calendar, User, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../services/api';

const ReleaseNotesModal = ({ isOpen, onClose, releaseNotes: initialReleaseNotes }) => {
  const [releaseNotes, setReleaseNotes] = useState(initialReleaseNotes || []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const currentRelease = releaseNotes[currentIndex];

  useEffect(() => {
    if (isOpen && !initialReleaseNotes) {
      fetchUnviewedReleaseNotes();
    }
  }, [isOpen, initialReleaseNotes]);

  const fetchUnviewedReleaseNotes = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/release-notes/unviewed');
      setReleaseNotes(response.data.data);
    } catch (err) {
      console.error('Error fetching unviewed release notes:', err);
      setError('Failed to load release notes');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsViewed = async (releaseId) => {
    try {
      await api.post(`/release-notes/${releaseId}/mark-viewed`);
    } catch (err) {
      console.error('Error marking release as viewed:', err);
    }
  };

  const handleClose = async () => {
    if (currentRelease) {
      await handleMarkAsViewed(currentRelease._id);
    }
    onClose();
  };

  const handleNext = async () => {
    if (currentRelease) {
      await handleMarkAsViewed(currentRelease._id);
    }
    
    if (currentIndex < releaseNotes.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const getReleaseTypeIcon = (type) => {
    switch (type) {
      case 'major':
        return <Zap className="w-4 h-4 text-red-500" />;
      case 'minor':
        return <Tag className="w-4 h-4 text-blue-500" />;
      case 'patch':
        return <Wrench className="w-4 h-4 text-green-500" />;
      case 'hotfix':
        return <Bug className="w-4 h-4 text-orange-500" />;
      default:
        return <Tag className="w-4 h-4 text-gray-500" />;
    }
  };

  const getReleaseTypeColor = (type) => {
    switch (type) {
      case 'major':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
      case 'minor':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
      case 'patch':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800';
      case 'hotfix':
        return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="release-notes-title"
        className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden"
      >
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-300">Loading release notes...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <div className="text-red-500 mb-2">
              <X className="w-8 h-8 mx-auto" />
            </div>
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={onClose}
              aria-label="Close release notes modal"
              className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        ) : releaseNotes.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 dark:text-gray-500 mb-2">
              <Tag className="w-8 h-8 mx-auto" />
            </div>
            <p className="text-gray-600 dark:text-gray-300">No new release notes available</p>
            <button
              onClick={onClose}
              aria-label="Close release notes modal"
              className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    {getReleaseTypeIcon(currentRelease.type)}
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${getReleaseTypeColor(currentRelease.type)}`}>
                      {currentRelease.type.toUpperCase()}
                    </span>
                    <span className="text-sm opacity-90">v{currentRelease.version}</span>
                  </div>
                  <h2 id="release-notes-title" className="text-2xl font-bold mb-2">{currentRelease.title}</h2>
                  <div className="flex items-center space-x-4 text-sm opacity-90">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(currentRelease.releaseDate)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <User className="w-4 h-4" />
                      <span>{currentRelease.author}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  aria-label="Close release notes modal"
                  className="text-white hover:text-gray-300 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Progress indicator */}
            {releaseNotes.length > 1 && (
              <div className="bg-gray-50 dark:bg-secondary-700 px-6 py-2 border-b border-gray-200 dark:border-secondary-600">
                <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-300">
                  <span>Release {currentIndex + 1} of {releaseNotes.length}</span>
                  <div className="flex space-x-1">
                    {releaseNotes.map((_, index) => (
                      <div
                        key={index}
                        className={`w-2 h-2 rounded-full ${
                          index === currentIndex ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {/* Main content */}
              <div className="prose prose-sm max-w-none mb-6 text-gray-800 dark:text-gray-200">
                <div dangerouslySetInnerHTML={{ __html: currentRelease.content.replace(/\n/g, '<br />') }} />
              </div>

              {/* Features, Bug Fixes, and Improvements */}
              <div className="space-y-6">
                {currentRelease.features && currentRelease.features.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-green-700 dark:text-green-400 mb-3 flex items-center">
                      <Zap className="w-5 h-5 mr-2" />
                      New Features
                    </h3>
                    <ul className="space-y-2">
                      {currentRelease.features.map((feature, index) => (
                        <li key={index} className="flex items-start">
                          <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                          <div>
                            <span className="font-medium text-gray-900 dark:text-gray-100">{feature.type}</span>
                            {feature.description && (
                              <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">{feature.description}</p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {currentRelease.bugFixes && currentRelease.bugFixes.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-3 flex items-center">
                      <Bug className="w-5 h-5 mr-2" />
                      Bug Fixes
                    </h3>
                    <ul className="space-y-2">
                      {currentRelease.bugFixes.map((fix, index) => (
                        <li key={index} className="flex items-start">
                          <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                          <div>
                            <span className="font-medium text-gray-900 dark:text-gray-100">{fix.type}</span>
                            {fix.description && (
                              <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">{fix.description}</p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {currentRelease.improvements && currentRelease.improvements.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-400 mb-3 flex items-center">
                      <Wrench className="w-5 h-5 mr-2" />
                      Improvements
                    </h3>
                    <ul className="space-y-2">
                      {currentRelease.improvements.map((improvement, index) => (
                        <li key={index} className="flex items-start">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                          <div>
                            <span className="font-medium text-gray-900 dark:text-gray-100">{improvement.type}</span>
                            {improvement.description && (
                              <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">{improvement.description}</p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* GitHub links */}
              {currentRelease.githubPullRequests && currentRelease.githubPullRequests.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Related Pull Requests:</h4>
                  <div className="flex flex-wrap gap-2">
                    {currentRelease.githubPullRequests.map((pr, index) => (
                      <a
                        key={index}
                        href={pr.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-2 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded text-xs text-gray-700 dark:text-gray-300 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        #{pr.number}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 dark:bg-secondary-700 px-6 py-4 flex justify-between items-center border-t border-gray-200 dark:border-secondary-600">
              <div className="flex space-x-2">
                {releaseNotes.length > 1 && currentIndex > 0 && (
                  <button
                    onClick={handlePrevious}
                    className="flex items-center px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </button>
                )}
              </div>
              
              <div className="flex space-x-2">
                {releaseNotes.length > 1 && currentIndex < releaseNotes.length - 1 ? (
                  <button
                    onClick={handleNext}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 transition-colors"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                ) : (
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 transition-colors"
                  >
                    Got it!
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ReleaseNotesModal; 