const express = require('express');
const { body, validationResult } = require('express-validator');
const FamilyMember = require('../models/FamilyMember');
const User = require('../models/User');
const { authenticateToken, requireAdmin, requireSystemAdmin, requireFamilyManagement } = require('../middleware/auth');

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
  body('dislikes').optional().isArray().withMessage('Dislikes must be an array'),
  body('hasLoginAccess').optional().isBoolean().withMessage('hasLoginAccess must be a boolean'),
  body('username').optional().trim().isLength({ min: 3, max: 50 }).withMessage('Username must be between 3 and 50 characters'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('role').optional().isIn(['admin', 'user']).withMessage('Role must be admin or user')
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
      avatar,
      hasLoginAccess,
      username,
      password,
      role
    } = req.body;

    // Validate authentication fields
    if (hasLoginAccess && (!username || !password)) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required when hasLoginAccess is true'
      });
    }

    // Check username uniqueness if provided
    if (username) {
      const existingUser = await User.findOne({ username });
      const existingFamilyMember = await FamilyMember.findOne({ username });
      
      if (existingUser || existingFamilyMember) {
        return res.status(400).json({
          success: false,
          message: 'Username already exists'
        });
      }
    }

    // Only system admins can assign admin role
    if (role === 'admin' && req.user.userType !== 'User') {
      return res.status(403).json({
        success: false,
        message: 'Only system administrators can assign admin role'
      });
    }

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
      hasLoginAccess: hasLoginAccess || false,
      username: username || undefined,
      password: password || undefined,
      role: role || 'user',
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
        message: 'Email or username already exists'
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
  body('dislikes').optional().isArray().withMessage('Dislikes must be an array'),
  body('hasLoginAccess').optional().isBoolean().withMessage('hasLoginAccess must be a boolean'),
  body('username').optional().trim().isLength({ min: 3, max: 50 }).withMessage('Username must be between 3 and 50 characters'),
  body('role').optional().isIn(['admin', 'user']).withMessage('Role must be admin or user')
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

    // Find existing family member
    const existingFamilyMember = await FamilyMember.findOne(query);
    if (!existingFamilyMember) {
      return res.status(404).json({
        success: false,
        message: 'Family member not found'
      });
    }

    const updateData = {};
    const allowedFields = [
      'firstName', 'lastName', 'email', 'dateOfBirth', 'relationship',
      'dietaryRestrictions', 'allergies', 'preferences', 'dislikes', 'avatar',
      'hasLoginAccess', 'username', 'role'
    ];

    // Only update fields that are provided
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // Validate authentication fields
    if (updateData.hasLoginAccess === true && !existingFamilyMember.username && !updateData.username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required when enabling login access'
      });
    }

    // Check username uniqueness if being updated
    if (updateData.username && updateData.username !== existingFamilyMember.username) {
      const existingUser = await User.findOne({ username: updateData.username });
      const existingFamilyMember = await FamilyMember.findOne({ 
        username: updateData.username,
        _id: { $ne: req.params.id }
      });
      
      if (existingUser || existingFamilyMember) {
        return res.status(400).json({
          success: false,
          message: 'Username already exists'
        });
      }
    }

    // Only system admins can assign admin role
    if (updateData.role === 'admin' && req.user.userType !== 'User') {
      return res.status(403).json({
        success: false,
        message: 'Only system administrators can assign admin role'
      });
    }

    // If disabling login access, clear authentication fields
    if (updateData.hasLoginAccess === false) {
      // Use $unset to properly remove fields from MongoDB document
      const familyMember = await FamilyMember.findOneAndUpdate(
        query,
        { 
          ...updateData,
          $unset: { 
            username: 1, 
            password: 1, 
            masterPassword: 1 
          }
        },
        { new: true, runValidators: true }
      ).populate('createdBy', 'firstName lastName username');

      return res.json({
        success: true,
        message: 'Family member updated successfully',
        familyMember
      });
    }

    const familyMember = await FamilyMember.findOneAndUpdate(
      query,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'firstName lastName username');

    res.json({
      success: true,
      message: 'Family member updated successfully',
      familyMember
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email or username already exists'
      });
    }
    
    console.error('Update family member error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating family member'
    });
  }
});

