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

const mealSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  prepTime: {
    type: Number, // in minutes
    default: 0
  },
  active: {
    type: Boolean,
    default: true
  },
  // Location information
  location: locationSchema,
  cuisine: {
    type: String,
    trim: true,
    maxlength: 50, // e.g., "Italian", "Mexican", "Chinese", etc.
  },
  region: {
    type: String,
    trim: true,
    maxlength: 100, // e.g., "Southern USA", "Mediterranean", "Southeast Asian"
  },
  ingredients: [{
    ingredient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ingredient',
      required: false // Optional - meal can exist without ingredients
    },
    quantity: {
      type: Number,
      required: false, // Optional - quantity can be empty
      min: 0,
      validate: {
        validator: function(value) {
          // Allow null, undefined
          if (value === null || value === undefined) {
            return true;
          }
          // If value exists, it should be a positive number
          return value >= 0;
        },
        message: 'Quantity must be a positive number or empty'
      }
    },
    unit: {
      type: String,
      required: false, // Optional - unit can be empty
      validate: {
        validator: function(value) {
          // Allow empty values (null, undefined, empty string)
          if (value === null || value === undefined || value === '') {
            return true;
          }
          // Check if value is in allowed units
          const validUnits = ['lbs', 'oz', 'kg', 'g', 'count', 'cups', 'tbsp', 'tsp', 'ml', 'l'];
          return validUnits.includes(value);
        },
        message: 'Invalid unit. Must be one of: lbs, oz, kg, g, count, cups, tbsp, tsp, ml, l'
      },
      trim: true
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 200 // Optional notes for this ingredient in the meal
    }
  }],
  recipe: {
    cookTime: {
      type: Number, // in minutes
      default: 0
    },
    servings: {
      type: Number,
      default: 1
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium'
    },
    instructions: [{
      step: {
        type: Number,
        required: true
      },
      description: {
        type: String,
        required: true,
        trim: true
      }
    }]
  },
  nutritionInfo: {
    calories: {
      type: Number,
      default: 0
    },
    protein: {
      type: Number,
      default: 0
    },
    carbs: {
      type: Number,
      default: 0
    },
    fat: {
      type: Number,
      default: 0
    },
    fiber: {
      type: Number,
      default: 0
    }
  },
  tags: [{
    type: String,
    trim: true
  }],
  image: {
    type: String, // URL to meal image
    default: ''
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 1000
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
mealSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for total cooking time
mealSchema.virtual('totalTime').get(function() {
  return (this.prepTime || 0) + (this.recipe.cookTime || 0);
});

// Ensure virtuals are included in JSON output
mealSchema.set('toJSON', { virtuals: true });

// Indexes for efficient querying
mealSchema.index({ name: 1 });
mealSchema.index({ active: 1 });
mealSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Meal', mealSchema); 