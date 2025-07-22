const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const Meal = require('../models/Meal');
const Ingredient = require('../models/Ingredient');
const Store = require('../models/Store');

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

    it('should prevent duplicate meal names', async () => {
      // First, create a meal
      await Meal.create({
        name: 'Duplicate Test Meal',
        createdBy: userId
      });

      // Try to create another meal with the same name
      const mealData = {
        name: 'Duplicate Test Meal'
      };

      const response = await request(app)
        .post('/api/meals')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mealData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'A meal with this name already exists');
    });

    it('should prevent duplicate meal names (case insensitive)', async () => {
      // First, create a meal
      await Meal.create({
        name: 'Case Test Meal',
        createdBy: userId
      });

      // Try to create another meal with the same name but different case
      const mealData = {
        name: 'CASE TEST MEAL'
      };

      const response = await request(app)
        .post('/api/meals')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mealData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'A meal with this name already exists');
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

    it('should prevent duplicate meal names when updating', async () => {
      // Create another meal with a different name
      const anotherMeal = await Meal.create({
        name: 'Another Meal',
        createdBy: userId
      });

      // Try to update the first meal to have the same name as the second
      const response = await request(app)
        .put(`/api/meals/${mealId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Another Meal' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'A meal with this name already exists');
    });

    it('should allow updating meal with same name (no change)', async () => {
      const response = await request(app)
        .put(`/api/meals/${mealId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Original Meal', description: 'Updated description' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.meal.description).toBe('Updated description');
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
  });

  describe('Meal Ingredients Integration', () => {
    let ingredientId1, ingredientId2;
    let testStore;

    beforeEach(async () => {
      // Clean up ingredients and stores
      await Ingredient.deleteMany({});
      await Store.deleteMany({});

      // Create test store
      testStore = await Store.create({
        name: 'Grocery Store',
        address: {
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345',
          country: 'USA'
        },
        createdBy: userId
      });

      // Create test ingredients
      const ingredient1 = await Ingredient.create({
        name: 'Chicken Breast',
        quantity: 1,
        unit: 'lbs',
        store: testStore._id,
        createdBy: userId
      });
      ingredientId1 = ingredient1._id;

      const ingredient2 = await Ingredient.create({
        name: 'Olive Oil',
        quantity: 500,
        unit: 'ml',
        store: testStore._id,
        createdBy: userId
      });
      ingredientId2 = ingredient2._id;
    });

    it('should create meal with ingredients from master data', async () => {
      const mealData = {
        name: 'Grilled Chicken',
        description: 'Delicious grilled chicken',
        prepTime: 30,
        ingredients: [
          {
            ingredient: ingredientId1,
            quantity: 2,
            unit: 'lbs',
            notes: 'Boneless, skinless'
          },
          {
            ingredient: ingredientId2,
            quantity: 50,
            unit: 'ml',
            notes: 'Extra virgin'
          }
        ]
      };

      const response = await request(app)
        .post('/api/meals')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mealData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.meal.ingredients).toHaveLength(2);
      expect(response.body.meal.ingredients[0].ingredient._id).toBe(ingredientId1.toString());
      expect(response.body.meal.ingredients[0].quantity).toBe(2);
      expect(response.body.meal.ingredients[0].unit).toBe('lbs');
      expect(response.body.meal.ingredients[0].notes).toBe('Boneless, skinless');
      expect(response.body.meal.ingredients[0].ingredient.name).toBe('Chicken Breast');
    });

    it('should create meal with optional ingredient fields', async () => {
      const mealData = {
        name: 'Simple Meal',
        ingredients: [
          {
            ingredient: ingredientId1
            // No quantity, unit, or notes - all optional
          }
        ]
      };

      const response = await request(app)
        .post('/api/meals')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mealData)
        .expect(201);

      expect(response.body.meal.ingredients).toHaveLength(1);
      expect(response.body.meal.ingredients[0].ingredient._id).toBe(ingredientId1.toString());
      expect(response.body.meal.ingredients[0].quantity).toBeUndefined();
      expect(response.body.meal.ingredients[0].unit).toBeUndefined();
      expect(response.body.meal.ingredients[0].notes).toBeUndefined();
    });

    it('should create meal without ingredients', async () => {
      const mealData = {
        name: 'Ingredient-less Meal',
        description: 'A meal without ingredients'
      };

      const response = await request(app)
        .post('/api/meals')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mealData)
        .expect(201);

      expect(response.body.meal.ingredients).toEqual([]);
    });

    it('should update meal ingredients', async () => {
      // First create a meal
      const meal = await Meal.create({
        name: 'Original Meal',
        ingredients: [{
          ingredient: ingredientId1,
          quantity: 1,
          unit: 'lbs'
        }],
        createdBy: userId
      });

      const updateData = {
        ingredients: [
          {
            ingredient: ingredientId2,
            quantity: 100,
            unit: 'ml',
            notes: 'For cooking'
          }
        ]
      };

      const response = await request(app)
        .put(`/api/meals/${meal._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.meal.ingredients).toHaveLength(1);
      expect(response.body.meal.ingredients[0].ingredient._id).toBe(ingredientId2.toString());
      expect(response.body.meal.ingredients[0].quantity).toBe(100);
      expect(response.body.meal.ingredients[0].notes).toBe('For cooking');
    });

    it('should validate ingredient ID format', async () => {
      const mealData = {
        name: 'Invalid Ingredient Meal',
        ingredients: [
          {
            ingredient: 'invalid-id',
            quantity: 1,
            unit: 'lbs'
          }
        ]
      };

      const response = await request(app)
        .post('/api/meals')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mealData)
        .expect(400);

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: 'ingredients[0].ingredient',
            msg: 'Invalid ingredient ID'
          })
        ])
      );
    });

    it('should validate ingredient quantity is numeric', async () => {
      const mealData = {
        name: 'Invalid Quantity Meal',
        ingredients: [
          {
            ingredient: ingredientId1,
            quantity: 'not-a-number',
            unit: 'lbs'
          }
        ]
      };

      const response = await request(app)
        .post('/api/meals')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mealData)
        .expect(400);

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: 'ingredients[0].quantity',
            msg: 'Quantity must be a positive number or empty'
          })
        ])
      );
    });

    it('should validate ingredient unit enum', async () => {
      const mealData = {
        name: 'Invalid Unit Meal',
        ingredients: [
          {
            ingredient: ingredientId1,
            quantity: 1,
            unit: 'invalid-unit'
          }
        ]
      };

      const response = await request(app)
        .post('/api/meals')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mealData)
        .expect(400);

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: 'ingredients[0].unit',
            msg: 'Invalid unit. Must be one of: lbs, oz, kg, g, count, cups, tbsp, tsp, ml, l'
          })
        ])
      );
    });

    it('should populate ingredient details in GET requests', async () => {
      // Create meal with ingredients
      const meal = await Meal.create({
        name: 'Populated Meal',
        ingredients: [
          {
            ingredient: ingredientId1,
            quantity: 2,
            unit: 'lbs',
            notes: 'Fresh chicken'
          }
        ],
        createdBy: userId
      });

      const response = await request(app)
        .get(`/api/meals/${meal._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.meal.ingredients).toHaveLength(1);
      expect(response.body.meal.ingredients[0].ingredient).toHaveProperty('name', 'Chicken Breast');
      expect(response.body.meal.ingredients[0].ingredient).toHaveProperty('unit', 'lbs');
      expect(response.body.meal.ingredients[0].ingredient.store).toHaveProperty('name', 'Grocery Store');
      expect(response.body.meal.ingredients[0].quantity).toBe(2);
      expect(response.body.meal.ingredients[0].notes).toBe('Fresh chicken');
    });

    it('should handle non-existent ingredient references gracefully', async () => {
      const fakeIngredientId = '507f1f77bcf86cd799439011';
      
      const mealData = {
        name: 'Meal with Non-existent Ingredient',
        ingredients: [
          {
            ingredient: fakeIngredientId,
            quantity: 1,
            unit: 'lbs'
          }
        ]
      };

      // This should still create the meal, but the ingredient reference will be null when populated
      const response = await request(app)
        .post('/api/meals')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mealData)
        .expect(201);

      expect(response.body.meal.ingredients).toHaveLength(1);
      expect(response.body.meal.ingredients[0].ingredient).toBe(null); // Populated but ingredient doesn't exist
    });

    it('should handle ingredients with missing ingredient reference', async () => {
      const mealData = {
        name: 'Meal with Mixed Ingredients',
        ingredients: [
          {
            ingredient: ingredientId1,
            quantity: 1,
            unit: 'lbs'
          },
          {
            // Ingredient with missing reference - should still be saved
            quantity: 2,
            unit: 'kg'
          },
          {
            ingredient: ingredientId2,
            quantity: 50,
            unit: 'ml'
          }
        ]
      };

      const response = await request(app)
        .post('/api/meals')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mealData)
        .expect(201);

      // All ingredients should be saved, even those without ingredient reference
      expect(response.body.meal.ingredients).toHaveLength(3);
      expect(response.body.meal.ingredients[0].ingredient._id).toBe(ingredientId1.toString());
      expect(response.body.meal.ingredients[1].ingredient).toBeUndefined(); // No ingredient reference
      expect(response.body.meal.ingredients[1].quantity).toBe(2);
      expect(response.body.meal.ingredients[2].ingredient._id).toBe(ingredientId2.toString());
    });
  });
}); 