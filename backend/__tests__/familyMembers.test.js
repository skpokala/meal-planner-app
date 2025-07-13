const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const FamilyMember = require('../models/FamilyMember');
const jwt = require('jsonwebtoken');

describe('Family Members Endpoints', () => {
  let adminUser, regularUser;
  let adminToken, regularToken;
  let familyMember, familyMemberWithAuth;

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

    // Create regular user
    regularUser = await User.create({
      username: 'regularuser',
      firstName: 'Regular',
      lastName: 'User',
      email: 'regular@example.com',
      password: 'password',
      role: 'user'
    });

    // Generate tokens
    adminToken = jwt.sign(
      { userId: adminUser._id, username: adminUser.username, role: adminUser.role, userType: 'User' },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    regularToken = jwt.sign(
      { userId: regularUser._id, username: regularUser.username, role: regularUser.role, userType: 'User' },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    // Create basic family member
    familyMember = await FamilyMember.create({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      dateOfBirth: new Date('1990-01-01'),
      relationship: 'spouse',
      createdBy: adminUser._id
    });

    // Create family member with authentication
    familyMemberWithAuth = await FamilyMember.create({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      dateOfBirth: new Date('1985-01-01'),
      relationship: 'spouse',
      username: 'janedoe',
      password: 'password123',
      hasLoginAccess: true,
      role: 'user',
      createdBy: adminUser._id
    });
  });

  describe('GET /api/family-members', () => {
    it('should get all family members for admin', async () => {
      const response = await request(app)
        .get('/api/family-members')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.familyMembers).toHaveLength(2);
    });

    it('should get only own family members for regular user', async () => {
      // Create family member for regular user
      await FamilyMember.create({
        firstName: 'Regular',
        lastName: 'Family',
        email: 'regularfamily@example.com',
        dateOfBirth: new Date('1995-01-01'),
        relationship: 'child',
        createdBy: regularUser._id
      });

      const response = await request(app)
        .get('/api/family-members')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.familyMembers).toHaveLength(1);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/family-members')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/family-members', () => {
    it('should create family member without authentication', async () => {
      const newMember = {
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
        dateOfBirth: '1992-05-15',
        relationship: 'sibling',
        dietaryRestrictions: ['vegetarian'],
        allergies: ['nuts']
      };

      const response = await request(app)
        .post('/api/family-members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newMember)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.familyMember.firstName).toBe('Alice');
      expect(response.body.familyMember.hasLoginAccess).toBe(false);
      expect(response.body.familyMember).not.toHaveProperty('password');
    });

    it('should create family member with authentication', async () => {
      const newMember = {
        firstName: 'Bob',
        lastName: 'Johnson',
        email: 'bob@example.com',
        dateOfBirth: '1988-03-20',
        relationship: 'parent',
        hasLoginAccess: true,
        username: 'bobjohnson',
        password: 'password123',
        role: 'user'
      };

      const response = await request(app)
        .post('/api/family-members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newMember)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.familyMember.firstName).toBe('Bob');
      expect(response.body.familyMember.hasLoginAccess).toBe(true);
      expect(response.body.familyMember.username).toBe('bobjohnson');
      expect(response.body.familyMember.role).toBe('user');
      expect(response.body.familyMember).not.toHaveProperty('password');
    });

    it('should require username and password when hasLoginAccess is true', async () => {
      const newMember = {
        firstName: 'Charlie',
        lastName: 'Brown',
        email: 'charlie@example.com',
        dateOfBirth: '1990-07-10',
        relationship: 'child',
        hasLoginAccess: true
        // missing username and password
      };

      const response = await request(app)
        .post('/api/family-members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newMember)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Username and password are required when hasLoginAccess is true');
    });

    it('should reject duplicate username', async () => {
      const newMember = {
        firstName: 'Duplicate',
        lastName: 'User',
        email: 'duplicate@example.com',
        dateOfBirth: '1990-01-01',
        relationship: 'other',
        hasLoginAccess: true,
        username: 'janedoe', // Already exists
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/family-members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newMember)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Username already exists');
    });

    it('should only allow system admin to assign admin role', async () => {
      const newMember = {
        firstName: 'Admin',
        lastName: 'Wannabe',
        email: 'adminwannabe@example.com',
        dateOfBirth: '1985-01-01',
        relationship: 'other',
        hasLoginAccess: true,
        username: 'adminwannabe',
        password: 'password123',
        role: 'admin'
      };

      // Create family member token (not system admin)
      const familyAdminToken = jwt.sign(
        { userId: familyMemberWithAuth._id, username: familyMemberWithAuth.username, role: 'admin', userType: 'FamilyMember' },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '7d' }
      );

      // Update family member to be admin
      await FamilyMember.findByIdAndUpdate(familyMemberWithAuth._id, { role: 'admin' });

      const response = await request(app)
        .post('/api/family-members')
        .set('Authorization', `Bearer ${familyAdminToken}`)
        .send(newMember)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Only system administrators can assign admin role');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/family-members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Test'
          // missing required fields
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('PUT /api/family-members/:id', () => {
    it('should update family member basic info', async () => {
      const updates = {
        firstName: 'Updated',
        lastName: 'Name',
        relationship: 'parent'
      };

      const response = await request(app)
        .put(`/api/family-members/${familyMember._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.familyMember.firstName).toBe('Updated');
      expect(response.body.familyMember.lastName).toBe('Name');
      expect(response.body.familyMember.relationship).toBe('parent');
    });

    it('should enable login access', async () => {
      const updates = {
        hasLoginAccess: true,
        username: 'johndoe'
      };

      const response = await request(app)
        .put(`/api/family-members/${familyMember._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.familyMember.hasLoginAccess).toBe(true);
      expect(response.body.familyMember.username).toBe('johndoe');
    });

    it('should disable login access and clear auth fields', async () => {
      const updates = {
        hasLoginAccess: false
      };

      const response = await request(app)
        .put(`/api/family-members/${familyMemberWithAuth._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.familyMember.hasLoginAccess).toBe(false);
      expect(response.body.familyMember.username).toBeUndefined();
    });

    it('should require username when enabling login access', async () => {
      const updates = {
        hasLoginAccess: true
        // missing username
      };

      const response = await request(app)
        .put(`/api/family-members/${familyMember._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updates)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Username is required when enabling login access');
    });

    it('should check username uniqueness on update', async () => {
      const updates = {
        username: 'admin' // Already exists in User collection
      };

      const response = await request(app)
        .put(`/api/family-members/${familyMember._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updates)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Username already exists');
    });
  });

  describe('PUT /api/family-members/:id/password', () => {
    it('should update family member password (admin)', async () => {
      const response = await request(app)
        .put(`/api/family-members/${familyMemberWithAuth._id}/password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          password: 'newpassword123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password updated successfully');
    });

    it('should require admin privileges', async () => {
      const response = await request(app)
        .put(`/api/family-members/${familyMemberWithAuth._id}/password`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          password: 'newpassword123'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Admin access required');
    });

    it('should verify current password when provided', async () => {
      const response = await request(app)
        .put(`/api/family-members/${familyMemberWithAuth._id}/password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          password: 'newpassword123',
          currentPassword: 'wrongpassword'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Current password is incorrect');
    });

    it('should enable login access if disabled', async () => {
      // First disable login access
      await FamilyMember.findByIdAndUpdate(familyMemberWithAuth._id, { hasLoginAccess: false });

      const response = await request(app)
        .put(`/api/family-members/${familyMemberWithAuth._id}/password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          password: 'newpassword123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Check that login access was enabled
      const updatedMember = await FamilyMember.findById(familyMemberWithAuth._id);
      expect(updatedMember.hasLoginAccess).toBe(true);
    });

    it('should validate password length', async () => {
      const response = await request(app)
        .put(`/api/family-members/${familyMemberWithAuth._id}/password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          password: '123' // Too short
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('PUT /api/family-members/:id/master-password', () => {
    let adminFamilyMember;

    beforeEach(async () => {
      // Create admin family member
      adminFamilyMember = await FamilyMember.create({
        firstName: 'Admin',
        lastName: 'Family',
        email: 'adminfamily@example.com',
        dateOfBirth: new Date('1980-01-01'),
        relationship: 'parent',
        username: 'adminfamily',
        password: 'password123',
        hasLoginAccess: true,
        role: 'admin',
        createdBy: adminUser._id
      });
    });

    it('should set master password for admin family member', async () => {
      const response = await request(app)
        .put(`/api/family-members/${adminFamilyMember._id}/master-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          masterPassword: 'masterpassword123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Master password updated successfully');
    });

    it('should reject master password for non-admin family member', async () => {
      const response = await request(app)
        .put(`/api/family-members/${familyMemberWithAuth._id}/master-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          masterPassword: 'masterpassword123'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Only admin family members can have master password');
    });

    it('should require admin privileges', async () => {
      const response = await request(app)
        .put(`/api/family-members/${adminFamilyMember._id}/master-password`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          masterPassword: 'masterpassword123'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Admin access required');
    });

    it('should verify current password when provided', async () => {
      const response = await request(app)
        .put(`/api/family-members/${adminFamilyMember._id}/master-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          masterPassword: 'masterpassword123',
          currentPassword: 'wrongpassword'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Current password is incorrect');
    });
  });

  describe('PUT /api/family-members/:id/toggle-login', () => {
    it('should toggle login access on', async () => {
      const response = await request(app)
        .put(`/api/family-members/${familyMember._id}/toggle-login`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login access enabled successfully');
      expect(response.body.familyMember.hasLoginAccess).toBe(true);
    });

    it('should toggle login access off and clear auth fields', async () => {
      const response = await request(app)
        .put(`/api/family-members/${familyMemberWithAuth._id}/toggle-login`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login access disabled successfully');
      expect(response.body.familyMember.hasLoginAccess).toBe(false);
      expect(response.body.familyMember.username).toBeUndefined();
    });

    it('should require admin privileges', async () => {
      const response = await request(app)
        .put(`/api/family-members/${familyMember._id}/toggle-login`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Admin access required');
    });
  });

  describe('Family Member Authentication', () => {
    it('should login family member with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'janedoe',
          password: 'password123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.username).toBe('janedoe');
      expect(response.body.user.userType).toBe('FamilyMember');
      expect(response.body.user.role).toBe('user');
      expect(response.body.user.hasLoginAccess).toBe(true);
    });

    it('should reject family member without login access', async () => {
      // Create family member without login access but with username/password
      const noAccessMember = await FamilyMember.create({
        firstName: 'No',
        lastName: 'Access',
        email: 'noaccess@example.com',
        dateOfBirth: new Date('1990-01-01'),
        relationship: 'child',
        username: 'noaccess',
        password: 'password123',
        hasLoginAccess: false,
        createdBy: adminUser._id
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'noaccess',
          password: 'password123'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should login admin family member with master password', async () => {
      // Create admin family member with master password
      const adminFamilyMember = await FamilyMember.create({
        firstName: 'Admin',
        lastName: 'Family',
        email: 'adminfamily@example.com',
        dateOfBirth: new Date('1980-01-01'),
        relationship: 'parent',
        username: 'adminfamily',
        password: 'password123',
        masterPassword: 'masterpassword123',
        hasLoginAccess: true,
        role: 'admin',
        createdBy: adminUser._id
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'adminfamily',
          password: 'masterpassword123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.username).toBe('adminfamily');
      expect(response.body.user.userType).toBe('FamilyMember');
      expect(response.body.user.role).toBe('admin');
    });

    it('should use family member token for authenticated requests', async () => {
      // Login as family member
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'janedoe',
          password: 'password123'
        })
        .expect(200);

      const familyMemberToken = loginResponse.body.token;

      // Use token to access profile
      const profileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${familyMemberToken}`)
        .expect(200);

      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.user.username).toBe('janedoe');
      expect(profileResponse.body.user.userType).toBe('FamilyMember');
      expect(profileResponse.body.user.relationship).toBe('spouse');
    });
  });

  describe('GET /api/family-members/stats/overview', () => {
    it('should get family member statistics', async () => {
      const response = await request(app)
        .get('/api/family-members/stats/overview')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.stats).toHaveProperty('overview');
      expect(response.body.stats).toHaveProperty('relationshipBreakdown');
      expect(response.body.stats.overview.totalMembers).toBe(2);
      expect(response.body.stats.overview.withLoginAccess).toBe(1);
    });

    it('should require admin privileges', async () => {
      const response = await request(app)
        .get('/api/family-members/stats/overview')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Admin access required');
    });
  });
});

describe('Username Availability Check', () => {
  beforeEach(async () => {
    // Create test users
    await User.create({
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: 'password',
      role: 'user'
    });

    await FamilyMember.create({
      firstName: 'Test',
      lastName: 'Family',
      email: 'testfamily@example.com',
      dateOfBirth: new Date('1990-01-01'),
      relationship: 'child',
      username: 'testfamily',
      password: 'password123',
      hasLoginAccess: true,
      createdBy: (await User.findOne({ username: 'testuser' }))._id
    });
  });

  describe('POST /api/auth/check-username', () => {
    it('should return available for new username', async () => {
      const response = await request(app)
        .post('/api/auth/check-username')
        .send({
          username: 'availableusername'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.available).toBe(true);
      expect(response.body.message).toBe('Username is available');
    });

    it('should return unavailable for existing User username', async () => {
      const response = await request(app)
        .post('/api/auth/check-username')
        .send({
          username: 'testuser'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.available).toBe(false);
      expect(response.body.message).toBe('Username is already taken');
    });

    it('should return unavailable for existing FamilyMember username', async () => {
      const response = await request(app)
        .post('/api/auth/check-username')
        .send({
          username: 'testfamily'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.available).toBe(false);
      expect(response.body.message).toBe('Username is already taken');
    });

    it('should exclude specified ID when checking', async () => {
      const familyMember = await FamilyMember.findOne({ username: 'testfamily' });
      
      const response = await request(app)
        .post('/api/auth/check-username')
        .send({
          username: 'testfamily',
          excludeId: familyMember._id
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.available).toBe(true);
      expect(response.body.message).toBe('Username is available');
    });

    it('should validate username format', async () => {
      const response = await request(app)
        .post('/api/auth/check-username')
        .send({
          username: 'ab' // Too short
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });
  });
}); 