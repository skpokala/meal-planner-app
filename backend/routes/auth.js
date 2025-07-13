const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const FamilyMember = require('../models/FamilyMember');
const Audit = require('../models/Audit');
const { authenticateToken, requireSystemAdmin } = require('../middleware/auth');

const router = express.Router();

// Helper function to extract client information
const getClientInfo = (req) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  const ipAddress = forwardedFor 
    ? forwardedFor.split(',')[0].trim() 
    : req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
  
  const userAgent = req.headers['user-agent'] || 'unknown';
  
  return {
    ipAddress: ipAddress === '::1' ? '127.0.0.1' : ipAddress, // Normalize localhost
    userAgent
  };
};

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
    const clientInfo = getClientInfo(req);

    if (process.env.NODE_ENV === 'test') {
      console.log('Auth route processing login for username:', username);
    }

    // First, try to find user in User collection
    let user = await User.findOne({ username });
    let userType = 'User';
    
    // If not found, try to find in FamilyMember collection
    if (!user) {
      user = await FamilyMember.findOne({ username, hasLoginAccess: true });
      userType = 'FamilyMember';
    }

    if (!user) {
      // Log failed login attempt
      if (process.env.NODE_ENV === 'test') {
        console.log('Attempting to log audit event for non-existent user:', username);
      }
      
      const auditResult = await Audit.logEvent({
        action: 'failed_login',
        status: 'failure',
        userId: null,
        userType: 'Unknown',
        username: username,
        userDisplayName: username,
        userRole: 'unknown',
        sessionId: null,
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        failureReason: 'User not found'
      });
      
      if (process.env.NODE_ENV === 'test') {
        console.log('Audit log result:', auditResult ? 'Success' : 'Failed');
        if (auditResult) {
          console.log('Audit log ID:', auditResult._id);
        }
      }
      
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      // Log failed login attempt
      await Audit.logEvent({
        action: 'failed_login',
        status: 'failure',
        userId: user._id,
        userType: userType,
        username: user.username,
        userDisplayName: `${user.firstName} ${user.lastName}`,
        userRole: user.role,
        sessionId: null,
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        failureReason: 'Account is inactive'
      });
      
      return res.status(401).json({
        success: false,
        message: 'Account is inactive'
      });
    }

    // For family members, additional check for login access
    if (userType === 'FamilyMember' && !user.hasLoginAccess) {
      // Log failed login attempt
      await Audit.logEvent({
        action: 'failed_login',
        status: 'failure',
        userId: user._id,
        userType: userType,
        username: user.username,
        userDisplayName: `${user.firstName} ${user.lastName}`,
        userRole: user.role,
        sessionId: null,
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        failureReason: 'Login access not granted'
      });
      
      return res.status(401).json({
        success: false,
        message: 'Login access not granted'
      });
    }

    // Verify password (checks both regular and master password for admin users)
    const passwordVerification = await user.verifyPassword(password);
    if (!passwordVerification.valid) {
      // Log failed login attempt
      await Audit.logEvent({
        action: 'failed_login',
        status: 'failure',
        userId: user._id,
        userType: userType,
        username: user.username,
        userDisplayName: `${user.firstName} ${user.lastName}`,
        userRole: user.role,
        sessionId: null,
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        failureReason: 'Invalid password'
      });
      
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

    // Log successful login
    await Audit.logEvent({
      action: 'login',
      status: 'success',
      userId: user._id,
      userType: userType,
      username: user.username,
      userDisplayName: `${user.firstName} ${user.lastName}`,
      userRole: user.role,
      sessionId: token.substring(0, 8), // Use first 8 chars of token as session ID
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      details: {
        loginMethod: passwordVerification.method || 'password',
        timestamp: user.lastLogin
      }
    });

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

// Logout route
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const clientInfo = getClientInfo(req);
    
    // Log logout event
    await Audit.logEvent({
      action: 'logout',
      status: 'success',
      userId: req.user._id,
      userType: req.user.userType,
      username: req.user.username,
      userDisplayName: `${req.user.firstName} ${req.user.lastName}`,
      userRole: req.user.role,
      sessionId: req.headers.authorization?.substring(7, 15) || null, // Extract from Bearer token
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      details: {
        timestamp: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
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