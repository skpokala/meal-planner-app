const jwt = require('jsonwebtoken');
const User = require('../models/User');
const FamilyMember = require('../models/FamilyMember');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    
    // Determine user type and load appropriate model
    let user;
    const userType = decoded.userType || 'User'; // Default to User for backward compatibility
    
    if (userType === 'FamilyMember') {
      user = await FamilyMember.findById(decoded.userId).select('-password -masterPassword');
    } else {
      user = await User.findById(decoded.userId).select('-password -masterPassword');
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is inactive'
      });
    }

    // For family members, check if they have login access
    if (userType === 'FamilyMember' && !user.hasLoginAccess) {
      return res.status(401).json({
        success: false,
        message: 'Login access not granted for this family member'
      });
    }

    // Add userType to user object for downstream use
    req.user = user;
    req.user.userType = userType;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Token verification failed'
    });
  }
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

// Middleware to check if user owns the resource or is admin
const requireOwnershipOrAdmin = (resourceUserField = 'createdBy') => {
  return (req, res, next) => {
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user owns the resource
    if (req.resource && req.resource[resourceUserField]) {
      if (req.resource[resourceUserField].toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only access your own resources'
        });
      }
    }

    next();
  };
};

// Middleware to check if user is a system admin (User with admin role)
const requireSystemAdmin = (req, res, next) => {
  if (req.user.userType !== 'User' || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'System admin access required'
    });
  }
  next();
};

// Middleware to check if user can manage family members
const requireFamilyManagement = (req, res, next) => {
  // System admins can manage all family members
  if (req.user.userType === 'User' && req.user.role === 'admin') {
    return next();
  }
  
  // Family member admins can manage family members they created
  if (req.user.userType === 'FamilyMember' && req.user.role === 'admin') {
    return next();
  }
  
  // Regular users can only manage their own family member record
  return res.status(403).json({
    success: false,
    message: 'Insufficient permissions to manage family members'
  });
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireOwnershipOrAdmin,
  requireSystemAdmin,
  requireFamilyManagement
}; 