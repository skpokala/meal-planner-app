const express = require('express');
const router = express.Router();
const { body, validationResult, query } = require('express-validator');
const auth = require('../middleware/auth');
const ReleaseNotes = require('../models/ReleaseNotes');
const User = require('../models/User');

// GET /api/release-notes - Get paginated release notes (public)
router.get('/', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  query('type').optional().isIn(['major', 'minor', 'patch', 'hotfix']),
  query('version').optional().isString().trim()
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

    const { page = 1, limit = 10, type, version } = req.query;
    const filters = {};
    
    if (type) filters.type = type;
    if (version) filters.version = { $regex: version, $options: 'i' };

    const result = await ReleaseNotes.getPaginated(page, limit, filters);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching release notes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch release notes'
    });
  }
});

// GET /api/release-notes/latest - Get latest release notes
router.get('/latest', [
  query('limit').optional().isInt({ min: 1, max: 10 }).toInt()
], async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const releaseNotes = await ReleaseNotes.getLatest(limit);
    
    res.json({
      success: true,
      data: releaseNotes
    });
  } catch (error) {
    console.error('Error fetching latest release notes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch latest release notes'
    });
  }
});

// GET /api/release-notes/unviewed - Get unviewed release notes for current user
router.get('/unviewed', auth, async (req, res) => {
  try {
    const releaseNotes = await ReleaseNotes.getUnviewedForUser(req.user.id);
    
    res.json({
      success: true,
      data: releaseNotes
    });
  } catch (error) {
    console.error('Error fetching unviewed release notes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unviewed release notes'
    });
  }
});

// GET /api/release-notes/stats/summary - Get release notes statistics (admin only)
router.get('/stats/summary', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const totalReleases = await ReleaseNotes.countDocuments({ isVisible: true });
    const releasesByType = await ReleaseNotes.aggregate([
      { $match: { isVisible: true } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    const recentReleases = await ReleaseNotes.find({ isVisible: true })
      .sort({ releaseDate: -1 })
      .limit(5)
      .select('version title type releaseDate viewCount');

    const stats = {
      totalReleases,
      releasesByType: releasesByType.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      recentReleases
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching release notes statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch release notes statistics'
    });
  }
});

// GET /api/release-notes/:version - Get specific release notes by version
router.get('/:version', async (req, res) => {
  try {
    const releaseNotes = await ReleaseNotes.getByVersion(req.params.version);
    
    if (!releaseNotes) {
      return res.status(404).json({
        success: false,
        message: 'Release notes not found'
      });
    }
    
    res.json({
      success: true,
      data: releaseNotes
    });
  } catch (error) {
    console.error('Error fetching release notes by version:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch release notes'
    });
  }
});

// POST /api/release-notes - Create new release notes (admin only)
router.post('/', [
  auth,
  body('version').notEmpty().withMessage('Version is required'),
  body('title').notEmpty().withMessage('Title is required'),
  body('content').notEmpty().withMessage('Content is required'),
  body('type').optional().isIn(['major', 'minor', 'patch', 'hotfix']),
  body('features').optional().isArray(),
  body('bugFixes').optional().isArray(),
  body('improvements').optional().isArray(),
  body('author').optional().isString().trim(),
  body('githubCommitHash').optional().isString().trim(),
  body('githubPullRequests').optional().isArray(),
  body('showModal').optional().isBoolean()
], async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      version,
      title,
      content,
      type = 'patch',
      features = [],
      bugFixes = [],
      improvements = [],
      author,
      githubCommitHash,
      githubPullRequests = [],
      showModal = true
    } = req.body;

    // Check if version already exists
    const existingRelease = await ReleaseNotes.findOne({ version });
    if (existingRelease) {
      return res.status(400).json({
        success: false,
        message: 'Release notes for this version already exist'
      });
    }

    const releaseNotes = new ReleaseNotes({
      version,
      title,
      content,
      type,
      features,
      bugFixes,
      improvements,
      author: author || `${req.user.firstName} ${req.user.lastName}`,
      githubCommitHash,
      githubPullRequests,
      showModal
    });

    await releaseNotes.save();

    res.status(201).json({
      success: true,
      message: 'Release notes created successfully',
      data: releaseNotes
    });
  } catch (error) {
    console.error('Error creating release notes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create release notes'
    });
  }
});

// PUT /api/release-notes/:id - Update release notes (admin only)
router.put('/:id', [
  auth,
  body('title').optional().notEmpty().withMessage('Title cannot be empty'),
  body('content').optional().notEmpty().withMessage('Content cannot be empty'),
  body('type').optional().isIn(['major', 'minor', 'patch', 'hotfix']),
  body('features').optional().isArray(),
  body('bugFixes').optional().isArray(),
  body('improvements').optional().isArray(),
  body('author').optional().isString().trim(),
  body('githubCommitHash').optional().isString().trim(),
  body('githubPullRequests').optional().isArray(),
  body('showModal').optional().isBoolean(),
  body('isVisible').optional().isBoolean()
], async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const releaseNotes = await ReleaseNotes.findById(req.params.id);
    if (!releaseNotes) {
      return res.status(404).json({
        success: false,
        message: 'Release notes not found'
      });
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        releaseNotes[key] = req.body[key];
      }
    });

    await releaseNotes.save();

    res.json({
      success: true,
      message: 'Release notes updated successfully',
      data: releaseNotes
    });
  } catch (error) {
    console.error('Error updating release notes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update release notes'
    });
  }
});

// DELETE /api/release-notes/:id - Delete release notes (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const releaseNotes = await ReleaseNotes.findById(req.params.id);
    if (!releaseNotes) {
      return res.status(404).json({
        success: false,
        message: 'Release notes not found'
      });
    }

    await ReleaseNotes.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Release notes deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting release notes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete release notes'
    });
  }
});

// POST /api/release-notes/:id/mark-viewed - Mark release notes as viewed by current user
router.post('/:id/mark-viewed', auth, async (req, res) => {
  try {
    const releaseNotes = await ReleaseNotes.findById(req.params.id);
    if (!releaseNotes) {
      return res.status(404).json({
        success: false,
        message: 'Release notes not found'
      });
    }

    await releaseNotes.markAsViewed(req.user.id);

    res.json({
      success: true,
      message: 'Release notes marked as viewed'
    });
  } catch (error) {
    console.error('Error marking release notes as viewed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark release notes as viewed'
    });
  }
});

module.exports = router; 