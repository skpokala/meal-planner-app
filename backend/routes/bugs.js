const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const Bug = require('../models/Bug');
const User = require('../models/User');
const FamilyMember = require('../models/FamilyMember');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Validation middleware
const validateBug = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('stepsToReproduce')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Steps to reproduce cannot exceed 1000 characters'),
  body('expectedBehavior')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Expected behavior cannot exceed 500 characters'),
  body('actualBehavior')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Actual behavior cannot exceed 500 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Priority must be low, medium, high, or critical'),
  body('severity')
    .optional()
    .isIn(['minor', 'moderate', 'major', 'blocker'])
    .withMessage('Severity must be minor, moderate, major, or blocker'),
  body('category')
    .optional()
    .isIn(['ui', 'functionality', 'performance', 'security', 'data', 'other'])
    .withMessage('Category must be ui, functionality, performance, security, data, or other'),
  body('environment.deviceType')
    .optional()
    .isIn(['desktop', 'tablet', 'mobile'])
    .withMessage('Device type must be desktop, tablet, or mobile'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters')
];

const validateBugUpdate = [
  body('status')
    .optional()
    .isIn(['open', 'in-progress', 'resolved', 'closed', 'wont-fix'])
    .withMessage('Status must be open, in-progress, resolved, closed, or wont-fix'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Priority must be low, medium, high, or critical'),
  body('assignedTo')
    .optional()
    .isMongoId()
    .withMessage('Assigned to must be a valid user ID'),
  body('resolutionNotes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Resolution notes cannot exceed 1000 characters'),
  body('estimatedTime')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Estimated time must be a positive number'),
  body('actualTime')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Actual time must be a positive number')
];

const validateComment = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment must be between 1 and 1000 characters'),
  body('isInternal')
    .optional()
    .isBoolean()
    .withMessage('isInternal must be a boolean')
];

// Helper function to get user info
const getUserInfo = async (userId, userType) => {
  let user;
  if (userType === 'User') {
    user = await User.findById(userId);
  } else {
    user = await FamilyMember.findById(userId);
  }
  
  if (!user) {
    throw new Error('User not found');
  }
  
  return {
    userId: user._id,
    userType,
    username: user.username,
    email: user.email
  };
};

// Helper function to check if user is admin
const isAdmin = (user) => {
  return user.role === 'admin' || user.role === 'system_admin';
};

// Helper function to build query filters
const buildQueryFilters = (query, user) => {
  const filters = {};
  
  // Non-admins can only see their own bugs
  if (!isAdmin(user)) {
    filters['reportedBy.userId'] = user._id;
  }
  
  // Status filter
  if (query.status) {
    filters.status = query.status;
  }
  
  // Priority filter
  if (query.priority) {
    filters.priority = query.priority;
  }
  
  // Category filter
  if (query.category) {
    filters.category = query.category;
  }
  
  // Assigned to filter (admin only)
  if (query.assignedTo && isAdmin(user)) {
    filters['assignedTo.userId'] = query.assignedTo;
  }
  
  // Date range filter
  if (query.startDate || query.endDate) {
    filters.createdAt = {};
    if (query.startDate) {
      filters.createdAt.$gte = new Date(query.startDate);
    }
    if (query.endDate) {
      filters.createdAt.$lte = new Date(query.endDate);
    }
  }
  
  // Search in title and description
  if (query.search) {
    filters.$or = [
      { title: { $regex: query.search, $options: 'i' } },
      { description: { $regex: query.search, $options: 'i' } }
    ];
  }
  
  return filters;
};

// @route   POST /api/bugs
// @desc    Create a new bug report
// @access  Private
router.post('/', authenticateToken, ...validateBug, async (req, res) => {
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
      title,
      description,
      stepsToReproduce,
      expectedBehavior,
      actualBehavior,
      priority,
      severity,
      category,
      environment,
      tags
    } = req.body;

    // Get user info
    const reportedBy = await getUserInfo(req.user._id, req.user.userType);

    // Auto-detect environment info if not provided
    const environmentInfo = {
      ...environment,
      appVersion: process.env.npm_package_version || '1.0.0'
    };

    const bug = new Bug({
      title,
      description,
      stepsToReproduce,
      expectedBehavior,
      actualBehavior,
      priority: priority || 'medium',
      severity: severity || 'moderate',
      category: category || 'functionality',
      environment: environmentInfo,
      reportedBy,
      tags: tags || []
    });

    await bug.save();

    res.status(201).json({
      success: true,
      message: 'Bug report submitted successfully',
      data: bug
    });
  } catch (error) {
    console.error('Error creating bug:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating bug report',
      error: error.message
    });
  }
});

// @route   GET /api/bugs
// @desc    Get bugs (all for admin, own for users)
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filters = buildQueryFilters(req.query, req.user);
    
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const bugs = await Bug.find(filters)
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('duplicateOf', 'title')
      .populate('relatedBugs', 'title')
      .lean();

    const totalBugs = await Bug.countDocuments(filters);
    const totalPages = Math.ceil(totalBugs / parseInt(limit));

    res.json({
      success: true,
      data: {
        bugs,
        pagination: {
          current: parseInt(page),
          total: totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
          totalRecords: totalBugs
        }
      }
    });
  } catch (error) {
    console.error('Error fetching bugs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bugs',
      error: error.message
    });
  }
});

