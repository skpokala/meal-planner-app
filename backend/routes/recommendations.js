const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const axios = require('axios');
const Config = require('../models/Config');

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
      day_of_week: now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(),
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
      const scoringMode = await getScoringMode();
      const recs = Array.isArray(mlResponse.data.data?.recommendations)
        ? mlResponse.data.data.recommendations
        : [];
      if (recs.length === 0) {
        // Fallback if ML returned no recs
        const fallbackRecommendations = await getFallbackRecommendations(req);
        return res.json({
          success: true,
          recommendations: await attachDisplayScores(fallbackRecommendations),
          context: {
            ...(mlResponse.data.data?.recommendation_context || {}),
            fallback: true,
            message: 'No ML recommendations, showing popular meals',
            models_used: ['fallback_popular'],
            scoring_mode: scoringMode
          },
          timestamp: new Date().toISOString()
        });
      }
      res.json({
        success: true,
        recommendations: await attachDisplayScores(recs),
        context: { ...(mlResponse.data.data.recommendation_context || {}), scoring_mode: scoringMode },
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
    
    // If ML service is unavailable or timed out, provide fallback recommendations
    if (error.code === 'ECONNREFUSED' || error.code === 'ECONNABORTED' || error.response?.status >= 500) {
      try {
        const scoringMode = await getScoringMode();
        const fallbackRecommendations = await getFallbackRecommendations(req);
        res.json({
          success: true,
          recommendations: await attachDisplayScores(fallbackRecommendations),
          context: {
            user_id: req.user.id,
            meal_type: req.query.meal_type,
            fallback: true,
            message: 'ML service unavailable, showing popular meals',
            scoring_mode: scoringMode
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
      day_of_week: now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(),
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
  const MealPlan = require('../models/MealPlan');
  const { meal_type } = req.query;
  const topN = parseInt(req.query.top_n, 10) || 5;

  // 30-day window
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Aggregate most used meals in the last month (optionally by meal_type)
  const matchStage = { date: { $gte: since } };
  if (meal_type) matchStage.mealType = meal_type;

  const usage = await MealPlan.aggregate([
    { $match: matchStage },
    { $group: { _id: '$meal', count: { $sum: 1 }, sampleType: { $first: '$mealType' } } },
    { $sort: { count: -1 } },
    { $limit: topN }
  ]);

  // Fetch meal docs for these IDs in the same order
  const popularIds = usage.map(u => u._id).filter(Boolean);
  let popularMeals = [];
  if (popularIds.length > 0) {
    const docs = await Meal.find({ _id: { $in: popularIds }, active: true })
      .populate('ingredients.ingredient', 'name')
      .lean();
    const idToMeal = new Map(docs.map(d => [d._id.toString(), d]));
    popularMeals = usage
      .map(u => ({ usage: u, meal: idToMeal.get(u._id?.toString()) }))
      .filter(x => !!x.meal)
      .map(({ usage: u, meal }) => ({
        meal_id: meal._id.toString(),
        meal_name: meal.name,
        meal_type: meal_type || u.sampleType || 'dinner',
        prep_time: meal.prepTime || 0,
        difficulty: meal.difficulty || 'medium',
        rating: meal.rating || 0,
        recommendation_type: 'fallback_popular',
        popularity_score: u.count,
        ingredients: (meal.ingredients || [])
          .map(ing => ing.ingredient?.name)
          .filter(Boolean)
      }));
  }

  // If we still need more, fill with recent active meals not already included
  if (popularMeals.length < topN) {
    const excludeIds = new Set(popularMeals.map(r => r.meal_id));
    const fillers = await Meal.find({ active: true, _id: { $nin: Array.from(excludeIds) } })
      .sort({ createdAt: -1 })
      .limit(topN - popularMeals.length)
      .populate('ingredients.ingredient', 'name')
      .lean();
    const fillerRecs = fillers.map(meal => ({
      meal_id: meal._id.toString(),
      meal_name: meal.name,
      meal_type: meal_type || 'dinner',
      prep_time: meal.prepTime || 0,
      difficulty: meal.difficulty || 'medium',
      rating: meal.rating || 0,
      recommendation_type: 'existing_meal',
      popularity_score: 0,
      ingredients: (meal.ingredients || [])
        .map(ing => ing.ingredient?.name)
        .filter(Boolean)
    }));
    popularMeals = popularMeals.concat(fillerRecs);
  }

  return popularMeals;
}

// Admin-configurable scoring model for display_score normalization
// modes: 'top_normalized', 'fixed_exponential', 'percentile', 'zscore_sigmoid', 'log_count', 'bayesian', 'decile', 'wilson', 'multi_factor'
async function getScoringMode() {
  try {
    const doc = await Config.findOne({ key: 'recommendation_scoring_mode' }).lean();
    return doc?.value || 'top_normalized';
  } catch (_) {
    return 'top_normalized';
  }
}

async function attachDisplayScores(recommendations) {
  const mode = await getScoringMode();
  if (!Array.isArray(recommendations) || recommendations.length === 0) return [];

  const recs = recommendations.map(r => ({ ...r }));
  const getNum = v => (typeof v === 'number' && isFinite(v) ? v : 0);

  // Preferred score fields in order
  const baseScores = recs.map(r => getNum(r.similarity_score) || getNum(r.prediction_score) || getNum(r.popularity_score));
  const maxBase = Math.max(0, ...baseScores);
  const mean = baseScores.reduce((a, b) => a + b, 0) / (baseScores.length || 1);
  const variance = baseScores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (baseScores.length || 1);
  const std = Math.sqrt(variance) || 1;

  // Percentiles
  const sorted = [...baseScores].sort((a, b) => a - b);
  const pct = s => {
    const idx = sorted.findIndex(v => v >= s);
    const rank = idx === -1 ? sorted.length : idx + 1;
    return rank / (sorted.length || 1);
  };

  const clamp01 = x => Math.max(0, Math.min(1, x));
  const sigmoid = x => 1 / (1 + Math.exp(-x));

  // Multi-factor components (if present)
  const maxRating = Math.max(1, ...recs.map(r => getNum(r.rating)));
  const maxPrep = Math.max(1, ...recs.map(r => getNum(r.prep_time)));

  const scored = recs.map((r, i) => {
    const raw = baseScores[i];
    let ds = 0;
    switch (mode) {
      case 'fixed_exponential': {
        const k = 2.0; // tune steepness
        const r = raw; // interpret as rate/score already; scale by a softmax over list
        const scaled = maxBase > 0 ? r / maxBase : 0;
        ds = 1 - Math.exp(-k * scaled);
        break;
      }
      case 'percentile': {
        ds = pct(raw);
        break;
      }
      case 'zscore_sigmoid': {
        const z = (raw - mean) / std;
        const k = 1.2;
        ds = sigmoid(k * z);
        break;
      }
      case 'log_count': {
        ds = maxBase > 0 ? Math.log(1 + raw) / Math.log(1 + maxBase) : 0;
        break;
      }
      case 'bayesian': {
        // Prior on global mean with strength alpha
        const alpha = 10;
        const prior = mean;
        ds = clamp01(((raw + alpha * prior) / (1 + alpha)) / (maxBase || 1));
        break;
      }
      case 'decile': {
        const p = pct(raw);
        ds = Math.ceil(p * 10) / 10;
        break;
      }
      case 'wilson': {
        // Treat raw/maxBase as proportion
        const p = clamp01(maxBase > 0 ? raw / maxBase : 0);
        const n = Math.max(1, baseScores.length);
        const z = 1.96; // 95%
        const denominator = 1 + (z * z) / n;
        const centre = p + (z * z) / (2 * n);
        const margin = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n);
        const lower = (centre - margin) / denominator;
        ds = clamp01(lower);
        break;
      }
      case 'multi_factor': {
        const wRec = 0.5;
        const wRating = 0.3;
        const wFresh = 0.2;
        const recNorm = maxBase > 0 ? raw / maxBase : 0;
        const ratingNorm = maxRating > 0 ? getNum(r.rating) / maxRating : 0;
        const prepNorm = maxPrep > 0 ? 1 - (getNum(r.prep_time) / maxPrep) : 0; // shorter prep preferred
        ds = clamp01(wRec * recNorm + wRating * ratingNorm + wFresh * prepNorm);
        break;
      }
      case 'top_normalized':
      default: {
        ds = maxBase > 0 ? raw / maxBase : 0;
        break;
      }
    }
    r.display_score = clamp01(ds);
    return r;
  });
  return scored;
}

module.exports = router; 