const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Import the app instance
const app = require('../server');

// Import models for testing
const User = require('../models/User');
const Meal = require('../models/Meal');
const Ingredient = require('../models/Ingredient');
const Store = require('../models/Store');

// Test data
let testUser, testAdmin, testToken, adminToken, testStore;

beforeEach(async () => {
  // Clear all collections before each test
  await User.deleteMany({});
  await Meal.deleteMany({});
  await Ingredient.deleteMany({});
  await Store.deleteMany({});
  
  // Create test users
  testUser = await User.create({
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'User',
    role: 'user'
  });

  testAdmin = await User.create({
    username: 'testadmin',
    email: 'admin@example.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'Admin',
    role: 'admin'
  });

  // Create test store
  testStore = await Store.create({
    name: 'Test Store',
    address: {
      street: '123 Test St',
      city: 'Test City',
      state: 'TS',
      zipCode: '12345'
    },
    createdBy: testUser._id
  });

  // Generate tokens
  testToken = jwt.sign(
    { userId: testUser._id, username: testUser.username },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );

  adminToken = jwt.sign(
    { userId: testAdmin._id, username: testAdmin.username },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );

  // Create some test data
  await Meal.create({
    name: 'Test Meal',
    description: 'A test meal',
    ingredients: [],
    instructions: ['Step 1', 'Step 2'],
    prepTime: 30,
    cookTime: 45,
    servings: 4,
    createdBy: testUser._id
  });

  await Ingredient.create({
    name: 'Test Ingredient',
    quantity: 1,
    unit: 'cups',
    store: testStore._id,
    createdBy: testUser._id
  });
});

