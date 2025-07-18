const express = require('express');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Meal = require('../models/Meal');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all meals with filters
router.get('/', async (req, res) => {
  try {
    const { search, active } = req.query;
    
    // Build query - all users can see all meals
    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (active !== undefined) {
      query.active = active === 'true';
    }

    const meals = await Meal.find(query)
      .populate('createdBy', 'firstName lastName username')
      .populate('ingredients.ingredient', 'name unit store')
      .sort({ name: 1 });

    res.json({
      success: true,
      count: meals.length,
      meals
    });
  } catch (error) {
    console.error('Get meals error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching meals'
    });
  }
});

// Get single meal
router.get('/:id', async (req, res) => {
  try {
    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid meal ID'
      });
    }

    // All users can see all meals
    const query = { _id: req.params.id };
    
    const meal = await Meal.findOne(query)
      .populate('createdBy', 'firstName lastName username')
      .populate({
        path: 'ingredients.ingredient',
        select: 'name unit store',
        populate: {
          path: 'store',
          select: 'name address'
        }
      });

    if (!meal) {
      return res.status(404).json({
        success: false,
        message: 'Meal not found'
      });
    }

    res.json({
      success: true,
      meal
    });
  } catch (error) {
    console.error('Get meal error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching meal'
    });
  }
});

// Create new meal
router.post('/', [
  body('name').trim().isLength({ min: 1 }).withMessage('Meal name is required').isLength({ max: 100 }).withMessage('Meal name must be less than 100 characters'),
  body('prepTime').optional().isNumeric().withMessage('Prep time must be a number'),
  body('active').optional().isBoolean().withMessage('Active must be a boolean'),
  body('ingredients').optional().isArray().withMessage('Ingredients must be an array'),
  body('ingredients.*.ingredient').optional().custom(value => {
    if (value === null || value === undefined || value === '') {
      return true; // Allow null, undefined, or empty string
    }
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(value)) {
      throw new Error('Invalid ingredient ID');
    }
    return true;
  }),
  body('ingredients.*.quantity').optional().custom(value => {
    if (value === null || value === undefined || value === '') {
      return true; // Allow null, undefined, or empty string
    }
    if (isNaN(value) || value < 0) {
      throw new Error('Quantity must be a positive number or empty');
    }
    return true;
  }),
  body('ingredients.*.unit').optional().custom(value => {
    if (value === null || value === undefined || value === '') {
      return true; // Allow null, undefined, or empty string
    }
    const validUnits = ['lbs', 'oz', 'kg', 'g', 'count', 'cups', 'tbsp', 'tsp', 'ml', 'l'];
    if (!validUnits.includes(value)) {
      throw new Error('Invalid unit. Must be one of: ' + validUnits.join(', '));
    }
    return true;
  }),
  body('recipe.cookTime').optional().isNumeric().withMessage('Cook time must be a number'),
  body('recipe.servings').optional().isNumeric().withMessage('Servings must be a number'),
  body('recipe.difficulty').optional().isIn(['easy', 'medium', 'hard']).withMessage('Invalid difficulty level')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      name,
      description,
      prepTime,
      active,
      ingredients,
      recipe,
      nutritionInfo,
      tags,
      image,
      notes
    } = req.body;

    // Check for duplicate meal name for this user
    const existingMeal = await Meal.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      createdBy: req.user._id,
      active: true
    });

    if (existingMeal) {
      return res.status(400).json({
        success: false,
        message: 'A meal with this name already exists'
      });
    }

    // Create new meal
    const meal = new Meal({
      name,
      description: description || '',
      prepTime: prepTime || 0,
      active: active !== undefined ? active : true,
      ingredients: ingredients || [],
      recipe: recipe || {},
      nutritionInfo: nutritionInfo || {},
      tags: tags || [],
      image: image || '',
      notes: notes || '',
      createdBy: req.user._id
    });

    await meal.save();

    // Populate the references for response
    await meal.populate('createdBy', 'firstName lastName username');
    await meal.populate({
      path: 'ingredients.ingredient',
      select: 'name unit store',
      populate: {
        path: 'store',
        select: 'name address'
      }
    });

    res.status(201).json({
      success: true,
      message: 'Meal created successfully',
      meal
    });
  } catch (error) {
    console.error('Create meal error:', error);
    
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
      message: 'Server error while creating meal'
    });
  }
});

