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
  mealType: {
    type: String,
    required: true,
    enum: ['breakfast', 'lunch', 'dinner', 'snack'],
    default: 'dinner'
  },
  date: {
    type: Date,
    required: true
  },
  ingredients: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    quantity: {
      type: String,
      required: true,
      trim: true
    },
    unit: {
      type: String,
      required: true,
      trim: true
    }
  }],
  recipe: {
    prepTime: {
      type: Number, // in minutes
      default: 0
    },
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
  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FamilyMember'
  }],
  tags: [{
    type: String,
    trim: true
  }],
  image: {
    type: String, // URL to meal image
    default: ''
  },
  isPlanned: {
    type: Boolean,
    default: true
  },
  isCooked: {
    type: Boolean,
    default: false
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
  return (this.recipe.prepTime || 0) + (this.recipe.cookTime || 0);
});

// Virtual for formatted date
mealSchema.virtual('formattedDate').get(function() {
  if (!this.date) return '';
  return this.date.toLocaleDateString();
});

// Ensure virtuals are included in JSON output
mealSchema.set('toJSON', { virtuals: true });

// Indexes for efficient querying
mealSchema.index({ date: 1, mealType: 1 });
mealSchema.index({ createdBy: 1, isPlanned: 1 });
mealSchema.index({ assignedTo: 1 });

module.exports = mongoose.model('Meal', mealSchema); 