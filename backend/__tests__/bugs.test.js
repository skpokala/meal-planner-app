const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Bug = require('../models/Bug');
const User = require('../models/User');
const FamilyMember = require('../models/FamilyMember');
const jwt = require('jsonwebtoken');

describe('Bug API', () => {
  let testUser, testAdmin, testFamilyMember;
  let userToken, adminToken, familyMemberToken;

  // Helper function to create auth token
  const createAuthToken = (user, userType = 'User') => {
    return jwt.sign(
      { 
        userId: user._id, 
        userType: userType 
      }, 
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '1h' }
    );
  };

  beforeEach(async () => {
    // Clear bugs collection
    await Bug.deleteMany({});
    await User.deleteMany({});
    await FamilyMember.deleteMany({});
    
    // Create test users
    testUser = await User.create({
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      email: 'testuser@test.com',
      password: 'testpassword123',
      role: 'user'
    });
    
    testAdmin = await User.create({
      username: 'testadmin',
      firstName: 'Test',
      lastName: 'Admin',
      email: 'admin@test.com',
      password: 'testpassword123',
      role: 'admin'
    });
    
    // Create test family member
    testFamilyMember = await FamilyMember.create({
      username: 'testfamily',
      email: 'family@test.com',
      firstName: 'Test',
      lastName: 'Family',
      role: 'user',
      dateOfBirth: new Date('1990-01-01'),
      relationship: 'child',
      createdBy: testUser._id,
      hasLoginAccess: true,
      password: 'testpassword123'
    });

    // Create auth tokens
    userToken = createAuthToken(testUser);
    adminToken = createAuthToken(testAdmin);
    familyMemberToken = createAuthToken(testFamilyMember, 'FamilyMember');
  });

  afterEach(async () => {
    await Bug.deleteMany({});
    await User.deleteMany({});
    await FamilyMember.deleteMany({});
  });

  describe('POST /api/bugs', () => {
    const validBugData = {
      title: 'Test Bug',
      description: 'This is a test bug description',
      category: 'functionality',
      priority: 'medium',
      severity: 'moderate',
      stepsToReproduce: '1. Do this\n2. Do that\n3. See bug',
      expectedBehavior: 'Should work correctly',
      actualBehavior: 'Does not work',
      environment: {
        browser: 'Chrome',
        browserVersion: '91.0',
        operatingSystem: 'Windows',
        deviceType: 'desktop',
        screenResolution: '1920x1080'
      },
      tags: ['ui', 'critical']
    };

    it('should create a bug report for authenticated user', async () => {
      const response = await request(app)
        .post('/api/bugs')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validBugData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Bug report submitted successfully');
      expect(response.body.data.title).toBe(validBugData.title);
      expect(response.body.data.reportedBy.userId).toBe(testUser._id.toString());
      expect(response.body.data.reportedBy.userType).toBe('User');
      expect(response.body.data.status).toBe('open');
    });

    it('should create a bug report for family member', async () => {
      const response = await request(app)
        .post('/api/bugs')
        .set('Authorization', `Bearer ${familyMemberToken}`)
        .send(validBugData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reportedBy.userType).toBe('FamilyMember');
      expect(response.body.data.reportedBy.userId).toBe(testFamilyMember._id.toString());
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/bugs')
        .send(validBugData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid data', async () => {
      const invalidData = {
        title: 'A', // Too short
        description: 'Short' // Too short
      };

      const response = await request(app)
        .post('/api/bugs')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should validate priority field', async () => {
      const invalidData = {
        ...validBugData,
        priority: 'invalid-priority'
      };

      const response = await request(app)
        .post('/api/bugs')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors.some(err => err.path === 'priority')).toBe(true);
    });

    it('should validate severity field', async () => {
      const invalidData = {
        ...validBugData,
        severity: 'invalid-severity'
      };

      const response = await request(app)
        .post('/api/bugs')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors.some(err => err.path === 'severity')).toBe(true);
    });

    it('should auto-detect app version', async () => {
      const response = await request(app)
        .post('/api/bugs')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validBugData)
        .expect(201);

      expect(response.body.data.environment.appVersion).toBeDefined();
    });
  });

  describe('GET /api/bugs', () => {
    beforeEach(async () => {
      // Create test bugs
      await Bug.create([
        {
          title: 'User Bug 1',
          description: 'Bug by regular user',
          reportedBy: {
            userId: testUser._id,
            userType: 'User',
            username: testUser.username,
            email: testUser.email
          },
          priority: 'high',
          status: 'open'
        },
        {
          title: 'User Bug 2',
          description: 'Another bug by regular user',
          reportedBy: {
            userId: testUser._id,
            userType: 'User',
            username: testUser.username,
            email: testUser.email
          },
          priority: 'medium',
          status: 'resolved'
        },
        {
          title: 'Admin Bug',
          description: 'Bug by admin user',
          reportedBy: {
            userId: testAdmin._id,
            userType: 'User',
            username: testAdmin.username,
            email: testAdmin.email
          },
          priority: 'critical',
          status: 'in-progress'
        }
      ]);
    });

    it('should return user\'s own bugs only for regular users', async () => {
      const response = await request(app)
        .get('/api/bugs')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.bugs).toHaveLength(2);
      response.body.data.bugs.forEach(bug => {
        expect(bug.reportedBy.userId).toBe(testUser._id.toString());
      });
    });

    it('should return all bugs for admin users', async () => {
      const response = await request(app)
        .get('/api/bugs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.bugs).toHaveLength(3);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/bugs?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.bugs).toHaveLength(2);
      expect(response.body.data.pagination.current).toBe(1);
      expect(response.body.data.pagination.total).toBe(2);
    });

    it('should support filtering by status', async () => {
      const response = await request(app)
        .get('/api/bugs?status=open')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.bugs.forEach(bug => {
        expect(bug.status).toBe('open');
      });
    });

    it('should support filtering by priority', async () => {
      const response = await request(app)
        .get('/api/bugs?priority=critical')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.bugs.forEach(bug => {
        expect(bug.priority).toBe('critical');
      });
    });

    it('should support search in title and description', async () => {
      const response = await request(app)
        .get('/api/bugs?search=Admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.bugs).toHaveLength(1);
      expect(response.body.data.bugs[0].title).toBe('Admin Bug');
    });

    it('should support sorting', async () => {
      const response = await request(app)
        .get('/api/bugs?sortBy=priority&sortOrder=asc')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const priorities = response.body.data.bugs.map(bug => bug.priority);
      expect(priorities).toEqual(['critical', 'high', 'medium']);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/bugs')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/bugs/statistics', () => {
    beforeEach(async () => {
      await Bug.create([
        {
          title: 'Open Bug',
          description: 'Open bug',
          reportedBy: {
            userId: testUser._id,
            userType: 'User',
            username: testUser.username,
            email: testUser.email
          },
          priority: 'critical',
          status: 'open',
          category: 'ui'
        },
        {
          title: 'Resolved Bug',
          description: 'Resolved bug',
          reportedBy: {
            userId: testUser._id,
            userType: 'User',
            username: testUser.username,
            email: testUser.email
          },
          priority: 'high',
          status: 'resolved',
          category: 'functionality'
        }
      ]);
    });

    it('should return statistics for admin users', async () => {
      const response = await request(app)
        .get('/api/bugs/statistics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.overview).toBeDefined();
      expect(response.body.data.overview.total).toBe(2);
      expect(response.body.data.overview.open).toBe(1);
      expect(response.body.data.overview.resolved).toBe(1);
      expect(response.body.data.overview.critical).toBe(1);
      expect(response.body.data.byCategory).toBeDefined();
    });

    it('should deny access for regular users', async () => {
      const response = await request(app)
        .get('/api/bugs/statistics')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied. Admin privileges required.');
    });
  });

  describe('GET /api/bugs/:id', () => {
    let testBug;

    beforeEach(async () => {
      testBug = await Bug.create({
        title: 'Test Bug',
        description: 'Test bug description',
        reportedBy: {
          userId: testUser._id,
          userType: 'User',
          username: testUser.username,
          email: testUser.email
        },
        comments: [
          {
            author: {
              userId: testAdmin._id,
              userType: 'User',
              username: testAdmin.username
            },
            content: 'Admin comment',
            isInternal: false
          },
          {
            author: {
              userId: testAdmin._id,
              userType: 'User',
              username: testAdmin.username
            },
            content: 'Internal admin comment',
            isInternal: true
          }
        ]
      });
    });

    it('should return bug details for bug owner', async () => {
      const response = await request(app)
        .get(`/api/bugs/${testBug._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Test Bug');
      expect(response.body.data.comments).toHaveLength(1); // Only non-internal comments
    });

    it('should return bug details with internal comments for admin', async () => {
      const response = await request(app)
        .get(`/api/bugs/${testBug._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.comments).toHaveLength(2); // All comments
    });

    it('should deny access to other users\' bugs', async () => {
      const otherUserBug = await Bug.create({
        title: 'Other User Bug',
        description: 'Bug by other user',
        reportedBy: {
          userId: testAdmin._id,
          userType: 'User',
          username: testAdmin.username,
          email: testAdmin.email
        }
      });

      const response = await request(app)
        .get(`/api/bugs/${otherUserBug._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied');
    });

    it('should return 404 for non-existent bug', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/bugs/${fakeId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Bug not found');
    });

    it('should return 400 for invalid bug ID', async () => {
      const response = await request(app)
        .get('/api/bugs/invalid-id')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/bugs/:id', () => {
    let testBug;

    beforeEach(async () => {
      testBug = await Bug.create({
        title: 'Test Bug',
        description: 'Test bug description',
        reportedBy: {
          userId: testUser._id,
          userType: 'User',
          username: testUser.username,
          email: testUser.email
        },
        priority: 'medium',
        status: 'open'
      });
    });

    it('should allow bug owner to update bug details', async () => {
      const updateData = {
        title: 'Updated Bug Title',
        description: 'Updated description',
        tags: ['updated', 'tag']
      };

      const response = await request(app)
        .put(`/api/bugs/${testBug._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Updated Bug Title');
      expect(response.body.data.description).toBe('Updated description');
      expect(response.body.data.tags).toEqual(['updated', 'tag']);
    });

    it('should allow admin to update bug status and priority', async () => {
      const updateData = {
        status: 'in-progress',
        priority: 'high',
        resolutionNotes: 'Working on it'
      };

      const response = await request(app)
        .put(`/api/bugs/${testBug._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('in-progress');
      expect(response.body.data.priority).toBe('high');
      expect(response.body.data.resolutionNotes).toBe('Working on it');
    });

    it('should allow admin to assign bug', async () => {
      const updateData = {
        assignedTo: testAdmin._id
      };

      const response = await request(app)
        .put(`/api/bugs/${testBug._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.assignedTo.userId).toBe(testAdmin._id.toString());
      expect(response.body.data.assignedTo.username).toBe(testAdmin.username);
    });

    it('should not allow regular user to update status', async () => {
      const updateData = { status: 'resolved' };

      const response = await request(app)
        .put(`/api/bugs/${testBug._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('open'); // Should remain unchanged
    });

    it('should deny access to other users', async () => {
      const otherUserBug = await Bug.create({
        title: 'Other User Bug',
        description: 'Bug by other user',
        reportedBy: {
          userId: testAdmin._id,
          userType: 'User',
          username: testAdmin.username,
          email: testAdmin.email
        }
      });

      const response = await request(app)
        .put(`/api/bugs/${otherUserBug._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Hacked' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should validate assignment to admin only', async () => {
      const updateData = {
        assignedTo: testUser._id // Regular user, not admin
      };

      const response = await request(app)
        .put(`/api/bugs/${testBug._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Cannot assign to non-admin user');
    });
  });

  describe('POST /api/bugs/:id/comments', () => {
    let testBug;

    beforeEach(async () => {
      testBug = await Bug.create({
        title: 'Test Bug',
        description: 'Test bug description',
        reportedBy: {
          userId: testUser._id,
          userType: 'User',
          username: testUser.username,
          email: testUser.email
        }
      });
    });

    it('should allow bug owner to add comment', async () => {
      const commentData = {
        content: 'This is a comment from the bug reporter'
      };

      const response = await request(app)
        .post(`/api/bugs/${testBug._id}/comments`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(commentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Comment added successfully');
      expect(response.body.data.comments).toHaveLength(1);
      expect(response.body.data.comments[0].content).toBe(commentData.content);
      expect(response.body.data.comments[0].isInternal).toBe(false);
    });

    it('should allow admin to add internal comment', async () => {
      const commentData = {
        content: 'Internal admin comment',
        isInternal: true
      };

      const response = await request(app)
        .post(`/api/bugs/${testBug._id}/comments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(commentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.comments[0].isInternal).toBe(true);
    });

    it('should not allow regular user to add internal comment', async () => {
      const commentData = {
        content: 'Attempted internal comment',
        isInternal: true
      };

      const response = await request(app)
        .post(`/api/bugs/${testBug._id}/comments`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(commentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.comments[0].isInternal).toBe(false); // Should be false
    });

    it('should deny access to other users', async () => {
      const otherUserBug = await Bug.create({
        title: 'Other User Bug',
        description: 'Bug by other user',
        reportedBy: {
          userId: testAdmin._id,
          userType: 'User',
          username: testAdmin.username,
          email: testAdmin.email
        }
      });

      const response = await request(app)
        .post(`/api/bugs/${otherUserBug._id}/comments`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Unauthorized comment' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should validate comment content', async () => {
      const response = await request(app)
        .post(`/api/bugs/${testBug._id}/comments`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: '' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('DELETE /api/bugs/:id', () => {
    let testBug;

    beforeEach(async () => {
      testBug = await Bug.create({
        title: 'Test Bug',
        description: 'Test bug description',
        reportedBy: {
          userId: testUser._id,
          userType: 'User',
          username: testUser.username,
          email: testUser.email
        }
      });
    });

    it('should allow admin to delete bugs', async () => {
      const response = await request(app)
        .delete(`/api/bugs/${testBug._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Bug deleted successfully');

      // Verify bug is deleted
      const deletedBug = await Bug.findById(testBug._id);
      expect(deletedBug).toBeNull();
    });

    it('should deny access to regular users', async () => {
      const response = await request(app)
        .delete(`/api/bugs/${testBug._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied. Admin privileges required.');
    });

    it('should return 404 for non-existent bug', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/api/bugs/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Bug not found');
    });
  });

  describe('GET /api/bugs/admin/dashboard', () => {
    beforeEach(async () => {
      await Bug.create([
        {
          title: 'Critical Bug',
          description: 'Critical bug',
          reportedBy: {
            userId: testUser._id,
            userType: 'User',
            username: testUser.username,
            email: testUser.email
          },
          priority: 'critical',
          status: 'open',
          assignedTo: {
            userId: testAdmin._id,
            username: testAdmin.username
          }
        },
        {
          title: 'Regular Bug',
          description: 'Regular bug',
          reportedBy: {
            userId: testUser._id,
            userType: 'User',
            username: testUser.username,
            email: testUser.email
          },
          priority: 'medium',
          status: 'resolved'
        }
      ]);
    });

    it('should return dashboard data for admin', async () => {
      const response = await request(app)
        .get('/api/bugs/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.recentBugs).toBeDefined();
      expect(response.body.data.criticalBugs).toHaveLength(1);
      expect(response.body.data.statistics).toBeDefined();
      expect(response.body.data.categoryCounts).toBeDefined();
      expect(response.body.data.assignedBugs).toHaveLength(1);
    });

    it('should deny access to regular users', async () => {
      const response = await request(app)
        .get('/api/bugs/admin/dashboard')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });
}); 