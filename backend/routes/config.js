const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const Config = require('../models/Config');

// Get current recommendation scoring mode
router.get('/recommendation-scoring-mode', authenticateToken, async (req, res) => {
  try {
    const doc = await Config.findOne({ key: 'recommendation_scoring_mode' }).lean();
    res.json({ success: true, mode: doc?.value || 'top_normalized' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to load mode' });
  }
});

// Set recommendation scoring mode (admin only)
router.put('/recommendation-scoring-mode', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    const allowed = ['top_normalized','fixed_exponential','percentile','zscore_sigmoid','log_count','bayesian','decile','wilson','multi_factor'];
    const { mode } = req.body || {};
    if (!allowed.includes(mode)) {
      return res.status(400).json({ success: false, message: 'Invalid mode' });
    }
    const updated = await Config.findOneAndUpdate(
      { key: 'recommendation_scoring_mode' },
      { value: mode, updatedBy: req.user._id, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ success: true, mode: updated.value });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to save mode' });
  }
});

module.exports = router;


