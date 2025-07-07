const express = require('express');
const { body, validationResult } = require('express-validator');
const Meal = require('../models/Meal');
const FamilyMember = require('../models/FamilyMember');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all meals with filters
router.get('/', async (req, res) => {
  try {
    const { date, mealType, assignedTo, isPlanned, isCooked, templates } = req.query;
    
    // Build query
    const query = req.user.role === 'admin' ? {} : { createdBy: req.user._id };
    
    // Handle templates vs instances
    if (templates !== undefined) {
      query.isTemplate = templates === 'true';
    }
    
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.date = { $gte: startDate, $lte: endDate };
    }
    
    if (mealType) {
      query.mealType = mealType;
    }
    
    if (assignedTo) {
      query.assignedTo = assignedTo;
    }
    
    if (isPlanned !== undefined) {
      query.isPlanned = isPlanned === 'true';
    }
    
    if (isCooked !== undefined) {
      query.isCooked = isCooked === 'true';
    }

    // Different sorting for templates vs instances
    const sortOptions = templates === 'true' 
      ? { name: 1, mealType: 1 } // Sort templates by name
      : { date: 1, mealType: 1 }; // Sort instances by date

    const meals = await Meal.find(query)
      .populate('assignedTo', 'firstName lastName fullName')
      .populate('createdBy', 'firstName lastName username')
      .sort(sortOptions);

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

// Get meal templates (for the Meals page)
router.get('/templates', async (req, res) => {
  try {
    const { mealType, search } = req.query;
    
    // Build query for templates only
    const query = req.user.role === 'admin' 
      ? { isTemplate: true } 
      : { isTemplate: true, createdBy: req.user._id };
    
    if (mealType) {
      query.mealType = mealType;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const templates = await Meal.find(query)
      .populate('createdBy', 'firstName lastName username')
      .sort({ name: 1, mealType: 1 });

    res.json({
      success: true,
      count: templates.length,
      meals: templates
    });
  } catch (error) {
    console.error('Get meal templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching meal templates'
    });
  }
});

// Get meals for a specific date range
router.get('/calendar', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const query = req.user.role === 'admin' ? {} : { createdBy: req.user._id };
    query.date = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };

    const meals = await Meal.find(query)
      .populate('assignedTo', 'firstName lastName fullName')
      .populate('createdBy', 'firstName lastName username')
      .sort({ date: 1, mealType: 1 });

    // Group meals by date
    const mealsByDate = {};
    meals.forEach(meal => {
      const dateKey = meal.date.toISOString().split('T')[0];
      if (!mealsByDate[dateKey]) {
        mealsByDate[dateKey] = [];
      }
      mealsByDate[dateKey].push(meal);
    });

    res.json({
      success: true,
      count: meals.length,
      mealsByDate
    });
  } catch (error) {
    console.error('Get calendar meals error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching calendar meals'
    });
  }
});

// Get single meal
router.get('/:id', async (req, res) => {
  try {
    const query = req.user.role === 'admin' 
      ? { _id: req.params.id } 
      : { _id: req.params.id, createdBy: req.user._id };
    
    const meal = await Meal.findOne(query)
      .populate('assignedTo', 'firstName lastName fullName')
      .populate('createdBy', 'firstName lastName username');

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
  body('name').trim().isLength({ min: 1 }).withMessage('Meal name is required'),
  body('mealType').isIn(['breakfast', 'lunch', 'dinner', 'snack']).withMessage('Invalid meal type'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('ingredients').optional().isArray().withMessage('Ingredients must be an array'),
  body('assignedTo').optional().isArray().withMessage('Assigned to must be an array'),
  body('recipe.prepTime').optional().isNumeric().withMessage('Prep time must be a number'),
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
      mealType,
      date,
      ingredients,
      recipe,
      nutritionInfo,
      assignedTo,
      tags,
      image,
      notes,
      isTemplate
    } = req.body;

    // Validate assigned family members belong to the user
    if (assignedTo && assignedTo.length > 0) {
      const familyMemberQuery = req.user.role === 'admin' 
        ? { _id: { $in: assignedTo } }
        : { _id: { $in: assignedTo }, createdBy: req.user._id };
      
      const validFamilyMembers = await FamilyMember.find(familyMemberQuery);
      if (validFamilyMembers.length !== assignedTo.length) {
        return res.status(400).json({
          success: false,
          message: 'Some assigned family members are invalid'
        });
      }
    }

    // Create new meal
    const meal = new Meal({
      name,
      description: description || '',
      mealType,
      date: new Date(date),
      ingredients: ingredients || [],
      recipe: recipe || {},
      nutritionInfo: nutritionInfo || {},
      assignedTo: assignedTo || [],
      tags: tags || [],
      image: image || '',
      notes: notes || '',
      isTemplate: isTemplate || false,
      createdBy: req.user._id
    });

    await meal.save();

    // Populate the references for response
    await meal.populate('assignedTo', 'firstName lastName fullName');
    await meal.populate('createdBy', 'firstName lastName username');

    res.status(201).json({
      success: true,
      message: 'Meal created successfully',
      meal
    });
  } catch (error) {
    console.error('Create meal error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating meal'
    });
  }
});

