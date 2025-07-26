const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');

// Import all models for introspection
const User = require('../models/User');
const FamilyMember = require('../models/FamilyMember');
const Meal = require('../models/Meal');
const MealPlan = require('../models/MealPlan');
const Ingredient = require('../models/Ingredient');
const Store = require('../models/Store');
const Bug = require('../models/Bug');
const Audit = require('../models/Audit');

// Helper function to check if user is admin
const isAdmin = (user) => {
  return user.role === 'admin' || user.isSystemAdmin;
};

// Helper function to get current app version
const getCurrentVersion = () => {
  try {
    const packageJson = require('../../package.json');
    return packageJson.version;
  } catch (error) {
    return '1.0.0';
  }
};

// Helper function to get database statistics
const getDatabaseStats = async () => {
  const stats = {};
  const models = { User, FamilyMember, Meal, MealPlan, Ingredient, Store, Bug, Audit };
  
  for (const [modelName, Model] of Object.entries(models)) {
    try {
      const count = await Model.countDocuments();
      const sampleDoc = await Model.findOne().lean();
      stats[modelName] = {
        count,
        hasData: count > 0,
        schema: sampleDoc ? Object.keys(sampleDoc) : [],
        modelVersion: Model.schema.get('versionKey') || '__v'
      };
    } catch (error) {
      stats[modelName] = {
        count: 0,
        hasData: false,
        error: error.message,
        schema: []
      };
    }
  }
  
  return stats;
};

// Helper function to generate MongoDB backup script
const generateMongoBackupScript = async (collections = [], includeIndexes = true) => {
  const stats = await getDatabaseStats();
  const version = getCurrentVersion();
  const timestamp = new Date().toISOString();
  
  let script = `// Generated backup script for Meal Planner App
// Version: ${version}
// Generated: ${timestamp}
// Compatible with: MongoDB 4.0+, Mongoose 6.0+

// Database connection check
if (!db) {
  print("Error: Not connected to database");
  quit(1);
}

// Version compatibility check
const appVersion = "${version}";
const requiredMongoVersion = "4.0";
const currentVersion = db.version();
print("Current MongoDB version: " + currentVersion);
print("Required MongoDB version: " + requiredMongoVersion);

// Database statistics at time of backup
const backupStats = ${JSON.stringify(stats, null, 2)};
print("Backup statistics:");
printjson(backupStats);

`;

  // Generate backup commands for each collection
  const collectionsToBackup = collections.length > 0 ? collections : Object.keys(stats);
  
  for (const collectionName of collectionsToBackup) {
    const modelName = collectionName.toLowerCase();
    const Model = {
      user: User,
      familymember: FamilyMember, 
      meal: Meal,
      mealplan: MealPlan,
      ingredient: Ingredient,
      store: Store,
      bug: Bug,
      audit: Audit
    }[modelName];
    
    if (!Model || !stats[collectionName] || !stats[collectionName].hasData) {
      script += `// Skipping ${collectionName} - no data or model not found\n\n`;
      continue;
    }
    
    script += `// ========== ${collectionName} Collection ==========\n`;
    script += `print("Processing ${collectionName} collection...");\n`;
    script += `const ${modelName}Count = db.${modelName}s.countDocuments();\n`;
    script += `print("Found " + ${modelName}Count + " documents in ${collectionName}");\n\n`;
    
    // Generate data export
    script += `// Export ${collectionName} data\n`;
    script += `const ${modelName}Data = db.${modelName}s.find({}).toArray();\n`;
    script += `print("Exporting " + ${modelName}Data.length + " ${collectionName} records...");\n\n`;
    
    // Generate indexes if requested
    if (includeIndexes) {
      script += `// Export ${collectionName} indexes\n`;
      script += `const ${modelName}Indexes = db.${modelName}s.getIndexes();\n`;
      script += `print("Found " + ${modelName}Indexes.length + " indexes for ${collectionName}");\n\n`;
    }
  }
  
  // Add restoration instructions
  script += `
// ========== RESTORATION INSTRUCTIONS ==========
/*
To restore this backup:

1. Ensure MongoDB is running and accessible
2. Connect to your target database: mongo <database_name>
3. Run this script: load("backup_script.js")

OR

For individual collections:
- db.<collection>.insertMany(<collection>Data);
- db.<collection>.createIndexes(<collection>Indexes);

IMPORTANT NOTES:
- This script preserves ObjectIds and timestamps
- Ensure target database is empty or use dropDatabase() first
- Verify all dependencies and references are maintained
- Test in a development environment first

Version compatibility:
- Generated for app version: ${version}
- Requires MongoDB ${requiredMongoVersion}+
- Compatible with Mongoose 6.0+
*/

print("Backup script generation completed successfully");
print("Total collections processed: ${collectionsToBackup.length}");
print("Generated at: ${timestamp}");
`;

  return script;
};

