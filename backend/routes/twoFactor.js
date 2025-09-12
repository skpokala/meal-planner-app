const express = require('express');
const { body, validationResult } = require('express-validator');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const User = require('../models/User');
const FamilyMember = require('../models/FamilyMember');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Check 2FA status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    let user;
    if (req.user.userType === 'FamilyMember') {
      user = await FamilyMember.findById(req.user._id).select('twoFactorEnabled twoFactorSetupCompleted');
    } else {
      user = await User.findById(req.user._id).select('twoFactorEnabled twoFactorSetupCompleted');
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      twoFactorEnabled: user.twoFactorEnabled || false,
      setupCompleted: user.twoFactorSetupCompleted || false,
      backupCodesGenerated: user.twoFactorBackupCodes?.length > 0 || false
    });
  } catch (error) {
    console.error('2FA status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while checking 2FA status'
    });
  }
});

// Initialize 2FA setup - generate secret and QR code
router.post('/setup/init', authenticateToken, [
  body('password').notEmpty().withMessage('Password is required for verification')
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

    const { password } = req.body;

    // Find user with password field from appropriate model
    let user;
    if (req.user.userType === 'FamilyMember') {
      user = await FamilyMember.findById(req.user._id);
    } else {
      user = await User.findById(req.user._id);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const passwordVerification = await user.verifyPassword(password);
    if (!passwordVerification.valid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      issuer: 'Family Meal Planner',
      name: `${user.firstName} ${user.lastName} (${user.username})`,
      length: 32
    });

    // Save the secret temporarily (not enabled yet)
    user.twoFactorSecret = secret.base32;
    user.twoFactorSetupCompleted = false;
    await user.save();

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      success: true,
      secret: secret.base32,
      qrCode: qrCodeUrl,
      manualEntryKey: secret.base32,
      message: 'Scan this QR code with your authenticator app'
    });
  } catch (error) {
    console.error('2FA setup init error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while initializing 2FA setup'
    });
  }
});

// Complete 2FA setup - verify TOTP code
router.post('/setup/verify', authenticateToken, [
  body('token').isLength({ min: 6, max: 6 }).isNumeric().withMessage('Token must be 6 digits')
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

    const { token } = req.body;

    // Find user from appropriate model
    let user;
    if (req.user.userType === 'FamilyMember') {
      user = await FamilyMember.findById(req.user._id);
    } else {
      user = await User.findById(req.user._id);
    }

    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({
        success: false,
        message: '2FA setup not initialized'
      });
    }

    // Verify TOTP token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Invalid TOTP code'
      });
    }

    // Generate backup codes
    const backupCodes = user.generateBackupCodes();

    // Enable 2FA
    user.twoFactorEnabled = true;
    user.twoFactorSetupCompleted = true;
    await user.save();

    res.json({
      success: true,
      message: '2FA enabled successfully',
      backupCodes: backupCodes,
      warning: 'Please save these backup codes in a secure location. They will not be shown again.'
    });
  } catch (error) {
    console.error('2FA setup verify error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while verifying 2FA setup'
    });
  }
});

// Disable 2FA
router.post('/disable', authenticateToken, [
  body('password').notEmpty().withMessage('Password is required'),
  body('token').optional().isLength({ min: 6, max: 6 }).isNumeric().withMessage('Token must be 6 digits'),
  body('backupCode').optional().isLength({ min: 8, max: 8 }).withMessage('Backup code must be 8 characters')
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

    const { password, token, backupCode } = req.body;

    // Find user from appropriate model
    let user;
    if (req.user.userType === 'FamilyMember') {
      user = await FamilyMember.findById(req.user._id);
    } else {
      user = await User.findById(req.user._id);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify password
    const passwordVerification = await user.verifyPassword(password);
    if (!passwordVerification.valid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // If 2FA is enabled, verify TOTP or backup code
    if (user.twoFactorEnabled) {
      let verified = false;

      if (token) {
        verified = user.verifyTOTP(token);
      } else if (backupCode) {
        verified = user.verifyBackupCode(backupCode);
      }

      if (!verified) {
        return res.status(400).json({
          success: false,
          message: 'Invalid TOTP code or backup code'
        });
      }
    }

    // Disable 2FA
    user.twoFactorEnabled = false;
    user.twoFactorSetupCompleted = false;
    user.twoFactorSecret = undefined;
    user.twoFactorBackupCodes = [];
    await user.save();

    res.json({
      success: true,
      message: '2FA disabled successfully'
    });
  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while disabling 2FA'
    });
  }
});

