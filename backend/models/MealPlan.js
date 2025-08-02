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

const mealPlanSchema = new mongoose.Schema({
  meal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meal',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  mealType: {
    type: String,
    required: true,
    enum: ['breakfast', 'lunch', 'dinner', 'snack'],
    default: 'dinner'
  },
  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FamilyMember'
  }],
  // Location information - where this meal plan will be executed
  location: locationSchema,
  isCooked: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
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
mealPlanSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for formatted date
mealPlanSchema.virtual('formattedDate').get(function() {
  if (!this.date) return '';
  return this.date.toLocaleDateString();
});

// Virtual to check if this is a future meal plan
mealPlanSchema.virtual('isFuture').get(function() {
  return this.date > new Date();
});

// Ensure virtuals are included in JSON output
mealPlanSchema.set('toJSON', { virtuals: true });

// Indexes for efficient querying
mealPlanSchema.index({ date: 1, mealType: 1 });
mealPlanSchema.index({ meal: 1 });
mealPlanSchema.index({ createdBy: 1 });
mealPlanSchema.index({ assignedTo: 1 });

// Compound index for finding specific meal plans
mealPlanSchema.index({ meal: 1, date: 1, mealType: 1 }, { unique: true });

module.exports = mongoose.model('MealPlan', mealPlanSchema); 