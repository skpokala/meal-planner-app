const request = require('supertest');
const app = require('../app');

describe('Version API', () => {
  test('GET /api/version should return version information', async () => {
    const response = await request(app)
      .get('/api/version')
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('version');
    expect(response.body).toHaveProperty('name', 'meal-planner-backend');
    expect(response.body).toHaveProperty('description');
    expect(response.body).toHaveProperty('timestamp');
    
    // Check version format
    expect(response.body.version).toMatch(/^\d+\.\d+\.\d+$/);
    
    // Check timestamp format
    expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
}); 