// Update meal
router.put('/:id', [
  body('name').optional().trim().isLength({ min: 1 }).withMessage('Meal name cannot be empty'),
  body('mealType').optional().isIn(['breakfast', 'lunch', 'dinner', 'snack']).withMessage('Invalid meal type'),
  body('date').optional().isISO8601().withMessage('Valid date is required'),
  body('ingredients').optional().isArray().withMessage('Ingredients must be an array'),
  body('assignedTo').optional().isArray().withMessage('Assigned to must be an array'),
  body('recipe.prepTime').optional().isNumeric().withMessage('Prep time must be a number'),
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

    // Validate assigned family members if provided
    if (req.body.assignedTo && req.body.assignedTo.length > 0) {
      const familyMemberQuery = req.user.role === 'admin' 
        ? { _id: { $in: req.body.assignedTo } }
        : { _id: { $in: req.body.assignedTo }, createdBy: req.user._id };
      
      const validFamilyMembers = await FamilyMember.find(familyMemberQuery);
      if (validFamilyMembers.length !== req.body.assignedTo.length) {
        return res.status(400).json({
          success: false,
          message: 'Some assigned family members are invalid'
        });
      }
    }

    const updateData = {};
    const allowedFields = [
      'name', 'description', 'mealType', 'date', 'ingredients', 'recipe',
      'nutritionInfo', 'assignedTo', 'tags', 'image', 'isTemplate', 'isPlanned', 'isCooked',
      'rating', 'notes'
    ];

    // Only update fields that are provided
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'date') {
          updateData[field] = new Date(req.body[field]);
        } else {
          updateData[field] = req.body[field];
        }
      }
    });

    const meal = await Meal.findOneAndUpdate(
      query,
      updateData,
      { new: true, runValidators: true }
    ).populate('assignedTo', 'firstName lastName fullName')
     .populate('createdBy', 'firstName lastName username');

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
    const query = req.user.role === 'admin' ? {} : { createdBy: req.user._id };
    
    // Get today's date at midnight for future meal filtering
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Debug: Log today's date and some sample meals
    console.log('DEBUG - Today\'s date for comparison:', today);
    const sampleMeals = await Meal.find(query).limit(5).select('name date isPlanned');
    console.log('DEBUG - Sample meals in database:', sampleMeals.map(m => ({ 
      name: m.name, 
      date: m.date, 
      isPlanned: m.isPlanned,
      isFuture: m.date >= today 
    })));
    
    const stats = await Meal.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalMeals: { $sum: 1 },
          plannedMeals: { 
            $sum: { 
              $cond: [
                { $gte: ['$date', today] },
                1, 
                0
              ] 
            } 
          },
          cookedMeals: { $sum: { $cond: ['$isCooked', 1, 0] } },
          averageRating: { $avg: '$rating' }
        }
      }
    ]);
    
    console.log('DEBUG - Aggregation result:', stats[0]);

    const mealTypeStats = await Meal.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$mealType',
          count: { $sum: 1 }
        }
      }
    ]);

    const weeklyStats = await Meal.aggregate([
      { $match: { ...query, date: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$date' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    res.json({
      success: true,
      stats: {
        overview: stats[0] || { totalMeals: 0, plannedMeals: 0, cookedMeals: 0, averageRating: 0 },
        mealTypes: mealTypeStats,
        weeklyMeals: weeklyStats
      }
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