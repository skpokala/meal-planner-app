import React from 'react';
import { render } from '@testing-library/react';

// Mock the API module completely
jest.mock('../services/api', () => ({
  get: jest.fn(() => Promise.resolve({ data: {} })),
  post: jest.fn(() => Promise.resolve({ data: {} })),
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() }
  }
}));

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }) => <div>{children}</div>,
  Routes: ({ children }) => <div>{children}</div>,
  Route: () => <div>Route</div>,
  Navigate: () => <div>Navigate</div>,
}));

// Mock all page components
jest.mock('../pages/Login', () => () => <div>Login Page</div>);
jest.mock('../pages/Dashboard', () => () => <div>Dashboard Page</div>);
jest.mock('../pages/FamilyMembers', () => () => <div>Family Members Page</div>);
jest.mock('../pages/MealPlanner', () => () => <div>Meal Planner Page</div>);
jest.mock('../pages/Settings', () => () => <div>Settings Page</div>);
jest.mock('../components/Layout', () => ({ children }) => <div>{children}</div>);

import App from '../App';

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
  });

  it('renders without crashing', () => {
    render(<App />);
  });
}); 