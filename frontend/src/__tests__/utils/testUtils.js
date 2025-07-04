import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock user data
export const mockUser = {
  _id: '123',
  username: 'admin',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  role: 'admin'
};

// Mock family member data
export const mockFamilyMember = {
  _id: '456',
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  dateOfBirth: '1990-01-01',
  relationship: 'spouse',
  dietaryRestrictions: ['vegetarian'],
  allergies: ['nuts'],
  preferences: ['italian'],
  dislikes: ['spicy']
};

// Mock meal data
export const mockMeal = {
  _id: '789',
  name: 'Spaghetti Bolognese',
  description: 'Classic Italian pasta dish',
  mealType: 'dinner',
  date: '2023-12-01',
  assignedTo: ['456'],
  ingredients: ['pasta', 'ground beef', 'tomato sauce'],
  recipe: {
    prepTime: 15,
    cookTime: 30,
    servings: 4,
    difficulty: 'medium',
    instructions: ['Boil pasta', 'Cook sauce', 'Combine']
  },
  totalTime: 45,
  rating: 4.5
};

// Custom render function with providers
export const renderWithProviders = (ui, options = {}) => {
  const {
    initialUser = null,
    // Add other provider props as needed
    ...renderOptions
  } = options;

  function Wrapper({ children }) {
    return (
      <BrowserRouter>
        <AuthProvider initialUser={initialUser}>
          {children}
        </AuthProvider>
      </BrowserRouter>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Mock API responses
export const mockApiResponses = {
  login: {
    user: mockUser,
    token: 'mock-jwt-token'
  },
  familyMembers: {
    familyMembers: [mockFamilyMember],
    count: 1
  },
  meals: {
    meals: [mockMeal],
    count: 1
  },
  mealStats: {
    stats: {
      overview: {
        totalMeals: 10,
        plannedMeals: 5,
        cookedMeals: 5
      }
    }
  }
};

// Mock localStorage
export const mockLocalStorage = () => {
  const store = {};
  
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn(key => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    })
  };
};

// Mock axios
export const createMockAxios = () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() }
  }
});

// Common event helpers
export const createMockEvent = (overrides = {}) => ({
  target: { value: '' },
  preventDefault: jest.fn(),
  stopPropagation: jest.fn(),
  ...overrides
});

// Wait for async operations
export const waitForApiCall = () => new Promise(resolve => setTimeout(resolve, 0)); 