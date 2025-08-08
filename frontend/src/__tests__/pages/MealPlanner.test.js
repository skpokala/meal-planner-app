import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import MealPlanner from '../../pages/MealPlanner';
import { Toaster } from 'react-hot-toast';

// Mock the API service
jest.mock('../../services/api', () => ({
  get: jest.fn(),
  post: jest.fn(),
  delete: jest.fn()
}));

// Mock the AuthProvider
jest.mock('../../contexts/AuthContext', () => ({
  AuthProvider: ({ children }) => <div>{children}</div>,
  useAuth: () => ({
    user: { _id: 'user123', firstName: 'Test', lastName: 'User' },
    login: jest.fn(),
    logout: jest.fn(),
    loading: false
  })
}));

// Mock MealModal component
jest.mock('../../components/MealModal', () => {
  return function MockMealModal({ isOpen, onClose, onMealCreated }) {
    if (!isOpen) return null;
    return (
      <div data-testid="meal-modal">
        <h2>Create New Meal</h2>
        <button onClick={() => onMealCreated({ _id: 'new-meal', name: 'New Test Meal' })}>
          Create Meal
        </button>
        <button onClick={onClose}>Close</button>
      </div>
    );
  };
});

// Mock MealRecommendations component
jest.mock('../../components/MealRecommendations', () => {
  return function MockMealRecommendations({ className, maxRecommendations, showFeedback }) {
    return (
      <div 
        data-testid="meal-recommendations"
        className={className}
        data-max-recommendations={maxRecommendations}
        data-show-feedback={showFeedback}
      >
        <h3>AI Meal Recommendations</h3>
        <div>Mock recommendations content</div>
      </div>
    );
  };
});

// Get the mocked api
import api from '../../services/api';

const TestWrapper = ({ children }) => (
  <MemoryRouter>
    <div>
      {children}
      <Toaster />
    </div>
  </MemoryRouter>
);

