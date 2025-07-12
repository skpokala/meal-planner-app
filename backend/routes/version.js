const express = require('express');
const router = express.Router();
const packageJson = require('../package.json');

// Get version endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    version: packageJson.version,
    name: packageJson.name,
    description: packageJson.description,
    timestamp: new Date().toISOString()
  });
});

module.exports = router; 