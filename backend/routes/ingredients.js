const express = require('express');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Ingredient = require('../models/Ingredient');
const Store = require('../models/Store');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all ingredients
router.get('/', async (req, res) => {
  try {
    const { active, search, store } = req.query;
    const query = { createdBy: req.user._id };
    
    // Filter by active status
    if (active !== undefined) {
      query.isActive = active === 'true';
    }
    
    // Search by name
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    // Filter by store (ObjectId or store name)
    if (store) {
      if (mongoose.Types.ObjectId.isValid(store)) {
        // Direct ObjectId match
        query.store = store;
      } else {
        // Find store by name first, then filter by ObjectId
        const storeDoc = await Store.findOne({
          name: { $regex: store, $options: 'i' },
          createdBy: req.user._id,
          isActive: true
        });
        if (storeDoc) {
          query.store = storeDoc._id;
        } else {
          // If store name doesn't match any store, return empty results
          query.store = new mongoose.Types.ObjectId(); // Non-existent ObjectId
        }
      }
    }
    
    const ingredients = await Ingredient.find(query)
      .populate('createdBy', 'firstName lastName username')
      .populate('store', 'name address')
      .sort({ name: 1 });
    
    res.json({
      success: true,
      ingredients,
      count: ingredients.length
    });
  } catch (error) {
    console.error('Get ingredients error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching ingredients'
    });
  }
});

// Get available stores for dropdown (must be before /:id route)
router.get('/stores/list', async (req, res) => {
  try {
    const stores = await Store.find({
      createdBy: req.user._id,
      isActive: true
    }).select('name address').sort({ name: 1 });
    
    res.json({
      success: true,
      stores
    });
  } catch (error) {
    console.error('Get stores error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching stores'
    });
  }
});

// Get single ingredient
router.get('/:id', async (req, res) => {
  try {
    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ingredient ID'
      });
    }
    
    const ingredient = await Ingredient.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    })
    .populate('createdBy', 'firstName lastName username')
    .populate('store', 'name address');
    
    if (!ingredient) {
      return res.status(404).json({
        success: false,
        message: 'Ingredient not found'
      });
    }
    
    res.json({
      success: true,
      ingredient
    });
  } catch (error) {
    console.error('Get ingredient error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching ingredient'
    });
  }
});

// Create new ingredient
router.post('/', [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Ingredient name is required and must be less than 100 characters'),
  body('quantity').isNumeric().withMessage('Quantity must be a number').isFloat({ min: 0 }).withMessage('Quantity must be positive'),
  body('unit').isIn(['lbs', 'oz', 'kg', 'g', 'count', 'cups', 'tbsp', 'tsp', 'ml', 'l']).withMessage('Invalid unit'),
  body('store').isMongoId().withMessage('Valid store ID is required'),
  body('isActive').optional().isBoolean().withMessage('Active status must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    
    const { name, quantity, unit, store, isActive } = req.body;
    
    // Verify store exists and belongs to user
    const storeExists = await Store.findOne({
      _id: store,
      createdBy: req.user._id,
      isActive: true
    });
    
    if (!storeExists) {
      return res.status(400).json({
        success: false,
        message: 'Store not found or inactive'
      });
    }
    
    // Check for duplicate ingredient name for this user
    const existingIngredient = await Ingredient.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      createdBy: req.user._id,
      isActive: true
    });
    
    if (existingIngredient) {
      return res.status(400).json({
        success: false,
        message: 'An ingredient with this name already exists'
      });
    }
    
    const ingredient = new Ingredient({
      name,
      quantity,
      unit,
      store,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user._id
    });
    
    await ingredient.save();
    
    // Populate the created ingredient
    await ingredient.populate([
      { path: 'createdBy', select: 'firstName lastName username' },
      { path: 'store', select: 'name address' }
    ]);
    
    res.status(201).json({
      success: true,
      message: 'Ingredient created successfully',
      ingredient
    });
  } catch (error) {
    console.error('Create ingredient error:', error);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        path: err.path,
        msg: err.message
      }));
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while creating ingredient'
    });
  }
});

// Update ingredient
router.put('/:id', [
  body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Ingredient name must be less than 100 characters'),
  body('quantity').optional().isNumeric().withMessage('Quantity must be a number').isFloat({ min: 0 }).withMessage('Quantity must be positive'),
  body('unit').optional().isIn(['lbs', 'oz', 'kg', 'g', 'count', 'cups', 'tbsp', 'tsp', 'ml', 'l']).withMessage('Invalid unit'),
  body('store').optional().isMongoId().withMessage('Valid store ID is required'),
  body('isActive').optional().isBoolean().withMessage('Active status must be boolean')
], async (req, res) => {
  try {
    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ingredient ID'
      });
    }
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    
    const { name, quantity, unit, store, isActive } = req.body;
    
    // Check if ingredient exists and belongs to user
    const ingredient = await Ingredient.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });
    
    if (!ingredient) {
      return res.status(404).json({
        success: false,
        message: 'Ingredient not found'
      });
    }
    
    // If store is being updated, verify it exists and belongs to user
    if (store) {
      const storeExists = await Store.findOne({
        _id: store,
        createdBy: req.user._id,
        isActive: true
      });
      
      if (!storeExists) {
        return res.status(400).json({
          success: false,
          message: 'Store not found or inactive'
        });
      }
    }
    
    // Check for duplicate name if name is being updated
    if (name && name.toLowerCase() !== ingredient.name.toLowerCase()) {
      const existingIngredient = await Ingredient.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        createdBy: req.user._id,
        _id: { $ne: req.params.id },
        isActive: true
      });
      
      if (existingIngredient) {
        return res.status(400).json({
          success: false,
          message: 'An ingredient with this name already exists'
        });
      }
    }
    
    // Update fields
    if (name !== undefined) ingredient.name = name;
    if (quantity !== undefined) ingredient.quantity = quantity;
    if (unit !== undefined) ingredient.unit = unit;
    if (store !== undefined) ingredient.store = store;
    if (isActive !== undefined) ingredient.isActive = isActive;
    
    await ingredient.save();
    
    // Populate the updated ingredient
    await ingredient.populate([
      { path: 'createdBy', select: 'firstName lastName username' },
      { path: 'store', select: 'name address' }
    ]);
    
    res.json({
      success: true,
      message: 'Ingredient updated successfully',
      ingredient
    });
  } catch (error) {
    console.error('Update ingredient error:', error);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        path: err.path,
        msg: err.message
      }));
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while updating ingredient'
    });
  }
});

// Delete ingredient (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ingredient ID'
      });
    }
    
    const ingredient = await Ingredient.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });
    
    if (!ingredient) {
      return res.status(404).json({
        success: false,
        message: 'Ingredient not found'
      });
    }
    
    // Soft delete by setting isActive to false
    ingredient.isActive = false;
    await ingredient.save();
    
    res.json({
      success: true,
      message: 'Ingredient deleted successfully'
    });
  } catch (error) {
    console.error('Delete ingredient error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting ingredient'
    });
  }
});

module.exports = router; 