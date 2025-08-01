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
let testUser, testToken, testMeal;

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
    ingredients: ['Chicken', 'Curry Powder', 'Rice'],
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
});

afterEach(async () => {
  // Clean up
  await User.deleteMany({});
  await Meal.deleteMany({});
  jest.clearAllMocks();
});

describe('Recommendations Routes', () => {
  describe('GET /api/recommendations', () => {
    const mockMLResponse = {
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

    test('should get recommendations successfully', async () => {
      mockedAxios.get.mockResolvedValue(mockMLResponse);

      const response = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${testToken}`)
        .query({
          meal_type: 'dinner',
          top_n: 5
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.recommendations).toHaveLength(1);
      expect(response.body.recommendations[0].meal_name).toBe('Test Chicken Curry');
      expect(response.body.context).toBeDefined();
      expect(response.body.timestamp).toBeDefined();

      // Verify ML service was called correctly
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://ml-service:5003/recommendations',
        expect.objectContaining({
          params: expect.objectContaining({
            user_id: testUser._id.toString(),
            meal_type: 'dinner',
            top_n: 5,
            hour: expect.any(Number),
            day_of_week: expect.any(String),
            month: expect.any(Number)
          }),
          timeout: 10000
        })
      );
    });

    test('should get recommendations with meal_id filter', async () => {
      mockedAxios.get.mockResolvedValue(mockMLResponse);

      const response = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${testToken}`)
        .query({
          meal_id: testMeal._id.toString(),
          top_n: 3
        });

      expect(response.status).toBe(200);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://ml-service:5003/recommendations',
        expect.objectContaining({
          params: expect.objectContaining({
            meal_id: testMeal._id.toString(),
            top_n: 3
          })
        })
      );
    });

    test('should handle default parameters', async () => {
      mockedAxios.get.mockResolvedValue(mockMLResponse);

      const response = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://ml-service:5003/recommendations',
        expect.objectContaining({
          params: expect.objectContaining({
            top_n: 5 // default value
          })
        })
      );
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/recommendations');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Access denied. No token provided.');
    });

    test('should handle ML service failure', async () => {
      mockedAxios.get.mockRejectedValue(new Error('ML service unavailable'));

      const response = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to get recommendations');
    });

    test('should handle ML service returning failure', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          success: false,
          message: 'Model not found'
        }
      });

      const response = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to get recommendations from ML service');
    });

    test('should handle ML service timeout', async () => {
      mockedAxios.get.mockRejectedValue({ code: 'ECONNABORTED' });

      const response = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    test('should include temporal context in ML request', async () => {
      mockedAxios.get.mockResolvedValue(mockMLResponse);
      
      const now = new Date();
      const expectedHour = now.getHours();
      const expectedMonth = now.getMonth() + 1;

      await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${testToken}`);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://ml-service:5003/recommendations',
        expect.objectContaining({
          params: expect.objectContaining({
            hour: expectedHour,
            month: expectedMonth,
            day_of_week: expect.any(String)
          })
        })
      );
    });
  });

  describe('POST /api/recommendations', () => {
    const mockMLResponse = {
      data: {
        success: true,
        data: {
          recommendations: [
            {
              meal_id: testMeal._id.toString(),
              meal_name: 'Test Chicken Curry',
              recommendation_type: 'content_based',
              similarity_score: 0.92,
              meal_type: 'dinner'
            }
          ],
          recommendation_context: {
            models_used: ['content_based'],
            fallback: false
          },
          total_count: 1
        }
      }
    };

    test('should handle POST recommendations with custom context', async () => {
      mockedAxios.post.mockResolvedValue(mockMLResponse);

      const customContext = {
        dietary_preferences: ['vegetarian'],
        cooking_skill: 'beginner',
        available_time: 30
      };

      const response = await request(app)
        .post('/api/recommendations')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          meal_type: 'lunch',
          top_n: 3,
          context: customContext
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.recommendations).toHaveLength(1);

      // Verify ML service was called with custom context
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://ml-service:5003/recommendations',
        expect.objectContaining({
          user_id: testUser._id.toString(),
          meal_type: 'lunch',
          context: expect.objectContaining({
            dietary_preferences: ['vegetarian'],
            cooking_skill: 'beginner',
            available_time: 30,
            hour: expect.any(Number),
            day_of_week: expect.any(String),
            month: expect.any(Number)
          }),
          top_n: 3
        }),
        expect.objectContaining({
          timeout: 10000
        })
      );
    });

    test('should handle POST with minimal data', async () => {
      mockedAxios.post.mockResolvedValue(mockMLResponse);

      const response = await request(app)
        .post('/api/recommendations')
        .set('Authorization', `Bearer ${testToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://ml-service:5003/recommendations',
        expect.objectContaining({
          top_n: 5, // default
          context: expect.objectContaining({
            hour: expect.any(Number),
            day_of_week: expect.any(String),
            month: expect.any(Number)
          })
        }),
        expect.any(Object)
      );
    });

    test('should require authentication for POST', async () => {
      const response = await request(app)
        .post('/api/recommendations')
        .send({ meal_type: 'dinner' });

      expect(response.status).toBe(401);
    });

    test('should handle ML service failure in POST', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      const response = await request(app)
        .post('/api/recommendations')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ meal_type: 'breakfast' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to get recommendations');
    });

    test('should handle ML service returning error in POST', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          success: false,
          message: 'Invalid request parameters'
        }
      });

      const response = await request(app)
        .post('/api/recommendations')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ meal_type: 'invalid' });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Failed to get recommendations from ML service');
    });
  });

  describe('POST /api/recommendations/feedback', () => {
    test('should record user feedback successfully', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          success: true,
          message: 'Feedback recorded successfully'
        }
      });

      const response = await request(app)
        .post('/api/recommendations/feedback')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          meal_id: testMeal._id.toString(),
          feedback_type: 'like',
          context: {
            recommendation_type: 'collaborative',
            position: 1
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Feedback recorded successfully');

      // Verify ML service was called correctly
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://ml-service:5003/feedback',
        expect.objectContaining({
          user_id: testUser._id.toString(),
          meal_id: testMeal._id.toString(),
          feedback_type: 'like',
          context: expect.objectContaining({
            recommendation_type: 'collaborative',
            position: 1
          }),
          timestamp: expect.any(String)
        }),
        expect.objectContaining({
          timeout: 5000
        })
      );
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
      expect(response.body.message).toContain('meal_id and feedback_type are required');
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
      expect(response.body.message).toContain('feedback_type must be like or dislike');
    });

    test('should handle ML service failure for feedback', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Service unavailable'));

      const response = await request(app)
        .post('/api/recommendations/feedback')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          meal_id: testMeal._id.toString(),
          feedback_type: 'dislike'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to record feedback');
    });

    test('should include timestamp in feedback', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { success: true }
      });

      await request(app)
        .post('/api/recommendations/feedback')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          meal_id: testMeal._id.toString(),
          feedback_type: 'like'
        });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://ml-service:5003/feedback',
        expect.objectContaining({
          timestamp: expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
        }),
        expect.any(Object)
      );
    });
  });

  describe('POST /api/recommendations/train', () => {
    test('should trigger model training successfully', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          success: true,
          message: 'Training started successfully',
          job_id: 'train_123'
        }
      });

      const response = await request(app)
        .post('/api/recommendations/train')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          force_retrain: true,
          models: ['collaborative', 'content_based']
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Training started successfully');
      expect(response.body.job_id).toBe('train_123');

      // Verify ML service was called correctly
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://ml-service:5003/train',
        expect.objectContaining({
          user_id: testUser._id.toString(),
          force_retrain: true,
          models: ['collaborative', 'content_based'],
          timestamp: expect.any(String)
        }),
        expect.objectContaining({
          timeout: 30000
        })
      );
    });

    test('should require authentication for training', async () => {
      const response = await request(app)
        .post('/api/recommendations/train')
        .send({ force_retrain: true });

      expect(response.status).toBe(401);
    });

    test('should handle training with default parameters', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { success: true, message: 'Training started' }
      });

      const response = await request(app)
        .post('/api/recommendations/train')
        .set('Authorization', `Bearer ${testToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://ml-service:5003/train',
        expect.objectContaining({
          force_retrain: false // default
        }),
        expect.any(Object)
      );
    });

    test('should handle training service failure', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Training service error'));

      const response = await request(app)
        .post('/api/recommendations/train')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ force_retrain: true });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to start training');
    });

    test('should use longer timeout for training requests', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { success: true }
      });

      await request(app)
        .post('/api/recommendations/train')
        .set('Authorization', `Bearer ${testToken}`)
        .send({});

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          timeout: 30000 // 30 seconds for training
        })
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JWT token', async () => {
      const response = await request(app)
        .get('/api/recommendations')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });

    test('should handle missing ML service URL', async () => {
      // Temporarily override the environment variable
      const originalUrl = process.env.ML_SERVICE_URL;
      delete process.env.ML_SERVICE_URL;

      mockedAxios.get.mockResolvedValue({
        data: { success: true, data: { recommendations: [] } }
      });

      const response = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://ml-service:5003/recommendations', // default fallback
        expect.any(Object)
      );

      // Restore environment variable
      if (originalUrl) {
        process.env.ML_SERVICE_URL = originalUrl;
      }
    });

    test('should handle invalid user ID in token', async () => {
      const invalidToken = jwt.sign(
        { id: 'invalid-id', username: 'test' },
        process.env.JWT_SECRET || 'test-secret'
      );

      // This should still work as we don't validate user existence in recommendations
      mockedAxios.get.mockResolvedValue({
        data: { success: true, data: { recommendations: [] } }
      });

      const response = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${invalidToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Integration with ML Service', () => {
    test('should pass all required parameters to ML service', async () => {
      const fullMLResponse = {
        data: {
          success: true,
          data: {
            recommendations: [
              {
                meal_id: testMeal._id.toString(),
                meal_name: 'Test Meal',
                recommendation_type: 'hybrid',
                similarity_score: 0.95,
                prediction_score: 0.88,
                popularity_score: 0.72,
                meal_type: 'dinner',
                prep_time: 15,
                difficulty: 'easy',
                rating: 4.8,
                ingredients: ['ingredient1', 'ingredient2'],
                confidence: 0.91
              }
            ],
            recommendation_context: {
              models_used: ['collaborative', 'content_based', 'popularity'],
              user_profile: {
                preferences: ['spicy', 'quick'],
                skill_level: 'intermediate'
              },
              temporal_context: {
                time_of_day: 'evening',
                day_of_week: 'friday'
              },
              fallback: false,
              message: 'High confidence recommendations'
            },
            total_count: 1,
            query_time_ms: 45
          }
        }
      };

      mockedAxios.get.mockResolvedValue(fullMLResponse);

      const response = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${testToken}`)
        .query({
          meal_type: 'dinner',
          meal_id: testMeal._id.toString(),
          top_n: 10
        });

      expect(response.status).toBe(200);
      expect(response.body.recommendations[0]).toMatchObject({
        meal_id: testMeal._id.toString(),
        meal_name: 'Test Meal',
        recommendation_type: 'hybrid',
        similarity_score: 0.95,
        confidence: 0.91
      });
      expect(response.body.context.models_used).toContain('collaborative');
      expect(response.body.context.query_time_ms).toBe(45);
    });
  });
}); 