const mongoose = require('mongoose');

const familyMemberSchema = new mongoose.Schema({
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
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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

// Ensure virtuals are included in JSON output
familyMemberSchema.set('toJSON', { virtuals: true });

// Index for efficient querying
familyMemberSchema.index({ createdBy: 1, isActive: 1 });

module.exports = mongoose.model('FamilyMember', familyMemberSchema); 