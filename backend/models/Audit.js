const mongoose = require('mongoose');

const auditSchema = new mongoose.Schema({
  // Event Information
  action: {
    type: String,
    required: true,
    enum: ['login', 'logout', 'failed_login', 'password_change', 'profile_update'],
    index: true
  },
  status: {
    type: String,
    required: true,
    enum: ['success', 'failure'],
    default: 'success'
  },
  
  // User Information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false, // Allow null for failed login attempts
    index: true
  },
  userType: {
    type: String,
    required: true,
    enum: ['User', 'FamilyMember', 'Unknown'], // Add Unknown for failed attempts
    index: true
  },
  username: {
    type: String,
    required: true,
    index: true
  },
  userDisplayName: {
    type: String,
    required: true
  },
  userRole: {
    type: String,
    required: true,
    enum: ['admin', 'user', 'unknown'] // Add unknown for failed attempts
  },
  
  // Session Information
  sessionId: {
    type: String,
    index: true
  },
  
  // Request Information
  ipAddress: {
    type: String,
    required: true,
    index: true
  },
  userAgent: {
    type: String,
    required: true
  },
  
  // Additional Details
  details: {
    type: String, // JSON string for additional event-specific data
    default: ''
  },
  failureReason: {
    type: String // For failed login attempts
  },
  
  // Timestamps
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // For retention management
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 } // TTL index for automatic cleanup
  }
});

// Compound indexes for efficient querying
auditSchema.index({ userId: 1, timestamp: -1 });
auditSchema.index({ userType: 1, timestamp: -1 });
auditSchema.index({ action: 1, timestamp: -1 });
auditSchema.index({ ipAddress: 1, timestamp: -1 });
auditSchema.index({ timestamp: -1 }); // For general chronological queries

// Static method to log audit events
auditSchema.statics.logEvent = async function(eventData) {
  try {
    const auditEntry = new this({
      action: eventData.action,
      status: eventData.status || 'success',
      userId: eventData.userId,
      userType: eventData.userType,
      username: eventData.username,
      userDisplayName: eventData.userDisplayName,
      userRole: eventData.userRole,
      sessionId: eventData.sessionId,
      ipAddress: eventData.ipAddress,
      userAgent: eventData.userAgent,
      details: eventData.details ? JSON.stringify(eventData.details) : '',
      failureReason: eventData.failureReason,
      expiresAt: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)) // 1 year retention
    });
    
    await auditEntry.save();
    return auditEntry;
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // In test environment, also log more details
    if (process.env.NODE_ENV === 'test') {
      console.error('Audit event data:', eventData);
      console.error('Error stack:', error.stack);
    }
    // Don't throw error to prevent breaking the main flow
    return null;
  }
};

// Static method to get recent activity for a user
auditSchema.statics.getUserActivity = async function(userId, userType, limit = 50) {
  return this.find({ 
    userId: userId, 
    userType: userType 
  })
  .sort({ timestamp: -1 })
  .limit(limit)
  .lean();
};

// Static method to get system-wide activity summary
auditSchema.statics.getActivitySummary = async function(timeframe = 24) {
  const since = new Date(Date.now() - (timeframe * 60 * 60 * 1000));
  
  const pipeline = [
    { $match: { timestamp: { $gte: since } } },
    {
      $group: {
        _id: {
          action: '$action',
          status: '$status',
          userType: '$userType'
        },
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
        uniqueIPs: { $addToSet: '$ipAddress' }
      }
    },
    {
      $addFields: {
        uniqueUserCount: { $size: '$uniqueUsers' },
        uniqueIPCount: { $size: '$uniqueIPs' }
      }
    },
    {
      $project: {
        action: '$_id.action',
        status: '$_id.status',
        userType: '$_id.userType',
        count: 1,
        uniqueUserCount: 1,
        uniqueIPCount: 1
      }
    }
  ];
  
  return this.aggregate(pipeline);
};

// Instance method to format for display
auditSchema.methods.toDisplayObject = function() {
  return {
    id: this._id,
    action: this.action,
    status: this.status,
    user: {
      id: this.userId,
      type: this.userType,
      username: this.username,
      displayName: this.userDisplayName,
      role: this.userRole
    },
    session: {
      id: this.sessionId,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent
    },
    details: this.details ? JSON.parse(this.details) : {},
    failureReason: this.failureReason,
    timestamp: this.timestamp,
    formattedTimestamp: this.timestamp.toISOString()
  };
};

module.exports = mongoose.model('Audit', auditSchema); 