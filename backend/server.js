const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
// const winston = require('winston');  // Temporarily commented out
require('dotenv').config();

const authRoutes = require('./routes/auth');
const twoFactorRoutes = require('./routes/twoFactor');
const familyMemberRoutes = require('./routes/familyMembers');
const mealRoutes = require('./routes/meals');
const mealPlanRoutes = require('./routes/mealPlans');
const ingredientRoutes = require('./routes/ingredients');
const storeRoutes = require('./routes/stores');
const versionRoutes = require('./routes/version');
const auditRoutes = require('./routes/audit');
const releaseNotesRoutes = require('./routes/releaseNotes');
const bugRoutes = require('./routes/bugs');
const backupRoutes = require('./routes/backup');

const app = express();

// Logger configuration - temporarily using console.log
const logger = {
  info: (message, ...args) => console.log('[INFO]', message, ...args),
  error: (message, ...args) => console.error('[ERROR]', message, ...args)
};

// Security middleware
app.use(helmet());

// Rate limiting (disabled for development)
if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
  });
  app.use('/api/', limiter);
}

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/meal_planner', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  logger.info('Connected to MongoDB');
  // Only initialize admin if not in test environment
  if (process.env.NODE_ENV !== 'test') {
    initializeAdmin();
  }
})
.catch((error) => {
  logger.error('MongoDB connection error:', error);
  process.exit(1);
});

// Initialize default admin user
async function initializeAdmin() {
  try {
    const User = require('./models/User');
    const existingAdmin = await User.findOne({ username: 'admin' });
    
    if (!existingAdmin) {
      const adminUser = new User({
        username: 'admin',
        email: 'admin@mealplanner.com',
        password: 'password', // The User model pre-save hook will hash this
        masterPassword: 'masteradmin123', // Default master password
        role: 'admin',
        firstName: 'Admin',
        lastName: 'User'
      });
      
      await adminUser.save();
      logger.info('Default admin user created successfully');
      logger.info('Admin can login with either password: "password" or master password: "masteradmin123"');
    }
  } catch (error) {
    logger.error('Error initializing admin user:', error);
  }
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/2fa', twoFactorRoutes);
app.use('/api/family-members', familyMemberRoutes);
app.use('/api/meals', mealRoutes);
app.use('/api/meal-plans', mealPlanRoutes);
app.use('/api/ingredients', ingredientRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/version', versionRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/release-notes', releaseNotesRoutes);
app.use('/api/bugs', bugRoutes);
app.use('/api/backup', backupRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 5000;

// Only start the server if this file is run directly (not when imported for tests)
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
}

module.exports = app; 