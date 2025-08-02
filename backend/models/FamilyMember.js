const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Reusable location schema
const locationSchema = {
  address: {
    street: {
      type: String,
      trim: true,
      maxlength: [100, 'Street address cannot exceed 100 characters']
    },
    city: {
      type: String,
      trim: true,
      maxlength: [50, 'City cannot exceed 50 characters']
    },
    state: {
      type: String,
      trim: true,
      maxlength: [50, 'State cannot exceed 50 characters']
    },
    zipCode: {
      type: String,
      trim: true,
      maxlength: [20, 'ZIP code cannot exceed 20 characters']
    },
    country: {
      type: String,
      trim: true,
      maxlength: [50, 'Country cannot exceed 50 characters'],
      default: 'USA'
    }
  },
  coordinates: {
    latitude: {
      type: Number,
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90']
    },
    longitude: {
      type: Number,  
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180']
    }
  },
  timezone: {
    type: String,
    trim: true,
    maxlength: [50, 'Timezone cannot exceed 50 characters'],
    default: 'America/New_York'
  }
};

const familyMemberSchema = new mongoose.Schema({
  // Authentication fields
  username: {
    type: String,
    required: false, // Optional - only required if family member has login access
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50,
    sparse: true // Allows null values while maintaining uniqueness for non-null values
  },
  password: {
    type: String,
    required: false, // Optional - only required if username is provided
    minlength: 6
  },
  masterPassword: {
    type: String,
    required: false,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user'
  },
  hasLoginAccess: {
    type: Boolean,
    default: false
  },
  // Personal information
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  relationship: {
    type: String,
    required: true,
    enum: ['parent', 'child', 'spouse', 'sibling', 'grandparent', 'other'],
    default: 'other'
  },
  dietaryRestrictions: [{
    type: String,
    enum: ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free', 'seafood-free', 'kosher', 'halal', 'other']
  }],
  allergies: [{
    type: String,
    trim: true
  }],
  preferences: [{
    type: String,
    trim: true
  }],
  dislikes: [{
    type: String,
    trim: true
  }],
  avatar: {
    type: String, // URL to avatar image
    default: ''
  },
  // Location information
  useParentLocation: {
    type: Boolean,
    default: true // By default, inherit location from the creating user
  },
  location: locationSchema, // Individual location if not using parent location
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // 2FA TOTP fields
  twoFactorSecret: {
    type: String,
    required: false
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorBackupCodes: {
    type: [String],
    default: []
  },
  twoFactorSetupCompleted: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
familyMemberSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Hash password before saving
familyMemberSchema.pre('save', async function(next) {
  try {
    // If hasLoginAccess is true and username/password are being explicitly set, validate them
    // This allows toggling hasLoginAccess without requiring credentials immediately
    if (this.hasLoginAccess && (this.isModified('username') || this.isModified('password'))) {
      if (this.username && !this.password) {
        const error = new Error('Password is required when username is set');
        return next(error);
      }
      if (this.password && !this.username) {
        const error = new Error('Username is required when password is set');
        return next(error);
      }
    }
    
    // Hash regular password if modified
    if (this.isModified('password') && this.password) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
    
    // Hash master password if modified (only for admin users)
    if (this.isModified('masterPassword') && this.masterPassword) {
      if (this.role === 'admin') {
        const salt = await bcrypt.genSalt(10);
        this.masterPassword = await bcrypt.hash(this.masterPassword, salt);
      } else {
        // Clear master password for non-admin users
        this.masterPassword = undefined;
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
familyMemberSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Compare master password method (admin users only)
familyMemberSchema.methods.compareMasterPassword = async function(candidatePassword) {
  if (this.role !== 'admin' || !this.masterPassword) {
    return false;
  }
  return await bcrypt.compare(candidatePassword, this.masterPassword);
};

// Verify any password (regular or master for admin users)
familyMemberSchema.methods.verifyPassword = async function(candidatePassword) {
  if (!this.hasLoginAccess) {
    return { valid: false, type: null };
  }
  
  // First check regular password
  const isRegularPasswordValid = await this.comparePassword(candidatePassword);
  if (isRegularPasswordValid) {
    return { valid: true, type: 'regular' };
  }
  
  // For admin users, also check master password
  if (this.role === 'admin') {
    const isMasterPasswordValid = await this.compareMasterPassword(candidatePassword);
    if (isMasterPasswordValid) {
      return { valid: true, type: 'master' };
    }
  }
  
  return { valid: false, type: null };
};

// TOTP verification method
familyMemberSchema.methods.verifyTOTP = function(token) {
  if (!this.twoFactorSecret || !this.twoFactorEnabled) {
    return false;
  }
  
  const speakeasy = require('speakeasy');
  return speakeasy.totp.verify({
    secret: this.twoFactorSecret,
    encoding: 'base32',
    token: token,
    window: 2 // Allow for time drift
  });
};

// Check if backup code is valid and remove it from the list
familyMemberSchema.methods.verifyBackupCode = function(code) {
  if (!this.twoFactorBackupCodes || this.twoFactorBackupCodes.length === 0) {
    return false;
  }
  
  const bcrypt = require('bcryptjs');
  for (let i = 0; i < this.twoFactorBackupCodes.length; i++) {
    if (bcrypt.compareSync(code, this.twoFactorBackupCodes[i])) {
      // Remove used backup code
      this.twoFactorBackupCodes.splice(i, 1);
      return true;
    }
  }
  return false;
};

// Generate backup codes
familyMemberSchema.methods.generateBackupCodes = function() {
  const bcrypt = require('bcryptjs');
  const crypto = require('crypto');
  const codes = [];
  const hashedCodes = [];
  
  for (let i = 0; i < 8; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(code);
    hashedCodes.push(bcrypt.hashSync(code, 10));
  }
  
  this.twoFactorBackupCodes = hashedCodes;
  return codes; // Return plain codes for user to save
};

// Virtual for full name
familyMemberSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for age calculation
familyMemberSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

// Transform output to remove sensitive data
familyMemberSchema.methods.toJSON = function() {
  const familyMemberObject = this.toObject();
  delete familyMemberObject.password;
  delete familyMemberObject.masterPassword;
  delete familyMemberObject.twoFactorSecret;
  delete familyMemberObject.twoFactorBackupCodes;
  return familyMemberObject;
};

// Ensure virtuals are included in JSON output
familyMemberSchema.set('toJSON', { virtuals: true });

// Index for efficient querying
familyMemberSchema.index({ createdBy: 1, isActive: 1 });
familyMemberSchema.index({ username: 1 }, { sparse: true });

module.exports = mongoose.model('FamilyMember', familyMemberSchema); 