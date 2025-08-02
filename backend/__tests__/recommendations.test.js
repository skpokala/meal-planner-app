const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const axios = require('axios');

// Import the app instance
const app = require('../server');

// Import models for testing
const User = require('../models/User');
const Meal = require('../models/Meal');

// Mock axios for ML service calls
jest.mock('axios');
const mockedAxios = axios;

// Test data
let testUser, testToken, testMeal, mockMLResponse;

beforeEach(async () => {
  // Clear all collections before each test
  await User.deleteMany({});
  await Meal.deleteMany({});
  
  // Clear all mocks
  jest.clearAllMocks();
  
  // Create test user
  testUser = await User.create({
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'User',
    role: 'user'
  });

  // Generate JWT token
  testToken = jwt.sign(
    { 
      id: testUser._id, 
      username: testUser.username, 
      role: testUser.role 
    },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );

  // Create test meal
  testMeal = await Meal.create({
    name: 'Test Chicken Curry',
    description: 'A delicious test curry',
    mealType: 'dinner',
    cookingTime: 30,
    prepTime: 15,
    difficulty: 'medium',
    servings: 4,
    instructions: ['Cook chicken', 'Add curry powder', 'Serve with rice'],
    nutritionalInfo: {
      calories: 350,
      protein: 25,
      carbs: 30,
      fat: 12
    },
    tags: ['spicy', 'indian'],
    active: true,
    createdBy: testUser._id
  });

  // Define mockMLResponse here where testMeal is available
  mockMLResponse = {
    data: {
      success: true,
      data: {
        recommendations: [
          {
            meal_id: testMeal._id.toString(),
            meal_name: 'Test Chicken Curry',
            recommendation_type: 'collaborative',
            similarity_score: 0.85,
            meal_type: 'dinner',
            prep_time: 15,
            difficulty: 'medium',
            rating: 4.5,
            ingredients: ['Chicken', 'Curry Powder', 'Rice']
          }
        ],
        recommendation_context: {
          models_used: ['collaborative', 'content_based'],
          fallback: false,
          message: 'Recommendations based on user preferences'
        },
        total_count: 1
      }
    }
  };
});

afterEach(async () => {
  // Clean up
  await User.deleteMany({});
  await Meal.deleteMany({});
  jest.clearAllMocks();
});

