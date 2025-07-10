const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const Ingredient = require('../models/Ingredient');

describe('Ingredients API', () => {
  let authToken;
  let userId;
  let testIngredient;

  beforeEach(async () => {
    // Clean up all data before each test
    await Ingredient.deleteMany({});
    await User.deleteMany({});
    
    // Create test user using the same approach as meal plans tests
    const user = await User.create({
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: 'password',
      role: 'user'
    });
    userId = user._id;

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser',
        password: 'password'
      });

    if (loginResponse.status !== 200) {
      console.error('Login failed:', loginResponse.body);
      throw new Error(`Login failed with status ${loginResponse.status}`);
    }

    authToken = loginResponse.body.token;
    
    // Create a test ingredient
    testIngredient = new Ingredient({
      name: 'Test Ingredient',
      quantity: 2.5,
      unit: 'lbs',
      store: 'Test Store',
      createdBy: userId
    });
    await testIngredient.save();
  });

  afterAll(async () => {
    // Clean up
    await User.deleteMany({});
    await Ingredient.deleteMany({});
  });

  describe('GET /api/ingredients', () => {
    it('should get all ingredients for authenticated user', async () => {
      const response = await request(app)
        .get('/api/ingredients')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.ingredients).toHaveLength(1);
      expect(response.body.ingredients[0].name).toBe('Test Ingredient');
      expect(response.body.count).toBe(1);
    });

    it('should filter ingredients by search term', async () => {
      // Create another ingredient
      const ingredient2 = new Ingredient({
        name: 'Another Item',
        quantity: 1,
        unit: 'kg',
        store: 'Test Store',
        createdBy: userId
      });
      await ingredient2.save();

      const response = await request(app)
        .get('/api/ingredients?search=Another')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.ingredients).toHaveLength(1);
      expect(response.body.ingredients[0].name).toBe('Another Item');
    });

    it('should filter ingredients by store', async () => {
      // Create ingredient with different store
      const ingredient2 = new Ingredient({
        name: 'Store Item',
        quantity: 1,
        unit: 'kg',
        store: 'Different Store',
        createdBy: userId
      });
      await ingredient2.save();

      const response = await request(app)
        .get('/api/ingredients?store=Different')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.ingredients).toHaveLength(1);
      expect(response.body.ingredients[0].store).toBe('Different Store');
    });

    it('should filter by active status', async () => {
      // Create inactive ingredient
      const ingredient2 = new Ingredient({
        name: 'Inactive Item',
        quantity: 1,
        unit: 'kg',
        store: 'Test Store',
        isActive: false,
        createdBy: userId
      });
      await ingredient2.save();

      const response = await request(app)
        .get('/api/ingredients?active=true')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.ingredients).toHaveLength(1);
      expect(response.body.ingredients[0].isActive).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/ingredients');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/ingredients/:id', () => {
    it('should get single ingredient by ID', async () => {
      const response = await request(app)
        .get(`/api/ingredients/${testIngredient._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.ingredient.name).toBe('Test Ingredient');
      expect(response.body.ingredient.quantity).toBe(2.5);
      expect(response.body.ingredient.unit).toBe('lbs');
      expect(response.body.ingredient.store).toBe('Test Store');
    });

    it('should return 404 for non-existent ingredient', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/ingredients/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Ingredient not found');
    });

    it('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .get('/api/ingredients/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid ingredient ID');
    });
  });

  describe('POST /api/ingredients', () => {
    it('should create new ingredient with valid data', async () => {
      const ingredientData = {
        name: 'New Ingredient',
        quantity: 1.5,
        unit: 'kg',
        store: 'New Store'
      };

      const response = await request(app)
        .post('/api/ingredients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(ingredientData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.ingredient.name).toBe('New Ingredient');
      expect(response.body.ingredient.quantity).toBe(1.5);
      expect(response.body.ingredient.unit).toBe('kg');
      expect(response.body.ingredient.store).toBe('New Store');
      expect(response.body.ingredient.isActive).toBe(true);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/ingredients')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toHaveLength(5); // name, quantity (2 errors), unit, store
    });

    it('should validate ingredient name length', async () => {
      const longName = 'a'.repeat(101);
      const response = await request(app)
        .post('/api/ingredients')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: longName,
          quantity: 1,
          unit: 'lbs',
          store: 'Test Store'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate quantity is positive', async () => {
      const response = await request(app)
        .post('/api/ingredients')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Item',
          quantity: -1,
          unit: 'lbs',
          store: 'Test Store'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate unit is from allowed list', async () => {
      const response = await request(app)
        .post('/api/ingredients')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Item',
          quantity: 1,
          unit: 'invalid-unit',
          store: 'Test Store'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should prevent duplicate ingredient names', async () => {
      const response = await request(app)
        .post('/api/ingredients')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Ingredient', // Same as existing
          quantity: 1,
          unit: 'lbs',
          store: 'Test Store'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('An ingredient with this name already exists');
    });
  });

  describe('PUT /api/ingredients/:id', () => {
    it('should update ingredient with valid data', async () => {
      const updateData = {
        name: 'Updated Ingredient',
        quantity: 3.0,
        unit: 'kg',
        store: 'Updated Store'
      };

      const response = await request(app)
        .put(`/api/ingredients/${testIngredient._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.ingredient.name).toBe('Updated Ingredient');
      expect(response.body.ingredient.quantity).toBe(3.0);
      expect(response.body.ingredient.unit).toBe('kg');
      expect(response.body.ingredient.store).toBe('Updated Store');
    });

    it('should return 404 for non-existent ingredient', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .put(`/api/ingredients/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Ingredient not found');
    });

    it('should validate updated data', async () => {
      const response = await request(app)
        .put(`/api/ingredients/${testIngredient._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          quantity: -1, // Invalid quantity
          unit: 'invalid-unit' // Invalid unit
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/ingredients/:id', () => {
    it('should soft delete ingredient', async () => {
      const response = await request(app)
        .delete(`/api/ingredients/${testIngredient._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Ingredient deleted successfully');

      // Verify ingredient is soft deleted
      const ingredient = await Ingredient.findById(testIngredient._id);
      expect(ingredient.isActive).toBe(false);
    });

    it('should return 404 for non-existent ingredient', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .delete(`/api/ingredients/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Ingredient not found');
    });
  });

  describe('GET /api/ingredients/stores/list', () => {
    it('should get unique stores list', async () => {
      // Create ingredients with different stores
      const ingredient2 = new Ingredient({
        name: 'Item 2',
        quantity: 1,
        unit: 'kg',
        store: 'Store B',
        createdBy: userId
      });
      await ingredient2.save();

      const ingredient3 = new Ingredient({
        name: 'Item 3',
        quantity: 1,
        unit: 'kg',
        store: 'Store A',
        createdBy: userId
      });
      await ingredient3.save();

      const response = await request(app)
        .get('/api/ingredients/stores/list')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.stores).toContain('Test Store');
      expect(response.body.stores).toContain('Store A');
      expect(response.body.stores).toContain('Store B');
      expect(response.body.stores).toEqual(expect.arrayContaining([
        'Store A', 'Store B', 'Test Store'
      ]));
    });

    it('should only return stores for active ingredients', async () => {
      // Create inactive ingredient
      const ingredient2 = new Ingredient({
        name: 'Inactive Item',
        quantity: 1,
        unit: 'kg',
        store: 'Inactive Store',
        isActive: false,
        createdBy: userId
      });
      await ingredient2.save();

      const response = await request(app)
        .get('/api/ingredients/stores/list')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.stores).not.toContain('Inactive Store');
      expect(response.body.stores).toContain('Test Store');
    });
  });
}); 