// Generate new backup codes
router.post('/backup-codes/regenerate', authenticateToken, [
  body('password').notEmpty().withMessage('Password is required'),
  body('token').optional().isLength({ min: 6, max: 6 }).isNumeric().withMessage('Token must be 6 digits'),
  body('backupCode').optional().isLength({ min: 8, max: 8 }).withMessage('Backup code must be 8 characters')
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

    const { password, token, backupCode } = req.body;

    // Find user from appropriate model
    let user;
    if (req.user.userType === 'FamilyMember') {
      user = await FamilyMember.findById(req.user._id);
    } else {
      user = await User.findById(req.user._id);
    }

    if (!user || !user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: '2FA is not enabled'
      });
    }

    // Verify password
    const passwordVerification = await user.verifyPassword(password);
    if (!passwordVerification.valid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Verify TOTP or backup code
    let verified = false;
    if (token) {
      verified = user.verifyTOTP(token);
    } else if (backupCode) {
      verified = user.verifyBackupCode(backupCode);
    } else {
      return res.status(400).json({
        success: false,
        message: 'TOTP code or backup code is required'
      });
    }

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Invalid TOTP code or backup code'
      });
    }

    // Generate new backup codes
    const newBackupCodes = user.generateBackupCodes();
    await user.save();

    res.json({
      success: true,
      backupCodes: newBackupCodes,
      message: 'New backup codes generated successfully',
      warning: 'Please save these backup codes in a secure location. They replace your previous backup codes.'
    });
  } catch (error) {
    console.error('Backup codes regenerate error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating backup codes'
    });
  }
});

// Verify 2FA during login (used by auth routes)
router.post('/verify', [
  body('token').optional().isLength({ min: 6, max: 6 }).isNumeric().withMessage('Token must be 6 digits'),
  body('backupCode').optional().isLength({ min: 8, max: 8 }).withMessage('Backup code must be 8 characters'),
  body('temporaryToken').notEmpty().withMessage('Temporary token is required')
], async (req, res) => {
  try {
    console.log('2FA verify request:', { 
      hasToken: !!req.body.token, 
      hasBackupCode: !!req.body.backupCode, 
      hasTemporaryToken: !!req.body.temporaryToken 
    });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('2FA validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { token, backupCode, temporaryToken } = req.body;

    // This endpoint is used during login flow, not with authentication middleware
    // The temporaryToken contains user info for 2FA verification
    const jwt = require('jsonwebtoken');
    let decoded;
    try {
      decoded = jwt.verify(temporaryToken, process.env.JWT_SECRET || 'fallback-secret');
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid temporary token'
      });
    }

    // Find user from appropriate model
    let user;
    if (decoded.userType === 'FamilyMember') {
      user = await FamilyMember.findById(decoded.userId);
    } else {
      user = await User.findById(decoded.userId);
    }

    if (!user || !user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: '2FA is not enabled for this user'
      });
    }

    // Verify TOTP or backup code
    let verified = false;
    console.log('Verifying 2FA:', { 
      hasToken: !!token, 
      hasBackupCode: !!backupCode, 
      userTwoFactorEnabled: user.twoFactorEnabled,
      userHasSecret: !!user.twoFactorSecret,
      userHasBackupCodes: user.twoFactorBackupCodes?.length || 0
    });
    
    if (token) {
      verified = user.verifyTOTP(token);
      console.log('TOTP verification result:', verified);
    } else if (backupCode) {
      verified = user.verifyBackupCode(backupCode);
      console.log('Backup code verification result:', verified);
      if (verified) {
        await user.save(); // Save to remove used backup code
      }
    } else {
      console.log('No token or backup code provided');
      return res.status(400).json({
        success: false,
        message: 'TOTP code or backup code is required'
      });
    }

    if (!verified) {
      console.log('2FA verification failed');
      return res.status(400).json({
        success: false,
        message: 'Invalid TOTP code or backup code'
      });
    }

    // Generate final JWT token
    const finalToken = jwt.sign(
      { 
        userId: user._id, 
        username: user.username, 
        role: user.role,
        userType: decoded.userType 
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Prepare user response
    const userResponse = {
      id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      userType: decoded.userType,
      lastLogin: user.lastLogin,
      twoFactorEnabled: user.twoFactorEnabled
    };

    // Add additional fields for family members
    if (decoded.userType === 'FamilyMember') {
      userResponse.relationship = user.relationship;
      userResponse.hasLoginAccess = user.hasLoginAccess;
      userResponse.createdBy = user.createdBy;
    }

    res.json({
      success: true,
      message: 'Login successful',
      token: finalToken,
      user: userResponse
    });
  } catch (error) {
    console.error('2FA verify error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during 2FA verification'
    });
  }
});

module.exports = router; 