const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const ReleaseNotes = require('../models/ReleaseNotes');
const jwt = require('jsonwebtoken');

describe('Release Notes System', () => {
  let adminUser, regularUser;
  let adminToken, regularToken;

  beforeEach(async () => {
    // Create test users
    adminUser = await User.create({
      username: 'admin',
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
      password: 'password',
      role: 'admin'
    });

    regularUser = await User.create({
      username: 'user',
      firstName: 'Regular',
      lastName: 'User',
      email: 'user@example.com',
      password: 'password',
      role: 'user'
    });

    // Create test tokens
    adminToken = jwt.sign(
      { id: adminUser._id, role: adminUser.role },
      process.env.JWT_SECRET || 'test-secret'
    );

    regularToken = jwt.sign(
      { id: regularUser._id, role: regularUser.role },
      process.env.JWT_SECRET || 'test-secret'
    );
  });

  describe('ReleaseNotes Model', () => {
    describe('Schema Validation', () => {
      it('should create release notes with required fields', async () => {
        const releaseData = {
          version: '1.0.0',
          title: 'Test Release',
          content: 'This is a test release with new features',
          type: 'major',
          features: [
            { type: 'New Feature', description: 'Added user authentication' }
          ],
          bugFixes: [
            { type: 'Bug Fix', description: 'Fixed login issue' }
          ],
          improvements: [
            { type: 'Performance', description: 'Improved page load times' }
          ]
        };

        const release = await ReleaseNotes.create(releaseData);
        
        expect(release.version).toBe('1.0.0');
        expect(release.title).toBe('Test Release');
        expect(release.type).toBe('major');
        expect(release.features).toHaveLength(1);
        expect(release.bugFixes).toHaveLength(1);
        expect(release.improvements).toHaveLength(1);
        expect(release.isVisible).toBe(true);
        expect(release.showModal).toBe(true);
        expect(release.viewCount).toBe(0);
      });

      it('should enforce unique version constraint', async () => {
        const releaseData = {
          version: '1.0.0',
          title: 'Test Release',
          content: 'Test content'
        };

        await ReleaseNotes.create(releaseData);
        
        await expect(ReleaseNotes.create(releaseData)).rejects.toThrow();
      });

      it('should validate release type enum', async () => {
        const releaseData = {
          version: '1.0.0',
          title: 'Test Release',
          content: 'Test content',
          type: 'invalid-type'
        };

        await expect(ReleaseNotes.create(releaseData)).rejects.toThrow();
      });
    });

    describe('Static Methods', () => {
      beforeEach(async () => {
        // Create test release notes
        await ReleaseNotes.create({
          version: '1.0.0',
          title: 'First Release',
          content: 'Initial release',
          type: 'major',
          releaseDate: new Date('2023-01-01')
        });

        await ReleaseNotes.create({
          version: '1.1.0',
          title: 'Second Release',
          content: 'Feature update',
          type: 'minor',
          releaseDate: new Date('2023-02-01')
        });

        await ReleaseNotes.create({
          version: '1.1.1',
          title: 'Bug Fix Release',
          content: 'Bug fixes',
          type: 'patch',
          releaseDate: new Date('2023-03-01')
        });
      });

      it('should get latest release notes', async () => {
        const latest = await ReleaseNotes.getLatest(2);
        
        expect(latest).toHaveLength(2);
        expect(latest[0].version).toBe('1.1.1');
        expect(latest[1].version).toBe('1.1.0');
      });

      it('should get release notes by version', async () => {
        const release = await ReleaseNotes.getByVersion('1.1.0');
        
        expect(release).toBeDefined();
        expect(release.version).toBe('1.1.0');
        expect(release.title).toBe('Second Release');
      });

      it('should get paginated release notes', async () => {
        const result = await ReleaseNotes.getPaginated(1, 2);
        
        expect(result.docs).toHaveLength(2);
        expect(result.total).toBe(3);
        expect(result.pages).toBe(2);
        expect(result.currentPage).toBe(1);
        expect(result.hasNext).toBe(true);
        expect(result.hasPrev).toBe(false);
      });
    });

    describe('Instance Methods', () => {
      let release;

      beforeEach(async () => {
        release = await ReleaseNotes.create({
          version: '1.0.0',
          title: 'Test Release',
          content: 'Test content',
          type: 'major'
        });
      });

      it('should mark release as viewed by user', async () => {
        expect(release.hasUserViewed(regularUser._id)).toBe(false);
        
        await release.markAsViewed(regularUser._id);
        
        expect(release.hasUserViewed(regularUser._id)).toBe(true);
        expect(release.viewCount).toBe(1);
      });

      it('should not duplicate views from same user', async () => {
        await release.markAsViewed(regularUser._id);
        await release.markAsViewed(regularUser._id);
        
        expect(release.viewCount).toBe(1);
        expect(release.usersViewed).toHaveLength(1);
      });

      it('should get unviewed releases for user', async () => {
        const unviewed = await ReleaseNotes.getUnviewedForUser(regularUser._id);
        
        expect(unviewed).toHaveLength(1);
        expect(unviewed[0].version).toBe('1.0.0');
        
        await release.markAsViewed(regularUser._id);
        
        const unviewedAfter = await ReleaseNotes.getUnviewedForUser(regularUser._id);
        expect(unviewedAfter).toHaveLength(0);
      });
    });
  });

  describe('API Endpoints', () => {
    describe('GET /api/release-notes', () => {
      beforeEach(async () => {
        await ReleaseNotes.create({
          version: '1.0.0',
          title: 'First Release',
          content: 'Initial release',
          type: 'major'
        });

        await ReleaseNotes.create({
          version: '1.1.0',
          title: 'Second Release',
          content: 'Feature update',
          type: 'minor'
        });
      });

      it('should get paginated release notes (public)', async () => {
        const response = await request(app)
          .get('/api/release-notes')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.docs).toHaveLength(2);
        expect(response.body.data.total).toBe(2);
      });

      it('should filter by release type', async () => {
        const response = await request(app)
          .get('/api/release-notes?type=major')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.docs).toHaveLength(1);
        expect(response.body.data.docs[0].type).toBe('major');
      });

      it('should search by version', async () => {
        const response = await request(app)
          .get('/api/release-notes?version=1.0')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.docs).toHaveLength(1);
        expect(response.body.data.docs[0].version).toBe('1.0.0');
      });

      it('should support pagination', async () => {
        const response = await request(app)
          .get('/api/release-notes?page=1&limit=1')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.docs).toHaveLength(1);
        expect(response.body.data.currentPage).toBe(1);
        expect(response.body.data.hasNext).toBe(true);
      });
    });

    describe('GET /api/release-notes/latest', () => {
      beforeEach(async () => {
        await ReleaseNotes.create({
          version: '1.0.0',
          title: 'First Release',
          content: 'Initial release',
          type: 'major'
        });
      });

      it('should get latest release notes', async () => {
        const response = await request(app)
          .get('/api/release-notes/latest')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].version).toBe('1.0.0');
      });

      it('should limit results', async () => {
        const response = await request(app)
          .get('/api/release-notes/latest?limit=0')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(0);
      });
    });

    describe('GET /api/release-notes/unviewed', () => {
      let release;

      beforeEach(async () => {
        release = await ReleaseNotes.create({
          version: '1.0.0',
          title: 'Test Release',
          content: 'Test content',
          type: 'major'
        });
      });

      it('should get unviewed release notes for authenticated user', async () => {
        const response = await request(app)
          .get('/api/release-notes/unviewed')
          .set('Authorization', `Bearer ${regularToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].version).toBe('1.0.0');
      });

      it('should return empty array after marking as viewed', async () => {
        await release.markAsViewed(regularUser._id);

        const response = await request(app)
          .get('/api/release-notes/unviewed')
          .set('Authorization', `Bearer ${regularToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(0);
      });

      it('should require authentication', async () => {
        await request(app)
          .get('/api/release-notes/unviewed')
          .expect(401);
      });
    });

    describe('POST /api/release-notes', () => {
      const validReleaseData = {
        version: '1.0.0',
        title: 'Test Release',
        content: 'Test content',
        type: 'major',
        features: [
          { type: 'New Feature', description: 'Added user authentication' }
        ],
        bugFixes: [
          { type: 'Bug Fix', description: 'Fixed login issue' }
        ]
      };

      it('should create release notes (admin only)', async () => {
        const response = await request(app)
          .post('/api/release-notes')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(validReleaseData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.version).toBe('1.0.0');
        expect(response.body.data.title).toBe('Test Release');
        expect(response.body.data.author).toBe('Admin User');
      });

      it('should reject non-admin users', async () => {
        await request(app)
          .post('/api/release-notes')
          .set('Authorization', `Bearer ${regularToken}`)
          .send(validReleaseData)
          .expect(403);
      });

      it('should require authentication', async () => {
        await request(app)
          .post('/api/release-notes')
          .send(validReleaseData)
          .expect(401);
      });

      it('should validate required fields', async () => {
        const response = await request(app)
          .post('/api/release-notes')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            version: '1.0.0'
            // Missing title and content
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.errors).toBeDefined();
      });

      it('should prevent duplicate versions', async () => {
        await ReleaseNotes.create(validReleaseData);

        const response = await request(app)
          .post('/api/release-notes')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(validReleaseData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('already exist');
      });
    });

    describe('PUT /api/release-notes/:id', () => {
      let release;

      beforeEach(async () => {
        release = await ReleaseNotes.create({
          version: '1.0.0',
          title: 'Test Release',
          content: 'Test content',
          type: 'major'
        });
      });

      it('should update release notes (admin only)', async () => {
        const updateData = {
          title: 'Updated Title',
          content: 'Updated content'
        };

        const response = await request(app)
          .put(`/api/release-notes/${release._id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.title).toBe('Updated Title');
        expect(response.body.data.content).toBe('Updated content');
      });

      it('should reject non-admin users', async () => {
        await request(app)
          .put(`/api/release-notes/${release._id}`)
          .set('Authorization', `Bearer ${regularToken}`)
          .send({ title: 'Updated Title' })
          .expect(403);
      });

      it('should return 404 for non-existent release', async () => {
        const fakeId = '507f1f77bcf86cd799439011';
        
        await request(app)
          .put(`/api/release-notes/${fakeId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ title: 'Updated Title' })
          .expect(404);
      });
    });

    describe('DELETE /api/release-notes/:id', () => {
      let release;

      beforeEach(async () => {
        release = await ReleaseNotes.create({
          version: '1.0.0',
          title: 'Test Release',
          content: 'Test content',
          type: 'major'
        });
      });

      it('should delete release notes (admin only)', async () => {
        const response = await request(app)
          .delete(`/api/release-notes/${release._id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('deleted successfully');

        const deletedRelease = await ReleaseNotes.findById(release._id);
        expect(deletedRelease).toBeNull();
      });

      it('should reject non-admin users', async () => {
        await request(app)
          .delete(`/api/release-notes/${release._id}`)
          .set('Authorization', `Bearer ${regularToken}`)
          .expect(403);
      });
    });

    describe('POST /api/release-notes/:id/mark-viewed', () => {
      let release;

      beforeEach(async () => {
        release = await ReleaseNotes.create({
          version: '1.0.0',
          title: 'Test Release',
          content: 'Test content',
          type: 'major'
        });
      });

      it('should mark release as viewed by user', async () => {
        const response = await request(app)
          .post(`/api/release-notes/${release._id}/mark-viewed`)
          .set('Authorization', `Bearer ${regularToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('marked as viewed');

        const updatedRelease = await ReleaseNotes.findById(release._id);
        expect(updatedRelease.hasUserViewed(regularUser._id)).toBe(true);
      });

      it('should require authentication', async () => {
        await request(app)
          .post(`/api/release-notes/${release._id}/mark-viewed`)
          .expect(401);
      });
    });

    describe('GET /api/release-notes/stats/summary', () => {
      beforeEach(async () => {
        await ReleaseNotes.create({
          version: '1.0.0',
          title: 'Major Release',
          content: 'Major update',
          type: 'major'
        });

        await ReleaseNotes.create({
          version: '1.1.0',
          title: 'Minor Release',
          content: 'Minor update',
          type: 'minor'
        });
      });

      it('should get release notes statistics (admin only)', async () => {
        const response = await request(app)
          .get('/api/release-notes/stats/summary')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.totalReleases).toBe(2);
        expect(response.body.data.releasesByType.major).toBe(1);
        expect(response.body.data.releasesByType.minor).toBe(1);
        expect(response.body.data.recentReleases).toBeDefined();
      });

      it('should reject non-admin users', async () => {
        await request(app)
          .get('/api/release-notes/stats/summary')
          .set('Authorization', `Bearer ${regularToken}`)
          .expect(403);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete release notes workflow', async () => {
      // Admin creates release notes
      const createResponse = await request(app)
        .post('/api/release-notes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          version: '1.0.0',
          title: 'Major Release',
          content: 'This is a major release with new features',
          type: 'major',
          features: [
            { type: 'Authentication', description: 'Added user login system' }
          ],
          bugFixes: [
            { type: 'UI Fix', description: 'Fixed button alignment' }
          ]
        })
        .expect(201);

      const releaseId = createResponse.body.data._id;

      // User gets unviewed releases
      const unviewedResponse = await request(app)
        .get('/api/release-notes/unviewed')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(200);

      expect(unviewedResponse.body.data).toHaveLength(1);

      // User marks release as viewed
      await request(app)
        .post(`/api/release-notes/${releaseId}/mark-viewed`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(200);

      // User gets unviewed releases again (should be empty)
      const unviewedAfterResponse = await request(app)
        .get('/api/release-notes/unviewed')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(200);

      expect(unviewedAfterResponse.body.data).toHaveLength(0);

      // Public can view release notes
      const publicResponse = await request(app)
        .get('/api/release-notes')
        .expect(200);

      expect(publicResponse.body.data.docs).toHaveLength(1);
      expect(publicResponse.body.data.docs[0].version).toBe('1.0.0');
    });
  });
}); 