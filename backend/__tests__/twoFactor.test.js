const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const FamilyMember = require('../models/FamilyMember');
const speakeasy = require('speakeasy');

describe('Two-Factor Authentication', () => {
  let testUser;
  let testUserToken;
  let familyMember;
  let familyMemberToken;

  beforeEach(async () => {
    // Clean up existing test users
    await User.deleteMany({ email: { $regex: /test.*@example\.com/ } });
    await FamilyMember.deleteMany({ email: { $regex: /test.*@example\.com/ } });

    // Create test user
    testUser = new User({
      username: 'testuser2fa',
      email: 'testuser2fa@example.com',
      password: 'testpassword123',
      firstName: 'Test',
      lastName: 'User',
      role: 'admin'
    });
    await testUser.save();

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser2fa',
        password: 'testpassword123'
      });

    testUserToken = loginResponse.body.token;

    // Create family member
    familyMember = new FamilyMember({
      username: 'familytest2fa',
      email: 'familytest2fa@example.com',
      password: 'familypassword123',
      firstName: 'Family',
      lastName: 'Member',
      dateOfBirth: new Date('1990-01-01'),
      relationship: 'parent',
      hasLoginAccess: true,
      createdBy: testUser._id
    });
    await familyMember.save();

    // Login family member
    const familyLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'familytest2fa',
        password: 'familypassword123'
      });

    familyMemberToken = familyLoginResponse.body.token;
  });

  describe('GET /api/2fa/status', () => {
    it('should return 2FA status for authenticated user', async () => {
      const response = await request(app)
        .get('/api/2fa/status')
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.twoFactorEnabled).toBe(false);
      expect(response.body.setupCompleted).toBe(false);
    });

    it('should return 401 for unauthenticated user', async () => {
      const response = await request(app)
        .get('/api/2fa/status');

      expect(response.status).toBe(401);
    });

    it('should work for family members', async () => {
      const response = await request(app)
        .get('/api/2fa/status')
        .set('Authorization', `Bearer ${familyMemberToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/2fa/setup/init', () => {
    it('should initialize 2FA setup with valid password', async () => {
      const response = await request(app)
        .post('/api/2fa/setup/init')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          password: 'testpassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.secret).toBeDefined();
      expect(response.body.qrCode).toBeDefined();
      expect(response.body.manualEntryKey).toBeDefined();
      expect(response.body.message).toContain('authenticator app');

      // Verify secret is stored in database
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.twoFactorSecret).toBeDefined();
      expect(updatedUser.twoFactorEnabled).toBe(false);
    });

    it('should reject with invalid password', async () => {
      const response = await request(app)
        .post('/api/2fa/setup/init')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          password: 'wrongpassword'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid password');
    });

    it('should require password', async () => {
      const response = await request(app)
        .post('/api/2fa/setup/init')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should work for family members', async () => {
      const response = await request(app)
        .post('/api/2fa/setup/init')
        .set('Authorization', `Bearer ${familyMemberToken}`)
        .send({
          password: 'familypassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/2fa/setup/verify', () => {
    let secret;

    beforeEach(async () => {
      // Initialize 2FA setup
      const initResponse = await request(app)
        .post('/api/2fa/setup/init')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          password: 'testpassword123'
        });

      secret = initResponse.body.secret;
    });

    it('should complete 2FA setup with valid TOTP token', async () => {
      // Generate valid TOTP token
      const token = speakeasy.totp({
        secret: secret,
        encoding: 'base32'
      });

      const response = await request(app)
        .post('/api/2fa/setup/verify')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          token: token
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('2FA enabled successfully');
      expect(response.body.backupCodes).toHaveLength(8);
      expect(response.body.warning).toContain('backup codes');

      // Verify 2FA is enabled in database
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.twoFactorEnabled).toBe(true);
      expect(updatedUser.twoFactorSetupCompleted).toBe(true);
      expect(updatedUser.twoFactorBackupCodes).toHaveLength(8);
    });

    it('should reject invalid TOTP token', async () => {
      const response = await request(app)
        .post('/api/2fa/setup/verify')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          token: '123456'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid TOTP code');
    });

    it('should require 6-digit token', async () => {
      const response = await request(app)
        .post('/api/2fa/setup/verify')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          token: '123'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should require 2FA setup initialization', async () => {
      // Create new user without 2FA setup
      const newUser = new User({
        username: 'newuser2fa',
        email: 'newuser2fa@example.com',
        password: 'newpassword123',
        firstName: 'New',
        lastName: 'User'
      });
      await newUser.save();

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'newuser2fa',
          password: 'newpassword123'
        });

      const response = await request(app)
        .post('/api/2fa/setup/verify')
        .set('Authorization', `Bearer ${loginResponse.body.token}`)
        .send({
          token: '123456'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('2FA setup not initialized');
    });
  });

  describe('POST /api/2fa/disable', () => {
    beforeEach(async () => {
      // Enable 2FA for test user
      const secret = speakeasy.generateSecret({ length: 32 });
      testUser.twoFactorSecret = secret.base32;
      testUser.twoFactorEnabled = true;
      testUser.twoFactorSetupCompleted = true;
      testUser.twoFactorBackupCodes = ['ABC12345', 'DEF67890'];
      await testUser.save();
    });

    it('should disable 2FA with valid password and TOTP', async () => {
      const token = speakeasy.totp({
        secret: testUser.twoFactorSecret,
        encoding: 'base32'
      });

      const response = await request(app)
        .post('/api/2fa/disable')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          password: 'testpassword123',
          token: token
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('2FA disabled successfully');

      // Verify 2FA is disabled in database
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.twoFactorEnabled).toBe(false);
      expect(updatedUser.twoFactorSetupCompleted).toBe(false);
      expect(updatedUser.twoFactorSecret).toBeUndefined();
      expect(updatedUser.twoFactorBackupCodes).toHaveLength(0);
    });

    it('should require valid password', async () => {
      const response = await request(app)
        .post('/api/2fa/disable')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          password: 'wrongpassword',
          token: '123456'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid password');
    });

    it('should require valid TOTP or backup code when 2FA is enabled', async () => {
      const response = await request(app)
        .post('/api/2fa/disable')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          password: 'testpassword123',
          token: '000000'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid TOTP code or backup code');
    });

    it('should work with backup code', async () => {
      // Mock the User prototype verifyBackupCode method to return true
      const originalVerifyBackupCode = User.prototype.verifyBackupCode;
      User.prototype.verifyBackupCode = jest.fn().mockReturnValue(true);

      const response = await request(app)
        .post('/api/2fa/disable')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          password: 'testpassword123',
          backupCode: 'ABC12345'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Restore original method
      User.prototype.verifyBackupCode = originalVerifyBackupCode;
    });
  });

  describe('POST /api/2fa/backup-codes/regenerate', () => {
    beforeEach(async () => {
      // Enable 2FA for test user
      const secret = speakeasy.generateSecret({ length: 32 });
      testUser.twoFactorSecret = secret.base32;
      testUser.twoFactorEnabled = true;
      testUser.twoFactorSetupCompleted = true;
      await testUser.save();
    });

    it('should regenerate backup codes with valid credentials', async () => {
      const token = speakeasy.totp({
        secret: testUser.twoFactorSecret,
        encoding: 'base32'
      });

      const response = await request(app)
        .post('/api/2fa/backup-codes/regenerate')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          password: 'testpassword123',
          token: token
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.backupCodes).toHaveLength(8);
      expect(response.body.message).toBe('New backup codes generated successfully');
      expect(response.body.warning).toContain('replace your previous backup codes');
    });

    it('should require 2FA to be enabled', async () => {
      // Disable 2FA
      testUser.twoFactorEnabled = false;
      await testUser.save();

      const response = await request(app)
        .post('/api/2fa/backup-codes/regenerate')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          password: 'testpassword123'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('2FA is not enabled');
    });

    it('should require TOTP or backup code', async () => {
      const response = await request(app)
        .post('/api/2fa/backup-codes/regenerate')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          password: 'testpassword123'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('TOTP code or backup code is required');
    });
  });

  describe('POST /api/2fa/verify (login flow)', () => {
    let temporaryToken;
    let secret;

    beforeEach(async () => {
      // Enable 2FA for test user
      secret = speakeasy.generateSecret({ length: 32 });
      testUser.twoFactorSecret = secret.base32;
      testUser.twoFactorEnabled = true;
      testUser.twoFactorSetupCompleted = true;
      await testUser.save();

      // Generate temporary token (simulating login with 2FA required)
      const jwt = require('jsonwebtoken');
      temporaryToken = jwt.sign(
        {
          userId: testUser._id,
          username: testUser.username,
          role: testUser.role,
          userType: 'User',
          temp2FA: true
        },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '10m' }
      );
    });

    it('should complete login with valid TOTP token', async () => {
      const token = speakeasy.totp({
        secret: secret.base32,
        encoding: 'base32'
      });

      const response = await request(app)
        .post('/api/2fa/verify')
        .send({
          temporaryToken: temporaryToken,
          token: token
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.twoFactorEnabled).toBe(true);
    });

    it('should complete login with valid backup code', async () => {
      // Mock the verifyBackupCode method
      const originalVerifyBackupCode = User.prototype.verifyBackupCode;
      User.prototype.verifyBackupCode = jest.fn().mockReturnValue(true);

      const response = await request(app)
        .post('/api/2fa/verify')
        .send({
          temporaryToken: temporaryToken,
          backupCode: 'ABC12345'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Restore original method
      User.prototype.verifyBackupCode = originalVerifyBackupCode;
    });

    it('should reject invalid TOTP token', async () => {
      const response = await request(app)
        .post('/api/2fa/verify')
        .send({
          temporaryToken: temporaryToken,
          token: '000000'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid TOTP code or backup code');
    });

    it('should reject invalid temporary token', async () => {
      const response = await request(app)
        .post('/api/2fa/verify')
        .send({
          temporaryToken: 'invalid-token',
          token: '123456'
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid temporary token');
    });

    it('should require TOTP or backup code', async () => {
      const response = await request(app)
        .post('/api/2fa/verify')
        .send({
          temporaryToken: temporaryToken
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('TOTP code or backup code is required');
    });
  });

  describe('User Model TOTP Methods', () => {
    let user;
    let secret;

    beforeEach(async () => {
      secret = speakeasy.generateSecret({ length: 32 });
      user = new User({
        username: 'totptest',
        email: 'totptest@example.com',
        password: 'testpassword',
        firstName: 'TOTP',
        lastName: 'Test',
        twoFactorSecret: secret.base32,
        twoFactorEnabled: true
      });
      await user.save();
    });

    it('should verify valid TOTP token', () => {
      const token = speakeasy.totp({
        secret: secret.base32,
        encoding: 'base32'
      });

      const isValid = user.verifyTOTP(token);
      expect(isValid).toBe(true);
    });

    it('should reject invalid TOTP token', () => {
      const isValid = user.verifyTOTP('000000');
      expect(isValid).toBe(false);
    });

    it('should reject TOTP when 2FA is disabled', () => {
      user.twoFactorEnabled = false;
      const token = speakeasy.totp({
        secret: secret.base32,
        encoding: 'base32'
      });

      const isValid = user.verifyTOTP(token);
      expect(isValid).toBe(false);
    });

    it('should generate backup codes', () => {
      const codes = user.generateBackupCodes();
      
      expect(codes).toHaveLength(8);
      expect(user.twoFactorBackupCodes).toHaveLength(8);
      
      // Each code should be 8 characters
      codes.forEach(code => {
        expect(code).toHaveLength(8);
        expect(code).toMatch(/^[A-F0-9]{8}$/);
      });
    });

    it('should verify and consume backup code', () => {
      const codes = user.generateBackupCodes();
      const firstCode = codes[0];

      // First use should succeed
      const isValid = user.verifyBackupCode(firstCode);
      expect(isValid).toBe(true);
      expect(user.twoFactorBackupCodes).toHaveLength(7);

      // Second use of same code should fail
      const isValidSecond = user.verifyBackupCode(firstCode);
      expect(isValidSecond).toBe(false);
    });

    it('should reject invalid backup code', () => {
      user.generateBackupCodes();
      const isValid = user.verifyBackupCode('INVALID1');
      expect(isValid).toBe(false);
    });
  });

  describe('Auth Flow with 2FA', () => {
    beforeEach(async () => {
      // Enable 2FA for test user
      const secret = speakeasy.generateSecret({ length: 32 });
      testUser.twoFactorSecret = secret.base32;
      testUser.twoFactorEnabled = true;
      testUser.twoFactorSetupCompleted = true;
      await testUser.save();
    });

    it('should require 2FA verification during login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser2fa',
          password: 'testpassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.requiresTwoFactor).toBe(true);
      expect(response.body.temporaryToken).toBeDefined();
      expect(response.body.message).toContain('2FA code');
    });

    it('should not require 2FA for users without it enabled', async () => {
      // Disable 2FA
      testUser.twoFactorEnabled = false;
      await testUser.save();

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser2fa',
          password: 'testpassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.requiresTwoFactor).toBeUndefined();
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
    });
  });
}); 