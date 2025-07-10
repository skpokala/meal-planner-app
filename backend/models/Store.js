const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Store name is required'],
    trim: true,
    maxlength: [100, 'Store name cannot exceed 100 characters']
  },
  address: {
    street: {
      type: String,
      required: [true, 'Street address is required'],
      trim: true,
      maxlength: [100, 'Street address cannot exceed 100 characters']
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      maxlength: [50, 'City cannot exceed 50 characters']
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
      maxlength: [50, 'State cannot exceed 50 characters']
    },
    zipCode: {
      type: String,
      required: [true, 'ZIP code is required'],
      trim: true,
      maxlength: [20, 'ZIP code cannot exceed 20 characters']
    },
    country: {
      type: String,
      required: false,
      trim: true,
      maxlength: [50, 'Country cannot exceed 50 characters'],
      default: 'USA'
    }
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
storeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for full address display
storeSchema.virtual('fullAddress').get(function() {
  const parts = [
    this.address.street,
    this.address.city,
    this.address.state,
    this.address.zipCode
  ];
  if (this.address.country && this.address.country !== 'USA') {
    parts.push(this.address.country);
  }
  return parts.filter(part => part && part.trim()).join(', ');
});

// Ensure virtual fields are serialized
storeSchema.set('toJSON', { virtuals: true });
storeSchema.set('toObject', { virtuals: true });

// Index for efficient querying
storeSchema.index({ createdBy: 1, isActive: 1 });
storeSchema.index({ name: 1, createdBy: 1 });
storeSchema.index({ 'address.city': 1, createdBy: 1 });
storeSchema.index({ 'address.state': 1, createdBy: 1 });

module.exports = mongoose.model('Store', storeSchema); 