describe('Backup API Tests', () => {
  
  describe('GET /api/backup/database-info', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/backup/database-info');
      
      expect(response.status).toBe(401);
    });

    it('should require admin privileges', async () => {
      const response = await request(app)
        .get('/api/backup/database-info')
        .set('Authorization', `Bearer ${testToken}`);
      
      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Admin access required');
    });

    it('should return database information for admin', async () => {
      const response = await request(app)
        .get('/api/backup/database-info')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('appVersion');
      expect(response.body.data).toHaveProperty('collections');
      expect(response.body.data).toHaveProperty('totalDocuments');
      expect(response.body.data).toHaveProperty('mongodb');
      expect(response.body.data.collections).toHaveProperty('User');
      expect(response.body.data.collections).toHaveProperty('Meal');
      expect(response.body.data.collections).toHaveProperty('Ingredient');
    });

    it('should include collection statistics', async () => {
      const response = await request(app)
        .get('/api/backup/database-info')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      const collections = response.body.data.collections;
      
      // Check User collection (should have 2 users)
      expect(collections.User.count).toBe(2);
      expect(collections.User.hasData).toBe(true);
      
      // Check Meal collection (should have 1 meal)
      expect(collections.Meal.count).toBe(1);
      expect(collections.Meal.hasData).toBe(true);
      
      // Check Ingredient collection (should have 1 ingredient)
      expect(collections.Ingredient.count).toBe(1);
      expect(collections.Ingredient.hasData).toBe(true);
    });
  });

  describe('POST /api/backup/generate-script', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/backup/generate-script')
        .send({ format: 'mongodb' });
      
      expect(response.status).toBe(401);
    });

    it('should require admin privileges', async () => {
      const response = await request(app)
        .post('/api/backup/generate-script')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ format: 'mongodb' });
      
      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Admin access required');
    });

    it('should validate format parameter', async () => {
      const response = await request(app)
        .post('/api/backup/generate-script')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ format: 'invalid' });
      
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should generate MongoDB backup script', async () => {
      const response = await request(app)
        .post('/api/backup/generate-script')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ format: 'mongodb' });
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/javascript');
      expect(response.headers['content-disposition']).toMatch(/attachment; filename=.*\.js/);
      
      const script = response.text;
      expect(script).toContain('Generated backup script for Meal Planner App');
      expect(script).toContain('MongoDB');
      expect(script).toContain('print(');
    });

    it('should generate JSON export', async () => {
      const response = await request(app)
        .post('/api/backup/generate-script')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ format: 'json' });
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.headers['content-disposition']).toMatch(/attachment; filename=.*\.json/);
      
      const exportData = JSON.parse(response.text);
      expect(exportData).toHaveProperty('metadata');
      expect(exportData).toHaveProperty('data');
      expect(exportData.metadata).toHaveProperty('version');
      expect(exportData.metadata).toHaveProperty('timestamp');
      expect(exportData.metadata.type).toBe('json_export');
      expect(exportData.data).toHaveProperty('User');
      expect(exportData.data).toHaveProperty('Meal');
    });

    it('should respect collection selection', async () => {
      const response = await request(app)
        .post('/api/backup/generate-script')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ 
          format: 'json',
          collections: ['User', 'Meal']
        });
      
      expect(response.status).toBe(200);
      const exportData = JSON.parse(response.text);
      
      expect(exportData.data).toHaveProperty('User');
      expect(exportData.data).toHaveProperty('Meal');
      expect(exportData.data.User.count).toBe(2);
      expect(exportData.data.Meal.count).toBe(1);
    });

    it('should handle empty collections parameter', async () => {
      const response = await request(app)
        .post('/api/backup/generate-script')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ 
          format: 'json',
          collections: []
        });
      
      expect(response.status).toBe(200);
      const exportData = JSON.parse(response.text);
      
      // Should include all collections when empty array is provided
      expect(exportData.data).toHaveProperty('User');
      expect(exportData.data).toHaveProperty('Meal');
      expect(exportData.data).toHaveProperty('Ingredient');
    });

    it('should include indexes when requested', async () => {
      const response = await request(app)
        .post('/api/backup/generate-script')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ 
          format: 'mongodb',
          includeIndexes: true
        });
      
      expect(response.status).toBe(200);
      const script = response.text;
      expect(script).toContain('getIndexes');
    });

    it('should exclude indexes when not requested', async () => {
      const response = await request(app)
        .post('/api/backup/generate-script')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ 
          format: 'mongodb',
          includeIndexes: false
        });
      
      expect(response.status).toBe(200);
      const script = response.text;
      expect(script).not.toContain('getIndexes');
    });
  });

  describe('POST /api/backup/validate-compatibility', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/backup/validate-compatibility')
        .send({ backupVersion: '1.0.0' });
      
      expect(response.status).toBe(401);
    });

    it('should require admin privileges', async () => {
      const response = await request(app)
        .post('/api/backup/validate-compatibility')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ backupVersion: '1.0.0' });
      
      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Admin access required');
    });

    it('should validate backup version parameter', async () => {
      const response = await request(app)
        .post('/api/backup/validate-compatibility')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should validate compatibility for compatible version', async () => {
      const response = await request(app)
        .post('/api/backup/validate-compatibility')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ backupVersion: '1.0.0' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('compatibility');
      expect(response.body.data).toHaveProperty('currentVersion');
      expect(response.body.data).toHaveProperty('backupVersion');
      expect(response.body.data.compatibility.isCompatible).toBe(true);
    });

    it('should flag incompatible newer version', async () => {
      const response = await request(app)
        .post('/api/backup/validate-compatibility')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ backupVersion: '999.0.0' });
      
      expect(response.status).toBe(200);
      expect(response.body.data.compatibility.isCompatible).toBe(false);
      expect(response.body.data.compatibility.errors.length).toBeGreaterThan(0);
    });

    it('should warn about pre-1.0 versions', async () => {
      const response = await request(app)
        .post('/api/backup/validate-compatibility')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ backupVersion: '0.9.0' });
      
      expect(response.status).toBe(200);
      expect(response.body.data.compatibility.warnings.length).toBeGreaterThan(0);
      expect(response.body.data.compatibility.warnings[0]).toContain('pre-1.0 version');
    });

    it('should validate schema compatibility with backup data', async () => {
      const mockBackupData = {
        metadata: {
          statistics: {
            User: { schema: ['_id', 'username', 'email'] },
            UnknownCollection: { schema: ['field1', 'field2'] }
          }
        }
      };

      const response = await request(app)
        .post('/api/backup/validate-compatibility')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ 
          backupVersion: '1.0.0',
          backupData: mockBackupData
        });
      
      expect(response.status).toBe(200);
      expect(response.body.data.compatibility.warnings.length).toBeGreaterThan(0);
      expect(response.body.data.compatibility.warnings[0]).toContain('UnknownCollection');
    });

    it('should provide recommendations', async () => {
      const response = await request(app)
        .post('/api/backup/validate-compatibility')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ backupVersion: '1.0.0' });
      
      expect(response.status).toBe(200);
      expect(response.body.data.compatibility.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON in request body', async () => {
      const response = await request(app)
        .post('/api/backup/generate-script')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'application/json')
        .send('invalid json');
      
      expect(response.status).toBe(500);
    });
  });

  describe('Security Tests', () => {
    it('should not expose sensitive information in error messages in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const response = await request(app)
        .post('/api/backup/generate-script')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ format: 'invalid' });
      
      expect(response.status).toBe(400);
      expect(response.body).not.toHaveProperty('error');
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should validate admin token properly', async () => {
      const invalidToken = jwt.sign(
        { userId: testUser._id, username: testUser.username },
        'wrong-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/backup/database-info')
        .set('Authorization', `Bearer ${invalidToken}`);
      
      expect(response.status).toBe(401);
    });

    it('should handle expired tokens', async () => {
      const expiredToken = jwt.sign(
        { userId: testAdmin._id, username: testAdmin.username },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .get('/api/backup/database-info')
        .set('Authorization', `Bearer ${expiredToken}`);
      
      expect(response.status).toBe(401);
    });
  });

  describe('Script Generation', () => {
    it('should generate proper MongoDB script format', async () => {
      const response = await request(app)
        .post('/api/backup/generate-script')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ format: 'mongodb' });
      
      const script = response.text;
      
      // Verify script structure
      expect(script).toContain('// Generated backup script for Meal Planner App');
      expect(script).toContain('// Version:');
      expect(script).toContain('// Generated:');
      expect(script).toContain('// Compatible with: MongoDB');
      expect(script).toContain('if (!db) {');
      expect(script).toContain('print(');
      expect(script).toContain('// ========== RESTORATION INSTRUCTIONS ==========');
    });
  });
}); 