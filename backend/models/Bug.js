const mongoose = require('mongoose');
const { Schema } = mongoose;

const bugSchema = new Schema({
  title: {
    type: String,
    required: [true, 'Bug title is required'],
    trim: true,
    maxlength: [200, 'Bug title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Bug description is required'],
    trim: true,
    maxlength: [2000, 'Bug description cannot exceed 2000 characters']
  },
  stepsToReproduce: {
    type: String,
    trim: true,
    maxlength: [1000, 'Steps to reproduce cannot exceed 1000 characters']
  },
  expectedBehavior: {
    type: String,
    trim: true,
    maxlength: [500, 'Expected behavior cannot exceed 500 characters']
  },
  actualBehavior: {
    type: String,
    trim: true,
    maxlength: [500, 'Actual behavior cannot exceed 500 characters']
  },
  priority: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high', 'critical'],
      message: 'Priority must be one of: low, medium, high, critical'
    },
    default: 'medium'
  },
  status: {
    type: String,
    enum: {
      values: ['open', 'in-progress', 'resolved', 'closed', 'wont-fix'],
      message: 'Status must be one of: open, in-progress, resolved, closed, wont-fix'
    },
    default: 'open'
  },
  severity: {
    type: String,
    enum: {
      values: ['minor', 'moderate', 'major', 'blocker'],
      message: 'Severity must be one of: minor, moderate, major, blocker'
    },
    default: 'moderate'
  },
  category: {
    type: String,
    enum: {
      values: ['ui', 'functionality', 'performance', 'security', 'data', 'other'],
      message: 'Category must be one of: ui, functionality, performance, security, data, other'
    },
    default: 'functionality'
  },
  environment: {
    browser: {
      type: String,
      trim: true
    },
    browserVersion: {
      type: String,
      trim: true
    },
    operatingSystem: {
      type: String,
      trim: true
    },
    deviceType: {
      type: String,
      enum: ['desktop', 'tablet', 'mobile'],
      default: 'desktop'
    },
    screenResolution: {
      type: String,
      trim: true
    },
    appVersion: {
      type: String,
      trim: true
    }
  },
  reportedBy: {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'reportedBy.userType'
    },
    userType: {
      type: String,
      required: true,
      enum: ['User', 'FamilyMember']
    },
    username: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    }
  },
  assignedTo: {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    username: {
      type: String
    }
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  attachments: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    author: {
      userId: {
        type: Schema.Types.ObjectId,
        required: true,
        refPath: 'comments.author.userType'
      },
      userType: {
        type: String,
        required: true,
        enum: ['User', 'FamilyMember']
      },
      username: {
        type: String,
        required: true
      }
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    isInternal: {
      type: Boolean,
      default: false // Internal comments only visible to admins
    }
  }],
  estimatedTime: {
    type: Number, // in hours
    min: 0
  },
  actualTime: {
    type: Number, // in hours
    min: 0
  },
  resolvedAt: {
    type: Date
  },
  resolutionNotes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Resolution notes cannot exceed 1000 characters']
  },
  duplicateOf: {
    type: Schema.Types.ObjectId,
    ref: 'Bug'
  },
  relatedBugs: [{
    type: Schema.Types.ObjectId,
    ref: 'Bug'
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
bugSchema.index({ status: 1, priority: 1 });
bugSchema.index({ 'reportedBy.userId': 1 });
bugSchema.index({ 'assignedTo.userId': 1 });
bugSchema.index({ createdAt: -1 });
bugSchema.index({ category: 1 });

// Virtual for calculating time spent
bugSchema.virtual('timeSpent').get(function() {
  if (this.resolvedAt && this.createdAt) {
    return Math.ceil((this.resolvedAt - this.createdAt) / (1000 * 60 * 60 * 24)); // days
  }
  return null;
});

// Virtual for age in days
bugSchema.virtual('ageInDays').get(function() {
  const now = new Date();
  return Math.ceil((now - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Method to add comment
bugSchema.methods.addComment = function(author, content, isInternal = false) {
  this.comments.push({
    author,
    content,
    isInternal,
    createdAt: new Date()
  });
  return this.save();
};

// Method to update status
bugSchema.methods.updateStatus = function(newStatus, resolutionNotes = null) {
  this.status = newStatus;
  
  if (newStatus === 'resolved' || newStatus === 'closed') {
    this.resolvedAt = new Date();
    if (resolutionNotes) {
      this.resolutionNotes = resolutionNotes;
    }
  } else if (this.resolvedAt) {
    // If reopening a resolved bug
    this.resolvedAt = null;
    this.resolutionNotes = null;
  }
  
  return this.save();
};

// Method to assign bug to admin
bugSchema.methods.assignTo = function(adminUser) {
  this.assignedTo = {
    userId: adminUser._id,
    username: adminUser.username
  };
  return this.save();
};

// Static method to get bug statistics
bugSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] } },
        resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
        closed: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
        critical: { $sum: { $cond: [{ $eq: ['$priority', 'critical'] }, 1, 0] } },
        high: { $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] } },
        medium: { $sum: { $cond: [{ $eq: ['$priority', 'medium'] }, 1, 0] } },
        low: { $sum: { $cond: [{ $eq: ['$priority', 'low'] }, 1, 0] } }
      }
    }
  ]);
  
  return stats[0] || {
    total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0,
    critical: 0, high: 0, medium: 0, low: 0
  };
};

// Static method to get bugs by category
bugSchema.statics.getBugsByCategory = async function() {
  return await this.aggregate([
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// Pre-save middleware to update resolvedAt timestamp
bugSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    if (this.status === 'resolved' || this.status === 'closed') {
      if (!this.resolvedAt) {
        this.resolvedAt = new Date();
      }
    } else if (this.status === 'open' || this.status === 'in-progress') {
      this.resolvedAt = null;
    }
  }
  next();
});

module.exports = mongoose.model('Bug', bugSchema); 