// Update meal
router.put('/:id', [
  body('name').optional().trim().isLength({ min: 1 }).withMessage('Meal name cannot be empty'),
  body('prepTime').optional().isNumeric().withMessage('Prep time must be a number'),
  body('active').optional().isBoolean().withMessage('Active must be a boolean'),
  body('ingredients').optional().isArray().withMessage('Ingredients must be an array'),
  body('ingredients.*.ingredient').optional().custom(value => {
    if (value === null || value === undefined || value === '') {
      return true; // Allow null, undefined, or empty string
    }
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(value)) {
      throw new Error('Invalid ingredient ID');
    }
    return true;
  }),
  body('ingredients.*.quantity').optional().custom(value => {
    if (value === null || value === undefined || value === '') {
      return true; // Allow null, undefined, or empty string
    }
    if (isNaN(value) || value < 0) {
      throw new Error('Quantity must be a positive number or empty');
    }
    return true;
  }),
  body('ingredients.*.unit').optional().custom(value => {
    if (value === null || value === undefined || value === '') {
      return true; // Allow null, undefined, or empty string
    }
    const validUnits = ['lbs', 'oz', 'kg', 'g', 'count', 'cups', 'tbsp', 'tsp', 'ml', 'l'];
    if (!validUnits.includes(value)) {
      throw new Error('Invalid unit. Must be one of: ' + validUnits.join(', '));
    }
    return true;
  }),
  body('recipe.cookTime').optional().isNumeric().withMessage('Cook time must be a number'),
  body('recipe.servings').optional().isNumeric().withMessage('Servings must be a number'),
  body('recipe.difficulty').optional().isIn(['easy', 'medium', 'hard']).withMessage('Invalid difficulty level'),
  body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const query = req.user.role === 'admin' 
      ? { _id: req.params.id } 
      : { _id: req.params.id, createdBy: req.user._id };

    const updateData = {};
    const allowedFields = [
      'name', 'description', 'prepTime', 'active', 'ingredients', 'recipe',
      'nutritionInfo', 'tags', 'image', 'rating', 'notes'
    ];

    // Only update fields that are provided
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // Check for duplicate meal name if name is being updated
    if (req.body.name) {
      const existingMeal = await Meal.findOne({
        name: { $regex: new RegExp(`^${req.body.name}$`, 'i') },
        createdBy: req.user._id,
        active: true,
        _id: { $ne: req.params.id } // Exclude current meal from duplicate check
      });

      if (existingMeal) {
        return res.status(400).json({
          success: false,
          message: 'A meal with this name already exists'
        });
      }
    }

    const meal = await Meal.findOneAndUpdate(
      query,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'firstName lastName username')
     .populate({
       path: 'ingredients.ingredient',
       select: 'name unit store',
       populate: {
         path: 'store',
         select: 'name address'
       }
     });

    if (!meal) {
      return res.status(404).json({
        success: false,
        message: 'Meal not found'
      });
    }

    res.json({
      success: true,
      message: 'Meal updated successfully',
      meal
    });
  } catch (error) {
    console.error('Update meal error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating meal'
    });
  }
});

// Delete meal
router.delete('/:id', async (req, res) => {
  try {
    const query = req.user.role === 'admin' 
      ? { _id: req.params.id } 
      : { _id: req.params.id, createdBy: req.user._id };

    const meal = await Meal.findOneAndDelete(query);

    if (!meal) {
      return res.status(404).json({
        success: false,
        message: 'Meal not found'
      });
    }

    res.json({
      success: true,
      message: 'Meal deleted successfully'
    });
  } catch (error) {
    console.error('Delete meal error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting meal'
    });
  }
});

// Get meal statistics
router.get('/stats/overview', async (req, res) => {
  try {
    // All users can see all meal stats
    const query = {};
    
    const stats = await Meal.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalMeals: { $sum: 1 },
          activeMeals: { $sum: { $cond: ['$active', 1, 0] } },
          averageRating: { $avg: '$rating' },
          averagePrepTime: { $avg: '$prepTime' }
        }
      }
    ]);

    res.json({
      success: true,
      stats: stats[0] || { totalMeals: 0, activeMeals: 0, averageRating: 0, averagePrepTime: 0 }
    });
  } catch (error) {
    console.error('Get meal stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching statistics'
    });
  }
});

module.exports = router; 