// @route   GET /api/bugs/statistics
// @desc    Get bug statistics (admin only)
// @access  Private (Admin)
router.get('/statistics', authenticateToken, async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const [statistics, categoryCounts] = await Promise.all([
      Bug.getStatistics(),
      Bug.getBugsByCategory()
    ]);

    res.json({
      success: true,
      data: {
        overview: statistics,
        byCategory: categoryCounts
      }
    });
  } catch (error) {
    console.error('Error fetching bug statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

// @route   GET /api/bugs/:id
// @desc    Get a single bug
// @access  Private
router.get('/:id', authenticateToken, [param('id').isMongoId()], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bug ID',
        errors: errors.array()
      });
    }

    const bug = await Bug.findById(req.params.id)
      .populate('duplicateOf', 'title')
      .populate('relatedBugs', 'title');

    if (!bug) {
      return res.status(404).json({
        success: false,
        message: 'Bug not found'
      });
    }

    // Check if user can view this bug
    if (!isAdmin(req.user) && bug.reportedBy.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Filter out internal comments for non-admin users
    if (!isAdmin(req.user)) {
      bug.comments = bug.comments.filter(comment => !comment.isInternal);
    }

    res.json({
      success: true,
      data: bug
    });
  } catch (error) {
    console.error('Error fetching bug:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bug',
      error: error.message
    });
  }
});

// @route   PUT /api/bugs/:id
// @desc    Update a bug (admin only for status/priority, users can update their own bug details)
// @access  Private
router.put('/:id', authenticateToken, [param('id').isMongoId()], validateBugUpdate, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const bug = await Bug.findById(req.params.id);

    if (!bug) {
      return res.status(404).json({
        success: false,
        message: 'Bug not found'
      });
    }

    const isOwner = bug.reportedBy.userId.toString() === req.user._id.toString();
    const isAdminUser = isAdmin(req.user);

    // Check permissions
    if (!isOwner && !isAdminUser) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const {
      status,
      priority,
      assignedTo,
      resolutionNotes,
      estimatedTime,
      actualTime,
      tags,
      // User can update these fields on their own bugs
      title,
      description,
      stepsToReproduce,
      expectedBehavior,
      actualBehavior
    } = req.body;

    // Only admins can change status, priority, assignment
    if (isAdminUser) {
      if (status !== undefined) bug.status = status;
      if (priority !== undefined) bug.priority = priority;
      if (resolutionNotes !== undefined) bug.resolutionNotes = resolutionNotes;
      if (estimatedTime !== undefined) bug.estimatedTime = estimatedTime;
      if (actualTime !== undefined) bug.actualTime = actualTime;
      
      // Handle assignment
      if (assignedTo) {
        const assignedUser = await User.findById(assignedTo);
        if (!assignedUser || !isAdmin(assignedUser)) {
          return res.status(400).json({
            success: false,
            message: 'Cannot assign to non-admin user'
          });
        }
        bug.assignedTo = {
          userId: assignedUser._id,
          username: assignedUser.username
        };
      } else if (assignedTo === null) {
        bug.assignedTo = undefined;
      }
    }

    // Users can update their own bug details
    if (isOwner) {
      if (title !== undefined) bug.title = title;
      if (description !== undefined) bug.description = description;
      if (stepsToReproduce !== undefined) bug.stepsToReproduce = stepsToReproduce;
      if (expectedBehavior !== undefined) bug.expectedBehavior = expectedBehavior;
      if (actualBehavior !== undefined) bug.actualBehavior = actualBehavior;
      if (tags !== undefined) bug.tags = tags;
    }

    await bug.save();

    res.json({
      success: true,
      message: 'Bug updated successfully',
      data: bug
    });
  } catch (error) {
    console.error('Error updating bug:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating bug',
      error: error.message
    });
  }
});

// @route   POST /api/bugs/:id/comments
// @desc    Add a comment to a bug
// @access  Private
router.post('/:id/comments', authenticateToken, [param('id').isMongoId()], validateComment, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const bug = await Bug.findById(req.params.id);

    if (!bug) {
      return res.status(404).json({
        success: false,
        message: 'Bug not found'
      });
    }

    const isOwner = bug.reportedBy.userId.toString() === req.user._id.toString();
    const isAdminUser = isAdmin(req.user);

    // Check if user can comment on this bug
    if (!isOwner && !isAdminUser) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const { content, isInternal = false } = req.body;

    // Only admins can add internal comments
    const commentIsInternal = isInternal && isAdminUser;

    const author = await getUserInfo(req.user._id, req.user.userType);

    await bug.addComment(author, content, commentIsInternal);

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: bug
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding comment',
      error: error.message
    });
  }
});

// @route   DELETE /api/bugs/:id
// @desc    Delete a bug (admin only)
// @access  Private (Admin)
router.delete('/:id', authenticateToken, [param('id').isMongoId()], async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bug ID',
        errors: errors.array()
      });
    }

    const bug = await Bug.findById(req.params.id);

    if (!bug) {
      return res.status(404).json({
        success: false,
        message: 'Bug not found'
      });
    }

    await Bug.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Bug deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting bug:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting bug',
      error: error.message
    });
  }
});

// @route   GET /api/bugs/admin/dashboard
// @desc    Get admin dashboard data
// @access  Private (Admin)
router.get('/admin/dashboard', authenticateToken, async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const [
      recentBugs,
      criticalBugs,
      statistics,
      categoryCounts,
      assignedBugs
    ] = await Promise.all([
      Bug.find().sort({ createdAt: -1 }).limit(10).lean(),
      Bug.find({ priority: 'critical', status: { $nin: ['resolved', 'closed'] } }).lean(),
      Bug.getStatistics(),
      Bug.getBugsByCategory(),
      Bug.find({ 'assignedTo.userId': req.user._id, status: { $nin: ['resolved', 'closed'] } }).lean()
    ]);

    res.json({
      success: true,
      data: {
        recentBugs,
        criticalBugs,
        statistics,
        categoryCounts,
        assignedBugs
      }
    });
  } catch (error) {
    console.error('Error fetching admin dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: error.message
    });
  }
});

module.exports = router; 