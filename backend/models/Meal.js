const mongoose = require('mongoose');

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
  ingredients: [{
    ingredient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ingredient',
      required: false // Optional - meal can exist without ingredients
    },
    quantity: {
      type: Number,
      required: false, // Optional - quantity can be empty
      min: 0
    },
    unit: {
      type: String,
      required: false, // Optional - unit can be empty
      enum: {
        values: ['lbs', 'oz', 'kg', 'g', 'count', 'cups', 'tbsp', 'tsp', 'ml', 'l'],
        message: 'Invalid unit. Must be one of: lbs, oz, kg, g, count, cups, tbsp, tsp, ml, l'
      },
      validate: {
        validator: function(value) {
          // Allow empty values
          if (value === null || value === undefined || value === '') {
            return true;
          }
          // Check if value is in enum
          return ['lbs', 'oz', 'kg', 'g', 'count', 'cups', 'tbsp', 'tsp', 'ml', 'l'].includes(value);
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