const mongoose = require('mongoose');

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