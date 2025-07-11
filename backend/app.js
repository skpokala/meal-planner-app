const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import routes
const authRoutes = require('./routes/auth');
const familyMemberRoutes = require('./routes/familyMembers');
const mealRoutes = require('./routes/meals');
const mealPlanRoutes = require('./routes/mealPlans');
const ingredientRoutes = require('./routes/ingredients');
const storeRoutes = require('./routes/stores');

const app = express();

// Database connection (only if not in test environment)
if (process.env.NODE_ENV !== 'test') {
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/meal-planner', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }).then(() => {
    console.log('Connected to MongoDB');
  }).catch((error) => {
    console.error('MongoDB connection error:', error);
  });
}

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

// Rate limiting (disabled for development)
if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
  });
  app.use('/api', limiter);
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/family-members', familyMemberRoutes);
app.use('/api/meals', mealRoutes);
app.use('/api/meal-plans', mealPlanRoutes);
app.use('/api/ingredients', ingredientRoutes);
app.use('/api/stores', storeRoutes);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Check database connectivity
    let dbStatus = 'disconnected';
    if (process.env.NODE_ENV !== 'test') {
      dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
      
      // Ping database
      if (dbStatus === 'connected') {
        await mongoose.connection.db.admin().ping();
      }
    } else {
      dbStatus = 'test-mode';
    }
    
    res.status(200).json({ 
      status: 'OK', 
      message: 'Meal Planner API is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: dbStatus,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Simple health check for load balancers
app.get('/health', async (req, res) => {
  try {
    if (process.env.NODE_ENV !== 'test') {
      await mongoose.connection.db.admin().ping();
    }
    res.status(200).send('OK');
  } catch (error) {
    res.status(503).send('ERROR');
  }
});

// Root health check
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'Meal Planner API is running',
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    message: 'API endpoint not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation Error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }
  
  if (err.name === 'CastError') {
    return res.status(400).json({
      message: 'Invalid ID format'
    });
  }
  
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app; 