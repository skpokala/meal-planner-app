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
  
  // Check if MONGODB_URI is provided (for CI environments)
  if (process.env.MONGODB_URI) {
    mongoUri = process.env.MONGODB_URI;
    console.log('Using provided MongoDB URI for tests');
  } else {
    // Create in-memory MongoDB instance (for local development)
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    console.log('Using MongoDB Memory Server for tests');
  }

  // Connect to the database
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

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
});

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

// Global test timeout
jest.setTimeout(30000); 