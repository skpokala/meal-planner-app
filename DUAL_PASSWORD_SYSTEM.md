# Dual Password System for Admin Users

## Overview

The Family Meal Planner application now supports a dual password system for admin users, allowing them to authenticate using either their regular password or a master password. This provides enhanced security and flexibility for administrative access.

## Features

### ✅ **Admin Dual Authentication**
- Admin users can login with **regular password** OR **master password**
- Both passwords are independently managed and hashed
- Master password is only available for admin users

### ✅ **Security Features**
- Master passwords are securely hashed using bcrypt
- Master password field is excluded from JSON responses
- Only admin users can set/update master passwords
- Regular users cannot use master passwords

### ✅ **API Endpoints**
- **Login**: `POST /api/auth/login` - Accepts both password types for admin users
- **Set Master Password**: `PUT /api/auth/set-master-password` - Admin-only endpoint

## Usage

### **Admin Login (Frontend)**
Admin users can login using either password at: **http://localhost:3001**

**Option 1 - Regular Password:**
- Username: `admin`
- Password: `password`

**Option 2 - Master Password:**
- Username: `admin`
- Password: `testmaster123` (or custom master password)

### **Setting Master Password (Frontend UI)**
1. Login to the application at **http://localhost:3001**
2. Navigate to **Settings** page
3. Click on the **"Master Password"** tab (admin users only)
4. Fill in the form:
   - **Current Password**: Your existing password
   - **Master Password**: Your new master password (6+ characters)
   - **Confirm Master Password**: Repeat the master password
5. Click **"Set Master Password"**

### **Setting Master Password (API)**
```bash
# 1. Login to get admin token
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

# 2. Set master password
curl -X PUT http://localhost:5001/api/auth/set-master-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"currentPassword":"password","masterPassword":"newmaster123"}'
```

## Technical Implementation

### **Database Schema Changes**
```javascript
// User model now includes:
{
  password: String,        // Regular password (required)
  masterPassword: String,  // Master password (optional, admin only)
  // ... other fields
}
```

### **Authentication Flow**
1. User submits login credentials
2. System finds user by username
3. **For admin users**: Checks both `password` and `masterPassword` fields
4. **For regular users**: Only checks `password` field
5. Returns JWT token on successful authentication

### **Password Hashing**
- Both passwords are hashed using bcrypt with salt rounds = 10
- Master password is only hashed for admin users
- Non-admin users cannot have master passwords

### **New Methods**
```javascript
// User model methods:
userSchema.methods.comparePassword(candidatePassword)     // Regular password
userSchema.methods.compareMasterPassword(candidatePassword) // Master password  
userSchema.methods.verifyPassword(candidatePassword)      // Both passwords
```

## Security Considerations

### **✅ Secure Design**
- Master passwords are never stored in plain text
- Password fields are excluded from JSON responses
- Only current password verification required to set master password
- Master password functionality restricted to admin users only

### **✅ Access Control**
- Master password creation requires admin role
- Current password verification required for security
- Non-admin users receive 403 error when attempting to set master password

### **✅ Validation**
- Master password must be at least 6 characters
- Current password validation prevents unauthorized changes
- Input validation on all endpoints

## Testing

### **Manual Testing**
```bash
# Test regular password
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

# Test master password  
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"masteradmin123"}'

# Test wrong password (should fail)
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"wrongpassword"}'
```

### **Automated Tests**
- ✅ Admin login with regular password
- ✅ Admin login with master password
- ✅ Regular user login (no master password)
- ✅ Master password setting (admin only)
- ✅ Security validations and error handling

## Default Credentials

### **Admin User**
- **Username**: `admin`
- **Regular Password**: `password`
- **Master Password**: Set via API (default: `masteradmin123` if created fresh)

### **Important Notes**
1. **Production**: Change default passwords immediately
2. **Security**: Master password should be significantly different from regular password
3. **Backup**: Master password serves as backup authentication method
4. **Logging**: Both password types generate same login success message

## File Changes

### **Modified Files**
- `backend/models/User.js` - Added masterPassword field and methods
- `backend/routes/auth.js` - Updated login logic and added master password endpoint
- `backend/server.js` - Updated admin initialization
- `backend/__tests__/auth.test.js` - Added comprehensive tests
- `frontend/src/contexts/AuthContext.js` - Added setMasterPassword function
- `frontend/src/pages/Settings.js` - Added Master Password tab and UI

### **Key Functions**
- `verifyPassword()` - Checks both regular and master passwords
- `compareMasterPassword()` - Validates master password
- `set-master-password` endpoint - Admin-only master password management
- `setMasterPassword()` - Frontend function for setting master password
- Master Password UI - Settings page tab for admin users

## Future Enhancements

### **Possible Improvements**
- Master password expiration
- Password complexity requirements
- Login attempt monitoring
- Multi-factor authentication
- Password history tracking

---

**Status**: ✅ **FULLY IMPLEMENTED WITH UI**  
**Version**: 1.1.10  
**Date**: January 2025  
**Frontend UI**: ✅ Complete  
**Backend API**: ✅ Complete  
**Security Level**: Enhanced 