// Set/update family member password (admin only)
router.put('/:id/password', requireAdmin, [
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('currentPassword').optional().isLength({ min: 6 }).withMessage('Current password is required for verification')
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

    const { password, currentPassword } = req.body;

    // Find family member
    const familyMember = await FamilyMember.findById(req.params.id);
    if (!familyMember) {
      return res.status(404).json({
        success: false,
        message: 'Family member not found'
      });
    }

    // Verify current password if provided (for self-updates)
    if (currentPassword) {
      const isCurrentPasswordValid = await familyMember.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }
    }

    // Enable login access if not already enabled
    if (!familyMember.hasLoginAccess) {
      familyMember.hasLoginAccess = true;
    }

    // Update password
    familyMember.password = password;
    await familyMember.save();

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Password update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating password'
    });
  }
});

// Set/update family member master password (admin only)
router.put('/:id/master-password', requireAdmin, [
  body('masterPassword').isLength({ min: 6 }).withMessage('Master password must be at least 6 characters long'),
  body('currentPassword').optional().isLength({ min: 6 }).withMessage('Current password is required for verification')
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

    const { masterPassword, currentPassword } = req.body;

    // Find family member
    const familyMember = await FamilyMember.findById(req.params.id);
    if (!familyMember) {
      return res.status(404).json({
        success: false,
        message: 'Family member not found'
      });
    }

    // Only admin family members can have master password
    if (familyMember.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Only admin family members can have master password'
      });
    }

    // Verify current password if provided
    if (currentPassword) {
      const isCurrentPasswordValid = await familyMember.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }
    }

    // Update master password
    familyMember.masterPassword = masterPassword;
    await familyMember.save();

    res.json({
      success: true,
      message: 'Master password updated successfully'
    });
  } catch (error) {
    console.error('Master password update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating master password'
    });
  }
});

// Toggle login access (admin only)
router.put('/:id/toggle-login', requireAdmin, async (req, res) => {
  try {
    const familyMember = await FamilyMember.findById(req.params.id);
    if (!familyMember) {
      return res.status(404).json({
        success: false,
        message: 'Family member not found'
      });
    }

    const newLoginAccess = !familyMember.hasLoginAccess;
    
    let updatedFamilyMember;
    
    // If disabling login access, clear authentication fields
    if (!newLoginAccess) {
      updatedFamilyMember = await FamilyMember.findByIdAndUpdate(
        req.params.id,
        {
          hasLoginAccess: newLoginAccess,
          $unset: { 
            username: 1, 
            password: 1, 
            masterPassword: 1 
          }
        },
        { new: true }
      );
    } else {
      // If enabling login access, just set the flag
      // Note: Login won't work until username/password are set
      familyMember.hasLoginAccess = newLoginAccess;
      updatedFamilyMember = await familyMember.save();
    }

    res.json({
      success: true,
      message: `Login access ${newLoginAccess ? 'enabled' : 'disabled'} successfully`,
      familyMember: updatedFamilyMember
    });
  } catch (error) {
    console.error('Toggle login access error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while toggling login access'
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
          _id: null,
          totalMembers: { $sum: 1 },
          withLoginAccess: { $sum: { $cond: ['$hasLoginAccess', 1, 0] } },
          adminMembers: { $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] } },
          relationships: { $addToSet: '$relationship' },
          averageAge: { $avg: '$age' }
        }
      }
    ]);

    const relationshipStats = await FamilyMember.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$relationship',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      stats: {
        overview: stats[0] || {
          totalMembers: 0,
          withLoginAccess: 0,
          adminMembers: 0,
          relationships: [],
          averageAge: 0
        },
        relationshipBreakdown: relationshipStats
      }
    });
  } catch (error) {
    console.error('Family member stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching statistics'
    });
  }
});

module.exports = router; 