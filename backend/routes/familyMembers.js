const express = require('express');
const { body, validationResult } = require('express-validator');
const FamilyMember = require('../models/FamilyMember');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all family members
router.get('/', async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { createdBy: req.user._id };
    const familyMembers = await FamilyMember.find({ ...query, isActive: true })
      .populate('createdBy', 'firstName lastName username')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: familyMembers.length,
      familyMembers
    });
  } catch (error) {
    console.error('Get family members error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching family members'
    });
  }
});

// Get single family member
router.get('/:id', async (req, res) => {
  try {
    const query = req.user.role === 'admin' 
      ? { _id: req.params.id } 
      : { _id: req.params.id, createdBy: req.user._id };
    
    const familyMember = await FamilyMember.findOne(query)
      .populate('createdBy', 'firstName lastName username');

    if (!familyMember) {
      return res.status(404).json({
        success: false,
        message: 'Family member not found'
      });
    }

    res.json({
      success: true,
      familyMember
    });
  } catch (error) {
    console.error('Get family member error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching family member'
    });
  }
});

// Create new family member
router.post('/', [
  body('firstName').trim().isLength({ min: 1 }).withMessage('First name is required'),
  body('lastName').trim().isLength({ min: 1 }).withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('dateOfBirth').isISO8601().withMessage('Valid date of birth is required'),
  body('relationship').isIn(['parent', 'child', 'spouse', 'sibling', 'grandparent', 'other']).withMessage('Invalid relationship type'),
  body('dietaryRestrictions').optional().isArray().withMessage('Dietary restrictions must be an array'),
  body('allergies').optional().isArray().withMessage('Allergies must be an array'),
  body('preferences').optional().isArray().withMessage('Preferences must be an array'),
  body('dislikes').optional().isArray().withMessage('Dislikes must be an array')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      firstName,
      lastName,
      email,
      dateOfBirth,
      relationship,
      dietaryRestrictions,
      allergies,
      preferences,
      dislikes,
      avatar
    } = req.body;

    // Create new family member
    const familyMember = new FamilyMember({
      firstName,
      lastName,
      email,
      dateOfBirth,
      relationship,
      dietaryRestrictions: dietaryRestrictions || [],
      allergies: allergies || [],
      preferences: preferences || [],
      dislikes: dislikes || [],
      avatar: avatar || '',
      createdBy: req.user._id
    });

    await familyMember.save();

    // Populate the createdBy field for response
    await familyMember.populate('createdBy', 'firstName lastName username');

    res.status(201).json({
      success: true,
      message: 'Family member created successfully',
      familyMember
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }
    
    console.error('Create family member error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating family member'
    });
  }
});

// Update family member
router.put('/:id', [
  body('firstName').optional().trim().isLength({ min: 1 }).withMessage('First name cannot be empty'),
  body('lastName').optional().trim().isLength({ min: 1 }).withMessage('Last name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('dateOfBirth').optional().isISO8601().withMessage('Valid date of birth is required'),
  body('relationship').optional().isIn(['parent', 'child', 'spouse', 'sibling', 'grandparent', 'other']).withMessage('Invalid relationship type'),
  body('dietaryRestrictions').optional().isArray().withMessage('Dietary restrictions must be an array'),
  body('allergies').optional().isArray().withMessage('Allergies must be an array'),
  body('preferences').optional().isArray().withMessage('Preferences must be an array'),
  body('dislikes').optional().isArray().withMessage('Dislikes must be an array')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const query = req.user.role === 'admin' 
      ? { _id: req.params.id } 
      : { _id: req.params.id, createdBy: req.user._id };

    const updateData = {};
    const allowedFields = [
      'firstName', 'lastName', 'email', 'dateOfBirth', 'relationship',
      'dietaryRestrictions', 'allergies', 'preferences', 'dislikes', 'avatar'
    ];

    // Only update fields that are provided
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const familyMember = await FamilyMember.findOneAndUpdate(
      query,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'firstName lastName username');

    if (!familyMember) {
      return res.status(404).json({
        success: false,
        message: 'Family member not found'
      });
    }

    res.json({
      success: true,
      message: 'Family member updated successfully',
      familyMember
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }
    
    console.error('Update family member error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating family member'
    });
  }
});

// Delete family member (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const query = req.user.role === 'admin' 
      ? { _id: req.params.id } 
      : { _id: req.params.id, createdBy: req.user._id };

    const familyMember = await FamilyMember.findOneAndUpdate(
      query,
      { isActive: false },
      { new: true }
    );

    if (!familyMember) {
      return res.status(404).json({
        success: false,
        message: 'Family member not found'
      });
    }

    res.json({
      success: true,
      message: 'Family member deleted successfully'
    });
  } catch (error) {
    console.error('Delete family member error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting family member'
    });
  }
});

// Get family member statistics (admin only)
router.get('/stats/overview', requireAdmin, async (req, res) => {
  try {
    const stats = await FamilyMember.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$relationship',
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: null,
          totalMembers: { $sum: '$count' },
          relationshipBreakdown: {
            $push: {
              relationship: '$_id',
              count: '$count'
            }
          }
        }
      }
    ]);

    const dietaryStats = await FamilyMember.aggregate([
      { $match: { isActive: true, dietaryRestrictions: { $ne: [] } } },
      { $unwind: '$dietaryRestrictions' },
      {
        $group: {
          _id: '$dietaryRestrictions',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      stats: {
        overview: stats[0] || { totalMembers: 0, relationshipBreakdown: [] },
        dietaryRestrictions: dietaryStats
      }
    });
  } catch (error) {
    console.error('Get family member stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching statistics'
    });
  }
});

module.exports = router; 