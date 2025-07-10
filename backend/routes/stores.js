const express = require('express');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Store = require('../models/Store');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all stores
router.get('/', async (req, res) => {
  try {
    const { active, search } = req.query;
    const query = { createdBy: req.user._id };
    
    // Filter by active status
    if (active !== undefined) {
      query.isActive = active === 'true';
    }
    
    // Search by name or address fields
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'address.street': { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } },
        { 'address.state': { $regex: search, $options: 'i' } },
        { 'address.zipCode': { $regex: search, $options: 'i' } }
      ];
    }
    
    const stores = await Store.find(query)
      .populate('createdBy', 'firstName lastName username')
      .sort({ name: 1 });
    
    res.json({
      success: true,
      stores,
      count: stores.length
    });
  } catch (error) {
    console.error('Get stores error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching stores'
    });
  }
});

// Get single store
router.get('/:id', async (req, res) => {
  try {
    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid store ID'
      });
    }
    
    const store = await Store.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    }).populate('createdBy', 'firstName lastName username');
    
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }
    
    res.json({
      success: true,
      store
    });
  } catch (error) {
    console.error('Get store error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching store'
    });
  }
});

// Create new store
router.post('/', [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Store name is required and must be less than 100 characters'),
  body('address.street').trim().isLength({ min: 1, max: 100 }).withMessage('Street address is required and must be less than 100 characters'),
  body('address.city').trim().isLength({ min: 1, max: 50 }).withMessage('City is required and must be less than 50 characters'),
  body('address.state').trim().isLength({ min: 1, max: 50 }).withMessage('State is required and must be less than 50 characters'),
  body('address.zipCode').trim().isLength({ min: 1, max: 20 }).withMessage('ZIP code is required and must be less than 20 characters'),
  body('address.country').optional().trim().isLength({ max: 50 }).withMessage('Country must be less than 50 characters'),
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
    
    const { name, address, isActive } = req.body;
    
    // Check for duplicate store name for this user
    const existingStore = await Store.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      createdBy: req.user._id,
      isActive: true
    });
    
    if (existingStore) {
      return res.status(400).json({
        success: false,
        message: 'A store with this name already exists'
      });
    }
    
    const store = new Store({
      name,
      address: {
        street: address.street,
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
        country: address.country || 'USA'
      },
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user._id
    });
    
    await store.save();
    
    // Populate the created store
    await store.populate('createdBy', 'firstName lastName username');
    
    res.status(201).json({
      success: true,
      message: 'Store created successfully',
      store
    });
  } catch (error) {
    console.error('Create store error:', error);
    
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
      message: 'Server error while creating store'
    });
  }
});

// Update store
router.put('/:id', [
  body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Store name must be less than 100 characters'),
  body('address.street').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Street address must be less than 100 characters'),
  body('address.city').optional().trim().isLength({ min: 1, max: 50 }).withMessage('City must be less than 50 characters'),
  body('address.state').optional().trim().isLength({ min: 1, max: 50 }).withMessage('State must be less than 50 characters'),
  body('address.zipCode').optional().trim().isLength({ min: 1, max: 20 }).withMessage('ZIP code must be less than 20 characters'),
  body('address.country').optional().trim().isLength({ max: 50 }).withMessage('Country must be less than 50 characters'),
  body('isActive').optional().isBoolean().withMessage('Active status must be boolean')
], async (req, res) => {
  try {
    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid store ID'
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
    
    const { name, address, isActive } = req.body;
    
    // Check if store exists and belongs to user
    const store = await Store.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });
    
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }
    
    // Check for duplicate name if name is being updated
    if (name && name.toLowerCase() !== store.name.toLowerCase()) {
      const existingStore = await Store.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        createdBy: req.user._id,
        _id: { $ne: req.params.id },
        isActive: true
      });
      
      if (existingStore) {
        return res.status(400).json({
          success: false,
          message: 'A store with this name already exists'
        });
      }
    }
    
    // Update fields
    if (name !== undefined) store.name = name;
    if (address) {
      if (address.street !== undefined) store.address.street = address.street;
      if (address.city !== undefined) store.address.city = address.city;
      if (address.state !== undefined) store.address.state = address.state;
      if (address.zipCode !== undefined) store.address.zipCode = address.zipCode;
      if (address.country !== undefined) store.address.country = address.country;
    }
    if (isActive !== undefined) store.isActive = isActive;
    
    await store.save();
    
    // Populate the updated store
    await store.populate('createdBy', 'firstName lastName username');
    
    res.json({
      success: true,
      message: 'Store updated successfully',
      store
    });
  } catch (error) {
    console.error('Update store error:', error);
    
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
      message: 'Server error while updating store'
    });
  }
});

// Delete store (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid store ID'
      });
    }
    
    const store = await Store.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });
    
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }
    
    // Soft delete by setting isActive to false
    store.isActive = false;
    await store.save();
    
    res.json({
      success: true,
      message: 'Store deleted successfully'
    });
  } catch (error) {
    console.error('Delete store error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting store'
    });
  }
});

module.exports = router; 