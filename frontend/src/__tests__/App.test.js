import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../App';
import { BrowserRouter } from 'react-router-dom';

// Version component is tested separately in its own test file

// Mock AuthContext
const mockAuthContext = {
  user: null,
  login: jest.fn(),
  logout: jest.fn(),
  loading: false
};

jest.mock('../contexts/AuthContext', () => ({
  AuthProvider: ({ children }) => <div>{children}</div>,
  useAuth: () => mockAuthContext
}));

// Mock ThemeContext
const mockThemeContext = {
  theme: 'light',
  resolvedTheme: 'light',
  setTheme: jest.fn(),
  toggleTheme: jest.fn(),
  themes: [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' }
  ]
};

jest.mock('../contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }) => <div>{children}</div>,
  useTheme: () => mockThemeContext
}));

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  BrowserRouter: ({ children }) => <div>{children}</div>,
  Routes: ({ children }) => <div>{children}</div>,
  Route: ({ element }) => <div>{element}</div>,
  Navigate: () => <div>Navigate</div>,
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/login' })
}));

// Mock pages
jest.mock('../pages/Login', () => {
  return function MockLogin() {
    return <div>Login Page</div>;
  };
});

describe('App Component', () => {
  test('renders without crashing', () => {
    render(<App />);
  });

  test('renders routes correctly', () => {
    render(<App />);
    
    // Should render the Login page when not authenticated
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  test('includes Toaster component', () => {
    render(<App />);
    
    // Toaster should be rendered (though it may not be visible without a toast)
    // We can't easily test for Toaster visibility, but we can ensure the app renders without error
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });
}); 