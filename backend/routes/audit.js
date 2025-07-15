const express = require('express');
const { query, validationResult } = require('express-validator');
const Audit = require('../models/Audit');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get audit logs with pagination and filtering (admin only)
router.get('/', authenticateToken, requireAdmin, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('action').optional().isIn(['login', 'logout', 'failed_login', 'password_change', 'profile_update']).withMessage('Invalid action'),
  query('status').optional().isIn(['success', 'failure']).withMessage('Invalid status'),
  query('userType').optional().isIn(['User', 'FamilyMember']).withMessage('Invalid user type'),
  query('userId').optional().isMongoId().withMessage('Invalid user ID'),
  query('username').optional().trim(),
  query('ipAddress').optional().trim(),
  query('startDate').optional().isISO8601().withMessage('Invalid start date'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      page = 1,
      limit = 50,
      action,
      status,
      userType,
      userId,
      username,
      ipAddress,
      startDate,
      endDate
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (action) filter.action = action;
    if (status) filter.status = status;
    if (userType) filter.userType = userType;
    if (userId) filter.userId = userId;
    if (username) filter.username = new RegExp(username, 'i');
    if (ipAddress) filter.ipAddress = ipAddress;
    
    // Date range filter
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get total count for pagination
    const total = await Audit.countDocuments(filter);

    // Get audit logs
    const auditLogs = await Audit.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Format logs for display
    const formattedLogs = auditLogs.map(log => ({
      id: log._id,
      action: log.action,
      status: log.status,
      user: {
        id: log.userId,
        type: log.userType,
        username: log.username,
        displayName: log.userDisplayName,
        role: log.userRole
      },
      session: {
        id: log.sessionId,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent
      },
      details: log.details ? JSON.parse(log.details) : {},
      failureReason: log.failureReason,
      timestamp: log.timestamp,
      formattedTimestamp: log.timestamp.toISOString()
    }));

    res.json({
      success: true,
      auditLogs: formattedLogs,
      pagination: {
        current: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
        hasNext: skip + parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching audit logs'
    });
  }
});

// Get audit statistics (admin only)
router.get('/stats', authenticateToken, requireAdmin, [
  query('timeframe').optional().isInt({ min: 1, max: 168 }).withMessage('Timeframe must be between 1 and 168 hours')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { timeframe = 24 } = req.query;

    // Get activity summary
    const summary = await Audit.getActivitySummary(parseInt(timeframe));

    // Get recent activity trends (last 7 days, grouped by day)
    const sevenDaysAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
    const trendsPipeline = [
      { $match: { timestamp: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            action: '$action',
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ];

    const trends = await Audit.aggregate(trendsPipeline);

    // Get top active users (last 24 hours)
    const oneDayAgo = new Date(Date.now() - (24 * 60 * 60 * 1000));
    const topUsersPipeline = [
      { $match: { timestamp: { $gte: oneDayAgo }, action: { $in: ['login', 'logout'] } } },
      {
        $group: {
          _id: {
            userId: '$userId',
            username: '$username',
            displayName: '$userDisplayName',
            userType: '$userType'
          },
          loginCount: { $sum: { $cond: [{ $eq: ['$action', 'login'] }, 1, 0] } },
          logoutCount: { $sum: { $cond: [{ $eq: ['$action', 'logout'] }, 1, 0] } },
          lastActivity: { $max: '$timestamp' }
        }
      },
      { $sort: { loginCount: -1 } },
      { $limit: 10 }
    ];

    const topUsers = await Audit.aggregate(topUsersPipeline);

    // Get failed login attempts (last 24 hours)
    const failedLoginsPipeline = [
      { $match: { timestamp: { $gte: oneDayAgo }, action: 'failed_login' } },
      {
        $group: {
          _id: {
            ipAddress: '$ipAddress',
            username: '$username'
          },
          attempts: { $sum: 1 },
          lastAttempt: { $max: '$timestamp' },
          reasons: { $addToSet: '$failureReason' }
        }
      },
      { $sort: { attempts: -1 } },
      { $limit: 10 }
    ];

    const failedLogins = await Audit.aggregate(failedLoginsPipeline);

    res.json({
      success: true,
      stats: {
        timeframe: parseInt(timeframe),
        summary,
        trends,
        topUsers,
        failedLogins
      }
    });
  } catch (error) {
    console.error('Get audit stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching audit statistics'
    });
  }
});

// Get user activity history (admin only)
router.get('/user/:userId', authenticateToken, requireAdmin, [
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { userId } = req.params;
    const { limit = 50 } = req.query;

    // Get user activity
    const activity = await Audit.find({ userId })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .lean();

    // Format activity for display
    const formattedActivity = activity.map(log => ({
      id: log._id,
      action: log.action,
      status: log.status,
      session: {
        id: log.sessionId,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent
      },
      details: log.details ? JSON.parse(log.details) : {},
      failureReason: log.failureReason,
      timestamp: log.timestamp,
      formattedTimestamp: log.timestamp.toISOString()
    }));

    res.json({
      success: true,
      userId,
      activity: formattedActivity
    });
  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user activity'
    });
  }
});

// Export audit logs (admin only) - CSV format
router.get('/export', authenticateToken, requireAdmin, [
  query('startDate').optional().isISO8601().withMessage('Invalid start date'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date'),
  query('action').optional().isIn(['login', 'logout', 'failed_login', 'password_change', 'profile_update']).withMessage('Invalid action'),
  query('userType').optional().isIn(['User', 'FamilyMember']).withMessage('Invalid user type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { startDate, endDate, action, userType } = req.query;

    // Build filter object
    const filter = {};
    if (action) filter.action = action;
    if (userType) filter.userType = userType;
    
    // Date range filter (default to last 30 days if not specified)
    const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
    filter.timestamp = {};
    filter.timestamp.$gte = startDate ? new Date(startDate) : thirtyDaysAgo;
    if (endDate) filter.timestamp.$lte = new Date(endDate);

    // Get audit logs (limit to 10000 for performance)
    const auditLogs = await Audit.find(filter)
      .sort({ timestamp: -1 })
      .limit(10000)
      .lean();

    // Generate CSV content
    const csvHeaders = [
      'Timestamp',
      'Action',
      'Status',
      'User Type',
      'Username',
      'Display Name',
      'Role',
      'IP Address',
      'User Agent',
      'Session ID',
      'Failure Reason',
      'Details'
    ];

    const csvRows = auditLogs.map(log => [
      log.timestamp.toISOString(),
      log.action,
      log.status,
      log.userType,
      log.username,
      log.userDisplayName,
      log.userRole,
      log.ipAddress,
      `"${log.userAgent.replace(/"/g, '""')}"`, // Escape quotes in user agent
      log.sessionId || '',
      log.failureReason || '',
      log.details ? `"${log.details.replace(/"/g, '""')}"` : ''
    ]);

    const csvContent = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n');

    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`);
    
    res.send(csvContent);
  } catch (error) {
    console.error('Export audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while exporting audit logs'
    });
  }
});

module.exports = router; 