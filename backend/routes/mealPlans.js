const express = require('express');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const MealPlan = require('../models/MealPlan');
const Meal = require('../models/Meal');
const FamilyMember = require('../models/FamilyMember');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all meal plans with filters
router.get('/', async (req, res) => {
  try {
    const { date, mealType, assignedTo, startDate, endDate, future } = req.query;
    
    // Build query
    const query = req.user.role === 'admin' ? {} : { createdBy: req.user._id };
    
    if (date) {
      const startOfDay = new Date(date);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      query.date = { $gte: startOfDay, $lte: endOfDay };
    }
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Include the entire end day
      query.date = {
        $gte: start,
        $lte: end
      };
    }
    
    if (mealType) {
      query.mealType = mealType;
    }
    
    if (assignedTo) {
      query.assignedTo = assignedTo;
    }
    
    if (future !== undefined) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (future === 'true') {
        query.date = { $gte: today };
      } else {
        query.date = { $lt: today };
      }
    }

    const mealPlans = await MealPlan.find(query)
      .populate('meal', 'name description prepTime active')
      .populate('assignedTo', 'firstName lastName fullName')
      .populate('createdBy', 'firstName lastName username')
      .sort({ date: 1, mealType: 1 });

    res.json({
      success: true,
      count: mealPlans.length,
      mealPlans
    });
  } catch (error) {
    console.error('Get meal plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching meal plans'
    });
  }
});

// Get meal plans for calendar view
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
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Include the entire end day
    query.date = {
      $gte: start,
      $lte: end
    };

    const mealPlans = await MealPlan.find(query)
      .populate('meal', 'name description prepTime active')
      .populate('assignedTo', 'firstName lastName fullName')
      .populate('createdBy', 'firstName lastName username')
      .sort({ date: 1, mealType: 1 });

    // Group meal plans by date
    const mealPlansByDate = {};
    mealPlans.forEach(plan => {
      const dateKey = plan.date.toISOString().split('T')[0];
      if (!mealPlansByDate[dateKey]) {
        mealPlansByDate[dateKey] = [];
      }
      mealPlansByDate[dateKey].push(plan);
    });

    res.json({
      success: true,
      count: mealPlans.length,
      mealPlansByDate
    });
  } catch (error) {
    console.error('Get calendar meal plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching calendar meal plans'
    });
  }
});

// Get single meal plan
router.get('/:id', async (req, res) => {
  try {
    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid meal plan ID'
      });
    }

    const query = req.user.role === 'admin' 
      ? { _id: req.params.id } 
      : { _id: req.params.id, createdBy: req.user._id };
    
    const mealPlan = await MealPlan.findOne(query)
      .populate('meal', 'name description prepTime active')
      .populate('assignedTo', 'firstName lastName fullName')
      .populate('createdBy', 'firstName lastName username');

    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        message: 'Meal plan not found'
      });
    }

    res.json({
      success: true,
      mealPlan
    });
  } catch (error) {
    console.error('Get meal plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching meal plan'
    });
  }
});

// Create new meal plan
router.post('/', [
  body('meal').isMongoId().withMessage('Meal reference is required'),
  body('date').isISO8601().withMessage('Date is required'),
  body('mealType').optional().isIn(['breakfast', 'lunch', 'dinner', 'snack']).withMessage('Invalid meal type'),
  body('assignedTo').optional().isArray().withMessage('Assigned to must be an array'),
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

    const {
      meal,
      date,
      mealType,
      assignedTo,
      isCooked,
      notes,
      rating
    } = req.body;

    // Validate meal exists and belongs to user
    const mealQuery = req.user.role === 'admin' 
      ? { _id: meal } 
      : { _id: meal, createdBy: req.user._id };
    
    const validMeal = await Meal.findOne(mealQuery);
    if (!validMeal) {
      return res.status(400).json({
        success: false,
        message: 'Meal not found or invalid'
      });
    }

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

    // Create new meal plan
    const mealPlan = new MealPlan({
      meal,
      date: new Date(date),
      mealType: mealType || 'dinner', // Use default if not provided
      assignedTo: assignedTo || [],
      isCooked: isCooked || false,
      notes: notes || '',
      rating: rating || null,
      createdBy: req.user._id
    });

    await mealPlan.save();

    // Populate the references for response
    await mealPlan.populate('meal', 'name description prepTime active');
    await mealPlan.populate('assignedTo', 'firstName lastName fullName');
    await mealPlan.populate('createdBy', 'firstName lastName username');

    res.status(201).json({
      success: true,
      message: 'Meal plan created successfully',
      mealPlan
    });
  } catch (error) {
    console.error('Create meal plan error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Meal plan already exists for this meal, date, and meal type'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while creating meal plan'
    });
  }
});

// Update meal plan
router.put('/:id', [
  body('meal').optional().isMongoId().withMessage('Valid meal ID is required'),
  body('date').optional().isISO8601().withMessage('Valid date is required'),
  body('mealType').optional().isIn(['breakfast', 'lunch', 'dinner', 'snack']).withMessage('Invalid meal type'),
  body('assignedTo').optional().isArray().withMessage('Assigned to must be an array'),
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

    // Validate meal if provided
    if (req.body.meal) {
      const mealQuery = req.user.role === 'admin' 
        ? { _id: req.body.meal } 
        : { _id: req.body.meal, createdBy: req.user._id };
      
      const validMeal = await Meal.findOne(mealQuery);
      if (!validMeal) {
        return res.status(400).json({
          success: false,
          message: 'Meal not found or invalid'
        });
      }
    }

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
      'meal', 'date', 'mealType', 'assignedTo', 'isCooked', 'notes', 'rating'
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

    const mealPlan = await MealPlan.findOneAndUpdate(
      query,
      updateData,
      { new: true, runValidators: true }
    ).populate('meal', 'name description prepTime active')
     .populate('assignedTo', 'firstName lastName fullName')
     .populate('createdBy', 'firstName lastName username');

    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        message: 'Meal plan not found'
      });
    }

    res.json({
      success: true,
      message: 'Meal plan updated successfully',
      mealPlan
    });
  } catch (error) {
    console.error('Update meal plan error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Meal plan already exists for this meal, date, and meal type'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while updating meal plan'
    });
  }
});

// Delete meal plan
router.delete('/:id', async (req, res) => {
  try {
    const query = req.user.role === 'admin' 
      ? { _id: req.params.id } 
      : { _id: req.params.id, createdBy: req.user._id };

    const mealPlan = await MealPlan.findOneAndDelete(query);

    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        message: 'Meal plan not found'
      });
    }

    res.json({
      success: true,
      message: 'Meal plan deleted successfully'
    });
  } catch (error) {
    console.error('Delete meal plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting meal plan'
    });
  }
});

// Get meal plan statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { createdBy: req.user._id };
    
    // Get future meal plans
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const stats = await MealPlan.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalMealPlans: { $sum: 1 },
          futureMealPlans: { 
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

    res.json({
      success: true,
      stats: stats[0] || { totalMealPlans: 0, futureMealPlans: 0, cookedMeals: 0, averageRating: 0 }
    });
  } catch (error) {
    console.error('Get meal plan stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching statistics'
    });
  }
});

module.exports = router; 