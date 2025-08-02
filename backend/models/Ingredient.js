const mongoose = require('mongoose');

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

const ingredientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Ingredient name is required'],
    trim: true,
    maxlength: [100, 'Ingredient name cannot exceed 100 characters']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity must be a positive number']
  },
  unit: {
    type: String,
    required: [true, 'Unit is required'],
    enum: {
      values: ['lbs', 'oz', 'kg', 'g', 'count', 'cups', 'tbsp', 'tsp', 'ml', 'l'],
      message: 'Unit must be one of: lbs, oz, kg, g, count, cups, tbsp, tsp, ml, l'
    }
  },
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: [true, 'Store is required']
  },
  // Optional direct location information (in addition to store location)
  // Useful for tracking specific pickup locations, seasonal availability by region, etc.
  location: locationSchema,
  seasonality: {
    availableMonths: [{
      type: Number,
      min: 1,
      max: 12
    }], // Array of month numbers (1-12) when ingredient is typically available
    notes: {
      type: String,
      trim: true,
      maxlength: 200
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
ingredientSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient querying
ingredientSchema.index({ createdBy: 1, isActive: 1 });
ingredientSchema.index({ name: 1, createdBy: 1 });
ingredientSchema.index({ store: 1, createdBy: 1 });

module.exports = mongoose.model('Ingredient', ingredientSchema); 