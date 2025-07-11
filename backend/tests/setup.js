const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

// Setup test database
beforeAll(async () => {
  // Close existing mongoose connection if any
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  let mongoUri;
  
  // Check if we're in CI environment with external MongoDB
  if (process.env.CI && process.env.MONGODB_URI) {
    mongoUri = process.env.MONGODB_URI;
    console.log('Using provided MongoDB URI for CI tests');
  } else {
    // Create in-memory MongoDB instance (for local development)
    // Use more conservative settings for CI
    const mongoOptions = process.env.CI ? {
      binary: {
        downloadDir: '/tmp/mongodb-binaries',
        version: '6.0.4',
      },
      instance: {
        dbName: 'test-meal-planner',
        port: 27017,
        storageEngine: 'wiredTiger',
      },
    } : {};
    
    mongoServer = await MongoMemoryServer.create(mongoOptions);
    mongoUri = mongoServer.getUri();
    console.log('Using MongoDB Memory Server for local tests');
  }

  // Connect to the database with retry logic
  const maxRetries = 3;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000, // 10 seconds
        socketTimeoutMS: 45000, // 45 seconds
        maxPoolSize: 10,
        minPoolSize: 1,
      });
      console.log('Successfully connected to MongoDB');
      break;
    } catch (error) {
      retries++;
      console.log(`MongoDB connection attempt ${retries} failed:`, error.message);
      if (retries >= maxRetries) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
    }
  }
}, 60000); // 60 second timeout for setup

// Clean up after each test
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Cleanup after all tests
afterAll(async () => {
  await mongoose.disconnect();
  // Only stop mongoServer if it was created (not using external MongoDB)
  if (mongoServer) {
    await mongoServer.stop();
  }
}, 30000); // 30 second timeout for cleanup

// Mock console methods to reduce test noise
const originalConsole = { ...console };

beforeAll(() => {
  console.log = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  Object.assign(console, originalConsole);
});

// Mock JWT secret for tests (only if not already set)
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret-key';
}
process.env.NODE_ENV = 'test';

// Global test timeout - increase for CI
const testTimeout = process.env.CI ? 60000 : 30000; // 60s for CI, 30s for local
jest.setTimeout(testTimeout); 