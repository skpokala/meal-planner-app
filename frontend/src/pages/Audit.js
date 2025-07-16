import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Filter, 
  Download, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Users,
  Activity,
  Eye
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const Audit = () => {
  const { isAdmin } = useAuth();
  
  // State for audit logs
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // State for statistics
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  
  // State for filters and pagination
  const [filters, setFilters] = useState({
    page: 1,
    limit: 50,
    action: '',
    status: '',
    userType: '',
    username: '',
    ipAddress: '',
    startDate: '',
    endDate: ''
  });
  
  const [pagination, setPagination] = useState({
    current: 1,
    limit: 50,
    total: 0,
    pages: 0,
    hasNext: false,
    hasPrev: false
  });

  // Redirect if not admin
  useEffect(() => {
    if (!loading && !isAdmin()) {
      toast.error('Access denied: Administrator privileges required');
      window.location.href = '/dashboard';
    }
  }, [loading, isAdmin]);

  useEffect(() => {
    if (isAdmin()) {
      fetchAuditLogs();
      fetchStats();
    }
  }, [filters, isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          queryParams.append(key, filters[key]);
        }
      });

      const response = await api.get(`/audit?${queryParams.toString()}`);
      setAuditLogs(response.data.auditLogs);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const response = await api.get('/audit/stats?timeframe=24');
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching audit stats:', error);
      toast.error('Failed to load audit statistics');
    } finally {
      setStatsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchAuditLogs(), fetchStats()]);
    setRefreshing(false);
    toast.success('Audit logs refreshed');
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filtering
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({
      ...prev,
      page: newPage
    }));
  };

  const handleExport = async () => {
    try {
      const queryParams = new URLSearchParams();
      
      // Add current filters for export
      ['action', 'userType', 'startDate', 'endDate'].forEach(key => {
        if (filters[key]) {
          queryParams.append(key, filters[key]);
        }
      });

      const response = await api.get(`/audit/export?${queryParams.toString()}`, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Audit logs exported successfully');
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      toast.error('Failed to export audit logs');
    }
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      limit: 50,
      action: '',
      status: '',
      userType: '',
      username: '',
      ipAddress: '',
      startDate: '',
      endDate: ''
    });
  };

  const getActionIcon = (action, status) => {
    if (status === 'failure') {
      return <XCircle className="w-4 h-4 text-error-600" />;
    }
    
    switch (action) {
      case 'login':
        return <CheckCircle className="w-4 h-4 text-success-600" />;
      case 'logout':
        return <Activity className="w-4 h-4 text-primary-600" />;
      case 'failed_login':
        return <AlertTriangle className="w-4 h-4 text-error-600" />;
      default:
        return <Activity className="w-4 h-4 text-secondary-600" />;
    }
  };

  const getActionColor = (action, status) => {
    if (status === 'failure') {
      return 'bg-error-100 dark:bg-error-900/20 text-error-800 dark:text-error-300';
    }
    
    switch (action) {
      case 'login':
        return 'bg-success-100 dark:bg-success-900/20 text-success-800 dark:text-success-300';
      case 'logout':
        return 'bg-primary-100 dark:bg-primary-900/20 text-primary-800 dark:text-primary-300';
      case 'failed_login':
        return 'bg-error-100 dark:bg-error-900/20 text-error-800 dark:text-error-300';
      default:
        return 'bg-secondary-100 dark:bg-secondary-900/20 text-secondary-800 dark:text-secondary-300';
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getUserAgentInfo = (userAgent) => {
    if (!userAgent || userAgent === 'unknown') return 'Unknown';
    
    // Extract browser info
    const browser = userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/i);
    const os = userAgent.match(/(Windows|Mac|Linux|Android|iOS)/i);
    
    return `${browser?.[1] || 'Unknown Browser'} on ${os?.[1] || 'Unknown OS'}`;
  };

  if (!isAdmin()) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-16 h-16 text-error-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-2">
            Access Denied
          </h3>
          <p className="text-secondary-600 dark:text-secondary-400">
            Administrator privileges required to access audit logs
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Audit Logs
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Monitor user authentication and system activity
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-outline"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleExport}
            className="btn-primary"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {!statsLoading && stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary-600 dark:text-secondary-400">
                    Total Logins (24h)
                  </p>
                  <p className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                    {stats.summary.find(s => s.action === 'login')?.count || 0}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-success-500" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary-600 dark:text-secondary-400">
                    Failed Logins (24h)
                  </p>
                  <p className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                    {stats.summary.find(s => s.action === 'failed_login')?.count || 0}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-error-500" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary-600 dark:text-secondary-400">
                    Active Users (24h)
                  </p>
                  <p className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                    {stats.topUsers.length}
                  </p>
                </div>
                <Users className="w-8 h-8 text-primary-500" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary-600 dark:text-secondary-400">
                    Total Events (24h)
                  </p>
                  <p className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                    {stats.summary.reduce((total, s) => total + s.count, 0)}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-secondary-500" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filters
          </h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                Action
              </label>
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="select"
              >
                <option value="">All Actions</option>
                <option value="login">Login</option>
                <option value="logout">Logout</option>
                <option value="failed_login">Failed Login</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="select"
              >
                <option value="">All Status</option>
                <option value="success">Success</option>
                <option value="failure">Failure</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                User Type
              </label>
              <select
                value={filters.userType}
                onChange={(e) => handleFilterChange('userType', e.target.value)}
                className="select"
              >
                <option value="">All Types</option>
                <option value="User">System User</option>
                <option value="FamilyMember">Family Member</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                Username
              </label>
              <input
                type="text"
                value={filters.username}
                onChange={(e) => handleFilterChange('username', e.target.value)}
                className="input"
                placeholder="Search username..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                IP Address
              </label>
              <input
                type="text"
                value={filters.ipAddress}
                onChange={(e) => handleFilterChange('ipAddress', e.target.value)}
                className="input"
                placeholder="Filter by IP..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                Start Date
              </label>
              <input
                type="datetime-local"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                End Date
              </label>
              <input
                type="datetime-local"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="input"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="btn-outline w-full"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
            Audit Events
          </h3>
          <p className="text-sm text-secondary-600 dark:text-secondary-400">
            Showing {auditLogs.length} of {pagination.total} events
          </p>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" text="Loading audit logs..." />
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-16 h-16 text-secondary-400 dark:text-secondary-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-2">
                No audit events found
              </h3>
              <p className="text-secondary-600 dark:text-secondary-400">
                Try adjusting your filters or check back later
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-secondary-200 dark:divide-secondary-700">
                <thead className="bg-secondary-50 dark:bg-secondary-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                      Event
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                      Session Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-secondary-900 divide-y divide-secondary-200 dark:divide-secondary-700">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-secondary-50 dark:hover:bg-secondary-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getActionIcon(log.action, log.status)}
                          <div className="ml-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action, log.status)}`}>
                              {log.action.replace('_', ' ')}
                            </span>
                            {log.failureReason && (
                              <p className="text-xs text-error-600 dark:text-error-400 mt-1">
                                {log.failureReason}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
                            {log.user.username}
                          </div>
                          <div className="text-sm text-secondary-500 dark:text-secondary-400">
                            {log.user.displayName}
                          </div>
                          <div className="flex items-center mt-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              log.user.type === 'User' 
                                ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300'
                                : 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                            }`}>
                              {log.user.type}
                            </span>
                            {log.user.role === 'admin' && (
                              <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300">
                                Admin
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500 dark:text-secondary-400">
                        <div>
                          <div className="flex items-center">
                            <span className="font-mono text-xs bg-secondary-100 dark:bg-secondary-800 px-2 py-1 rounded">
                              {log.session.ipAddress}
                            </span>
                          </div>
                          <div className="mt-1 text-xs truncate max-w-48" title={log.session.userAgent}>
                            {getUserAgentInfo(log.session.userAgent)}
                          </div>
                          {log.session.id && (
                            <div className="mt-1 text-xs font-mono text-secondary-400 dark:text-secondary-500">
                              Session: {log.session.id}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500 dark:text-secondary-400">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500 dark:text-secondary-400">
                        {Object.keys(log.details).length > 0 && (
                          <details className="cursor-pointer">
                            <summary className="flex items-center text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300">
                              <Eye className="w-4 h-4 mr-1" />
                              View Details
                            </summary>
                            <pre className="mt-2 text-xs bg-secondary-100 dark:bg-secondary-800 p-2 rounded max-w-xs overflow-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* Pagination */}
        {!loading && pagination.pages > 1 && (
          <div className="card-footer">
            <div className="flex items-center justify-between">
              <div className="text-sm text-secondary-700 dark:text-secondary-300">
                Showing page {pagination.current} of {pagination.pages} ({pagination.total} total events)
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.current - 1)}
                  disabled={!pagination.hasPrev}
                  className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(pagination.current + 1)}
                  disabled={!pagination.hasNext}
                  className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default Audit; 