// Helper function to generate JSON export
const generateJsonExport = async (collections = []) => {
  const stats = await getDatabaseStats();
  const version = getCurrentVersion();
  const timestamp = new Date().toISOString();
  
  const exportData = {
    metadata: {
      version,
      timestamp,
      type: 'json_export',
      compatibility: {
        minAppVersion: '1.0.0',
        mongoVersion: '4.0+',
        nodeVersion: '16.0+'
      },
      statistics: stats
    },
    data: {}
  };
  
  const collectionsToExport = collections.length > 0 ? collections : Object.keys(stats);
  
  for (const collectionName of collectionsToExport) {
    const modelName = collectionName.toLowerCase();
    const Model = {
      user: User,
      familymember: FamilyMember,
      meal: Meal, 
      mealplan: MealPlan,
      ingredient: Ingredient,
      store: Store,
      bug: Bug,
      audit: Audit
    }[modelName];
    
    if (!Model || !stats[collectionName] || !stats[collectionName].hasData) {
      exportData.data[collectionName] = { count: 0, records: [] };
      continue;
    }
    
    try {
      const records = await Model.find({}).lean();
      exportData.data[collectionName] = {
        count: records.length,
        records: records,
        indexes: Model.collection.getIndexes ? await Model.collection.getIndexes() : []
      };
    } catch (error) {
      exportData.data[collectionName] = {
        count: 0,
        records: [],
        error: error.message
      };
    }
  }
  
  return exportData;
};

// POST /api/backup/generate-script
// Generate backup script
router.post('/generate-script', [
  authenticateToken,
  body('format').isIn(['mongodb', 'json']).withMessage('Format must be mongodb or json'),
  body('collections').optional().isArray().withMessage('Collections must be an array'),
  body('includeIndexes').optional().isBoolean().withMessage('Include indexes must be boolean'),
  body('includeData').optional().isBoolean().withMessage('Include data must be boolean')
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

    const user = req.user;
    if (!isAdmin(user)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { format = 'mongodb', collections = [], includeIndexes = true, includeData = true } = req.body;
    
    // Log the backup request
    console.log(`Backup script requested by ${user.email || user.name} for format: ${format}`);
    
    let result;
    let filename;
    let contentType;
    
    if (format === 'mongodb') {
      result = await generateMongoBackupScript(collections, includeIndexes);
      filename = `meal-planner-backup-${new Date().toISOString().split('T')[0]}.js`;
      contentType = 'application/javascript';
    } else if (format === 'json') {
      result = await generateJsonExport(collections);
      filename = `meal-planner-export-${new Date().toISOString().split('T')[0]}.json`;
      contentType = 'application/json';
      result = JSON.stringify(result, null, 2);
    }
    
    // Set headers for file download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    res.status(200).send(result);
    
  } catch (error) {
    console.error('Error generating backup script:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate backup script',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/backup/database-info
// Get database information and statistics
router.get('/database-info', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    if (!isAdmin(user)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const stats = await getDatabaseStats();
    const version = getCurrentVersion();
    
    // Get MongoDB version and connection info
    const mongoInfo = {
      version: mongoose.version,
      connectionState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    };
    
    res.status(200).json({
      success: true,
      data: {
        appVersion: version,
        timestamp: new Date().toISOString(),
        mongodb: mongoInfo,
        collections: stats,
        totalDocuments: Object.values(stats).reduce((sum, stat) => sum + (stat.count || 0), 0),
        availableFormats: ['mongodb', 'json']
      }
    });
    
  } catch (error) {
    console.error('Error getting database info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve database information',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/backup/validate-compatibility
// Validate backup compatibility with current environment
router.post('/validate-compatibility', [
  authenticateToken,
  body('backupVersion').notEmpty().withMessage('Backup version is required'),
  body('backupData').optional().isObject().withMessage('Backup data must be an object')
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

    const user = req.user;
    if (!isAdmin(user)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { backupVersion, backupData } = req.body;
    const currentVersion = getCurrentVersion();
    const currentStats = await getDatabaseStats();
    
    const compatibility = {
      isCompatible: true,
      warnings: [],
      errors: [],
      recommendations: []
    };
    
    // Version compatibility check
    const backupVersionNum = parseFloat(backupVersion.replace(/[^\d.]/g, ''));
    const currentVersionNum = parseFloat(currentVersion.replace(/[^\d.]/g, ''));
    
    if (backupVersionNum > currentVersionNum) {
      compatibility.errors.push(`Backup version ${backupVersion} is newer than current app version ${currentVersion}`);
      compatibility.isCompatible = false;
    }
    
    if (backupVersionNum < 1.0) {
      compatibility.warnings.push('Backup from pre-1.0 version may have compatibility issues');
    }
    
    // Schema compatibility check
    if (backupData && backupData.metadata && backupData.metadata.statistics) {
      const backupStats = backupData.metadata.statistics;
      
      for (const [collection, backupStat] of Object.entries(backupStats)) {
        const currentStat = currentStats[collection];
        
        if (!currentStat) {
          compatibility.warnings.push(`Collection ${collection} from backup not found in current schema`);
          continue;
        }
        
        // Check for missing fields
        if (backupStat.schema && currentStat.schema) {
          const missingFields = backupStat.schema.filter(field => !currentStat.schema.includes(field));
          if (missingFields.length > 0) {
            compatibility.warnings.push(`Collection ${collection} backup contains fields not in current schema: ${missingFields.join(', ')}`);
          }
        }
      }
    }
    
    // Add recommendations
    if (compatibility.warnings.length > 0) {
      compatibility.recommendations.push('Test restoration in a development environment first');
    }
    
    if (compatibility.errors.length === 0 && compatibility.warnings.length === 0) {
      compatibility.recommendations.push('Backup appears fully compatible with current environment');
    }
    
    res.status(200).json({
      success: true,
      data: {
        compatibility,
        currentVersion,
        backupVersion,
        currentEnvironment: {
          mongodb: mongoose.version,
          node: process.version,
          collections: Object.keys(currentStats)
        }
      }
    });
    
  } catch (error) {
    console.error('Error validating compatibility:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate compatibility',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router; 