import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  const mockMeals = [
    {
      _id: 'meal1',
      name: 'Chicken Curry',
      mealType: 'dinner',
      prepTime: 30,
      difficulty: 'medium',
      rating: 4.5,
      ingredients: ['Chicken', 'Curry Powder', 'Rice']
    },
    {
      _id: 'meal2', 
      name: 'Breakfast Pancakes',
      mealType: 'breakfast',
      prepTime: 15,
      difficulty: 'easy',
      rating: 4.2,
      ingredients: ['Flour', 'Eggs', 'Milk']
    }
  ];

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    localStorage.setItem('token', 'mock-token');
    
    // Default mock - success with sample meals
    api.get.mockResolvedValue({
      data: {
        success: true,
        meals: mockMeals
      }
    });

    api.post.mockResolvedValue({
      data: {
        success: true,
        mealPlan: { _id: 'plan123', meal: 'meal1', date: '2024-01-01' }
      }
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Component Rendering', () => {
    test('renders meal recommendations component title', async () => {
      render(
        <TestWrapper>
          <MealRecommendations showFeedback={true} maxRecommendations={5} />
        </TestWrapper>
      );

      expect(screen.getByText('AI Meal Recommendations')).toBeInTheDocument();
    });

    test('renders with custom className', () => {
      render(
        <TestWrapper>
          <MealRecommendations className="custom-class" />
        </TestWrapper>
      );

      const component = screen.getByText('AI Meal Recommendations').closest('div');
      expect(component).toHaveClass('custom-class');
    });

    test('applies height constraints properly', () => {
      render(
        <TestWrapper>
          <MealRecommendations className="h-full w-full max-w-full overflow-hidden" />
        </TestWrapper>
      );

      const component = screen.getByText('AI Meal Recommendations').closest('div');
      expect(component).toHaveClass('h-full', 'w-full', 'max-w-full', 'overflow-hidden');
    });
  });

  describe('API Integration', () => {
    test('calls API to fetch meals on mount', async () => {
      render(
        <TestWrapper>
          <MealRecommendations />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/meals');
      });
    });

    test('handles API call failure gracefully', async () => {
      api.get.mockRejectedValue(new Error('Network error'));

      render(
        <TestWrapper>
          <MealRecommendations />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Failed to fetch meals/)).toBeInTheDocument();
      });
    });

    test('displays loading state initially', () => {
      // Make API call hang to test loading state
      api.get.mockImplementation(() => new Promise(() => {}));

      render(
        <TestWrapper>
          <MealRecommendations />
        </TestWrapper>
      );

      expect(screen.getByText('AI Meal Recommendations')).toBeInTheDocument();
      // Check for loading animation
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });

  describe('Meal Display and Interactions', () => {
    test('displays meal recommendations when data is loaded', async () => {
      render(
        <TestWrapper>
          <MealRecommendations />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Chicken Curry')).toBeInTheDocument();
        expect(screen.getByText('Breakfast Pancakes')).toBeInTheDocument();
      });
    });

    test('respects maxRecommendations prop', async () => {
      render(
        <TestWrapper>
          <MealRecommendations maxRecommendations={1} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Chicken Curry')).toBeInTheDocument();
        expect(screen.queryByText('Breakfast Pancakes')).not.toBeInTheDocument();
      });
    });

    test('shows meal details correctly', async () => {
      render(
        <TestWrapper>
          <MealRecommendations />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('30m')).toBeInTheDocument(); // prep time
        expect(screen.getByText('medium')).toBeInTheDocument(); // difficulty
        expect(screen.getByText('4.5/5')).toBeInTheDocument(); // rating
      });
    });

    test('shows feedback buttons when showFeedback is true', async () => {
      render(
        <TestWrapper>
          <MealRecommendations showFeedback={true} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getAllByTitle('Like')).toHaveLength(2);
        expect(screen.getAllByTitle('Dislike')).toHaveLength(2);
        expect(screen.getAllByTitle('Add to meal plan')).toHaveLength(2);
      });
    });

    test('hides feedback buttons when showFeedback is false', async () => {
      render(
        <TestWrapper>
          <MealRecommendations showFeedback={false} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByTitle('Like')).not.toBeInTheDocument();
        expect(screen.queryByTitle('Dislike')).not.toBeInTheDocument();
        expect(screen.queryByTitle('Add to meal plan')).not.toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    test('handles refresh button click', async () => {
      render(
        <TestWrapper>
          <MealRecommendations />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(1);
      });

      const refreshButton = screen.getByTitle('Refresh recommendations');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(2);
      });
    });

    test('handles add to meal plan button click', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <MealRecommendations showFeedback={true} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Chicken Curry')).toBeInTheDocument();
      });

      const addButton = screen.getAllByTitle('Add to meal plan')[0];
      await user.click(addButton);

      // Should open modal
      await waitFor(() => {
        expect(screen.getByText('Add Chicken Curry to Meal Plan')).toBeInTheDocument();
      });
    });

    test('handles meal plan modal form submission', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <MealRecommendations showFeedback={true} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Chicken Curry')).toBeInTheDocument();
      });

      // Open modal
      const addButton = screen.getAllByTitle('Add to meal plan')[0];
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Add Chicken Curry to Meal Plan')).toBeInTheDocument();
      });

      // Fill form and submit
      const dateInput = screen.getByDisplayValue(new Date().toISOString().split('T')[0]);
      const mealTypeSelect = screen.getByDisplayValue('dinner');
      const submitButton = screen.getByText('Add to Meal Plan');

      await user.click(submitButton);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/meal-plans', expect.objectContaining({
          meal: 'meal1',
          mealType: 'dinner',
          date: expect.any(String)
        }));
      });
    });

    test('handles modal close', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <MealRecommendations showFeedback={true} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Chicken Curry')).toBeInTheDocument();
      });

      // Open modal
      const addButton = screen.getAllByTitle('Add to meal plan')[0];
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Add Chicken Curry to Meal Plan')).toBeInTheDocument();
      });

      // Close modal
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Add Chicken Curry to Meal Plan')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('shows error message when no meals found', async () => {
      api.get.mockResolvedValue({
        data: {
          success: true,
          meals: []
        }
      });

      render(
        <TestWrapper>
          <MealRecommendations />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('No recommendations available yet.')).toBeInTheDocument();
      });
    });

    test('handles meal plan creation failure', async () => {
      const user = userEvent.setup();
      api.post.mockRejectedValue(new Error('Failed to create meal plan'));

      render(
        <TestWrapper>
          <MealRecommendations showFeedback={true} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Chicken Curry')).toBeInTheDocument();
      });

      // Open modal and submit
      const addButton = screen.getAllByTitle('Add to meal plan')[0];
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Add Chicken Curry to Meal Plan')).toBeInTheDocument();
      });

      const submitButton = screen.getByText('Add to Meal Plan');
      await user.click(submitButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText('Failed to add to meal plan. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('Fallback Behavior', () => {
    test('shows fallback context when using existing meals', async () => {
      render(
        <TestWrapper>
          <MealRecommendations />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/⚠️/)).toBeInTheDocument();
        expect(screen.getByText(/Using your existing meals as recommendations/)).toBeInTheDocument();
      });
    });

    test('filters meals by type when mealType prop is provided', async () => {
      const breakfastMeals = mockMeals.filter(meal => meal.mealType === 'breakfast');
      
      render(
        <TestWrapper>
          <MealRecommendations mealType="breakfast" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Breakfast Pancakes')).toBeInTheDocument();
        expect(screen.queryByText('Chicken Curry')).not.toBeInTheDocument();
      });
    });
  });

  describe('Layout and Containment', () => {
    test('applies proper containment styles for overflow prevention', () => {
      render(
        <TestWrapper>
          <MealRecommendations className="overflow-hidden" />
        </TestWrapper>
      );

      const component = screen.getByText('AI Meal Recommendations').closest('div');
      expect(component).toHaveClass('overflow-hidden');
    });

    test('recommendation cards have proper width constraints', async () => {
      render(
        <TestWrapper>
          <MealRecommendations />
        </TestWrapper>
      );

      await waitFor(() => {
        const mealCard = screen.getByText('Chicken Curry').closest('div');
        expect(mealCard).toHaveStyle('maxWidth: 100%');
      });
    });

    test('text truncation works for long meal names', async () => {
      const longNameMeal = {
        ...mockMeals[0],
        name: 'This is a very long meal name that should be truncated to prevent overflow issues in the UI'
      };
      
      api.get.mockResolvedValue({
        data: {
          success: true,
          meals: [longNameMeal]
        }
      });

      render(
        <TestWrapper>
          <MealRecommendations />
        </TestWrapper>
      );

      await waitFor(() => {
        const mealTitle = screen.getByText(longNameMeal.name);
        expect(mealTitle).toHaveClass('truncate');
      });
    });

    test('ingredients list truncates when too many items', async () => {
      const manyIngredientsMeal = {
        ...mockMeals[0],
        ingredients: ['Ingredient 1', 'Ingredient 2', 'Ingredient 3', 'Ingredient 4', 'Ingredient 5']
      };
      
      api.get.mockResolvedValue({
        data: {
          success: true,
          meals: [manyIngredientsMeal]
        }
      });

      render(
        <TestWrapper>
          <MealRecommendations />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Ingredient 1, Ingredient 2/)).toBeInTheDocument();
        expect(screen.getByText(/\+3 more/)).toBeInTheDocument();
      });
    });
  });
}); 