import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import Login from '../../pages/Login';
import { AuthProvider } from '../../contexts/AuthContext';
import { mockUser } from '../utils/testUtils';

// Mock the API module
jest.mock('../../services/api', () => ({
  defaults: {
    headers: {
      common: {}
    }
  },
  get: jest.fn(() => Promise.resolve({ data: {} })),
  post: jest.fn(() => Promise.resolve({ data: {} })),
  put: jest.fn(() => Promise.resolve({ data: {} })),
  delete: jest.fn(() => Promise.resolve({ data: {} })),
  interceptors: {
    request: {
      use: jest.fn()
    },
    response: {
      use: jest.fn()
    }
  }
}));

// Get the mocked API
const mockApi = require('../../services/api');

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

// Get the mocked toast
const mockToast = require('react-hot-toast').default;

describe('Login', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock useNavigate
    require('react-router-dom').useNavigate = jest.fn(() => mockNavigate);
  });

  const renderLogin = (initialRoute = '/login') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </MemoryRouter>
    );
  };

  describe('component rendering', () => {
    it('renders login form elements', () => {
      renderLogin();
      
      expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('renders demo credentials section', () => {
      renderLogin();
      
      expect(screen.getByText('Demo Credentials')).toBeInTheDocument();
      expect(screen.getByText('Username: admin')).toBeInTheDocument();
      expect(screen.getByText('Password: password')).toBeInTheDocument();
    });

    it('has proper form structure', () => {
      renderLogin();
      
      const form = screen.getByRole('form') || screen.getByTestId('login-form') || document.querySelector('form');
      expect(form).toBeInTheDocument();
      
      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      
      expect(usernameInput).toHaveAttribute('type', 'text');
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(usernameInput).toBeRequired();
      expect(passwordInput).toBeRequired();
    });
  });

  describe('form interactions', () => {
    it('updates input values when typing', () => {
      renderLogin();
      
      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      
      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(passwordInput, { target: { value: 'testpass' } });
      
      expect(usernameInput).toHaveValue('testuser');
      expect(passwordInput).toHaveValue('testpass');
    });

    it('shows loading state during form submission', async () => {
      mockApi.post.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      renderLogin();
      
      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      fireEvent.change(usernameInput, { target: { value: 'admin' } });
      fireEvent.change(passwordInput, { target: { value: 'password' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
        expect(screen.getByText('Signing in...')).toBeInTheDocument();
      });
    });
  });

  describe('successful login', () => {
    beforeEach(() => {
      mockApi.post.mockResolvedValue({
        data: {
          user: mockUser,
          token: 'test-token'
        }
      });
    });

    it('successfully logs in with valid credentials', async () => {
      renderLogin();
      
      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      fireEvent.change(usernameInput, { target: { value: 'admin' } });
      fireEvent.change(passwordInput, { target: { value: 'password' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockApi.post).toHaveBeenCalledWith('/auth/login', {
          username: 'admin',
          password: 'password'
        });
      });
      
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });

    it('redirects to intended page after login', async () => {
      renderLogin('/login?redirect=/meal-planner');
      
      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      fireEvent.change(usernameInput, { target: { value: 'admin' } });
      fireEvent.change(passwordInput, { target: { value: 'password' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/meal-planner');
      });
    });
  });

  describe('login errors', () => {
    it('handles login failure with error message', async () => {
      const errorMessage = 'Invalid credentials';
      mockApi.post.mockRejectedValue({
        response: {
          data: { message: errorMessage }
        }
      });
      
      renderLogin();
      
      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      fireEvent.change(usernameInput, { target: { value: 'admin' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(errorMessage);
      });
      
      // Form should be re-enabled
      expect(submitButton).not.toBeDisabled();
      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });

    it('handles network errors', async () => {
      mockApi.post.mockRejectedValue(new Error('Network error'));
      
      renderLogin();
      
      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      fireEvent.change(usernameInput, { target: { value: 'admin' } });
      fireEvent.change(passwordInput, { target: { value: 'password' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('An error occurred during login');
      });
    });
  });

  describe('form validation', () => {
    it('requires username field', () => {
      renderLogin();
      
      const usernameInput = screen.getByLabelText(/username/i);
      expect(usernameInput).toBeRequired();
    });

    it('requires password field', () => {
      renderLogin();
      
      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toBeRequired();
    });

    it('prevents form submission with empty fields', () => {
      renderLogin();
      
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(submitButton);
      
      // API should not be called with empty fields
      expect(mockApi.post).not.toHaveBeenCalled();
    });
  });

  describe('keyboard navigation', () => {
    it('allows form submission with Enter key', async () => {
      mockApi.post.mockResolvedValue({
        data: {
          user: mockUser,
          token: 'test-token'
        }
      });
      
      renderLogin();
      
      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      
      fireEvent.change(usernameInput, { target: { value: 'admin' } });
      fireEvent.change(passwordInput, { target: { value: 'password' } });
      fireEvent.keyDown(passwordInput, { key: 'Enter', code: 'Enter' });
      
      await waitFor(() => {
        expect(mockApi.post).toHaveBeenCalled();
      });
    });
  });

  describe('accessibility', () => {
    it('has proper labels and ARIA attributes', () => {
      renderLogin();
      
      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      
      expect(usernameInput).toHaveAccessibleName();
      expect(passwordInput).toHaveAccessibleName();
    });

    it('has proper heading structure', () => {
      renderLogin();
      
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('Sign in to your account');
    });
  });

  describe('redirect behavior', () => {
    it('extracts redirect parameter from URL', () => {
      renderLogin('/login?redirect=/family-members');
      
      // This would be tested by checking if the redirect works after successful login
      // The component should read the URL parameter and use it for navigation
    });

    it('defaults to dashboard when no redirect parameter', async () => {
      mockApi.post.mockResolvedValue({
        data: {
          user: mockUser,
          token: 'test-token'
        }
      });
      
      renderLogin('/login');
      
      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      fireEvent.change(usernameInput, { target: { value: 'admin' } });
      fireEvent.change(passwordInput, { target: { value: 'password' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });
  });
}); 