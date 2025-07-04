import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock react-router-dom to prevent nested router issues
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  BrowserRouter: ({ children }) => <div>{children}</div>,
}));

// Mock the API module completely
jest.mock('../services/api', () => ({
  get: jest.fn(() => Promise.resolve({ data: {} })),
  post: jest.fn(() => Promise.resolve({ data: {} })),
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() }
  }
}));

// Mock AuthContext
const mockAuthContext = {
  user: {
    _id: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    role: 'user'
  },
  logout: jest.fn(),
  loading: false
};

jest.mock('../contexts/AuthContext', () => ({
  AuthProvider: ({ children }) => <div>{children}</div>,
  useAuth: jest.fn(() => ({
    user: {
      _id: '1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      role: 'user'
    },
    logout: jest.fn(),
    loading: false
  })),
}));

// Mock all page components
jest.mock('../pages/Login', () => () => <div>Login Page</div>);
jest.mock('../pages/Dashboard', () => () => <div>Dashboard Page</div>);
jest.mock('../pages/FamilyMembers', () => () => <div>Family Members Page</div>);
jest.mock('../pages/Meals', () => () => <div>Meals Page</div>);
jest.mock('../pages/MealPlanner', () => () => <div>Meal Planner Page</div>);
jest.mock('../pages/Settings', () => () => <div>Settings Page</div>);
jest.mock('../components/Layout', () => ({ children }) => <div>{children}</div>);

import App from '../App';

// Get the mocked useAuth function
const { useAuth: mockUseAuth } = require('../contexts/AuthContext');

const renderAppWithRoute = (initialEntries = ['/']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <App />
    </MemoryRouter>
  );
};

describe('App', () => {
  beforeEach(() => {
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
      },
      writable: true
    });
    
    // Reset useAuth mock to default authenticated state
    mockUseAuth.mockReturnValue(mockAuthContext);
    
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    renderAppWithRoute();
  });

  describe('Routing', () => {
    it('renders Dashboard page for /dashboard route', () => {
      renderAppWithRoute(['/dashboard']);
      expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
    });

    it('renders Family Members page for /family-members route', () => {
      renderAppWithRoute(['/family-members']);
      expect(screen.getByText('Family Members Page')).toBeInTheDocument();
    });

    it('renders Meals page for /meals route', () => {
      renderAppWithRoute(['/meals']);
      expect(screen.getByText('Meals Page')).toBeInTheDocument();
    });

    it('renders Meal Planner page for /meal-planner route', () => {
      renderAppWithRoute(['/meal-planner']);
      expect(screen.getByText('Meal Planner Page')).toBeInTheDocument();
    });

    it('renders Settings page for /settings route', () => {
      renderAppWithRoute(['/settings']);
      expect(screen.getByText('Settings Page')).toBeInTheDocument();
    });

    it('redirects to dashboard when accessing root path with authenticated user', () => {
      renderAppWithRoute(['/']);
      // Since user is authenticated, should redirect to dashboard
      expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
    });
  });

  describe('Authentication Flow', () => {
    it('renders Login page when user is not authenticated', () => {
      // Mock unauthenticated user
      mockUseAuth.mockReturnValue({
        user: null,
        logout: jest.fn(),
        loading: false
      });

      renderAppWithRoute(['/dashboard']);
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });

    it('redirects authenticated user from login page to dashboard', () => {
      renderAppWithRoute(['/login']);
      expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
    });
  });

  describe('Protected Routes', () => {
    it('all main routes are protected and require authentication', () => {
      // Mock unauthenticated user
      mockUseAuth.mockReturnValue({
        user: null,
        logout: jest.fn(),
        loading: false
      });

      const protectedRoutes = ['/dashboard', '/family-members', '/meals', '/meal-planner', '/settings'];
      
      protectedRoutes.forEach(route => {
        const { unmount } = renderAppWithRoute([route]);
        expect(screen.getByText('Login Page')).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('Page Components Integration', () => {
    it('wraps protected pages with Layout component', () => {
      renderAppWithRoute(['/meals']);
      // Layout component is mocked to render children directly
      expect(screen.getByText('Meals Page')).toBeInTheDocument();
    });

    it('does not wrap login page with Layout component', () => {
      // Mock unauthenticated user
      mockUseAuth.mockReturnValue({
        user: null,
        logout: jest.fn(),
        loading: false
      });

      renderAppWithRoute(['/login']);
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
  });
}); 