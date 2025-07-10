const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const Store = require('../models/Store');

describe('Store API', () => {
  let authToken;
  let userId;
  let testStore;

  beforeEach(async () => {
    // Clean up all data before each test
    await Store.deleteMany({});
    await User.deleteMany({});
    
    // Create test user
    const testUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User'
    });
    await testUser.save();
    userId = testUser._id;

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser',
        password: 'password123'
      });

    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({});
    await Store.deleteMany({});
  });

  describe('POST /api/stores', () => {
    it('should create a new store with valid data', async () => {
      const storeData = {
        name: 'Test Store',
        address: {
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345',
          country: 'USA'
        }
      };

      const response = await request(app)
        .post('/api/stores')
        .set('Authorization', `Bearer ${authToken}`)
        .send(storeData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.store.name).toBe(storeData.name);
      expect(response.body.store.address.street).toBe(storeData.address.street);
      expect(response.body.store.address.city).toBe(storeData.address.city);
      expect(response.body.store.address.state).toBe(storeData.address.state);
      expect(response.body.store.address.zipCode).toBe(storeData.address.zipCode);
      expect(response.body.store.address.country).toBe(storeData.address.country);
      expect(response.body.store.fullAddress).toBe('123 Main St, Anytown, CA, 12345');
      expect(response.body.store.isActive).toBe(true);
      expect(response.body.store.createdBy._id).toBe(userId.toString());
    });

    it('should create a store with default country when not provided', async () => {
      const storeData = {
        name: 'Test Store 2',
        address: {
          street: '456 Oak Ave',
          city: 'Testville',
          state: 'NY',
          zipCode: '67890'
        }
      };

      const response = await request(app)
        .post('/api/stores')
        .set('Authorization', `Bearer ${authToken}`)
        .send(storeData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.store.address.country).toBe('USA');
    });

    it('should fail when required fields are missing', async () => {
      const invalidData = {
        name: 'Test Store'
        // Missing address
      };

      const response = await request(app)
        .post('/api/stores')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should fail when street address is missing', async () => {
      const invalidData = {
        name: 'Test Store',
        address: {
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345'
        }
      };

      const response = await request(app)
        .post('/api/stores')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should fail when city is missing', async () => {
      const invalidData = {
        name: 'Test Store',
        address: {
          street: '123 Main St',
          state: 'CA',
          zipCode: '12345'
        }
      };

      const response = await request(app)
        .post('/api/stores')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should fail when state is missing', async () => {
      const invalidData = {
        name: 'Test Store',
        address: {
          street: '123 Main St',
          city: 'Anytown',
          zipCode: '12345'
        }
      };

      const response = await request(app)
        .post('/api/stores')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should fail when zipCode is missing', async () => {
      const invalidData = {
        name: 'Test Store',
        address: {
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA'
        }
      };

      const response = await request(app)
        .post('/api/stores')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should fail when name exceeds character limit', async () => {
      const invalidData = {
        name: 'A'.repeat(101), // Exceeds 100 character limit
        address: {
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345'
        }
      };

      const response = await request(app)
        .post('/api/stores')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should fail when street address exceeds character limit', async () => {
      const invalidData = {
        name: 'Test Store',
        address: {
          street: 'A'.repeat(101), // Exceeds 100 character limit
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345'
        }
      };

      const response = await request(app)
        .post('/api/stores')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should prevent duplicate store names for same user', async () => {
      const storeData = {
        name: 'Duplicate Store',
        address: {
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345'
        }
      };

      // Create first store
      await request(app)
        .post('/api/stores')
        .set('Authorization', `Bearer ${authToken}`)
        .send(storeData);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/stores')
        .set('Authorization', `Bearer ${authToken}`)
        .send(storeData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should require authentication', async () => {
      const storeData = {
        name: 'Test Store',
        address: {
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345'
        }
      };

      const response = await request(app)
        .post('/api/stores')
        .send(storeData);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/stores', () => {
    beforeEach(async () => {
      // Create test stores
      testStore = new Store({
        name: 'Test Store',
        address: {
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345',
          country: 'USA'
        },
        createdBy: userId
      });
      await testStore.save();
    });

    it('should get all stores for authenticated user', async () => {
      const response = await request(app)
        .get('/api/stores')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.stores).toHaveLength(1);
      expect(response.body.stores[0].name).toBe('Test Store');
      expect(response.body.stores[0].address.street).toBe('123 Main St');
      expect(response.body.count).toBe(1);
    });

    it('should search stores by name', async () => {
      const response = await request(app)
        .get('/api/stores?search=Test')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.stores).toHaveLength(1);
    });

    it('should search stores by street address', async () => {
      const response = await request(app)
        .get('/api/stores?search=Main')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.stores).toHaveLength(1);
    });

    it('should search stores by city', async () => {
      const response = await request(app)
        .get('/api/stores?search=Anytown')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.stores).toHaveLength(1);
    });

    it('should search stores by state', async () => {
      const response = await request(app)
        .get('/api/stores?search=CA')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.stores).toHaveLength(1);
    });

    it('should search stores by ZIP code', async () => {
      const response = await request(app)
        .get('/api/stores?search=12345')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.stores).toHaveLength(1);
    });

    it('should filter by active status', async () => {
      // Create inactive store
      const inactiveStore = new Store({
        name: 'Inactive Store',
        address: {
          street: '456 Oak Ave',
          city: 'Testville',
          state: 'NY',
          zipCode: '67890'
        },
        isActive: false,
        createdBy: userId
      });
      await inactiveStore.save();

      const response = await request(app)
        .get('/api/stores?active=true')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.stores).toHaveLength(1);
      expect(response.body.stores[0].name).toBe('Test Store');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/stores');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/stores/:id', () => {
    beforeEach(async () => {
      testStore = new Store({
        name: 'Test Store',
        address: {
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345',
          country: 'USA'
        },
        createdBy: userId
      });
      await testStore.save();
    });

    it('should get a specific store', async () => {
      const response = await request(app)
        .get(`/api/stores/${testStore._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.store.name).toBe('Test Store');
      expect(response.body.store.address.street).toBe('123 Main St');
    });

    it('should return 404 for non-existent store', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/stores/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid store ID', async () => {
      const response = await request(app)
        .get('/api/stores/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/stores/:id', () => {
    beforeEach(async () => {
      testStore = new Store({
        name: 'Test Store',
        address: {
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345',
          country: 'USA'
        },
        createdBy: userId
      });
      await testStore.save();
    });

    it('should update a store', async () => {
      const updateData = {
        name: 'Updated Store',
        address: {
          street: '456 Oak Ave',
          city: 'Newtown',
          state: 'NY',
          zipCode: '67890'
        }
      };

      const response = await request(app)
        .put(`/api/stores/${testStore._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.store.name).toBe('Updated Store');
      expect(response.body.store.address.street).toBe('456 Oak Ave');
      expect(response.body.store.address.city).toBe('Newtown');
      expect(response.body.store.address.state).toBe('NY');
      expect(response.body.store.address.zipCode).toBe('67890');
    });

    it('should update only provided fields', async () => {
      const updateData = {
        name: 'Partially Updated Store'
      };

      const response = await request(app)
        .put(`/api/stores/${testStore._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.store.name).toBe('Partially Updated Store');
      expect(response.body.store.address.street).toBe('123 Main St'); // Should remain unchanged
    });

    it('should prevent duplicate names when updating', async () => {
      // Create another store
      const anotherStore = new Store({
        name: 'Another Store',
        address: {
          street: '789 Pine St',
          city: 'Otherville',
          state: 'TX',
          zipCode: '11111'
        },
        createdBy: userId
      });
      await anotherStore.save();

      const updateData = {
        name: 'Another Store' // Try to use existing name
      };

      const response = await request(app)
        .put(`/api/stores/${testStore._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should return 404 for non-existent store', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const updateData = {
        name: 'Updated Store'
      };

      const response = await request(app)
        .put(`/api/stores/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/stores/:id', () => {
    beforeEach(async () => {
      testStore = new Store({
        name: 'Test Store',
        address: {
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345',
          country: 'USA'
        },
        createdBy: userId
      });
      await testStore.save();
    });

    it('should soft delete a store', async () => {
      const response = await request(app)
        .delete(`/api/stores/${testStore._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify store is marked as inactive
      const deletedStore = await Store.findById(testStore._id);
      expect(deletedStore.isActive).toBe(false);
    });

    it('should return 404 for non-existent store', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/api/stores/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
}); 