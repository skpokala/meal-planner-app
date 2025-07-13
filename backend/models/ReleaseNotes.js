const mongoose = require('mongoose');

const releaseNotesSchema = new mongoose.Schema({
  // Version Information
  version: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Release Information
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['major', 'minor', 'patch', 'hotfix'],
    default: 'patch'
  },
  
  // Metadata
  releaseDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  isVisible: {
    type: Boolean,
    default: true
  },
  showModal: {
    type: Boolean,
    default: true
  },
  
  // Content Structure
  features: [{
    type: { type: String },
    description: String
  }],
  bugFixes: [{
    type: { type: String },
    description: String
  }],
  improvements: [{
    type: { type: String },
    description: String
  }],
  
  // Author Information
  author: {
    type: String,
    default: 'System'
  },
  
  // GitHub Integration
  githubCommitHash: {
    type: String,
    index: true
  },
  githubPullRequests: [{
    number: Number,
    title: String,
    url: String
  }],
  
  // User Interaction
  viewCount: {
    type: Number,
    default: 0
  },
  usersViewed: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes for better performance
releaseNotesSchema.index({ version: 1, releaseDate: -1 });
releaseNotesSchema.index({ isVisible: 1, releaseDate: -1 });
releaseNotesSchema.index({ type: 1, releaseDate: -1 });

// Virtual for formatted release date
releaseNotesSchema.virtual('formattedReleaseDate').get(function() {
  return this.releaseDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Virtual for release summary
releaseNotesSchema.virtual('summary').get(function() {
  const totalChanges = this.features.length + this.bugFixes.length + this.improvements.length;
  return `${totalChanges} changes including ${this.features.length} new features, ${this.bugFixes.length} bug fixes, and ${this.improvements.length} improvements`;
});

// Static method to get latest release notes
releaseNotesSchema.statics.getLatest = function(limit = 10) {
  return this.find({ isVisible: true })
    .sort({ releaseDate: -1 })
    .limit(limit);
};

// Static method to get release notes by version
releaseNotesSchema.statics.getByVersion = function(version) {
  return this.findOne({ version, isVisible: true });
};

// Static method to get paginated release notes
releaseNotesSchema.statics.getPaginated = function(page = 1, limit = 10, filters = {}) {
  const query = { isVisible: true, ...filters };
  const skip = (page - 1) * limit;
  
  return Promise.all([
    this.find(query)
      .sort({ releaseDate: -1 })
      .skip(skip)
      .limit(limit),
    this.countDocuments(query)
  ]).then(([docs, total]) => ({
    docs,
    total,
    pages: Math.ceil(total / limit),
    currentPage: page,
    hasNext: page < Math.ceil(total / limit),
    hasPrev: page > 1
  }));
};

// Method to check if user has viewed this release
releaseNotesSchema.methods.hasUserViewed = function(userId) {
  return this.usersViewed.some(view => view.userId.equals(userId));
};

// Method to mark as viewed by user
releaseNotesSchema.methods.markAsViewed = function(userId) {
  if (!this.hasUserViewed(userId)) {
    this.usersViewed.push({ userId, viewedAt: new Date() });
    this.viewCount = this.usersViewed.length;
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to get release notes that should show modal for user
releaseNotesSchema.statics.getUnviewedForUser = function(userId, limit = 5) {
  return this.find({
    isVisible: true,
    showModal: true,
    'usersViewed.userId': { $ne: userId }
  })
  .sort({ releaseDate: -1 })
  .limit(limit);
};

// Pre-save middleware to update view count
releaseNotesSchema.pre('save', function(next) {
  if (this.isModified('usersViewed')) {
    this.viewCount = this.usersViewed.length;
  }
  next();
});

module.exports = mongoose.model('ReleaseNotes', releaseNotesSchema); 