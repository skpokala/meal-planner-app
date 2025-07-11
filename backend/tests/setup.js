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
    console.log('Using provided MongoDB URI for CI tests:', mongoUri);
  } else {
    // Create in-memory MongoDB instance (for local development)
    console.log('Creating MongoDB Memory Server for local tests');
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    console.log('Using MongoDB Memory Server for local tests');
  }

  // Connect to the database with retry logic
  const maxRetries = 5;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 15000, // 15 seconds
        socketTimeoutMS: 45000, // 45 seconds
        maxPoolSize: 10,
        minPoolSize: 1,
        connectTimeoutMS: 30000, // 30 seconds
      });
      console.log('Successfully connected to MongoDB');
      break;
    } catch (error) {
      retries++;
      console.log(`MongoDB connection attempt ${retries} failed:`, error.message);
      if (retries >= maxRetries) {
        throw error;
      }
      const delay = Math.min(1000 * Math.pow(2, retries), 10000); // Exponential backoff, max 10s
      console.log(`Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}, 90000); // 90 second timeout for setup

// Clean up after each test
afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  }
});

// Cleanup after all tests
afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  // Only stop mongoServer if it was created (not using external MongoDB)
  if (mongoServer) {
    await mongoServer.stop();
  }
}, 30000); // 30 second timeout for cleanup

// Mock console methods to reduce test noise (but keep important logs)
const originalConsole = { ...console };

beforeAll(() => {
  // Only mock in non-CI environments to see CI logs
  if (!process.env.CI) {
    console.log = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  }
});

afterAll(() => {
  if (!process.env.CI) {
    Object.assign(console, originalConsole);
  }
});

// Mock JWT secret for tests (only if not already set)
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret-key';
}
process.env.NODE_ENV = 'test';

// Global test timeout - increase for CI
const testTimeout = process.env.CI ? 90000 : 30000; // 90s for CI, 30s for local
jest.setTimeout(testTimeout);
console.log(`Test timeout set to: ${testTimeout}ms (CI: ${!!process.env.CI})`); 