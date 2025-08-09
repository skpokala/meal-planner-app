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

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
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
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  masterPassword: {
    type: String,
    required: false,
    minlength: 6
  },
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
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user'
  },
  // Location information
  location: locationSchema,
  // UI preferences
  theme: {
    type: String,
    enum: ['light', 'dark', 'system'],
    default: 'system'
  },
  themeStyle: {
    type: String,
    enum: ['classic', 'modern'],
    default: 'classic'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
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
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  try {
    // Hash regular password if modified
    if (this.isModified('password')) {
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
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Compare master password method (admin users only)
userSchema.methods.compareMasterPassword = async function(candidatePassword) {
  if (this.role !== 'admin' || !this.masterPassword) {
    return false;
  }
  return await bcrypt.compare(candidatePassword, this.masterPassword);
};

// Verify any password (regular or master for admin users)
userSchema.methods.verifyPassword = async function(candidatePassword) {
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
userSchema.methods.verifyTOTP = function(token) {
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
userSchema.methods.verifyBackupCode = function(code) {
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
userSchema.methods.generateBackupCodes = function() {
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

// Transform output to remove sensitive data
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.masterPassword;
  delete userObject.twoFactorSecret;
  delete userObject.twoFactorBackupCodes;
  return userObject;
};

module.exports = mongoose.model('User', userSchema); 