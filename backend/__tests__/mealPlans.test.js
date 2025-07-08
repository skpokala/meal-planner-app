const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const Meal = require('../models/Meal');
const MealPlan = require('../models/MealPlan');

describe('Meal Plans API Endpoints', () => {
  let authToken;
  let userId;
  let testMealId;

  beforeEach(async () => {
    // Clear collections
    await MealPlan.deleteMany({});
    await Meal.deleteMany({});
    await User.deleteMany({});

    // Create and login a test user
    const user = await User.create({
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: 'password',
      role: 'admin'
    });
    userId = user._id;

    // Create a test meal
    const meal = await Meal.create({
      name: 'Test Meal',
      description: 'A test meal for planning',
      prepTime: 30,
      active: true,
      createdBy: userId
    });
    testMealId = meal._id;

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser',
        password: 'password'
      });

    authToken = loginResponse.body.token;
  });

  describe('GET /api/meal-plans', () => {
    beforeEach(async () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      // Create test meal plans
      await MealPlan.create([
        {
          meal: testMealId,
          date: today,
          mealType: 'dinner',
          createdBy: userId
        },
        {
          meal: testMealId,
          date: tomorrow,
          mealType: 'lunch',
          createdBy: userId
        },
        {
          meal: testMealId,
          date: yesterday,
          mealType: 'breakfast',
          createdBy: userId
        }
      ]);
    });

    it('should get all meal plans for authenticated user', async () => {
      const response = await request(app)
        .get('/api/meal-plans')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('count', 3);
      expect(response.body).toHaveProperty('mealPlans');
      expect(response.body.mealPlans).toHaveLength(3);
    });

    it('should filter future meal plans only', async () => {
      const response = await request(app)
        .get('/api/meal-plans?future=true')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.count).toBe(2); // today and tomorrow
      expect(response.body.mealPlans.every(plan => 
        new Date(plan.date) >= new Date().setHours(0, 0, 0, 0)
      )).toBe(true);
    });

    it('should filter by meal type', async () => {
      const response = await request(app)
        .get('/api/meal-plans?mealType=dinner')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.count).toBe(1);
      expect(response.body.mealPlans[0].mealType).toBe('dinner');
    });

    it('should filter by date range', async () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const response = await request(app)
        .get(`/api/meal-plans?startDate=${today.toISOString().split('T')[0]}&endDate=${tomorrow.toISOString().split('T')[0]}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.count).toBe(2); // today and tomorrow
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/meal-plans')
        .expect(401);

      expect(response.body).toHaveProperty('message', 'No token provided');
    });
  });

  describe('POST /api/meal-plans', () => {
    it('should create a new meal plan with valid data', async () => {
      const mealPlanData = {
        meal: testMealId,
        date: new Date(),
        mealType: 'dinner'
      };

      const response = await request(app)
        .post('/api/meal-plans')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mealPlanData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('mealPlan');
      expect(response.body.mealPlan.meal._id).toBe(testMealId.toString());
      expect(response.body.mealPlan.mealType).toBe(mealPlanData.mealType);
      expect(response.body.mealPlan.isCooked).toBe(false);
      expect(response.body.mealPlan.createdBy).toBeDefined();
    });

    it('should create a meal plan with default values', async () => {
      const mealPlanData = {
        meal: testMealId,
        date: new Date()
      };

      const response = await request(app)
        .post('/api/meal-plans')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mealPlanData)
        .expect(201);

      expect(response.body.mealPlan.mealType).toBe('dinner'); // default
      expect(response.body.mealPlan.isCooked).toBe(false);
      expect(response.body.mealPlan.assignedTo).toEqual([]);
    });

    it('should reject meal plan without meal reference', async () => {
      const mealPlanData = {
        date: new Date(),
        mealType: 'dinner'
      };

      const response = await request(app)
        .post('/api/meal-plans')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mealPlanData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: 'meal',
            msg: 'Meal reference is required'
          })
        ])
      );
    });

    it('should reject meal plan without date', async () => {
      const mealPlanData = {
        meal: testMealId,
        mealType: 'dinner'
      };

      const response = await request(app)
        .post('/api/meal-plans')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mealPlanData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: 'date',
            msg: 'Date is required'
          })
        ])
      );
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/meal-plans')
        .send({ meal: testMealId, date: new Date() })
        .expect(401);

      expect(response.body).toHaveProperty('message', 'No token provided');
    });
  });

  describe('GET /api/meal-plans/:id', () => {
    let mealPlanId;

    beforeEach(async () => {
      const mealPlan = await MealPlan.create({
        meal: testMealId,
        date: new Date(),
        mealType: 'dinner',
        createdBy: userId
      });
      mealPlanId = mealPlan._id.toString();
    });

    it('should get a specific meal plan by id', async () => {
      const response = await request(app)
        .get(`/api/meal-plans/${mealPlanId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('mealPlan');
      expect(response.body.mealPlan._id).toBe(mealPlanId);
      expect(response.body.mealPlan.meal).toBeDefined();
    });

    it('should return 404 for non-existent meal plan', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/meal-plans/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Meal plan not found');
    });

    it('should return 400 for invalid meal plan id', async () => {
      const response = await request(app)
        .get('/api/meal-plans/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Invalid meal plan ID');
    });
  });

  describe('PUT /api/meal-plans/:id', () => {
    let mealPlanId;

    beforeEach(async () => {
      const mealPlan = await MealPlan.create({
        meal: testMealId,
        date: new Date(),
        mealType: 'dinner',
        isCooked: false,
        createdBy: userId
      });
      mealPlanId = mealPlan._id.toString();
    });

    it('should update a meal plan with valid data', async () => {
      const updateData = {
        mealType: 'lunch',
        isCooked: true,
        rating: 5,
        notes: 'Delicious meal!'
      };

      const response = await request(app)
        .put(`/api/meal-plans/${mealPlanId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('mealPlan');
      expect(response.body.mealPlan.mealType).toBe(updateData.mealType);
      expect(response.body.mealPlan.isCooked).toBe(updateData.isCooked);
      expect(response.body.mealPlan.rating).toBe(updateData.rating);
      expect(response.body.mealPlan.notes).toBe(updateData.notes);
    });

    it('should partially update a meal plan', async () => {
      const updateData = {
        isCooked: true
      };

      const response = await request(app)
        .put(`/api/meal-plans/${mealPlanId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.mealPlan.mealType).toBe('dinner'); // Unchanged
      expect(response.body.mealPlan.isCooked).toBe(true); // Updated
    });

    it('should return 404 for non-existent meal plan', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .put(`/api/meal-plans/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ isCooked: true })
        .expect(404);

      expect(response.body).toHaveProperty('message', 'Meal plan not found');
    });
  });

  describe('DELETE /api/meal-plans/:id', () => {
    let mealPlanId;

    beforeEach(async () => {
      const mealPlan = await MealPlan.create({
        meal: testMealId,
        date: new Date(),
        mealType: 'dinner',
        createdBy: userId
      });
      mealPlanId = mealPlan._id.toString();
    });

    it('should delete a meal plan successfully', async () => {
      const response = await request(app)
        .delete(`/api/meal-plans/${mealPlanId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Meal plan deleted successfully');

      // Verify meal plan is actually deleted
      const deletedMealPlan = await MealPlan.findById(mealPlanId);
      expect(deletedMealPlan).toBeNull();
    });

    it('should return 404 for non-existent meal plan', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .delete(`/api/meal-plans/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('message', 'Meal plan not found');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete(`/api/meal-plans/${mealPlanId}`)
        .expect(401);

      expect(response.body).toHaveProperty('message', 'No token provided');
    });
  });

  describe('GET /api/meal-plans/calendar', () => {
    beforeEach(async () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      // Create test meal plans
      await MealPlan.create([
        {
          meal: testMealId,
          date: today,
          mealType: 'dinner',
          createdBy: userId
        },
        {
          meal: testMealId,
          date: tomorrow,
          mealType: 'lunch',
          createdBy: userId
        }
      ]);
    });

    it('should return meal plans grouped by date', async () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const response = await request(app)
        .get('/api/meal-plans/calendar')
        .query({
          startDate: today.toISOString().split('T')[0],
          endDate: tomorrow.toISOString().split('T')[0]
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('mealPlansByDate');
      
      const mealPlansByDate = response.body.mealPlansByDate;
      const todayKey = today.toISOString().split('T')[0];
      const tomorrowKey = tomorrow.toISOString().split('T')[0];
      
      expect(mealPlansByDate).toHaveProperty(todayKey);
      expect(mealPlansByDate).toHaveProperty(tomorrowKey);
      expect(mealPlansByDate[todayKey]).toHaveLength(1);
      expect(mealPlansByDate[tomorrowKey]).toHaveLength(1);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/meal-plans/calendar')
        .expect(401);

      expect(response.body).toHaveProperty('message', 'No token provided');
    });
  });

  describe('Meal plan validation', () => {
    it('should validate meal type enum', async () => {
      const mealPlanData = {
        meal: testMealId,
        date: new Date(),
        mealType: 'invalid-type'
      };

      const response = await request(app)
        .post('/api/meal-plans')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mealPlanData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should validate rating range', async () => {
      const mealPlanData = {
        meal: testMealId,
        date: new Date(),
        mealType: 'dinner',
        rating: 10 // exceeds max of 5
      };

      const response = await request(app)
        .post('/api/meal-plans')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mealPlanData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should validate invalid meal reference', async () => {
      const mealPlanData = {
        meal: '507f1f77bcf86cd799439011', // non-existent meal
        date: new Date(),
        mealType: 'dinner'
      };

      const response = await request(app)
        .post('/api/meal-plans')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mealPlanData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });
}); 