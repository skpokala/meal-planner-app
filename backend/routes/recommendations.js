const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const axios = require('axios');

// ML Service URL
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://ml-service:5003';

/**
 * @route GET /api/recommendations
 * @desc Get personalized meal recommendations
 * @access Private
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { meal_type, top_n = 5, meal_id } = req.query;
    const user_id = req.user.id;
    
    // Add temporal context
    const now = new Date();
    const context = {
      hour: now.getHours(),
      day_of_week: now.toLocaleLowerCase(now.toLocaleDateString('en-US', { weekday: 'long' })),
      month: now.getMonth() + 1
    };
    
    // Call ML service
    const mlResponse = await axios.get(`${ML_SERVICE_URL}/recommendations`, {
      params: {
        user_id,
        meal_id,
        meal_type,
        top_n: parseInt(top_n),
        ...context
      },
      timeout: 10000 // 10 second timeout
    });
    
    if (mlResponse.data.success) {
      res.json({
        success: true,
        recommendations: mlResponse.data.data.recommendations,
        context: mlResponse.data.data.recommendation_context,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to get recommendations from ML service'
      });
    }
    
  } catch (error) {
    console.error('Error getting recommendations:', error.message);
    
    // If ML service is unavailable, provide fallback recommendations
    if (error.code === 'ECONNREFUSED' || error.response?.status >= 500) {
      try {
        const fallbackRecommendations = await getFallbackRecommendations(req);
        res.json({
          success: true,
          recommendations: fallbackRecommendations,
          context: {
            user_id: req.user.id,
            meal_type: req.query.meal_type,
            fallback: true,
            message: 'ML service unavailable, showing popular meals'
          },
          timestamp: new Date().toISOString()
        });
      } catch (fallbackError) {
        console.error('Fallback recommendations failed:', fallbackError.message);
        res.status(500).json({
          success: false,
          message: 'Unable to get recommendations'
        });
      }
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to get recommendations'
      });
    }
  }
});

/**
 * @route POST /api/recommendations
 * @desc Get recommendations with complex context
 * @access Private
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { meal_type, top_n = 5, meal_id, context = {} } = req.body;
    const user_id = req.user.id;
    
    // Default context if not provided
    const now = new Date();
    const requestContext = {
      hour: now.getHours(),
      day_of_week: now.toLocaleLowerCase(now.toLocaleDateString('en-US', { weekday: 'long' })),
      month: now.getMonth() + 1,
      ...context
    };
    
    // Call ML service
    const mlResponse = await axios.post(`${ML_SERVICE_URL}/recommendations`, {
      user_id,
      meal_id,
      meal_type,
      context: requestContext,
      top_n: parseInt(top_n)
    }, {
      timeout: 10000
    });
    
    if (mlResponse.data.success) {
      res.json({
        success: true,
        recommendations: mlResponse.data.data.recommendations,
        context: mlResponse.data.data.recommendation_context,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to get recommendations from ML service'
      });
    }
    
  } catch (error) {
    console.error('Error getting recommendations (POST):', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get recommendations'
    });
  }
});

/**
 * @route POST /api/recommendations/feedback
 * @desc Record user feedback on recommendations
 * @access Private
 */
router.post('/feedback', authenticateToken, async (req, res) => {
  try {
    const { meal_id, feedback_type, rating } = req.body;
    const user_id = req.user.id;
    
    if (!meal_id || !feedback_type) {
      return res.status(400).json({
        success: false,
        message: 'meal_id and feedback_type are required'
      });
    }
    
    if (!['like', 'dislike', 'neutral'].includes(feedback_type)) {
      return res.status(400).json({
        success: false,
        message: 'feedback_type must be one of: like, dislike, neutral'
      });
    }
    
    // Call ML service to record feedback
    const mlResponse = await axios.post(`${ML_SERVICE_URL}/feedback`, {
      user_id,
      meal_id,
      feedback_type,
      rating
    }, {
      timeout: 5000
    });
    
    if (mlResponse.data.success) {
      res.json({
        success: true,
        message: 'Feedback recorded successfully',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to record feedback'
      });
    }
    
  } catch (error) {
    console.error('Error recording feedback:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to record feedback'
    });
  }
});

/**
 * @route POST /api/recommendations/train
 * @desc Trigger ML model retraining (admin only)
 * @access Private (Admin)
 */
router.post('/train', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    
    const { force = false } = req.body;
    
    // Call ML service to trigger training
    const mlResponse = await axios.post(`${ML_SERVICE_URL}/train`, {
      force
    }, {
      timeout: 300000 // 5 minute timeout for training
    });
    
    res.json({
      success: mlResponse.data.success,
      message: mlResponse.data.message,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error triggering training:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger model training'
    });
  }
});

/**
 * @route GET /api/recommendations/status
 * @desc Get ML service status
 * @access Private (Admin)
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    
    // Call ML service status endpoint
    const mlResponse = await axios.get(`${ML_SERVICE_URL}/status`, {
      timeout: 5000
    });
    
    res.json({
      success: true,
      ml_service: mlResponse.data,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error getting ML service status:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get ML service status',
      error: error.code === 'ECONNREFUSED' ? 'ML service unavailable' : 'Unknown error'
    });
  }
});

/**
 * Fallback recommendations when ML service is unavailable
 */
async function getFallbackRecommendations(req) {
  const Meal = require('../models/Meal');
  const { meal_type } = req.query;
  
  // Build query
  const query = {};
  if (meal_type) {
    query.type = meal_type;
  }
  
  // Get popular meals (by rating)
  const meals = await Meal.find(query)
    .populate('ingredients', 'name unit')
    .sort({ rating: -1, createdAt: -1 })
    .limit(5)
    .lean();
  
  return meals.map(meal => ({
    meal_id: meal._id.toString(),
    meal_name: meal.name,
    meal_type: meal.type,
    prep_time: meal.prepTime,
    difficulty: meal.difficulty,
    rating: meal.rating,
    recommendation_type: 'fallback_popular',
    popularity_score: meal.rating || 0,
    ingredients: meal.ingredients ? meal.ingredients.map(ing => ing.name) : []
  }));
}

module.exports = router; 