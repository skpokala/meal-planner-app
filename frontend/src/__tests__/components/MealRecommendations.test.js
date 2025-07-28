import React from 'react';
import { render, screen } from '@testing-library/react';
import MealRecommendations from '../../components/MealRecommendations';
import { Toaster } from 'react-hot-toast';

// Mock the API service
jest.mock('../../services/api', () => ({
  get: jest.fn(),
  post: jest.fn()
}));

// Mock the AuthProvider completely
jest.mock('../../contexts/AuthContext', () => ({
  AuthProvider: ({ children }) => <div>{children}</div>,
  useAuth: () => ({
    user: { _id: 'user123', firstName: 'Test', lastName: 'User' },
    login: jest.fn(),
    logout: jest.fn(),
    loading: false
  })
}));

// Get the mocked api
import api from '../../services/api';

const TestWrapper = ({ children }) => (
  <div>
    {children}
    <Toaster />
  </div>
);

describe('MealRecommendations', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    localStorage.setItem('token', 'mock-token');
    
    // Default mock - success with empty meals to avoid infinite loops
    api.get.mockResolvedValue({
      data: {
        success: true,
        meals: []
      }
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  test('renders meal recommendations component title', async () => {
    render(
      <TestWrapper>
        <MealRecommendations showFeedback={true} maxRecommendations={5} />
      </TestWrapper>
    );

    // Just check that the title renders
    expect(screen.getByText('AI Meal Recommendations')).toBeInTheDocument();
  });

  test('calls API to fetch meals', async () => {
    render(
      <TestWrapper>
        <MealRecommendations showFeedback={true} maxRecommendations={5} />
      </TestWrapper>
    );

    // Verify API was called
    expect(api.get).toHaveBeenCalledWith('/meals');
  });
}); 