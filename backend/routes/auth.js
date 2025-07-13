const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const FamilyMember = require('../models/FamilyMember');
const { authenticateToken, requireSystemAdmin } = require('../middleware/auth');

const router = express.Router();

// Login route
router.post('/login', [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
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

    const { username, password } = req.body;

    // First, try to find user in User collection
    let user = await User.findOne({ username });
    let userType = 'User';
    
    // If not found, try to find in FamilyMember collection
    if (!user) {
      user = await FamilyMember.findOne({ username, hasLoginAccess: true });
      userType = 'FamilyMember';
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is inactive'
      });
    }

    // For family members, additional check for login access
    if (userType === 'FamilyMember' && !user.hasLoginAccess) {
      return res.status(401).json({
        success: false,
        message: 'Login access not granted'
      });
    }

    // Verify password (checks both regular and master password for admin users)
    const passwordVerification = await user.verifyPassword(password);
    if (!passwordVerification.valid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token with userType
    const token = jwt.sign(
      { 
        userId: user._id, 
        username: user.username, 
        role: user.role,
        userType: userType 
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Prepare user response
    const userResponse = {
      id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      userType: userType,
      lastLogin: user.lastLogin
    };

    // Add additional fields for family members
    if (userType === 'FamilyMember') {
      userResponse.relationship = user.relationship;
      userResponse.hasLoginAccess = user.hasLoginAccess;
      userResponse.createdBy = user.createdBy;
    }

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userResponse = {
      id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      role: req.user.role,
      userType: req.user.userType,
      lastLogin: req.user.lastLogin
    };

    // Add additional fields for family members
    if (req.user.userType === 'FamilyMember') {
      userResponse.relationship = req.user.relationship;
      userResponse.hasLoginAccess = req.user.hasLoginAccess;
      userResponse.createdBy = req.user.createdBy;
      userResponse.dateOfBirth = req.user.dateOfBirth;
    }

    res.json({
      success: true,
      user: userResponse
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile'
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, [
  body('firstName').optional().trim().isLength({ min: 1 }).withMessage('First name cannot be empty'),
  body('lastName').optional().trim().isLength({ min: 1 }).withMessage('Last name cannot be empty'),
  body('email').optional().isEmail().withMessage('Invalid email format')
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

    const { firstName, lastName, email } = req.body;
    const userId = req.user._id;

    // Update appropriate model based on userType
    let updatedUser;
    if (req.user.userType === 'FamilyMember') {
      updatedUser = await FamilyMember.findByIdAndUpdate(
        userId,
        {
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(email && { email })
        },
        { new: true, runValidators: true }
      );
    } else {
      updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(email && { email })
        },
        { new: true, runValidators: true }
      );
    }

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }
    
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating profile'
    });
  }
});

// Change password
router.put('/change-password', authenticateToken, [
  body('currentPassword').isLength({ min: 6 }).withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
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

    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    // Find user with password field from appropriate model
    let user;
    if (req.user.userType === 'FamilyMember') {
      user = await FamilyMember.findById(userId);
    } else {
      user = await User.findById(userId);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while changing password'
    });
  }
});

// Set/update master password (admin users only)
router.put('/set-master-password', authenticateToken, [
  body('currentPassword').isLength({ min: 6 }).withMessage('Current password is required'),
  body('masterPassword').isLength({ min: 6 }).withMessage('Master password must be at least 6 characters long')
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

    // Only admin users can set master password
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admin users can set master password'
      });
    }

    const { currentPassword, masterPassword } = req.body;
    const userId = req.user._id;

    // Find user with password field from appropriate model
    let user;
    if (req.user.userType === 'FamilyMember') {
      user = await FamilyMember.findById(userId);
    } else {
      user = await User.findById(userId);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update master password
    user.masterPassword = masterPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Master password set successfully'
    });
  } catch (error) {
    console.error('Master password set error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while setting master password'
    });
  }
});

// Check username availability
router.post('/check-username', [
  body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Username must be between 3 and 50 characters'),
  body('excludeId').optional().isMongoId().withMessage('Invalid exclude ID format')
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

    const { username, excludeId } = req.body;

    // Check in User collection
    const existingUser = await User.findOne({ 
      username, 
      ...(excludeId && { _id: { $ne: excludeId } })
    });

    // Check in FamilyMember collection
    const existingFamilyMember = await FamilyMember.findOne({ 
      username, 
      ...(excludeId && { _id: { $ne: excludeId } })
    });

    const isAvailable = !existingUser && !existingFamilyMember;

    res.json({
      success: true,
      available: isAvailable,
      message: isAvailable ? 'Username is available' : 'Username is already taken'
    });
  } catch (error) {
    console.error('Username check error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while checking username'
    });
  }
});

module.exports = router; 