import React, { useState, useEffect } from 'react';
import { 
  Bug, 
  Search, 
  Filter, 
  MoreVertical, 
  Eye, 
  Edit, 
  Trash2, 
  AlertCircle, 
  Clock, 
  User, 
  Tag,
  MessageSquare,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Download
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import BugReportForm from '../components/BugReportForm';

const BugManagement = () => {
  const { user } = useAuth();
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState(null);
  const [selectedBug, setSelectedBug] = useState(null);
  const [showBugForm, setShowBugForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filters and pagination
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: '',
    category: '',
    assignedTo: '',
    startDate: '',
    endDate: ''
  });
  const [pagination, setPagination] = useState({
    current: 1,
    total: 1,
    hasNext: false,
    hasPrev: false,
    totalRecords: 0
  });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Fetch bugs
  const fetchBugs = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        sortBy,
        sortOrder,
        ...Object.fromEntries(
          Object.entries(filters).filter(([key, value]) => value && value.trim())
        )
      });

      const response = await api.get(`/bugs?${params}`);
      
      if (response.data.success) {
        setBugs(response.data.data.bugs);
        setPagination(response.data.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching bugs:', error);
      toast.error('Failed to fetch bugs');
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics (admin only)
  const fetchStatistics = async () => {
    if (user?.role !== 'admin' && user?.role !== 'system_admin') return;
    
    try {
      const response = await api.get('/bugs/statistics');
      if (response.data.success) {
        setStatistics(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  useEffect(() => {
    fetchBugs();
    fetchStatistics();
  }, [filters, sortBy, sortOrder]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const updateBugStatus = async (bugId, status, resolutionNotes = '') => {
    try {
      const response = await api.put(`/bugs/${bugId}`, {
        status,
        resolutionNotes
      });

      if (response.data.success) {
        toast.success('Bug status updated successfully');
        fetchBugs(pagination.current);
        fetchStatistics();
      }
    } catch (error) {
      console.error('Error updating bug status:', error);
      toast.error('Failed to update bug status');
    }
  };

  const assignBug = async (bugId, assignedTo) => {
    try {
      const response = await api.put(`/bugs/${bugId}`, {
        assignedTo: assignedTo || null
      });

      if (response.data.success) {
        toast.success('Bug assignment updated successfully');
        fetchBugs(pagination.current);
      }
    } catch (error) {
      console.error('Error assigning bug:', error);
      toast.error('Failed to assign bug');
    }
  };

  const deleteBug = async (bugId) => {
    if (!window.confirm('Are you sure you want to delete this bug? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await api.delete(`/bugs/${bugId}`);

      if (response.data.success) {
        toast.success('Bug deleted successfully');
        fetchBugs(pagination.current);
        fetchStatistics();
      }
    } catch (error) {
      console.error('Error deleting bug:', error);
      toast.error('Failed to delete bug');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
      case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'wont-fix': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'system_admin';

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Bug className="w-8 h-8 text-primary-600 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
              Bug Management
            </h1>
            <p className="text-secondary-600 dark:text-secondary-400">
              {isAdmin ? 'Manage and track all bug reports' : 'Track your reported bugs'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowBugForm(true)}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Report Bug
        </button>
      </div>

      {/* Statistics Cards (Admin Only) */}
      {isAdmin && statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white dark:bg-secondary-800 p-6 rounded-lg shadow-sm border border-secondary-200 dark:border-secondary-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary-600 dark:text-secondary-400">Total Bugs</p>
                <p className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">{statistics.overview.total}</p>
              </div>
              <Bug className="w-8 h-8 text-secondary-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-secondary-800 p-6 rounded-lg shadow-sm border border-secondary-200 dark:border-secondary-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary-600 dark:text-secondary-400">Open Bugs</p>
                <p className="text-2xl font-bold text-blue-600">{statistics.overview.open}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-secondary-800 p-6 rounded-lg shadow-sm border border-secondary-200 dark:border-secondary-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary-600 dark:text-secondary-400">Critical Bugs</p>
                <p className="text-2xl font-bold text-red-600">{statistics.overview.critical}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-secondary-800 p-6 rounded-lg shadow-sm border border-secondary-200 dark:border-secondary-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary-600 dark:text-secondary-400">Resolved</p>
                <p className="text-2xl font-bold text-green-600">{statistics.overview.resolved}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-sm border border-secondary-200 dark:border-secondary-700 mb-6">
        <div 
          className="flex items-center justify-between p-4 cursor-pointer"
          onClick={() => setShowFilters(!showFilters)}
        >
          <div className="flex items-center">
            <Filter className="w-5 h-5 text-secondary-500 mr-2" />
            <span className="font-medium text-secondary-900 dark:text-secondary-100">Filters</span>
          </div>
          <div className="text-secondary-500">
            {showFilters ? '−' : '+'}
          </div>
        </div>

        {showFilters && (
          <div className="border-t border-secondary-200 dark:border-secondary-700 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary-400" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    placeholder="Search bugs..."
                    className="w-full pl-10 pr-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-secondary-700 dark:text-secondary-100"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-secondary-700 dark:text-secondary-100"
                >
                  <option value="">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="in-progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                  <option value="wont-fix">Won't Fix</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Priority
                </label>
                <select
                  value={filters.priority}
                  onChange={(e) => handleFilterChange('priority', e.target.value)}
                  className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-secondary-700 dark:text-secondary-100"
                >
                  <option value="">All Priorities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Category
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-secondary-700 dark:text-secondary-100"
                >
                  <option value="">All Categories</option>
                  <option value="ui">UI/Visual</option>
                  <option value="functionality">Functionality</option>
                  <option value="performance">Performance</option>
                  <option value="security">Security</option>
                  <option value="data">Data</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bug List */}
      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-sm border border-secondary-200 dark:border-secondary-700">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="ml-2 text-secondary-600 dark:text-secondary-400">Loading bugs...</span>
          </div>
        ) : bugs.length === 0 ? (
          <div className="text-center py-8">
            <Bug className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
            <p className="text-secondary-600 dark:text-secondary-400">No bugs found matching your criteria</p>
          </div>
        ) : (
          <>
            {/* Desktop Table Header - Hidden on mobile */}
            <div className="hidden lg:block px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
              <div className="grid grid-cols-12 gap-4 text-sm font-medium text-secondary-700 dark:text-secondary-300">
                <div 
                  className="col-span-4 cursor-pointer hover:text-primary-600 flex items-center"
                  onClick={() => handleSort('title')}
                >
                  Title
                  {sortBy === 'title' && (
                    <span className="ml-1">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                  )}
                </div>
                <div 
                  className="col-span-1 cursor-pointer hover:text-primary-600 flex items-center"
                  onClick={() => handleSort('priority')}
                >
                  Priority
                  {sortBy === 'priority' && (
                    <span className="ml-1">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                  )}
                </div>
                <div 
                  className="col-span-1 cursor-pointer hover:text-primary-600 flex items-center"
                  onClick={() => handleSort('status')}
                >
                  Status
                  {sortBy === 'status' && (
                    <span className="ml-1">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                  )}
                </div>
                <div className="col-span-2">Reporter</div>
                <div className="col-span-2">Assigned To</div>
                <div 
                  className="col-span-1 cursor-pointer hover:text-primary-600 flex items-center"
                  onClick={() => handleSort('createdAt')}
                >
                  Created
                  {sortBy === 'createdAt' && (
                    <span className="ml-1">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                  )}
                </div>
                <div className="col-span-1">Actions</div>
              </div>
            </div>

            {/* Desktop Table Body - Hidden on mobile */}
            <div className="hidden lg:block divide-y divide-secondary-200 dark:divide-secondary-700">
              {bugs.map((bug) => (
                <div key={bug._id} className="px-6 py-4 hover:bg-secondary-50 dark:hover:bg-secondary-700/50">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* Title */}
                    <div className="col-span-4">
                      <div className="flex items-start">
                        <Bug className="w-4 h-4 text-secondary-400 mt-1 mr-2 flex-shrink-0" />
                        <div>
                          <h3 className="font-medium text-secondary-900 dark:text-secondary-100 hover:text-primary-600 cursor-pointer">
                            {bug.title}
                          </h3>
                          <p className="text-sm text-secondary-600 dark:text-secondary-400 mt-1 line-clamp-2">
                            {bug.description}
                          </p>
                          {bug.tags && bug.tags.length > 0 && (
                            <div className="flex items-center mt-2 space-x-1">
                              {bug.tags.slice(0, 3).map((tag, index) => (
                                <span 
                                  key={index}
                                  className="inline-flex items-center px-2 py-1 bg-secondary-100 dark:bg-secondary-700 text-secondary-600 dark:text-secondary-400 rounded text-xs"
                                >
                                  <Tag className="w-3 h-3 mr-1" />
                                  {tag}
                                </span>
                              ))}
                              {bug.tags.length > 3 && (
                                <span className="text-xs text-secondary-500">+{bug.tags.length - 3} more</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Priority */}
                    <div className="col-span-1">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(bug.priority)}`}>
                        {bug.priority}
                      </span>
                    </div>

                    {/* Status */}
                    <div className="col-span-1">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(bug.status)}`}>
                        {bug.status}
                      </span>
                    </div>

                    {/* Reporter */}
                    <div className="col-span-2">
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-secondary-400 mr-2" />
                        <div>
                          <p className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
                            {bug.reportedBy.username}
                          </p>
                          <p className="text-xs text-secondary-500">{bug.reportedBy.email}</p>
                        </div>
                      </div>
                    </div>

                    {/* Assigned To */}
                    <div className="col-span-2">
                      {bug.assignedTo ? (
                        <div className="flex items-center">
                          <User className="w-4 h-4 text-secondary-400 mr-2" />
                          <p className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
                            {bug.assignedTo.username}
                          </p>
                        </div>
                      ) : (
                        <span className="text-sm text-secondary-500">Unassigned</span>
                      )}
                    </div>

                    {/* Created */}
                    <div className="col-span-1">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 text-secondary-400 mr-1" />
                        <span className="text-xs text-secondary-500">{formatDate(bug.createdAt)}</span>
                      </div>
                      {bug.ageInDays > 0 && (
                        <p className="text-xs text-secondary-400">{bug.ageInDays} days old</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="col-span-1">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setSelectedBug(bug)}
                          className="text-secondary-400 hover:text-primary-600 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => updateBugStatus(bug._id, 
                                bug.status === 'open' ? 'in-progress' : 
                                bug.status === 'in-progress' ? 'resolved' : 'open'
                              )}
                              className="text-secondary-400 hover:text-green-600 transition-colors"
                              title="Update Status"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteBug(bug._id)}
                              className="text-secondary-400 hover:text-red-600 transition-colors"
                              title="Delete Bug"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile Card Layout - Visible on mobile and tablet */}
            <div className="lg:hidden divide-y divide-secondary-200 dark:divide-secondary-700">
              {bugs.map((bug) => (
                <div key={bug._id} className="p-4 hover:bg-secondary-50 dark:hover:bg-secondary-700/50">
                  {/* Mobile Card Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start flex-1 min-w-0">
                      <Bug className="w-5 h-5 text-secondary-400 mt-1 mr-3 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-secondary-900 dark:text-secondary-100 text-base leading-tight mb-1">
                          {bug.title}
                        </h3>
                        <p className="text-sm text-secondary-600 dark:text-secondary-400 line-clamp-2 mb-2">
                          {bug.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-2">
                      <button
                        onClick={() => setSelectedBug(bug)}
                        className="text-secondary-400 hover:text-primary-600 transition-colors p-1"
                        title="View Details"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => updateBugStatus(bug._id, 
                            bug.status === 'open' ? 'in-progress' : 
                            bug.status === 'in-progress' ? 'resolved' : 'open'
                          )}
                          className="text-secondary-400 hover:text-green-600 transition-colors p-1"
                          title="Update Status"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Mobile Card Content */}
                  <div className="space-y-3">
                    {/* Priority and Status Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium text-secondary-600 dark:text-secondary-400">Priority:</span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(bug.priority)}`}>
                          {bug.priority}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium text-secondary-600 dark:text-secondary-400">Status:</span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(bug.status)}`}>
                          {bug.status}
                        </span>
                      </div>
                    </div>

                    {/* Reporter and Assigned Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center min-w-0 flex-1">
                        <User className="w-4 h-4 text-secondary-400 mr-2 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-secondary-900 dark:text-secondary-100 truncate">
                            {bug.reportedBy.username}
                          </p>
                          <p className="text-xs text-secondary-500 truncate">{bug.reportedBy.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center ml-4 min-w-0 flex-1">
                        <User className="w-4 h-4 text-secondary-400 mr-2 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          {bug.assignedTo ? (
                            <p className="text-sm font-medium text-secondary-900 dark:text-secondary-100 truncate">
                              {bug.assignedTo.username}
                            </p>
                          ) : (
                            <p className="text-sm text-secondary-500">Unassigned</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Created Date Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 text-secondary-400 mr-2" />
                        <span className="text-xs text-secondary-500">{formatDate(bug.createdAt)}</span>
                      </div>
                      {bug.ageInDays > 0 && (
                        <span className="text-xs text-secondary-400">{bug.ageInDays} days old</span>
                      )}
                    </div>

                    {/* Tags Row */}
                    {bug.tags && bug.tags.length > 0 && (
                      <div className="flex items-center space-x-1 flex-wrap">
                        <Tag className="w-4 h-4 text-secondary-400 mr-1 flex-shrink-0" />
                        {bug.tags.slice(0, 4).map((tag, index) => (
                          <span 
                            key={index}
                            className="inline-flex items-center px-2 py-1 bg-secondary-100 dark:bg-secondary-700 text-secondary-600 dark:text-secondary-400 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                        {bug.tags.length > 4 && (
                          <span className="text-xs text-secondary-500">+{bug.tags.length - 4} more</span>
                        )}
                      </div>
                    )}

                    {/* Admin Actions Row */}
                    {isAdmin && (
                      <div className="flex items-center justify-end pt-2 border-t border-secondary-200 dark:border-secondary-700">
                        <button
                          onClick={() => deleteBug(bug._id)}
                          className="text-red-400 hover:text-red-600 transition-colors p-2"
                          title="Delete Bug"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.total > 1 && (
              <div className="px-4 lg:px-6 py-4 border-t border-secondary-200 dark:border-secondary-700">
                <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
                  <div className="text-sm text-secondary-600 dark:text-secondary-400 text-center sm:text-left">
                    Showing {Math.min((pagination.current - 1) * 20 + 1, pagination.totalRecords)} to{' '}
                    {Math.min(pagination.current * 20, pagination.totalRecords)} of {pagination.totalRecords} bugs
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => fetchBugs(pagination.current - 1)}
                      disabled={!pagination.hasPrev}
                      className="px-3 py-2 text-sm bg-secondary-100 hover:bg-secondary-200 disabled:bg-secondary-50 disabled:text-secondary-400 text-secondary-700 rounded transition-colors"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-secondary-600 dark:text-secondary-400 px-2">
                      Page {pagination.current} of {pagination.total}
                    </span>
                    <button
                      onClick={() => fetchBugs(pagination.current + 1)}
                      disabled={!pagination.hasNext}
                      className="px-3 py-2 text-sm bg-secondary-100 hover:bg-secondary-200 disabled:bg-secondary-50 disabled:text-secondary-400 text-secondary-700 rounded transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bug Report Form Modal */}
      {showBugForm && (
        <BugReportForm
          isOpen={showBugForm}
          onClose={() => setShowBugForm(false)}
          onSuccess={() => {
            fetchBugs(pagination.current);
            fetchStatistics();
          }}
        />
      )}

      {/* Bug Detail Modal */}
      {selectedBug && (
        <BugDetailModal
          bug={selectedBug}
          onClose={() => setSelectedBug(null)}
          onUpdate={() => {
            fetchBugs(pagination.current);
            fetchStatistics();
          }}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
};

// Bug Detail Modal Component
const BugDetailModal = ({ bug, onClose, onUpdate, isAdmin }) => {
  const [comment, setComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [loading, setLoading] = useState(false);

  const addComment = async () => {
    if (!comment.trim()) return;

    setLoading(true);
    try {
      const response = await api.post(`/bugs/${bug._id}/comments`, {
        content: comment,
        isInternal
      });

      if (response.data.success) {
        toast.success('Comment added successfully');
        setComment('');
        setIsInternal(false);
        onUpdate();
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-secondary-200 dark:border-secondary-700">
          <div className="flex items-center">
            <Bug className="w-6 h-6 text-primary-600 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-secondary-900 dark:text-secondary-100">
                {bug.title}
              </h2>
              <p className="text-sm text-secondary-500">Bug #{bug._id.slice(-8)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-secondary-500 hover:text-secondary-700 dark:text-secondary-400 dark:hover:text-secondary-200"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Bug Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-secondary-900 dark:text-secondary-100 mb-2">Description</h3>
                <p className="text-secondary-700 dark:text-secondary-300">{bug.description}</p>
              </div>

              {bug.stepsToReproduce && (
                <div>
                  <h3 className="font-medium text-secondary-900 dark:text-secondary-100 mb-2">Steps to Reproduce</h3>
                  <pre className="text-secondary-700 dark:text-secondary-300 whitespace-pre-wrap text-sm bg-secondary-50 dark:bg-secondary-700 p-3 rounded">
                    {bug.stepsToReproduce}
                  </pre>
                </div>
              )}

              {(bug.expectedBehavior || bug.actualBehavior) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bug.expectedBehavior && (
                    <div>
                      <h3 className="font-medium text-secondary-900 dark:text-secondary-100 mb-2">Expected Behavior</h3>
                      <p className="text-secondary-700 dark:text-secondary-300 text-sm">{bug.expectedBehavior}</p>
                    </div>
                  )}
                  {bug.actualBehavior && (
                    <div>
                      <h3 className="font-medium text-secondary-900 dark:text-secondary-100 mb-2">Actual Behavior</h3>
                      <p className="text-secondary-700 dark:text-secondary-300 text-sm">{bug.actualBehavior}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* Metadata */}
              <div className="bg-secondary-50 dark:bg-secondary-700 p-4 rounded-lg">
                <h3 className="font-medium text-secondary-900 dark:text-secondary-100 mb-3">Bug Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-secondary-600 dark:text-secondary-400">Priority:</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${bug.priority === 'critical' ? 'bg-red-100 text-red-800' : bug.priority === 'high' ? 'bg-orange-100 text-orange-800' : bug.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                      {bug.priority}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary-600 dark:text-secondary-400">Status:</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${bug.status === 'open' ? 'bg-blue-100 text-blue-800' : bug.status === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {bug.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary-600 dark:text-secondary-400">Category:</span>
                    <span className="text-secondary-900 dark:text-secondary-100">{bug.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary-600 dark:text-secondary-400">Reporter:</span>
                    <span className="text-secondary-900 dark:text-secondary-100">{bug.reportedBy.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary-600 dark:text-secondary-400">Created:</span>
                    <span className="text-secondary-900 dark:text-secondary-100">{formatDate(bug.createdAt)}</span>
                  </div>
                  {bug.assignedTo && (
                    <div className="flex justify-between">
                      <span className="text-secondary-600 dark:text-secondary-400">Assigned:</span>
                      <span className="text-secondary-900 dark:text-secondary-100">{bug.assignedTo.username}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Environment Info */}
              {bug.environment && (
                <div className="bg-secondary-50 dark:bg-secondary-700 p-4 rounded-lg">
                  <h3 className="font-medium text-secondary-900 dark:text-secondary-100 mb-3">Environment</h3>
                  <div className="space-y-1 text-sm">
                    {bug.environment.browser && (
                      <div><span className="text-secondary-600 dark:text-secondary-400">Browser:</span> {bug.environment.browser} {bug.environment.browserVersion}</div>
                    )}
                    {bug.environment.operatingSystem && (
                      <div><span className="text-secondary-600 dark:text-secondary-400">OS:</span> {bug.environment.operatingSystem}</div>
                    )}
                    {bug.environment.deviceType && (
                      <div><span className="text-secondary-600 dark:text-secondary-400">Device:</span> {bug.environment.deviceType}</div>
                    )}
                    {bug.environment.screenResolution && (
                      <div><span className="text-secondary-600 dark:text-secondary-400">Resolution:</span> {bug.environment.screenResolution}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Tags */}
              {bug.tags && bug.tags.length > 0 && (
                <div>
                  <h3 className="font-medium text-secondary-900 dark:text-secondary-100 mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {bug.tags.map((tag, index) => (
                      <span 
                        key={index}
                        className="inline-flex items-center px-2 py-1 bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200 rounded text-sm"
                      >
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Comments Section */}
          <div>
            <h3 className="font-medium text-secondary-900 dark:text-secondary-100 mb-4 flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" />
              Comments ({bug.comments?.length || 0})
            </h3>

            {/* Existing Comments */}
            <div className="space-y-4 mb-6">
              {bug.comments && bug.comments.length > 0 ? (
                bug.comments.map((comment, index) => (
                  <div key={index} className="bg-secondary-50 dark:bg-secondary-700 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-secondary-500 mr-2" />
                        <span className="font-medium text-secondary-900 dark:text-secondary-100">
                          {comment.author.username}
                        </span>
                        {comment.isInternal && (
                          <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">
                            Internal
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-secondary-500">
                        {formatDate(comment.createdAt)}
                      </span>
                    </div>
                    <p className="text-secondary-700 dark:text-secondary-300">{comment.content}</p>
                  </div>
                ))
              ) : (
                <p className="text-secondary-500 text-center py-4">No comments yet</p>
              )}
            </div>

            {/* Add Comment */}
            <div className="border-t border-secondary-200 dark:border-secondary-700 pt-4">
              <div className="space-y-3">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={3}
                  className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-secondary-700 dark:text-secondary-100"
                />
                <div className="flex items-center justify-between">
                  {isAdmin && (
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={isInternal}
                        onChange={(e) => setIsInternal(e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm text-secondary-600 dark:text-secondary-400">
                        Internal comment (admin only)
                      </span>
                    </label>
                  )}
                  <button
                    onClick={addComment}
                    disabled={loading || !comment.trim()}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-secondary-400 text-white rounded-lg transition-colors flex items-center"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Adding...
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Add Comment
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BugManagement; 