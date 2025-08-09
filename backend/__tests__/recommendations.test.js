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

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.recommendations)).toBe(true);
    });

    test('should get recommendations with meal_id filter', async () => {
      mockedAxios.get.mockResolvedValue(mockMLResponse);
      const response = await request(app)
        .get('/api/recommendations?meal_id=' + testMeal._id.toString())
        .set('Authorization', `Bearer ${testToken}`);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should handle default parameters', async () => {
      mockedAxios.get.mockResolvedValue(mockMLResponse);
      const response = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${testToken}`);
      expect(response.status).toBe(200);
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/recommendations');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('No token provided');
    });

    test('should handle ML service failure', async () => {
      mockedAxios.get.mockRejectedValue({ code: 'ECONNREFUSED' });
      const response = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${testToken}`);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should handle ML service returning failure', async () => {
      mockedAxios.get.mockResolvedValue({ data: { success: false } });
      const response = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${testToken}`);
      expect([500]).toContain(response.status);
    });

    test('should handle ML service timeout', async () => {
      mockedAxios.get.mockRejectedValue({ code: 'ECONNABORTED' });
      const response = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${testToken}`);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should include temporal context in ML request', async () => {
      mockedAxios.get.mockResolvedValue(mockMLResponse);
      await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${testToken}`);
      expect(mockedAxios.get).toHaveBeenCalled();
      const call = mockedAxios.get.mock.calls[0];
      const params = call[1]?.params || {};
      expect(params).toHaveProperty('hour');
      expect(params).toHaveProperty('day_of_week');
      expect(params).toHaveProperty('month');
    });
  });

  describe('POST /api/recommendations', () => {
    test('should handle POST recommendations with custom context', async () => {
      mockedAxios.post.mockResolvedValue({ data: { success: true, data: { recommendations: [], recommendation_context: {} } } });
      const response = await request(app)
        .post('/api/recommendations')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          meal_type: 'lunch',
          top_n: 3,
          context: { dietary_preferences: ['vegetarian'] }
        });
      expect(response.status).toBe(200);
    });

    test('should handle POST with minimal data', async () => {
      mockedAxios.post.mockResolvedValue({ data: { success: true, data: { recommendations: [], recommendation_context: {} } } });
      const response = await request(app)
        .post('/api/recommendations')
        .set('Authorization', `Bearer ${testToken}`)
        .send({});
      expect(response.status).toBe(200);
    });

    test('should require authentication for POST', async () => {
      const response = await request(app)
        .post('/api/recommendations')
        .send({ meal_type: 'dinner' });

      expect(response.status).toBe(401);
    });

    test('should handle ML service failure in POST', async () => {
      mockedAxios.post.mockRejectedValue({ code: 'ECONNREFUSED' });
      const response = await request(app)
        .post('/api/recommendations')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ meal_type: 'breakfast' });
      expect(response.status).toBe(500);
    });

    test('should handle ML service returning error in POST', async () => {
      mockedAxios.post.mockResolvedValue({ data: { success: false } });
      const response = await request(app)
        .post('/api/recommendations')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ meal_type: 'invalid' });
      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/recommendations/feedback', () => {
    test('should record user feedback successfully', async () => {
      mockedAxios.post.mockResolvedValue({ data: { success: true } });
      const response = await request(app)
        .post('/api/recommendations/feedback')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          meal_id: testMeal._id.toString(),
          feedback_type: 'like'
        });
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
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

      expect(response.status).toBe(400);
    });

    test('should validate feedback type', async () => {
      const response = await request(app)
        .post('/api/recommendations/feedback')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          meal_id: testMeal._id.toString(),
          feedback_type: 'invalid'
        });

      expect(response.status).toBe(400);
    });

    test('should handle ML service failure for feedback', async () => {
      mockedAxios.post.mockRejectedValue({ code: 'ECONNREFUSED' });
      const response = await request(app)
        .post('/api/recommendations/feedback')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          meal_id: testMeal._id.toString(),
          feedback_type: 'dislike'
        });
      expect(response.status).toBe(500);
    });

    test('should include timestamp in feedback', async () => {
      mockedAxios.post.mockResolvedValue({ data: { success: true } });
      const response = await request(app)
        .post('/api/recommendations/feedback')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          meal_id: testMeal._id.toString(),
          feedback_type: 'like'
        });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('timestamp');
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
      mockedAxios.post.mockResolvedValue({ data: { success: true, message: 'Model training completed' } });
      const response = await request(app)
        .post('/api/recommendations/train')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ force: true });
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should require authentication for training', async () => {
      const response = await request(app)
        .post('/api/recommendations/train')
        .send({});

      expect(response.status).toBe(401);
    });

    test('should handle training with default parameters', async () => {
      mockedAxios.post.mockResolvedValue({ data: { success: true, message: 'ok' } });
      const response = await request(app)
        .post('/api/recommendations/train')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      expect(response.status).toBe(200);
    });

    test('should handle training service failure', async () => {
      mockedAxios.post.mockRejectedValue({ code: 'ECONNREFUSED' });
      const response = await request(app)
        .post('/api/recommendations/train')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ force: true });
      expect(response.status).toBe(500);
    });

    test('should use longer timeout for training requests', async () => {
      mockedAxios.post.mockResolvedValue({ data: { success: true, message: 'ok' } });
      await request(app)
        .post('/api/recommendations/train')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      const cfg = mockedAxios.post.mock.calls[0][2] || {};
      expect(cfg.timeout).toBeGreaterThanOrEqual(300000);
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
      delete process.env.ML_SERVICE_URL;
      mockedAxios.get.mockRejectedValue({ code: 'ECONNREFUSED' });
      const response = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${testToken}`);
      // Should fallback to DB popular recommendations
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should handle invalid user ID in token', async () => {
      const invalidToken = jwt.sign(
        { id: 'invalid_id', username: 'test', role: 'user' },
        process.env.JWT_SECRET || 'test-secret'
      );

      mockedAxios.get.mockResolvedValue(mockMLResponse);
      const response = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${invalidToken}`);

      // Should be 401 due to invalid user
      expect(response.status).toBe(401);
    });
  });

  describe('Integration with ML Service', () => {
    test('should pass all required parameters to ML service', async () => {
      mockedAxios.get.mockResolvedValue(mockMLResponse);
      const response = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${testToken}`)
        .query({
          meal_type: 'lunch',
          top_n: 10,
          include_context: true
        });

      expect(response.status).toBe(200);
      const params = mockedAxios.get.mock.calls[0][1]?.params || {};
      expect(params.meal_type).toBe('lunch');
      expect(params.top_n).toBe(10);
      expect(params).toHaveProperty('hour');
      expect(params).toHaveProperty('day_of_week');
      expect(params).toHaveProperty('month');
    });
  });
}); 