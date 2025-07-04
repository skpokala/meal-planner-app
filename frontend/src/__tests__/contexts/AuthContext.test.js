import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { mockUser, mockLocalStorage, createMockAxios } from '../utils/testUtils';

// Mock api module
const mockApi = createMockAxios();
jest.mock('../../services/api', () => mockApi);

// Test component to access context
const TestComponent = () => {
  const { user, login, logout, updateProfile, changePassword, loading } = useAuth();
  
  return (
    <div>
      <div data-testid="user">{user ? user.username : 'No user'}</div>
      <div data-testid="loading">{loading ? 'Loading' : 'Not loading'}</div>
      <button onClick={() => login('admin', 'password')} data-testid="login-btn">
        Login
      </button>
      <button onClick={logout} data-testid="logout-btn">
        Logout
      </button>
      <button 
        onClick={() => updateProfile({ firstName: 'Updated' })} 
        data-testid="update-profile-btn"
      >
        Update Profile
      </button>
      <button 
        onClick={() => changePassword('old', 'new')} 
        data-testid="change-password-btn"
      >
        Change Password
      </button>
    </div>
  );
};

describe('AuthContext', () => {
  let mockLocalStorageImpl;

  beforeEach(() => {
    mockLocalStorageImpl = mockLocalStorage();
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorageImpl,
      writable: true
    });
    
    // Reset mocks
    jest.clearAllMocks();
  });

  const renderWithAuthProvider = (initialUser = null) => {
    return render(
      <AuthProvider initialUser={initialUser}>
        <TestComponent />
      </AuthProvider>
    );
  };

  describe('initial state', () => {
    it('renders with no user when localStorage is empty', () => {
      renderWithAuthProvider();
      
      expect(screen.getByTestId('user')).toHaveTextContent('No user');
      expect(screen.getByTestId('loading')).toHaveTextContent('Not loading');
    });

    it('renders with user from localStorage', () => {
      mockLocalStorageImpl.getItem.mockReturnValue(JSON.stringify(mockUser));
      
      renderWithAuthProvider();
      
      expect(screen.getByTestId('user')).toHaveTextContent(mockUser.username);
    });

    it('renders with initialUser prop', () => {
      renderWithAuthProvider(mockUser);
      
      expect(screen.getByTestId('user')).toHaveTextContent(mockUser.username);
    });
  });

  describe('login functionality', () => {
    it('successfully logs in user', async () => {
      mockApi.post.mockResolvedValue({
        data: {
          user: mockUser,
          token: 'test-token'
        }
      });

      renderWithAuthProvider();
      
      fireEvent.click(screen.getByTestId('login-btn'));
      
      // Should show loading state
      expect(screen.getByTestId('loading')).toHaveTextContent('Loading');
      
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent(mockUser.username);
        expect(screen.getByTestId('loading')).toHaveTextContent('Not loading');
      });

      expect(mockApi.post).toHaveBeenCalledWith('/auth/login', {
        username: 'admin',
        password: 'password'
      });
      
      expect(mockLocalStorageImpl.setItem).toHaveBeenCalledWith(
        'user', 
        JSON.stringify(mockUser)
      );
      expect(mockLocalStorageImpl.setItem).toHaveBeenCalledWith(
        'token', 
        'test-token'
      );
    });

    it('handles login error', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockApi.post.mockRejectedValue(new Error('Login failed'));

      renderWithAuthProvider();
      
      fireEvent.click(screen.getByTestId('login-btn'));
      
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('No user');
        expect(screen.getByTestId('loading')).toHaveTextContent('Not loading');
      });

      expect(consoleSpy).toHaveBeenCalledWith('Login error:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('logout functionality', () => {
    it('successfully logs out user', async () => {
      mockApi.post.mockResolvedValue({ data: {} });
      
      renderWithAuthProvider(mockUser);
      
      fireEvent.click(screen.getByTestId('logout-btn'));
      
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('No user');
      });

      expect(mockApi.post).toHaveBeenCalledWith('/auth/logout');
      expect(mockLocalStorageImpl.removeItem).toHaveBeenCalledWith('user');
      expect(mockLocalStorageImpl.removeItem).toHaveBeenCalledWith('token');
    });

    it('handles logout error gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockApi.post.mockRejectedValue(new Error('Logout failed'));
      
      renderWithAuthProvider(mockUser);
      
      fireEvent.click(screen.getByTestId('logout-btn'));
      
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('No user');
      });

      expect(consoleSpy).toHaveBeenCalledWith('Logout error:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('updateProfile functionality', () => {
    it('successfully updates user profile', async () => {
      const updatedUser = { ...mockUser, firstName: 'Updated' };
      mockApi.put.mockResolvedValue({ data: { user: updatedUser } });
      
      renderWithAuthProvider(mockUser);
      
      fireEvent.click(screen.getByTestId('update-profile-btn'));
      
      await waitFor(() => {
        expect(mockApi.put).toHaveBeenCalledWith('/auth/profile', { firstName: 'Updated' });
        expect(mockLocalStorageImpl.setItem).toHaveBeenCalledWith(
          'user', 
          JSON.stringify(updatedUser)
        );
      });
    });

    it('handles update profile error', async () => {
      mockApi.put.mockRejectedValue(new Error('Update failed'));
      
      renderWithAuthProvider(mockUser);
      
      fireEvent.click(screen.getByTestId('update-profile-btn'));
      
      await waitFor(() => {
        expect(mockApi.put).toHaveBeenCalled();
      });
    });
  });

  describe('changePassword functionality', () => {
    it('successfully changes password', async () => {
      mockApi.put.mockResolvedValue({ data: {} });
      
      renderWithAuthProvider(mockUser);
      
      fireEvent.click(screen.getByTestId('change-password-btn'));
      
      await waitFor(() => {
        expect(mockApi.put).toHaveBeenCalledWith('/auth/change-password', {
          currentPassword: 'old',
          newPassword: 'new'
        });
      });
    });

    it('handles change password error', async () => {
      mockApi.put.mockRejectedValue(new Error('Change password failed'));
      
      renderWithAuthProvider(mockUser);
      
      fireEvent.click(screen.getByTestId('change-password-btn'));
      
      await waitFor(() => {
        expect(mockApi.put).toHaveBeenCalled();
      });
    });
  });

  describe('error handling', () => {
    it('throws error when useAuth is used outside AuthProvider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      expect(() => render(<TestComponent />)).toThrow(
        'useAuth must be used within an AuthProvider'
      );
      
      consoleSpy.mockRestore();
    });
  });
}); 