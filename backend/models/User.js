const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
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

// Transform output to remove sensitive data
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.masterPassword;
  return userObject;
};

module.exports = mongoose.model('User', userSchema); 