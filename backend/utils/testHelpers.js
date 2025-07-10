const User = require('../../models/User');
const Store = require('../../models/Store');
const Ingredient = require('../../models/Ingredient');
const Meal = require('../../models/Meal');

/**
 * Create a test user with default values
 */
async function createTestUser(overrides = {}) {
  const defaultUser = {
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    password: 'password',
    role: 'user'
  };

  return await User.create({ ...defaultUser, ...overrides });
}

/**
 * Create a test store with default values
 */
async function createTestStore(userId, overrides = {}) {
  const defaultStore = {
    name: 'Test Store',
    address: {
      street: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      zipCode: '12345',
      country: 'USA'
    },
    createdBy: userId
  };

  return await Store.create({ ...defaultStore, ...overrides });
}

/**
 * Create a test ingredient with Store ObjectId reference
 */
async function createTestIngredient(userId, storeId, overrides = {}) {
  const defaultIngredient = {
    name: 'Test Ingredient',
    quantity: 1,
    unit: 'lbs',
    store: storeId,
    createdBy: userId
  };

  return await Ingredient.create({ ...defaultIngredient, ...overrides });
}

/**
 * Create a test meal with optional ingredients
 */
async function createTestMeal(userId, ingredients = [], overrides = {}) {
  const defaultMeal = {
    name: 'Test Meal',
    description: 'A test meal',
    prepTime: 30,
    active: true,
    ingredients: ingredients,
    createdBy: userId
  };

  return await Meal.create({ ...defaultMeal, ...overrides });
}

/**
 * Clean up all test data
 */
async function cleanupTestData() {
  await User.deleteMany({});
  await Store.deleteMany({});
  await Ingredient.deleteMany({});
  await Meal.deleteMany({});
}

/**
 * Create a complete test setup with user, store, and ingredients
 */
async function createCompleteTestSetup() {
  // Create user
  const user = await createTestUser();
  
  // Create store
  const store = await createTestStore(user._id);
  
  // Create ingredients
  const ingredient1 = await createTestIngredient(user._id, store._id, {
    name: 'Chicken Breast',
    quantity: 1,
    unit: 'lbs'
  });
  
  const ingredient2 = await createTestIngredient(user._id, store._id, {
    name: 'Olive Oil',
    quantity: 500,
    unit: 'ml'
  });

  return {
    user,
    store,
    ingredients: [ingredient1, ingredient2]
  };
}

module.exports = {
  createTestUser,
  createTestStore,
  createTestIngredient,
  createTestMeal,
  cleanupTestData,
  createCompleteTestSetup
}; 