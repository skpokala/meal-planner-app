import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler
} from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import { 
  TrendingUp,
  Activity,
  Users,
  Shield,
  Clock,
  AlertTriangle,
  BarChart3,
  PieChart
} from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import api from '../services/api';
import toast from 'react-hot-toast';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler
);

const AuditChartsView = ({ filters = {} }) => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('24'); // hours

  useEffect(() => {
    fetchChartData();
  }, [timeframe, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchChartData = async () => {
    try {
      setLoading(true);
      
      // Check if user is authenticated
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        toast.error('Please login to view charts');
        return;
      }

      console.log('Fetching chart data with timeframe:', timeframe, 'filters:', filters);
      
      // Fetch comprehensive audit data for charts
      const [statsResponse, logsResponse] = await Promise.all([
        api.get(`/audit/stats?timeframe=${timeframe}`),
        api.get(`/audit?limit=1000&${new URLSearchParams(filters).toString()}`)
      ]);

      console.log('Stats response:', statsResponse.data);
      console.log('Logs response:', logsResponse.data);

      const stats = statsResponse.data.stats;
      const logs = logsResponse.data.auditLogs;

      // Process data for charts
      const processedData = processAuditDataForCharts(stats, logs);
      console.log('Processed data:', processedData);
      setChartData(processedData);
    } catch (error) {
      console.error('Error fetching chart data:', error);
      console.error('Error details:', error.response?.data || error.message);
      toast.error(`Failed to load chart data: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const processAuditDataForCharts = (stats, logs) => {
    // Provide default values for missing data
    const safeStats = {
      trends: stats?.trends || [],
      summary: stats?.summary || [],
      topUsers: stats?.topUsers || [],
      failedLogins: stats?.failedLogins || []
    };
    const safeLogs = logs || [];

    console.log('Processing data with safe stats:', safeStats, 'and safe logs:', safeLogs);

    // Activity trends over time (last 7 days)
    const activityTrends = processActivityTrends(safeStats.trends);
    
    // Action distribution
    const actionDistribution = processActionDistribution(safeStats.summary);
    
    // Status distribution
    const statusDistribution = processStatusDistribution(safeStats.summary);
    
    // User activity
    const userActivity = processUserActivity(safeStats.topUsers);
    
    // Failed login attempts
    const failedLogins = processFailedLogins(safeStats.failedLogins);
    
    // Hourly activity pattern
    const hourlyPattern = processHourlyPattern(safeLogs);
    
    // User type distribution
    const userTypeDistribution = processUserTypeDistribution(safeStats.summary);
    
    // IP address activity
    const ipActivity = processIpActivity(safeLogs);

    return {
      activityTrends,
      actionDistribution,
      statusDistribution,
      userActivity,
      failedLogins,
      hourlyPattern,
      userTypeDistribution,
      ipActivity
    };
  };

  const processActivityTrends = (trends) => {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      last7Days.push(date.toISOString().split('T')[0]);
    }

    const loginData = last7Days.map(date => {
      const dayData = trends.filter(t => 
        t._id.date === date && 
        t._id.action === 'login' && 
        t._id.status === 'success'
      );
      return dayData.reduce((sum, item) => sum + item.count, 0);
    });

    const failedLoginData = last7Days.map(date => {
      const dayData = trends.filter(t => 
        t._id.date === date && 
        t._id.action === 'failed_login'
      );
      return dayData.reduce((sum, item) => sum + item.count, 0);
    });

    return {
      labels: last7Days.map(date => new Date(date).toLocaleDateString()),
      datasets: [
        {
          label: 'Successful Logins',
          data: loginData,
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Failed Logins',
          data: failedLoginData,
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.4,
          fill: true
        }
      ]
    };
  };

  const processActionDistribution = (summary) => {
    const actionCounts = summary.reduce((acc, item) => {
      acc[item.action] = (acc[item.action] || 0) + item.count;
      return acc;
    }, {});

    return {
      labels: Object.keys(actionCounts).map(action => 
        action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
      ),
      datasets: [{
        data: Object.values(actionCounts),
        backgroundColor: [
          '#22c55e', // green
          '#3b82f6', // blue
          '#ef4444', // red
          '#f59e0b', // amber
          '#8b5cf6'  // purple
        ],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    };
  };

  const processStatusDistribution = (summary) => {
    const statusCounts = summary.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + item.count;
      return acc;
    }, {});

    return {
      labels: Object.keys(statusCounts).map(status => 
        status.charAt(0).toUpperCase() + status.slice(1)
      ),
      datasets: [{
        data: Object.values(statusCounts),
        backgroundColor: [
          '#22c55e', // green for success
          '#ef4444'  // red for failure
        ],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    };
  };

  const processUserActivity = (topUsers) => {
    const top10Users = topUsers.slice(0, 10);
    
    return {
      labels: top10Users.map(user => user._id.username),
      datasets: [{
        label: 'Login Count',
        data: top10Users.map(user => user.loginCount),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1
      }]
    };
  };

  const processFailedLogins = (failedLogins) => {
    const top10Failed = failedLogins.slice(0, 10);
    
    return {
      labels: top10Failed.map(item => 
        `${item._id.username} (${item._id.ipAddress})`
      ),
      datasets: [{
        label: 'Failed Attempts',
        data: top10Failed.map(item => item.attempts),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 1
      }]
    };
  };

  const processHourlyPattern = (logs) => {
    const hourCounts = Array(24).fill(0);
    
    logs.forEach(log => {
      const hour = new Date(log.timestamp).getHours();
      hourCounts[hour]++;
    });

    return {
      labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      datasets: [{
        label: 'Activity Count',
        data: hourCounts,
        backgroundColor: 'rgba(139, 92, 246, 0.8)',
        borderColor: 'rgb(139, 92, 246)',
        borderWidth: 1
      }]
    };
  };

  const processUserTypeDistribution = (summary) => {
    const userTypeCounts = summary.reduce((acc, item) => {
      acc[item.userType] = (acc[item.userType] || 0) + item.count;
      return acc;
    }, {});

    return {
      labels: Object.keys(userTypeCounts),
      datasets: [{
        data: Object.values(userTypeCounts),
        backgroundColor: [
          '#3b82f6', // blue for User
          '#10b981', // emerald for FamilyMember
          '#f59e0b'  // amber for Unknown
        ],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    };
  };

  const processIpActivity = (logs) => {
    const ipCounts = logs.reduce((acc, log) => {
      acc[log.session.ipAddress] = (acc[log.session.ipAddress] || 0) + 1;
      return acc;
    }, {});

    const sortedIps = Object.entries(ipCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    return {
      labels: sortedIps.map(([ip]) => ip),
      datasets: [{
        label: 'Activity Count',
        data: sortedIps.map(([, count]) => count),
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 1
      }]
    };
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      }
    }
  };

  const pieChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right',
      },
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text="Loading charts..." />
      </div>
    );
  }

  if (!chartData) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-16 h-16 text-secondary-400 dark:text-secondary-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-2">
          No chart data available
        </h3>
        <p className="text-secondary-600 dark:text-secondary-400">
          Unable to generate charts from the current data
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
          Audit Analytics
        </h2>
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-secondary-700 dark:text-secondary-300">
            Time Range:
          </label>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="select w-auto"
          >
            <option value="24">Last 24 hours</option>
            <option value="72">Last 3 days</option>
            <option value="168">Last 7 days</option>
            <option value="720">Last 30 days</option>
          </select>
        </div>
      </div>

      {/* Activity Trends */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Activity Trends (Last 7 Days)
          </h3>
        </div>
        <div className="card-body">
          <div className="h-64">
            <Line data={chartData.activityTrends} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Distribution Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Action Distribution */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 flex items-center">
              <PieChart className="w-5 h-5 mr-2" />
              Action Distribution
            </h3>
          </div>
          <div className="card-body">
            <div className="h-64">
              <Pie data={chartData.actionDistribution} options={pieChartOptions} />
            </div>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              Status Distribution
            </h3>
          </div>
          <div className="card-body">
            <div className="h-64">
              <Doughnut data={chartData.statusDistribution} options={pieChartOptions} />
            </div>
          </div>
        </div>
      </div>

      {/* User Activity */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Top Active Users
          </h3>
        </div>
        <div className="card-body">
          <div className="h-64">
            <Bar data={chartData.userActivity} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Failed Logins */}
      {chartData.failedLogins.labels.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Failed Login Attempts
            </h3>
          </div>
          <div className="card-body">
            <div className="h-64">
              <Bar data={chartData.failedLogins} options={chartOptions} />
            </div>
          </div>
        </div>
      )}

      {/* Bottom Row Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Hourly Activity Pattern */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Hourly Activity Pattern
            </h3>
          </div>
          <div className="card-body">
            <div className="h-64">
              <Bar data={chartData.hourlyPattern} options={chartOptions} />
            </div>
          </div>
        </div>

        {/* User Type Distribution */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 flex items-center">
              <Users className="w-5 h-5 mr-2" />
              User Type Distribution
            </h3>
          </div>
          <div className="card-body">
            <div className="h-64">
              <Doughnut data={chartData.userTypeDistribution} options={pieChartOptions} />
            </div>
          </div>
        </div>
      </div>

      {/* IP Activity */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            Top IP Addresses
          </h3>
        </div>
        <div className="card-body">
          <div className="h-64">
            <Bar data={chartData.ipActivity} options={chartOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditChartsView; 