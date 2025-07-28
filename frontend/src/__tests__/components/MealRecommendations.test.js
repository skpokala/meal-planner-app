import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider } from '../../contexts/AuthContext';
import MealRecommendations from '../../components/MealRecommendations';
import { Toaster } from 'react-hot-toast';

// Mock the API
global.fetch = jest.fn();

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

const TestWrapper = ({ children }) => (
  <div>
    {children}
    <Toaster />
  </div>
);

describe('MealRecommendations - Meal Planning', () => {
  beforeEach(() => {
    fetch.mockClear();
    localStorage.setItem('token', 'mock-token');
  });

  afterEach(() => {
    localStorage.clear();
  });

  test('renders meal recommendations with add to meal plan buttons', async () => {
    // Mock successful API response
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        recommendations: [
          {
            meal_id: 'rec1',
            meal_name: 'Grilled Chicken',
            meal_type: 'dinner',
            prep_time: 20,
            difficulty: 'easy',
            rating: 4.5,
            recommendation_type: 'popular',
            popularity_score: 0.9,
            ingredients: ['chicken', 'herbs']
          }
        ]
      })
    });

    render(
      <TestWrapper>
        <MealRecommendations showFeedback={true} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Grilled Chicken')).toBeInTheDocument();
    });

    // Check if the calendar (add to meal plan) button is present
    const calendarButton = screen.getByTitle('Add to meal plan');
    expect(calendarButton).toBeInTheDocument();
  });

  test('opens meal plan modal when calendar button is clicked', async () => {
    // Mock successful API response
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        recommendations: [
          {
            meal_id: 'rec1',
            meal_name: 'Pasta Primavera',
            meal_type: 'dinner',
            prep_time: 15,
            difficulty: 'easy',
            rating: 4.2,
            recommendation_type: 'popular',
            popularity_score: 0.8,
            ingredients: ['pasta', 'vegetables']
          }
        ]
      })
    });

    render(
      <TestWrapper>
        <MealRecommendations showFeedback={true} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Pasta Primavera')).toBeInTheDocument();
    });

    // Click the calendar button
    const calendarButton = screen.getByTitle('Add to meal plan');
    fireEvent.click(calendarButton);

    // Check if the modal opened
    await waitFor(() => {
      expect(screen.getByText('Add to Meal Plan')).toBeInTheDocument();
      expect(screen.getByLabelText('Date')).toBeInTheDocument();
      expect(screen.getByLabelText('Meal Type')).toBeInTheDocument();
    });
  });

  test('closes modal when cancel button is clicked', async () => {
    // Mock successful API response
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        recommendations: [
          {
            meal_id: 'rec1',
            meal_name: 'Breakfast Smoothie',
            meal_type: 'breakfast',
            prep_time: 5,
            difficulty: 'easy',
            rating: 4.0,
            recommendation_type: 'popular',
            popularity_score: 0.7,
            ingredients: ['banana', 'berries']
          }
        ]
      })
    });

    render(
      <TestWrapper>
        <MealRecommendations showFeedback={true} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Breakfast Smoothie')).toBeInTheDocument();
    });

    // Open modal
    const calendarButton = screen.getByTitle('Add to meal plan');
    fireEvent.click(calendarButton);

    await waitFor(() => {
      expect(screen.getByText('Add to Meal Plan')).toBeInTheDocument();
    });

    // Click cancel
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    // Modal should be closed
    await waitFor(() => {
      expect(screen.queryByText('Add to Meal Plan')).not.toBeInTheDocument();
    });
  });

  test('successfully adds meal to meal plan when meal already exists', async () => {
    // Mock recommendations API
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        recommendations: [
          {
            meal_id: 'rec1',
            meal_name: 'Existing Meal',
            meal_type: 'dinner',
            prep_time: 30,
            difficulty: 'medium',
            rating: 4.3,
            recommendation_type: 'content_based',
            similarity_score: 0.85,
            ingredients: ['ingredient1', 'ingredient2']
          }
        ]
      })
    });

    // Mock existing meals API (meal exists)
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        meals: [
          {
            _id: 'existing-meal-id',
            name: 'Existing Meal',
            description: 'Test meal'
          }
        ]
      })
    });

    // Mock meal plan creation API
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        mealPlan: {
          _id: 'plan123',
          meal: { name: 'Existing Meal' },
          date: '2024-01-20T00:00:00.000Z',
          mealType: 'dinner'
        }
      })
    });

    render(
      <TestWrapper>
        <MealRecommendations showFeedback={true} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Existing Meal')).toBeInTheDocument();
    });

    // Open modal
    const calendarButton = screen.getByTitle('Add to meal plan');
    fireEvent.click(calendarButton);

    await waitFor(() => {
      expect(screen.getByText('Add to Meal Plan')).toBeInTheDocument();
    });

    // Set date and meal type
    const dateInput = screen.getByLabelText('Date');
    const mealTypeSelect = screen.getByLabelText('Meal Type');
    
    fireEvent.change(dateInput, { target: { value: '2024-01-20' } });
    fireEvent.change(mealTypeSelect, { target: { value: 'dinner' } });

    // Click Add to Plan
    const addButton = screen.getByText('Add to Plan');
    fireEvent.click(addButton);

    // Wait for success
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(3); // recommendations + meals + meal plan
    }, { timeout: 3000 });

    // Check API calls
    expect(fetch).toHaveBeenNthCalledWith(2, expect.stringContaining('/api/meals'), expect.objectContaining({
      headers: expect.objectContaining({
        'Authorization': 'Bearer mock-token'
      })
    }));

    expect(fetch).toHaveBeenNthCalledWith(3, expect.stringContaining('/api/meal-plans'), expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        'Authorization': 'Bearer mock-token',
        'Content-Type': 'application/json'
      }),
      body: expect.stringContaining('existing-meal-id')
    }));
  });

  test('creates new meal and adds to meal plan when meal does not exist', async () => {
    // Mock recommendations API
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        recommendations: [
          {
            meal_id: 'rec1',
            meal_name: 'New Recipe',
            meal_type: 'lunch',
            prep_time: 25,
            difficulty: 'hard',
            rating: 4.8,
            recommendation_type: 'hybrid',
            prediction_score: 0.92,
            ingredients: ['ingredient1', 'ingredient2', 'ingredient3']
          }
        ]
      })
    });

    // Mock existing meals API (meal doesn't exist)
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        meals: []
      })
    });

    // Mock meal creation API
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        meal: {
          _id: 'new-meal-id',
          name: 'New Recipe',
          description: 'Test description'
        }
      })
    });

    // Mock meal plan creation API
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        mealPlan: {
          _id: 'plan456',
          meal: { name: 'New Recipe' },
          date: '2024-01-21T00:00:00.000Z',
          mealType: 'lunch'
        }
      })
    });

    render(
      <TestWrapper>
        <MealRecommendations showFeedback={true} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('New Recipe')).toBeInTheDocument();
    });

    // Open modal
    const calendarButton = screen.getByTitle('Add to meal plan');
    fireEvent.click(calendarButton);

    await waitFor(() => {
      expect(screen.getByText('Add to Meal Plan')).toBeInTheDocument();
    });

    // Set date and meal type
    const dateInput = screen.getByLabelText('Date');
    const mealTypeSelect = screen.getByLabelText('Meal Type');
    
    fireEvent.change(dateInput, { target: { value: '2024-01-21' } });
    fireEvent.change(mealTypeSelect, { target: { value: 'lunch' } });

    // Click Add to Plan
    const addButton = screen.getByText('Add to Plan');
    fireEvent.click(addButton);

    // Wait for completion
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(4); // recommendations + existing meals + create meal + meal plan
    }, { timeout: 3000 });

    // Check meal creation API call
    expect(fetch).toHaveBeenNthCalledWith(3, expect.stringContaining('/api/meals'), expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        'Authorization': 'Bearer mock-token',
        'Content-Type': 'application/json'
      }),
      body: expect.stringContaining('New Recipe')
    }));

    // Check meal plan creation API call
    expect(fetch).toHaveBeenNthCalledWith(4, expect.stringContaining('/api/meal-plans'), expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        'Authorization': 'Bearer mock-token',
        'Content-Type': 'application/json'
      }),
      body: expect.stringContaining('new-meal-id')
    }));
  });

  test('handles errors when adding to meal plan fails', async () => {
    // Mock recommendations API
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        recommendations: [
          {
            meal_id: 'rec1',
            meal_name: 'Error Meal',
            meal_type: 'dinner',
            prep_time: 20,
            difficulty: 'easy',
            rating: 4.0,
            recommendation_type: 'popular',
            popularity_score: 0.8,
            ingredients: ['ingredient1']
          }
        ]
      })
    });

    // Mock existing meals API
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        meals: []
      })
    });

    // Mock meal creation API (success)
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        meal: {
          _id: 'meal-id',
          name: 'Error Meal'
        }
      })
    });

    // Mock meal plan creation API (error)
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        message: 'Meal plan already exists'
      })
    });

    render(
      <TestWrapper>
        <MealRecommendations showFeedback={true} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Error Meal')).toBeInTheDocument();
    });

    // Open modal and submit
    const calendarButton = screen.getByTitle('Add to meal plan');
    fireEvent.click(calendarButton);

    await waitFor(() => {
      expect(screen.getByText('Add to Meal Plan')).toBeInTheDocument();
    });

    const addButton = screen.getByText('Add to Plan');
    fireEvent.click(addButton);

    // Wait for error handling
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(4);
    }, { timeout: 3000 });
  });
}); 