const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const Meal = require('../models/Meal');

describe('Meals API Endpoints', () => {
  let authToken;
  let userId;

  beforeEach(async () => {
    // Clear meals collection
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

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser',
        password: 'password'
      });

    authToken = loginResponse.body.token;
  });

  describe('GET /api/meals', () => {
    beforeEach(async () => {
      // Create test meals
      await Meal.create([
        {
          name: 'Pasta Primavera',
          description: 'Delicious pasta with vegetables',
          prepTime: 30,
          active: true,
          createdBy: userId
        },
        {
          name: 'Chicken Salad',
          description: 'Healthy chicken salad',
          prepTime: 15,
          active: true,
          createdBy: userId
        },
        {
          name: 'Inactive Meal',
          description: 'This meal is inactive',
          prepTime: 45,
          active: false,
          createdBy: userId
        }
      ]);
    });

    it('should get all meals for authenticated user', async () => {
      const response = await request(app)
        .get('/api/meals')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('count', 3);
      expect(response.body).toHaveProperty('meals');
      expect(response.body.meals).toHaveLength(3);
    });

    it('should filter active meals only', async () => {
      const response = await request(app)
        .get('/api/meals?active=true')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.count).toBe(2);
      expect(response.body.meals.every(meal => meal.active)).toBe(true);
    });

    it('should search meals by name', async () => {
      const response = await request(app)
        .get('/api/meals?search=pasta')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.count).toBe(1);
      expect(response.body.meals[0].name).toContain('Pasta');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/meals')
        .expect(401);

      expect(response.body).toHaveProperty('message', 'No token provided');
    });
  });

  describe('POST /api/meals', () => {
    it('should create a new meal with valid data', async () => {
      const mealData = {
        name: 'New Test Meal',
        description: 'A test meal',
        prepTime: 25,
        active: true
      };

      const response = await request(app)
        .post('/api/meals')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mealData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('meal');
      expect(response.body.meal.name).toBe(mealData.name);
      expect(response.body.meal.description).toBe(mealData.description);
      expect(response.body.meal.prepTime).toBe(mealData.prepTime);
      expect(response.body.meal.active).toBe(mealData.active);
      expect(response.body.meal.createdBy).toBeDefined();
    });

    it('should create a meal with default values', async () => {
      const mealData = {
        name: 'Minimal Meal'
      };

      const response = await request(app)
        .post('/api/meals')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mealData)
        .expect(201);

      expect(response.body.meal.name).toBe(mealData.name);
      expect(response.body.meal.prepTime).toBe(0);
      expect(response.body.meal.active).toBe(true);
      expect(response.body.meal.ingredients).toEqual([]);
    });

    it('should reject meal without name', async () => {
      const mealData = {
        description: 'No name meal'
      };

      const response = await request(app)
        .post('/api/meals')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mealData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: 'name',
            msg: 'Meal name is required'
          })
        ])
      );
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/meals')
        .send({ name: 'Test Meal' })
        .expect(401);

      expect(response.body).toHaveProperty('message', 'No token provided');
    });
  });

  describe('GET /api/meals/:id', () => {
    let mealId;

    beforeEach(async () => {
      const meal = await Meal.create({
        name: 'Test Meal',
        description: 'A test meal',
        prepTime: 30,
        active: true,
        createdBy: userId
      });
      mealId = meal._id.toString();
    });

    it('should get a specific meal by id', async () => {
      const response = await request(app)
        .get(`/api/meals/${mealId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('meal');
      expect(response.body.meal._id).toBe(mealId);
      expect(response.body.meal.name).toBe('Test Meal');
    });

    it('should return 404 for non-existent meal', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/meals/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Meal not found');
    });

    it('should return 400 for invalid meal id', async () => {
      const response = await request(app)
        .get('/api/meals/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Invalid meal ID');
    });
  });

  describe('PUT /api/meals/:id', () => {
    let mealId;

    beforeEach(async () => {
      const meal = await Meal.create({
        name: 'Original Meal',
        description: 'Original description',
        prepTime: 30,
        active: true,
        createdBy: userId
      });
      mealId = meal._id.toString();
    });

    it('should update a meal with valid data', async () => {
      const updateData = {
        name: 'Updated Meal',
        description: 'Updated description',
        prepTime: 45,
        active: false
      };

      const response = await request(app)
        .put(`/api/meals/${mealId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('meal');
      expect(response.body.meal.name).toBe(updateData.name);
      expect(response.body.meal.description).toBe(updateData.description);
      expect(response.body.meal.prepTime).toBe(updateData.prepTime);
      expect(response.body.meal.active).toBe(updateData.active);
    });

    it('should partially update a meal', async () => {
      const updateData = {
        prepTime: 60
      };

      const response = await request(app)
        .put(`/api/meals/${mealId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.meal.name).toBe('Original Meal'); // Unchanged
      expect(response.body.meal.prepTime).toBe(60); // Updated
    });

    it('should return 404 for non-existent meal', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .put(`/api/meals/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated' })
        .expect(404);

      expect(response.body).toHaveProperty('message', 'Meal not found');
    });
  });

  describe('DELETE /api/meals/:id', () => {
    let mealId;

    beforeEach(async () => {
      const meal = await Meal.create({
        name: 'Meal to Delete',
        description: 'This meal will be deleted',
        prepTime: 30,
        active: true,
        createdBy: userId
      });
      mealId = meal._id.toString();
    });

    it('should delete a meal successfully', async () => {
      const response = await request(app)
        .delete(`/api/meals/${mealId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Meal deleted successfully');

      // Verify meal is actually deleted
      const deletedMeal = await Meal.findById(mealId);
      expect(deletedMeal).toBeNull();
    });

    it('should return 404 for non-existent meal', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .delete(`/api/meals/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('message', 'Meal not found');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete(`/api/meals/${mealId}`)
        .expect(401);

      expect(response.body).toHaveProperty('message', 'No token provided');
    });
  });

  describe('Meal validation', () => {
    it('should validate meal name length', async () => {
      const mealData = {
        name: 'a'.repeat(101), // Exceeds maxlength of 100
        description: 'Test description'
      };

      const response = await request(app)
        .post('/api/meals')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mealData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should validate prepTime is a number', async () => {
      const mealData = {
        name: 'Test Meal',
        prepTime: 'invalid'
      };

      const response = await request(app)
        .post('/api/meals')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mealData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should allow ingredients array', async () => {
      const mealData = {
        name: 'Meal with Ingredients',
        ingredients: [
          { name: 'Pasta', quantity: '200', unit: 'g' },
          { name: 'Tomatoes', quantity: '3', unit: 'pieces' }
        ]
      };

      const response = await request(app)
        .post('/api/meals')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mealData)
        .expect(201);

      expect(response.body.meal.ingredients).toHaveLength(2);
      expect(response.body.meal.ingredients[0].name).toBe('Pasta');
    });
  });
}); 