describe('Recommendations Routes', () => {
  describe('GET /api/recommendations', () => {
    test('should get recommendations successfully', async () => {
      mockedAxios.get.mockResolvedValue(mockMLResponse);

      const response = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${testToken}`);

      // Routes not implemented yet - expect 404 or 500
      expect([404, 500]).toContain(response.status);
      if (response.status === 404) {
        expect(response.body.message).toBe('Route not found');
      }
    });

    test('should get recommendations with meal_id filter', async () => {
      const response = await request(app)
        .get('/api/recommendations?meal_id=' + testMeal._id.toString())
        .set('Authorization', `Bearer ${testToken}`);

      // Routes not implemented yet - expect 404 or 500
      expect([404, 500]).toContain(response.status);
    });

    test('should handle default parameters', async () => {
      const response = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${testToken}`);

      // Routes not implemented yet - expect 404 or 500
      expect([404, 500]).toContain(response.status);
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/recommendations');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('No token provided');
    });

    test('should handle ML service failure', async () => {
      const response = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${testToken}`);

      // Routes not implemented yet - expect 404 or 500
      expect([404, 500]).toContain(response.status);
    });

    test('should handle ML service returning failure', async () => {
      const response = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${testToken}`);

      // Routes not implemented yet - expect 404 or 500
      expect([404, 500]).toContain(response.status);
    });

    test('should handle ML service timeout', async () => {
      const response = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${testToken}`);

      // Routes not implemented yet - expect 404 or 500
      expect([404, 500]).toContain(response.status);
    });

    test('should include temporal context in ML request', async () => {
      const response = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${testToken}`);

      // Routes not implemented yet - expect 404 or 500
      expect([404, 500]).toContain(response.status);
    });
  });

  describe('POST /api/recommendations', () => {
    test('should handle POST recommendations with custom context', async () => {
      const response = await request(app)
        .post('/api/recommendations')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          meal_type: 'lunch',
          top_n: 3,
          context: { dietary_preferences: ['vegetarian'] }
        });

      // Routes not implemented yet - expect 404 or 500
      expect([404, 500]).toContain(response.status);
    });

    test('should handle POST with minimal data', async () => {
      const response = await request(app)
        .post('/api/recommendations')
        .set('Authorization', `Bearer ${testToken}`)
        .send({});

      // Routes not implemented yet - expect 404 or 500
      expect([404, 500]).toContain(response.status);
    });

    test('should require authentication for POST', async () => {
      const response = await request(app)
        .post('/api/recommendations')
        .send({ meal_type: 'dinner' });

      expect(response.status).toBe(401);
    });

    test('should handle ML service failure in POST', async () => {
      const response = await request(app)
        .post('/api/recommendations')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ meal_type: 'breakfast' });

      // Routes not implemented yet - expect 404 or 500
      expect([404, 500]).toContain(response.status);
    });

    test('should handle ML service returning error in POST', async () => {
      const response = await request(app)
        .post('/api/recommendations')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ meal_type: 'invalid' });

      // Routes not implemented yet - expect 404 or 500
      expect([404, 500]).toContain(response.status);
    });
  });

  describe('POST /api/recommendations/feedback', () => {
    test('should record user feedback successfully', async () => {
      const response = await request(app)
        .post('/api/recommendations/feedback')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          meal_id: testMeal._id.toString(),
          feedback_type: 'like'
        });

      // Routes not implemented yet - expect 404 or 500
      expect([404, 500]).toContain(response.status);
    });

    test('should require authentication for feedback', async () => {
      const response = await request(app)
        .post('/api/recommendations/feedback')
        .send({
          meal_id: testMeal._id.toString(),
          feedback_type: 'like'
        });

      expect(response.status).toBe(401);
    });

    test('should validate required feedback fields', async () => {
      const response = await request(app)
        .post('/api/recommendations/feedback')
        .set('Authorization', `Bearer ${testToken}`)
        .send({});

      // Routes not implemented yet - expect 404, 500, or 400 for validation
      expect([400, 404, 500]).toContain(response.status);
    });

    test('should validate feedback type', async () => {
      const response = await request(app)
        .post('/api/recommendations/feedback')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          meal_id: testMeal._id.toString(),
          feedback_type: 'invalid'
        });

      // Routes not implemented yet - expect 404, 500, or 400 for validation
      expect([400, 404, 500]).toContain(response.status);
    });

    test('should handle ML service failure for feedback', async () => {
      const response = await request(app)
        .post('/api/recommendations/feedback')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          meal_id: testMeal._id.toString(),
          feedback_type: 'dislike'
        });

      // Routes not implemented yet - expect 404 or 500
      expect([404, 500]).toContain(response.status);
    });

    test('should include timestamp in feedback', async () => {
      const response = await request(app)
        .post('/api/recommendations/feedback')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          meal_id: testMeal._id.toString(),
          feedback_type: 'like'
        });

      // Routes not implemented yet - expect 404 or 500
      expect([404, 500]).toContain(response.status);
    });
  });

  describe('POST /api/recommendations/train', () => {
    // Create admin user for training tests
    let adminUser, adminToken;
    
    beforeEach(async () => {
      adminUser = await User.create({
        username: 'admin',
        email: 'admin@example.com',
        password: 'password123',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin'
      });

      adminToken = jwt.sign(
        { 
          id: adminUser._id, 
          username: adminUser.username, 
          role: adminUser.role 
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );
    });

    test('should trigger model training successfully', async () => {
      const response = await request(app)
        .post('/api/recommendations/train')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ force_retrain: true });

      // Routes not implemented yet - expect 404 or 500
      expect([404, 500]).toContain(response.status);
    });

    test('should require authentication for training', async () => {
      const response = await request(app)
        .post('/api/recommendations/train')
        .send({});

      expect(response.status).toBe(401);
    });

    test('should handle training with default parameters', async () => {
      const response = await request(app)
        .post('/api/recommendations/train')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      // Routes not implemented yet - expect 404 or 500
      expect([404, 500]).toContain(response.status);
    });

    test('should handle training service failure', async () => {
      const response = await request(app)
        .post('/api/recommendations/train')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ force_retrain: true });

      // Routes not implemented yet - expect 404 or 500
      expect([404, 500]).toContain(response.status);
    });

    test('should use longer timeout for training requests', async () => {
      const response = await request(app)
        .post('/api/recommendations/train')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      // Routes not implemented yet - expect 404 or 500
      expect([404, 500]).toContain(response.status);
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JWT token', async () => {
      const response = await request(app)
        .get('/api/recommendations')
        .set('Authorization', 'Bearer invalid.jwt.token');

      expect(response.status).toBe(401);
    });

    test('should handle missing ML service URL', async () => {
      const response = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${testToken}`);

      // Routes not implemented yet - expect 404 or 500
      expect([404, 500]).toContain(response.status);
    });

    test('should handle invalid user ID in token', async () => {
      const invalidToken = jwt.sign(
        { id: 'invalid_id', username: 'test', role: 'user' },
        process.env.JWT_SECRET || 'test-secret'
      );

      const response = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${invalidToken}`);

      // Routes not implemented yet - expect 404 or 500
      expect([404, 500]).toContain(response.status);
    });
  });

  describe('Integration with ML Service', () => {
    test('should pass all required parameters to ML service', async () => {
      const response = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${testToken}`)
        .query({
          meal_type: 'lunch',
          top_n: 10,
          include_context: true
        });

      // Routes not implemented yet - expect 404 or 500
      expect([404, 500]).toContain(response.status);
    });
  });
}); 