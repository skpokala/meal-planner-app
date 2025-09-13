import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage on app start
  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = localStorage.getItem('token');
        console.log('AuthContext loading user:', { 
          hasToken: !!token, 
          tokenLength: token?.length || 0 
        });
        
        if (token) {
          // Set the token in the API headers
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Verify token and get user info
          console.log('Making profile request...');
          const response = await api.get('/auth/profile');
          console.log('Profile response:', response.data);
          setUser(response.data.user);
        } else {
          console.log('No token found, user not authenticated');
        }
      } catch (error) {
        console.error('Error loading user:', error);
        console.error('Error details:', { 
          status: error.response?.status, 
          message: error.response?.data?.message 
        });
        // Clear invalid token
        localStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/login', {
        username,
        password,
      });
      
      const { token, user } = response.data;
      
      // Store token in localStorage
      localStorage.setItem('token', token);
      
      // Set token in API headers
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Update user state
      setUser(user);
      
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Call logout endpoint to log the logout event
      await api.post('/auth/logout');
    } catch (error) {
      // Don't fail if logout API call fails
      console.error('Logout API call failed:', error);
    } finally {
      // Always clear local state regardless of API call result
      // Remove token from localStorage
      localStorage.removeItem('token');
      
      // Remove token from API headers
      delete api.defaults.headers.common['Authorization'];
      
      // Clear user state
      setUser(null);
      
      // Navigation should be handled by the calling component
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await api.put('/auth/profile', profileData);
      setUser(response.data.user);
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      const response = await api.put('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const setMasterPassword = async (currentPassword, masterPassword) => {
    try {
      const response = await api.put('/auth/set-master-password', {
        currentPassword,
        masterPassword,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const checkUsernameAvailability = async (username, excludeId = null) => {
    try {
      const response = await api.post('/auth/check-username', {
        username,
        excludeId,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  // Helper functions for user type checking
  const isSystemUser = () => {
    return user && user.userType === 'User';
  };

  const isFamilyMember = () => {
    return user && user.userType === 'FamilyMember';
  };

  const isAdmin = () => {
    return user && user.role === 'admin';
  };

  const isSystemAdmin = () => {
    return user && user.userType === 'User' && user.role === 'admin';
  };

  const isFamilyAdmin = () => {
    return user && user.userType === 'FamilyMember' && user.role === 'admin';
  };

  const canManageFamilyMembers = () => {
    return isSystemAdmin() || isFamilyAdmin();
  };

  const canAssignAdminRole = () => {
    return isSystemAdmin();
  };

  const canSetMasterPassword = () => {
    return isAdmin();
  };

  const getUserDisplayName = () => {
    if (!user) return '';
    return `${user.firstName} ${user.lastName}`;
  };

  const getUserTypeLabel = () => {
    if (!user) return '';
    if (isSystemUser()) return 'System User';
    if (isFamilyMember()) return 'Family Member';
    return 'User';
  };

  const getRoleLabel = () => {
    if (!user) return '';
    return user.role === 'admin' ? 'Administrator' : 'User';
  };

  const getFullUserLabel = () => {
    if (!user) return '';
    const typeLabel = getUserTypeLabel();
    const roleLabel = getRoleLabel();
    return `${typeLabel} - ${roleLabel}`;
  };

  const value = {
    user,
    loading,
    login,
    logout,
    updateProfile,
    changePassword,
    setMasterPassword,
    checkUsernameAvailability,
    // Helper functions
    isSystemUser,
    isFamilyMember,
    isAdmin,
    isSystemAdmin,
    isFamilyAdmin,
    canManageFamilyMembers,
    canAssignAdminRole,
    canSetMasterPassword,
    getUserDisplayName,
    getUserTypeLabel,
    getRoleLabel,
    getFullUserLabel,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 