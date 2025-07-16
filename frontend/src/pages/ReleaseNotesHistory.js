import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Tag, 
  Wrench, 
  Zap, 
  Bug, 
  Calendar, 
  User, 
  Eye, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter,
  ChevronLeft,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import api from '../services/api';
import ReleaseNotesModal from '../components/ReleaseNotesModal';
import ReleaseNotesAdmin from '../components/ReleaseNotesAdmin';
import LoadingSpinner from '../components/LoadingSpinner';

const ReleaseNotesHistory = () => {
  const { user } = useAuth();
  const [releaseNotes, setReleaseNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [selectedRelease, setSelectedRelease] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRelease, setEditingRelease] = useState(null);

  const itemsPerPage = 10;

  useEffect(() => {
    fetchReleaseNotes();
  }, [currentPage, typeFilter, searchTerm]);

  const fetchReleaseNotes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString()
      });
      
      if (typeFilter) params.append('type', typeFilter);
      if (searchTerm) params.append('version', searchTerm);
      
      const response = await api.get(`/release-notes?${params}`);
      const { docs, total, pages } = response.data.data;
      
      setReleaseNotes(docs);
      setTotalResults(total);
      setTotalPages(pages);
    } catch (err) {
      console.error('Error fetching release notes:', err);
      setError('Failed to load release notes');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchReleaseNotes();
  };

  const handleTypeFilter = (type) => {
    setTypeFilter(type);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleViewRelease = (release) => {
    setSelectedRelease(release);
    setShowModal(true);
  };

  const handleDeleteRelease = async (releaseId) => {
    if (!window.confirm('Are you sure you want to delete this release note?')) {
      return;
    }

    try {
      await api.delete(`/release-notes/${releaseId}`);
      fetchReleaseNotes();
    } catch (err) {
      console.error('Error deleting release note:', err);
      alert('Failed to delete release note');
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
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700';
      case 'minor':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700';
      case 'patch':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700';
      case 'hotfix':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-700';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getSummaryText = (release) => {
    const totalChanges = (release.features?.length || 0) + 
                        (release.bugFixes?.length || 0) + 
                        (release.improvements?.length || 0);
    
    if (totalChanges === 0) return 'No detailed changes listed';
    
    const parts = [];
    if (release.features?.length > 0) parts.push(`${release.features.length} features`);
    if (release.bugFixes?.length > 0) parts.push(`${release.bugFixes.length} bug fixes`);
    if (release.improvements?.length > 0) parts.push(`${release.improvements.length} improvements`);
    
    return parts.join(', ');
  };

  const renderPagination = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3 py-2 mx-1 rounded ${
            i === currentPage
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          {i}
        </button>
      );
    }
    
    return (
      <div className="flex items-center justify-center mt-6 space-x-2">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex items-center px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous
        </button>
        
        {pages}
        
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex items-center px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Release Notes History</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Browse all release notes and updates for the Family Meal Planner
          </p>
        </div>
        {user?.role === 'admin' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Release Note
          </button>
        )}
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <form onSubmit={handleSearch} className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by version..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
          </form>
          
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            <select
              value={typeFilter}
              onChange={(e) => handleTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">All Types</option>
              <option value="major">Major</option>
              <option value="minor">Minor</option>
              <option value="patch">Patch</option>
              <option value="hotfix">Hotfix</option>
            </select>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {totalResults} release{totalResults !== 1 ? 's' : ''} found
          </span>
          <div className="flex space-x-2">
            {['major', 'minor', 'patch', 'hotfix'].map((type) => (
              <button
                key={type}
                onClick={() => handleTypeFilter(typeFilter === type ? '' : type)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  typeFilter === type
                    ? getReleaseTypeColor(type)
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {getReleaseTypeIcon(type)}
                <span className="ml-1">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Release Notes List */}
      {error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      ) : releaseNotes.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
          <Tag className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">No release notes found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {releaseNotes.map((release) => (
            <div
              key={release._id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getReleaseTypeIcon(release.type)}
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getReleaseTypeColor(release.type)}`}>
                        {release.type.toUpperCase()}
                      </span>
                      <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        v{release.version}
                      </span>
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                      {release.title}
                    </h3>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(release.releaseDate)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <User className="w-4 h-4" />
                        <span>{release.author}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Eye className="w-4 h-4" />
                        <span>{release.viewCount} views</span>
                      </div>
                    </div>
                    
                    <p className="text-gray-700 dark:text-gray-300 mb-3 line-clamp-3">
                      {release.content.length > 200 
                        ? `${release.content.substring(0, 200)}...` 
                        : release.content}
                    </p>
                    
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Changes:</span> {getSummaryText(release)}
                    </div>
                    
                    {release.githubPullRequests && release.githubPullRequests.length > 0 && (
                      <div className="mt-3 flex items-center space-x-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Related PRs:</span>
                        {release.githubPullRequests.slice(0, 3).map((pr, index) => (
                          <a
                            key={index}
                            href={pr.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-xs text-gray-700 dark:text-gray-300 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            #{pr.number}
                          </a>
                        ))}
                        {release.githubPullRequests.length > 3 && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            +{release.githubPullRequests.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleViewRelease(release)}
                      className="flex items-center px-3 py-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </button>
                    {user?.role === 'admin' && (
                      <>
                        <button
                          onClick={() => {
                            setEditingRelease(release);
                            setShowCreateModal(true);
                          }}
                          className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteRelease(release._id)}
                          className="flex items-center px-3 py-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && renderPagination()}

      {/* Release Notes Modal */}
      {showModal && selectedRelease && (
        <ReleaseNotesModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedRelease(null);
          }}
          releaseNotes={[selectedRelease]}
        />
      )}

      {/* Admin Modal */}
      {showCreateModal && (
        <ReleaseNotesAdmin
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setEditingRelease(null);
            fetchReleaseNotes();
          }}
          editingRelease={editingRelease}
        />
      )}
    </div>
  );
};

export default ReleaseNotesHistory; 