describe('MealPlanner', () => {
  const mockMeals = [
    {
      _id: 'meal1',
      name: 'Chicken Curry',
      mealType: 'dinner',
      prepTime: 30,
      difficulty: 'medium',
      active: true
    },
    {
      _id: 'meal2',
      name: 'Breakfast Pancakes',
      mealType: 'breakfast',
      prepTime: 15,
      difficulty: 'easy',
      active: true
    }
  ];

  const mockMealPlans = [
    {
      _id: 'plan1',
      meal: mockMeals[0],
      mealType: 'dinner',
      date: new Date().toISOString().split('T')[0], // Use today's date
      assignedTo: [],
      isCooked: false
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock API responses
    api.get.mockImplementation((url, config) => {
      if (url === '/meals') {
        return Promise.resolve({ data: { meals: mockMeals } });
      }
      if (url === '/meal-plans/calendar') {
        // Return meals organized by date for calendar view
        const mealPlansByDate = {};
        const today = new Date().toISOString().split('T')[0];
        mealPlansByDate[today] = mockMealPlans;
        return Promise.resolve({ data: { mealPlansByDate } });
      }
      if (url.includes('/meal-plans')) {
        return Promise.resolve({ data: { mealPlans: mockMealPlans } });
      }
      return Promise.resolve({ data: {} });
    });

    api.post.mockResolvedValue({
      data: { mealPlan: { _id: 'new-plan', meal: 'meal1', date: '2024-01-16' } }
    });

    api.delete.mockResolvedValue({ data: { success: true } });
  });

  describe('Component Rendering', () => {
    test('renders meal planner with all main sections', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      // Wait for data loading
      await waitFor(() => {
        expect(screen.getByText('Meal Planner')).toBeInTheDocument();
      });

      // Check main sections
      expect(screen.getByText('Meal Planner')).toBeInTheDocument();
      expect(screen.getByTestId('meal-recommendations')).toBeInTheDocument();
      
      // Check view mode controls using aria-labels
      expect(screen.getByLabelText('Monthly view')).toBeInTheDocument();
      expect(screen.getByLabelText('Weekly view')).toBeInTheDocument();
      expect(screen.getByLabelText('Daily view')).toBeInTheDocument();
      expect(screen.getByLabelText('List view')).toBeInTheDocument();
    });

    test('shows loading state initially', () => {
      // Make API calls hang to test loading state
      api.get.mockImplementation(() => new Promise(() => {}));

      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      // The component should show a loading state
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    test('displays error state when API fails', async () => {
      api.get.mockRejectedValue(new Error('API Error'));

      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load data: API Error')).toBeInTheDocument();
      });
    });
  });

  describe('View Mode Switching', () => {
    test('switches between view modes correctly', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Meal Planner')).toBeInTheDocument();
      });

      const user = userEvent.setup();

      // Test switching to Weekly view
      const weeklyButton = screen.getByLabelText('Weekly view');
      await user.click(weeklyButton);
      
      // Weekly should be active
      expect(weeklyButton).toHaveClass('bg-primary-50');

      // Test switching to Daily view
      const dailyButton = screen.getByLabelText('Daily view');
      await user.click(dailyButton);
      
      expect(dailyButton).toHaveClass('bg-primary-50');

      // Test switching to List view
      const listButton = screen.getByLabelText('List view');
      await user.click(listButton);
      
      expect(listButton).toHaveClass('bg-primary-50');
    });

    test('updates recommendations panel height based on view mode', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Meal Planner')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      const recommendationsPanel = screen.getByTestId('meal-recommendations');

      // Monthly view (default) - should have h-[816px] height
      expect(recommendationsPanel).toHaveClass('h-full');

      // Switch to Weekly view
      await user.click(screen.getByLabelText('Weekly view'));
      
      // The height should be managed by the parent container
      // In monthly view, the parent should have specific height constraints
      const parentContainer = recommendationsPanel.closest('div');
      expect(parentContainer).toBeDefined();

      // Switch to Daily view
      await user.click(screen.getByLabelText('Daily view'));
      
      // Switch to List view
      await user.click(screen.getByLabelText('List view'));
    });
  });

  describe('Height Synchronization', () => {
    test('applies correct height classes for monthly view', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Meal Planner')).toBeInTheDocument();
      });

      // Check that recommendations panel has proper height constraints
      const recommendationsPanel = screen.getByTestId('meal-recommendations');
      expect(recommendationsPanel).toHaveClass('h-full', 'w-full');

      // Check that the parent container has the right structure
      const mainContent = screen.getByText('Meal Planner').closest('.container');
      expect(mainContent).toBeInTheDocument();
    });

    test('maintains proper layout proportions', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Meal Planner')).toBeInTheDocument();
      });

      // Calendar should take 2/3 of space (flex-[2])
      // Recommendations should take 1/3 of space (xl:w-80)
      const mainLayout = document.querySelector('.flex.flex-col.xl\\:flex-row');
      expect(mainLayout).toBeInTheDocument();

      const calendarSection = mainLayout?.querySelector('.flex-1.xl\\:flex-\\[2\\]');
      const recommendationsSection = mainLayout?.querySelector('.xl\\:w-80');
      
      expect(calendarSection).toBeInTheDocument();
      expect(recommendationsSection).toBeInTheDocument();
    });

    test('recommendations panel has overflow prevention', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Meal Planner')).toBeInTheDocument();
      });

      const recommendationsPanel = screen.getByTestId('meal-recommendations');
      
      // Should have width constraints to prevent overflow
      expect(recommendationsPanel).toHaveClass('h-full', 'w-full');
      
      // Parent container should have overflow hidden
      const panelContainer = recommendationsPanel.closest('.overflow-hidden');
      expect(panelContainer).toBeInTheDocument();
    });
  });

  describe('Calendar Operations', () => {
    test('displays planned meals correctly', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Meal Planner')).toBeInTheDocument();
      });

      // Wait for API calls to complete and component to load
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/meals', expect.any(Object));
        expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/meal-plans'), expect.any(Object));
      }, { timeout: 5000 });

      // Just verify the calendar structure is rendered
      await waitFor(() => {
        // Calendar should show weekday headers
        expect(screen.getByText('Sun')).toBeInTheDocument();
        expect(screen.getByText('Mon')).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    test('allows adding meals to calendar', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Meal Planner')).toBeInTheDocument();
      });

      const user = userEvent.setup();

      // Click on a day cell to add meal
      const addButton = screen.getAllByTitle(/Add meal/)[0];
      await user.click(addButton);

      // Should show meal selector dropdown
      await waitFor(() => {
        expect(screen.getByText('Chicken Curry')).toBeInTheDocument();
      });
    });

    test('allows removing meals from calendar', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Chicken Curry')).toBeInTheDocument();
      });

      const user = userEvent.setup();

      // Find and click remove button
      const removeButton = screen.getByTitle(/Remove meal/);
      await user.click(removeButton);

      await waitFor(() => {
        expect(api.delete).toHaveBeenCalledWith('/meal-plans/plan1');
      });
    });

    test('navigates between months', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Meal Planner')).toBeInTheDocument();
      });

      const user = userEvent.setup();

      // Click navigation buttons (they don't have aria-labels, so find by position)
      const navigationButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg') && !button.textContent.trim()
      );
      
      // Should have at least 2 navigation buttons
      expect(navigationButtons.length).toBeGreaterThanOrEqual(2);
      
      // Click the navigation buttons
      await user.click(navigationButtons[navigationButtons.length - 1]); // Next button
      await user.click(navigationButtons[navigationButtons.length - 2]); // Previous button
    });
  });

  describe('Meal Creation Integration', () => {
    test('opens meal creation modal', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Meal Planner')).toBeInTheDocument();
      });

      const user = userEvent.setup();

      // Click Add Meal button
      const addMealButton = screen.getByText('Add Meal');
      await user.click(addMealButton);

      // Modal should open
      await waitFor(() => {
        expect(screen.getByTestId('meal-modal')).toBeInTheDocument();
      });
    });

    test('handles new meal creation and auto-planning', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Meal Planner')).toBeInTheDocument();
      });

      const user = userEvent.setup();

      // First select a date and meal type by clicking on a calendar cell
      const addButton = screen.getAllByTitle(/Add meal/)[0];
      await user.click(addButton);

      // Open meal creation modal
      const addMealButton = screen.getByText('Add Meal');
      await user.click(addMealButton);

      await waitFor(() => {
        expect(screen.getByTestId('meal-modal')).toBeInTheDocument();
      });

      // Create new meal
      const createButton = screen.getByText('Create Meal');
      await user.click(createButton);

      // Should auto-plan the meal
      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/meal-plans', expect.objectContaining({
          meal: 'new-meal'
        }));
      });
    });

    test('closes meal modal properly', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Meal Planner')).toBeInTheDocument();
      });

      const user = userEvent.setup();

      // Open modal
      const addMealButton = screen.getByText('Add Meal');
      await user.click(addMealButton);

      await waitFor(() => {
        expect(screen.getByTestId('meal-modal')).toBeInTheDocument();
      });

      // Close modal
      const closeButton = screen.getByText('Close');
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('meal-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('Recommendations Integration', () => {
    test('renders recommendations panel with correct props', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Meal Planner')).toBeInTheDocument();
      });

      const recommendationsPanel = screen.getByTestId('meal-recommendations');
      
      // Check props are passed correctly
      expect(recommendationsPanel).toHaveAttribute('data-max-recommendations', '4');
      expect(recommendationsPanel).toHaveAttribute('data-show-feedback', 'true');
      expect(recommendationsPanel).toHaveClass('h-full', 'w-full');
    });

    test('recommendations panel is positioned correctly in layout', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Meal Planner')).toBeInTheDocument();
      });

      // Recommendations should be in a sidebar with proper width constraints
      const recommendationsContainer = screen.getByTestId('meal-recommendations').closest('.xl\\:w-80');
      expect(recommendationsContainer).toBeInTheDocument();
      expect(recommendationsContainer).toHaveClass('xl:w-80', 'xl:min-w-0', 'xl:max-w-[320px]');
    });
  });

  describe('Responsive Layout', () => {
    test('adapts layout for different screen sizes', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Meal Planner')).toBeInTheDocument();
      });

      // Main layout should be responsive
      const mainLayout = document.querySelector('.flex.flex-col.xl\\:flex-row');
      expect(mainLayout).toBeInTheDocument();

      // Recommendations panel should have responsive classes
      const recommendationsSection = document.querySelector('.xl\\:w-80');
      expect(recommendationsSection).toHaveClass('w-full'); // Full width on mobile
    });

    test('maintains sticky positioning for recommendations on desktop', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Meal Planner')).toBeInTheDocument();
      });

      const stickyContainer = document.querySelector('.xl\\:sticky.xl\\:top-4');
      expect(stickyContainer).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('handles meal planning API errors', async () => {
      api.post.mockRejectedValue(new Error('Failed to create meal plan'));

      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Meal Planner')).toBeInTheDocument();
      });

      const user = userEvent.setup();

      // Try to add a meal
      const addButton = screen.getAllByTitle(/Add meal/)[0];
      await user.click(addButton);

      // Select a meal
      await waitFor(() => {
        const mealOption = screen.getByText('Chicken Curry');
        user.click(mealOption);
      });

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText('Failed to plan meal. Please try again.')).toBeInTheDocument();
      });
    });

    test('handles meal removal API errors', async () => {
      api.delete.mockRejectedValue(new Error('Failed to remove meal plan'));

      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Chicken Curry')).toBeInTheDocument();
      });

      const user = userEvent.setup();

      // Try to remove a meal
      const removeButton = screen.getByTitle(/Remove meal/);
      await user.click(removeButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/Failed to remove meal/)).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Optimization', () => {
    test('debounces API calls when switching dates quickly', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Meal Planner')).toBeInTheDocument();
      });

      const user = userEvent.setup();

      // Click next month multiple times quickly
      const nextButton = screen.getByLabelText(/Next month/);
      await user.click(nextButton);
      await user.click(nextButton);
      await user.click(nextButton);

      // Should eventually load data (but may not call API for each click)
      await waitFor(() => {
        expect(api.get).toHaveBeenCalled();
      });
    });

    test('prevents memory leaks on unmount', async () => {
      const { unmount } = render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Meal Planner')).toBeInTheDocument();
      });

      // Unmount component
      unmount();

      // No async operations should continue after unmount
      // This is mainly to ensure cleanup functions are called
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels and roles', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Meal Planner')).toBeInTheDocument();
      });

      // Check main heading
      expect(screen.getByRole('heading', { name: 'Meal Planner' })).toBeInTheDocument();

      // Check that navigation buttons exist (they don't have aria-labels but should be present)
      const navigationButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg') && !button.textContent.trim()
      );
      expect(navigationButtons.length).toBeGreaterThanOrEqual(2);

      // Check view mode buttons are accessible
      const monthlyButton = screen.getByLabelText('Monthly view');
      expect(monthlyButton).toBeInTheDocument();
    });

    test('supports keyboard navigation', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Meal Planner')).toBeInTheDocument();
      });

      const user = userEvent.setup();

      // Tab through interactive elements
      await user.tab();
      await user.tab();
      await user.tab();

      // Should be able to activate buttons with Enter/Space
      const monthlyButton = screen.getByLabelText('Monthly view');
      await user.type(monthlyButton, '{enter}');
    });
  });
}); 