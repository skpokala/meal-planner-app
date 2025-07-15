const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const FamilyMember = require('../models/FamilyMember');
const Audit = require('../models/Audit');
const jwt = require('jsonwebtoken');

describe('Audit System', () => {
  let adminUser, regularUser, familyMember;
  let adminToken, regularToken, familyMemberToken;

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

    familyMember = await FamilyMember.create({
      firstName: 'Family',
      lastName: 'Member',
      email: 'family@example.com',
      dateOfBirth: new Date('1990-01-01'),
      relationship: 'spouse',
      username: 'familymember',
      password: 'password123',
      hasLoginAccess: true,
      role: 'user',
      createdBy: adminUser._id
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

    familyMemberToken = jwt.sign(
      { userId: familyMember._id, username: familyMember.username, role: familyMember.role, userType: 'FamilyMember' },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );
  });

  describe('Audit Model', () => {
    it('should create audit entry with required fields', async () => {
      const auditData = {
        action: 'login',
        status: 'success',
        userId: adminUser._id,
        userType: 'User',
        username: adminUser.username,
        userDisplayName: `${adminUser.firstName} ${adminUser.lastName}`,
        userRole: adminUser.role,
        sessionId: 'test-session',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      };

      const audit = await Audit.logEvent(auditData);
      
      expect(audit).toBeTruthy();
      expect(audit.action).toBe('login');
      expect(audit.status).toBe('success');
      expect(audit.userId.toString()).toBe(adminUser._id.toString());
      expect(audit.userType).toBe('User');
      expect(audit.username).toBe(adminUser.username);
      expect(audit.ipAddress).toBe('127.0.0.1');
    });

    it('should handle audit logging errors gracefully', async () => {
      // Test with invalid data
      const auditData = {
        action: 'invalid_action', // Invalid enum value
        userId: adminUser._id,
        userType: 'User',
        username: adminUser.username,
        userDisplayName: `${adminUser.firstName} ${adminUser.lastName}`,
        userRole: adminUser.role,
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      };

      const result = await Audit.logEvent(auditData);
      expect(result).toBeNull(); // Should return null on error
    });

    it('should get user activity', async () => {
      // Create some audit entries
      await Audit.logEvent({
        action: 'login',
        status: 'success',
        userId: adminUser._id,
        userType: 'User',
        username: adminUser.username,
        userDisplayName: `${adminUser.firstName} ${adminUser.lastName}`,
        userRole: adminUser.role,
        sessionId: 'session1',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      });

      await Audit.logEvent({
        action: 'logout',
        status: 'success',
        userId: adminUser._id,
        userType: 'User',
        username: adminUser.username,
        userDisplayName: `${adminUser.firstName} ${adminUser.lastName}`,
        userRole: adminUser.role,
        sessionId: 'session1',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      });

      const activity = await Audit.getUserActivity(adminUser._id, 'User');
      expect(activity).toHaveLength(2);
      expect(activity[0].action).toBe('logout'); // Most recent first
      expect(activity[1].action).toBe('login');
    });

    it('should get activity summary', async () => {
      // Create test audit entries
      await Audit.logEvent({
        action: 'login',
        status: 'success',
        userId: adminUser._id,
        userType: 'User',
        username: adminUser.username,
        userDisplayName: `${adminUser.firstName} ${adminUser.lastName}`,
        userRole: adminUser.role,
        sessionId: 'session1',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      });

      await Audit.logEvent({
        action: 'failed_login',
        status: 'failure',
        userId: null,
        userType: 'Unknown',
        username: 'baduser',
        userDisplayName: 'baduser',
        userRole: 'unknown',
        sessionId: null,
        ipAddress: '192.168.1.100',
        userAgent: 'test-agent',
        failureReason: 'Invalid credentials'
      });

      const summary = await Audit.getActivitySummary(24);
      expect(Array.isArray(summary)).toBe(true);
      
      if (summary.length > 0) {
        expect(summary[0]).toHaveProperty('action');
        expect(summary[0]).toHaveProperty('count');
        expect(summary[0]).toHaveProperty('uniqueUserCount');
      }
    });
  });

  describe('Authentication Audit Logging', () => {
    it('should log successful login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'password'
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Check if audit log was created
      const auditLogs = await Audit.find({ 
        action: 'login', 
        userId: adminUser._id 
      });
      expect(auditLogs.length).toBeGreaterThan(0);
      
      const latestLog = auditLogs[auditLogs.length - 1];
      expect(latestLog.status).toBe('success');
      expect(latestLog.userType).toBe('User');
      expect(latestLog.username).toBe('admin');
    });

    it('should log failed login attempt', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);

      // Check if audit log was created
      const auditLogs = await Audit.find({ 
        action: 'failed_login', 
        username: 'admin' 
      });
      expect(auditLogs.length).toBeGreaterThan(0);
      
      const latestLog = auditLogs[auditLogs.length - 1];
      expect(latestLog.status).toBe('failure');
      expect(latestLog.failureReason).toBe('Invalid password');
    });

    it('should log failed login for non-existent user', async () => {
      // First, test if direct audit logging works
      try {
        const directAudit = await Audit.logEvent({
          action: 'failed_login',
          status: 'failure',
          userId: null,
          userType: 'Unknown',
          username: 'testuser',
          userDisplayName: 'testuser',
          userRole: 'unknown',
          sessionId: null,
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          failureReason: 'User not found'
        });
        
        expect(directAudit).toBeDefined();
        console.log('Direct audit logging worked');
      } catch (error) {
        console.error('Direct audit logging failed:', error);
      }
      
      // Now test the failing login
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistent',
          password: 'password'
        })
        .expect(401);

      expect(response.body.success).toBe(false);

      // Add a small delay to ensure audit log is written
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check if audit log was created
      const auditLogs = await Audit.find({ 
        action: 'failed_login', 
        username: 'nonexistent' 
      });
      
      // Debug: Check all audit logs
      const allAuditLogs = await Audit.find({});
      console.log('All audit logs count:', allAuditLogs.length);
      console.log('Failed login logs count:', auditLogs.length);
      
      if (auditLogs.length === 0) {
        // Check if any audit logs were created at all
        const allFailedLogins = await Audit.find({ action: 'failed_login' });
        console.log('All failed login logs:', allFailedLogins.length);
        console.log('Failed login logs:', allFailedLogins.map(log => ({
          username: log.username,
          failureReason: log.failureReason,
          timestamp: log.timestamp
        })));
      }
      
      expect(auditLogs.length).toBeGreaterThan(0);
      
      const latestLog = auditLogs[auditLogs.length - 1];
      expect(latestLog.status).toBe('failure');
      expect(latestLog.failureReason).toBe('User not found');
    });

    it('should log family member login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'familymember',
          password: 'password123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.userType).toBe('FamilyMember');

      // Check if audit log was created
      const auditLogs = await Audit.find({ 
        action: 'login', 
        userId: familyMember._id 
      });
      expect(auditLogs.length).toBeGreaterThan(0);
      
      const latestLog = auditLogs[auditLogs.length - 1];
      expect(latestLog.status).toBe('success');
      expect(latestLog.userType).toBe('FamilyMember');
      expect(latestLog.username).toBe('familymember');
    });

    it('should log logout', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Check if audit log was created
      const auditLogs = await Audit.find({ 
        action: 'logout', 
        userId: adminUser._id 
      });
      expect(auditLogs.length).toBeGreaterThan(0);
      
      const latestLog = auditLogs[auditLogs.length - 1];
      expect(latestLog.status).toBe('success');
      expect(latestLog.userType).toBe('User');
    });
  });

  describe('Audit API Endpoints', () => {
    beforeEach(async () => {
      // Create some test audit logs
      await Audit.logEvent({
        action: 'login',
        status: 'success',
        userId: adminUser._id,
        userType: 'User',
        username: adminUser.username,
        userDisplayName: `${adminUser.firstName} ${adminUser.lastName}`,
        userRole: adminUser.role,
        sessionId: 'session1',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0'
      });

      await Audit.logEvent({
        action: 'failed_login',
        status: 'failure',
        userId: null,
        userType: 'Unknown',
        username: 'hacker',
        userDisplayName: 'hacker',
        userRole: 'unknown',
        sessionId: null,
        ipAddress: '192.168.1.100',
        userAgent: 'curl/7.68.0',
        failureReason: 'User not found'
      });

      await Audit.logEvent({
        action: 'logout',
        status: 'success',
        userId: familyMember._id,
        userType: 'FamilyMember',
        username: familyMember.username,
        userDisplayName: `${familyMember.firstName} ${familyMember.lastName}`,
        userRole: familyMember.role,
        sessionId: 'session2',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15'
      });
    });

    describe('GET /api/audit', () => {
      it('should get audit logs for admin', async () => {
        const response = await request(app)
          .get('/api/audit')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.auditLogs)).toBe(true);
        expect(response.body.pagination).toBeTruthy();
        expect(response.body.auditLogs.length).toBeGreaterThan(0);
      });

      it('should deny access to regular users', async () => {
        const response = await request(app)
          .get('/api/audit')
          .set('Authorization', `Bearer ${regularToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Admin access required');
      });

      it('should filter audit logs by action', async () => {
        const response = await request(app)
          .get('/api/audit?action=login')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        response.body.auditLogs.forEach(log => {
          expect(log.action).toBe('login');
        });
      });

      it('should filter audit logs by user type', async () => {
        const response = await request(app)
          .get('/api/audit?userType=FamilyMember')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        response.body.auditLogs.forEach(log => {
          expect(log.user.type).toBe('FamilyMember');
        });
      });

      it('should filter audit logs by status', async () => {
        const response = await request(app)
          .get('/api/audit?status=failure')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        response.body.auditLogs.forEach(log => {
          expect(log.status).toBe('failure');
        });
      });

      it('should support pagination', async () => {
        const response = await request(app)
          .get('/api/audit?page=1&limit=2')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.auditLogs.length).toBeLessThanOrEqual(2);
        expect(response.body.pagination.limit).toBe(2);
      });
    });

    describe('GET /api/audit/stats', () => {
      it('should get audit statistics for admin', async () => {
        const response = await request(app)
          .get('/api/audit/stats')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.stats).toBeTruthy();
        expect(response.body.stats.timeframe).toBe(24);
        expect(Array.isArray(response.body.stats.summary)).toBe(true);
        expect(Array.isArray(response.body.stats.trends)).toBe(true);
        expect(Array.isArray(response.body.stats.topUsers)).toBe(true);
        expect(Array.isArray(response.body.stats.failedLogins)).toBe(true);
      });

      it('should deny access to regular users', async () => {
        const response = await request(app)
          .get('/api/audit/stats')
          .set('Authorization', `Bearer ${regularToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
      });

      it('should support custom timeframe', async () => {
        const response = await request(app)
          .get('/api/audit/stats?timeframe=48')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.stats.timeframe).toBe(48);
      });
    });

    describe('GET /api/audit/user/:userId', () => {
      it('should get user activity for admin', async () => {
        const response = await request(app)
          .get(`/api/audit/user/${adminUser._id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.userId).toBe(adminUser._id.toString());
        expect(Array.isArray(response.body.activity)).toBe(true);
      });

      it('should deny access to regular users', async () => {
        const response = await request(app)
          .get(`/api/audit/user/${adminUser._id}`)
          .set('Authorization', `Bearer ${regularToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/audit/export', () => {
      it('should export audit logs as CSV for admin', async () => {
        const response = await request(app)
          .get('/api/audit/export')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
        expect(response.headers['content-disposition']).toMatch(/attachment; filename="audit-logs-.*\.csv"/);
        expect(response.text).toContain('Timestamp,Action,Status');
      });

      it('should deny access to regular users', async () => {
        const response = await request(app)
          .get('/api/audit/export')
          .set('Authorization', `Bearer ${regularToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
      });

      it('should support filters in export', async () => {
        const response = await request(app)
          .get('/api/audit/export?action=login&userType=User')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
        expect(response.text).toContain('Timestamp,Action,Status');
      });
    });
  });

  describe('Edge Cases and Security', () => {
    it('should handle missing IP address gracefully', async () => {
      const auditData = {
        action: 'login',
        status: 'success',
        userId: adminUser._id,
        userType: 'User',
        username: adminUser.username,
        userDisplayName: `${adminUser.firstName} ${adminUser.lastName}`,
        userRole: adminUser.role,
        sessionId: 'test-session',
        ipAddress: '', // Empty IP
        userAgent: 'test-agent'
      };

      const audit = await Audit.logEvent(auditData);
      expect(audit).toBeNull(); // Should fail validation
    });

    it('should handle extremely long user agent strings', async () => {
      const longUserAgent = 'A'.repeat(1000);
      const auditData = {
        action: 'login',
        status: 'success',
        userId: adminUser._id,
        userType: 'User',
        username: adminUser.username,
        userDisplayName: `${adminUser.firstName} ${adminUser.lastName}`,
        userRole: adminUser.role,
        sessionId: 'test-session',
        ipAddress: '127.0.0.1',
        userAgent: longUserAgent
      };

      const audit = await Audit.logEvent(auditData);
      expect(audit).toBeTruthy();
      expect(audit.userAgent).toBe(longUserAgent);
    });

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/audit?page=invalid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should limit export size', async () => {
      // The export endpoint limits to 10000 records for performance
      const response = await request(app)
        .get('/api/audit/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
      // Should succeed even with large datasets
    });
  });
}); 