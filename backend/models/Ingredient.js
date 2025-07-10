const mongoose = require('mongoose');

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
    type: String,
    required: [true, 'Store is required'],
    trim: true,
    maxlength: [100, 'Store name cannot exceed 100 characters']
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

module.exports = mongoose.model('Ingredient', ingredientSchema); 