const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

describe('Authentication Endpoints', () => {
  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user (let the model handle password hashing)
      await User.create({
        username: 'admin',
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@example.com',
        password: 'password',
        role: 'admin'
      });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'password'
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.username).toBe('admin');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistent',
          password: 'password'
        })
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Invalid credentials');
    });
    
    it('should reject inactive user', async () => {
      // Create inactive user
      await User.create({
        username: 'inactive',
        firstName: 'Inactive',
        lastName: 'User',
        email: 'inactive@example.com',
        password: 'password',
        isActive: false
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'inactive',
          password: 'password'
        })
        .expect(401);

      expect(response.body.message).toBe('Account is inactive');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin'
          // missing password
        })
        .expect(400);

      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('Admin Dual Password System', () => {
    let adminUser;

    beforeEach(async () => {
      // Create admin user with master password
      adminUser = await User.create({
        username: 'admin',
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@example.com',
        password: 'password',
        masterPassword: 'masteradmin123',
        role: 'admin'
      });
    });

    it('should login admin with regular password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'password'
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body.user.username).toBe('admin');
      expect(response.body.user.role).toBe('admin');
    });

    it('should login admin with master password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'masteradmin123'
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body.user.username).toBe('admin');
      expect(response.body.user.role).toBe('admin');
    });

    it('should reject admin with wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should not expose master password in user object', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'password'
        })
        .expect(200);

      expect(response.body.user).not.toHaveProperty('password');
      expect(response.body.user).not.toHaveProperty('masterPassword');
    });
  });

  describe('Regular User Password System', () => {
    beforeEach(async () => {
      // Create regular user (no master password)
      await User.create({
        username: 'regularuser',
        firstName: 'Regular',
        lastName: 'User',
        email: 'regular@example.com',
        password: 'password',
        role: 'user'
      });
    });

    it('should login regular user with regular password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'regularuser',
          password: 'password'
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body.user.username).toBe('regularuser');
      expect(response.body.user.role).toBe('user');
    });

    it('should reject regular user with wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'regularuser',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.message).toBe('Invalid credentials');
    });
  });

  describe('Master Password Management', () => {
    let adminUser;
    let adminToken;

    beforeEach(async () => {
      // Create admin user
      adminUser = await User.create({
        username: 'admin',
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@example.com',
        password: 'password',
        role: 'admin'
      });

      // Login to get token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'password'
        });

      adminToken = loginResponse.body.token;
    });

    it('should allow admin to set master password', async () => {
      const response = await request(app)
        .put('/api/auth/set-master-password')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          currentPassword: 'password',
          masterPassword: 'newmaster123'
        })
        .expect(200);

      expect(response.body.message).toBe('Master password set successfully');

      // Verify admin can now login with master password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'newmaster123'
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('token');
    });

    it('should reject setting master password with wrong current password', async () => {
      const response = await request(app)
        .put('/api/auth/set-master-password')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          currentPassword: 'wrongpassword',
          masterPassword: 'newmaster123'
        })
        .expect(400);

      expect(response.body.message).toBe('Current password is incorrect');
    });

    it('should reject non-admin user setting master password', async () => {
      // Create regular user and get token
      await User.create({
        username: 'regularuser',
        firstName: 'Regular',
        lastName: 'User',
        email: 'regular@example.com',
        password: 'password',
        role: 'user'
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'regularuser',
          password: 'password'
        });

      const userToken = loginResponse.body.token;

      const response = await request(app)
        .put('/api/auth/set-master-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: 'password',
          masterPassword: 'newmaster123'
        })
        .expect(403);

      expect(response.body.message).toBe('Only admin users can set master password');
    });
  });

  describe('Profile and Password Change', () => {
    let token;
    let userId;

    beforeEach(async () => {
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

      token = loginResponse.body.token;
    });

    it('should get user profile', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.username).toBe('testuser');
    });

    it('should update user profile', async () => {
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          firstName: 'Updated',
          lastName: 'Name'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.firstName).toBe('Updated');
      expect(response.body.user.lastName).toBe('Name');
    });

    it('should change password', async () => {
      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'password',
          newPassword: 'newpassword123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password changed successfully');
    });

    it('should reject password change with wrong current password', async () => {
      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123'
        })
        .expect(400);

      expect(response.body.message).toBe('Current password is incorrect');
    });
  });
}); 