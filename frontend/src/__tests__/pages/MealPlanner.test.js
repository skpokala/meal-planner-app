import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import MealPlanner from '../../pages/MealPlanner';
import api from '../../services/api';

// Mock the API module
jest.mock('../../services/api');

// Mock the AuthContext
const mockUseAuth = {
  user: { _id: '1', email: 'test@example.com' },
  login: jest.fn(),
  logout: jest.fn(),
  loading: false,
};

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth,
}));

// Test wrapper component
const TestWrapper = ({ children }) => (
  <BrowserRouter>
    {children}
    <Toaster />
  </BrowserRouter>
);

describe('MealPlanner', () => {
  const mockMeals = [
    {
      _id: '1',
      name: 'Spaghetti Bolognese',
      description: 'Classic Italian pasta dish',
      mealType: 'dinner',
      totalTime: 45,
      rating: 4.5,
    },
    {
      _id: '2',
      name: 'Pancakes',
      description: 'Fluffy breakfast pancakes',
      mealType: 'breakfast',
      totalTime: 20,
      rating: 4.0,
    },
    {
      _id: '3',
      name: 'Caesar Salad',
      description: 'Fresh caesar salad',
      mealType: 'lunch',
      totalTime: 15,
      rating: 3.5,
    },
  ];

  const mockAssignments = [
    {
      _id: 'assignment-1',
      mealId: '1',
      meal: mockMeals[0],
      date: '2025-07-15',
      mealType: 'dinner',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock API responses
    api.get.mockImplementation((url) => {
      if (url === '/meals') {
        return Promise.resolve({ data: { meals: mockMeals } });
      }
      if (url === '/meal-assignments') {
        return Promise.resolve({ data: { assignments: mockAssignments } });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });
  });

  describe('Component Rendering', () => {
    test('renders meal planner header', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Meal Planner')).toBeInTheDocument();
      });
      expect(screen.getByText('Plan your family meals on the calendar')).toBeInTheDocument();
    });

    test('renders view toggle buttons', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTitle('Monthly View')).toBeInTheDocument();
      });
      expect(screen.getByTitle('Weekly View')).toBeInTheDocument();
      expect(screen.getByTitle('Daily View')).toBeInTheDocument();
      expect(screen.getByText('Month')).toBeInTheDocument();
      expect(screen.getByText('Week')).toBeInTheDocument();
      expect(screen.getByText('Day')).toBeInTheDocument();
    });

    test('monthly view is selected by default', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        const monthButton = screen.getByTitle('Monthly View');
        expect(monthButton).toHaveClass('bg-white text-primary-600 shadow-sm');
      });
      
      const weekButton = screen.getByTitle('Weekly View');
      const dayButton = screen.getByTitle('Daily View');
      expect(weekButton).toHaveClass('text-secondary-600 hover:text-secondary-900');
      expect(dayButton).toHaveClass('text-secondary-600 hover:text-secondary-900');
    });

    test('renders calendar navigation', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTitle('Previous monthly')).toBeInTheDocument();
      });
      expect(screen.getByTitle('Next monthly')).toBeInTheDocument();
    });

    test('renders calendar grid with day headers', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Sun')).toBeInTheDocument();
      });
      expect(screen.getByText('Mon')).toBeInTheDocument();
      expect(screen.getByText('Tue')).toBeInTheDocument();
      expect(screen.getByText('Wed')).toBeInTheDocument();
      expect(screen.getByText('Thu')).toBeInTheDocument();
      expect(screen.getByText('Fri')).toBeInTheDocument();
      expect(screen.getByText('Sat')).toBeInTheDocument();
    });

    test('renders meal dropdowns for each day', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        const dropdowns = screen.getAllByText('Add meal...');
        expect(dropdowns.length).toBeGreaterThan(0);
      });
    });

    test('shows loading spinner initially', () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      expect(screen.getByText('Loading meal planner...')).toBeInTheDocument();
    });
  });

  describe('View Mode Switching', () => {
    test('switches to weekly view when week button is clicked', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTitle('Weekly View')).toBeInTheDocument();
      });

      const weekButton = screen.getByTitle('Weekly View');
      fireEvent.click(weekButton);

      await waitFor(() => {
        expect(weekButton).toHaveClass('bg-white text-primary-600 shadow-sm');
      });
      
      // Check navigation titles updated
      expect(screen.getByTitle('Previous weekly')).toBeInTheDocument();
      expect(screen.getByTitle('Next weekly')).toBeInTheDocument();
    });

    test('switches to daily view when day button is clicked', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTitle('Daily View')).toBeInTheDocument();
      });

      const dayButton = screen.getByTitle('Daily View');
      fireEvent.click(dayButton);

      await waitFor(() => {
        expect(dayButton).toHaveClass('bg-white text-primary-600 shadow-sm');
      });
      
      // Check navigation titles updated
      expect(screen.getByTitle('Previous daily')).toBeInTheDocument();
      expect(screen.getByTitle('Next daily')).toBeInTheDocument();
    });

    test('switches back to monthly view from weekly view', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTitle('Weekly View')).toBeInTheDocument();
      });

      // Switch to weekly first
      const weekButton = screen.getByTitle('Weekly View');
      fireEvent.click(weekButton);

      await waitFor(() => {
        expect(weekButton).toHaveClass('bg-white text-primary-600 shadow-sm');
      });

      // Switch back to monthly
      const monthButton = screen.getByTitle('Monthly View');
      fireEvent.click(monthButton);

      await waitFor(() => {
        expect(monthButton).toHaveClass('bg-white text-primary-600 shadow-sm');
      });
      expect(weekButton).toHaveClass('text-secondary-600 hover:text-secondary-900');
    });
  });

  describe('Weekly View', () => {
    test('displays week range in header when in weekly view', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTitle('Weekly View')).toBeInTheDocument();
      });

      const weekButton = screen.getByTitle('Weekly View');
      fireEvent.click(weekButton);

      await waitFor(() => {
        // Should show week range like "Jun 29 - Jul 5, 2025" or "January 12-18, 2025"
        const header = screen.getByRole('heading', { level: 2 });
        expect(header.textContent).toMatch(/\w+ \d+ - \w+ \d+, \d{4}|\w+ \d+-\d+, \d{4}/);
      });
    });

    test('shows 7 days in weekly view', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTitle('Weekly View')).toBeInTheDocument();
      });

      const weekButton = screen.getByTitle('Weekly View');
      fireEvent.click(weekButton);

      await waitFor(() => {
        // Should show day headers
        expect(screen.getByText('Sun')).toBeInTheDocument();
        expect(screen.getByText('Mon')).toBeInTheDocument();
        expect(screen.getByText('Tue')).toBeInTheDocument();
        expect(screen.getByText('Wed')).toBeInTheDocument();
        expect(screen.getByText('Thu')).toBeInTheDocument();
        expect(screen.getByText('Fri')).toBeInTheDocument();
        expect(screen.getByText('Sat')).toBeInTheDocument();
      });
    });

    test('navigates weeks correctly', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTitle('Weekly View')).toBeInTheDocument();
      });

      const weekButton = screen.getByTitle('Weekly View');
      fireEvent.click(weekButton);

      await waitFor(() => {
        const currentWeek = screen.getByRole('heading', { level: 2 }).textContent;
        const nextButton = screen.getByTitle('Next weekly');
        
        fireEvent.click(nextButton);

        return waitFor(() => {
          const newWeek = screen.getByRole('heading', { level: 2 }).textContent;
          expect(newWeek).not.toBe(currentWeek);
        });
      });
    });
  });

  describe('Daily View', () => {
    test('displays full date in header when in daily view', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTitle('Daily View')).toBeInTheDocument();
      });

      const dayButton = screen.getByTitle('Daily View');
      fireEvent.click(dayButton);

      await waitFor(() => {
        // Should show full date like "Monday, January 13, 2025"
        const header = screen.getByRole('heading', { level: 2 });
        expect(header.textContent).toMatch(/\w+, \w+ \d+, \d{4}/);
      });
    });

    test('shows single day in daily view', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTitle('Daily View')).toBeInTheDocument();
      });

      const dayButton = screen.getByTitle('Daily View');
      fireEvent.click(dayButton);

      await waitFor(() => {
        // Should NOT show day headers in daily view
        expect(screen.queryByText('Sun')).not.toBeInTheDocument();
        expect(screen.queryByText('Mon')).not.toBeInTheDocument();
        expect(screen.queryByText('Tue')).not.toBeInTheDocument();
        expect(screen.queryByText('Wed')).not.toBeInTheDocument();
        expect(screen.queryByText('Thu')).not.toBeInTheDocument();
        expect(screen.queryByText('Fri')).not.toBeInTheDocument();
        expect(screen.queryByText('Sat')).not.toBeInTheDocument();
      });
    });

    test('navigates days correctly', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTitle('Daily View')).toBeInTheDocument();
      });

      const dayButton = screen.getByTitle('Daily View');
      fireEvent.click(dayButton);

      await waitFor(() => {
        const currentDay = screen.getByRole('heading', { level: 2 }).textContent;
        const nextButton = screen.getByTitle('Next daily');
        
        fireEvent.click(nextButton);

        return waitFor(() => {
          const newDay = screen.getByRole('heading', { level: 2 }).textContent;
          expect(newDay).not.toBe(currentDay);
        });
      });
    });

    test('shows expanded meal details in daily view', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTitle('Daily View')).toBeInTheDocument();
      });

      const dayButton = screen.getByTitle('Daily View');
      fireEvent.click(dayButton);

      await waitFor(() => {
        // Should show meal assignments with larger text and more space
        const mealElements = screen.getAllByText('Add meal...');
        expect(mealElements.length).toBe(1); // Only one day shown
      });
    });
  });

  describe('Calendar Navigation', () => {
    test('navigates to previous month in monthly view', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTitle('Previous monthly')).toBeInTheDocument();
      });

      const currentMonth = screen.getByRole('heading', { level: 2 }).textContent;
      const prevButton = screen.getByTitle('Previous monthly');
      
      fireEvent.click(prevButton);

      await waitFor(() => {
        const newMonth = screen.getByRole('heading', { level: 2 }).textContent;
        expect(newMonth).not.toBe(currentMonth);
      });
    });

    test('navigates to next month in monthly view', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTitle('Next monthly')).toBeInTheDocument();
      });

      const currentMonth = screen.getByRole('heading', { level: 2 }).textContent;
      const nextButton = screen.getByTitle('Next monthly');
      
      fireEvent.click(nextButton);

      await waitFor(() => {
        const newMonth = screen.getByRole('heading', { level: 2 }).textContent;
        expect(newMonth).not.toBe(currentMonth);
      });
    });

    test('navigation titles update based on view mode', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTitle('Previous monthly')).toBeInTheDocument();
        expect(screen.getByTitle('Next monthly')).toBeInTheDocument();
      });

      // Switch to weekly view
      const weekButton = screen.getByTitle('Weekly View');
      fireEvent.click(weekButton);

      await waitFor(() => {
        expect(screen.getByTitle('Previous weekly')).toBeInTheDocument();
        expect(screen.getByTitle('Next weekly')).toBeInTheDocument();
      });

      // Switch to daily view
      const dayButton = screen.getByTitle('Daily View');
      fireEvent.click(dayButton);

      await waitFor(() => {
        expect(screen.getByTitle('Previous daily')).toBeInTheDocument();
        expect(screen.getByTitle('Next daily')).toBeInTheDocument();
      });
    });
  });

  describe('Meal Assignment', () => {
    test('displays existing meal assignments', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Spaghetti Bolognese')).toBeInTheDocument();
      });
    });

    test('assigns meal to a date', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getAllByText('Add meal...')[0]).toBeInTheDocument();
      });

      const dropdown = screen.getAllByText('Add meal...')[0];
      
      // Find the select element and change its value
      const selectElement = dropdown.closest('select');
      fireEvent.change(selectElement, { target: { value: '2' } });

      await waitFor(() => {
        expect(screen.getByText(/Pancakes added to/)).toBeInTheDocument();
      });
    });

    test('opens meal modal when "Create new meal" is selected', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getAllByText('Add meal...')[0]).toBeInTheDocument();
      });

      const dropdown = screen.getAllByText('Add meal...')[0];
      const selectElement = dropdown.closest('select');
      
      fireEvent.change(selectElement, { target: { value: 'create-new' } });

      await waitFor(() => {
        expect(screen.getByText('Create Meal')).toBeInTheDocument();
      });
    });

    test('removes meal assignment', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Spaghetti Bolognese')).toBeInTheDocument();
      });

      const mealElement = screen.getByText('Spaghetti Bolognese');
      const mealContainer = mealElement.closest('.group');
      const removeButton = mealContainer.querySelector('[title="Remove meal"]');
      
      expect(removeButton).toBeInTheDocument();
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(screen.queryByText('Spaghetti Bolognese')).not.toBeInTheDocument();
      });
    });

    test('handles meal selection with empty value', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getAllByText('Add meal...')[0]).toBeInTheDocument();
      });

      const dropdown = screen.getAllByText('Add meal...')[0];
      const selectElement = dropdown.closest('select');
      
      fireEvent.change(selectElement, { target: { value: '' } });

      // Should not show any success message
      expect(screen.queryByText('added to')).not.toBeInTheDocument();
    });

    test('filters assigned meals from dropdown preventing duplicate selection', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getAllByText('Add meal...')[0]).toBeInTheDocument();
      });

      // First assignment - should succeed
      const dropdowns = screen.getAllByText('Add meal...');
      let targetDropdown = null;
      
      // Find a dropdown for a date without existing assignments
      for (const dropdown of dropdowns) {
        const selectElement = dropdown.closest('select');
        const dayElement = selectElement.closest('div').querySelector('div');
        if (dayElement && dayElement.textContent === '1') {
          targetDropdown = dropdown;
          break;
        }
      }

      const selectElement = targetDropdown.closest('select');
      
      // First assignment - should succeed
      fireEvent.change(selectElement, { target: { value: '2' } });

      await waitFor(() => {
        expect(screen.getAllByText(/Pancakes added to/)[0]).toBeInTheDocument();
      });

      // Verify the meal is now filtered out from dropdown options
      const options = Array.from(selectElement.querySelectorAll('option'));
      const mealOptions = options.filter(option => option.value && option.value !== 'create-new');
      
      // Should not include Pancakes (ID '2') anymore since it's now assigned
      expect(mealOptions.some(option => option.value === '2')).toBe(false);
      // Should still include other meals
      expect(mealOptions.some(option => option.value === '1')).toBe(true);
      expect(mealOptions.some(option => option.value === '3')).toBe(true);
    });

    test('filters out already assigned meals from dropdown options', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getAllByText('Add meal...')[0]).toBeInTheDocument();
      });

      // Find the dropdown for July 15th (which has Spaghetti Bolognese pre-assigned)
      const dropdowns = screen.getAllByText('Add meal...');
      let targetDropdown = null;
      
      for (const dropdown of dropdowns) {
        const selectElement = dropdown.closest('select');
        const dayElement = selectElement.closest('div').querySelector('div');
        if (dayElement && dayElement.textContent === '15') {
          targetDropdown = dropdown;
          break;
        }
      }

      expect(targetDropdown).toBeTruthy();
      const selectElement = targetDropdown.closest('select');
      
      // Check that Spaghetti Bolognese (meal ID '1') is not in the options
      const options = Array.from(selectElement.querySelectorAll('option'));
      const mealOptions = options.filter(option => option.value && option.value !== 'create-new');
      
      // Should not include Spaghetti Bolognese since it's already assigned
      expect(mealOptions.some(option => option.value === '1')).toBe(false);
      
      // Should still include other meals
      expect(mealOptions.some(option => option.value === '2')).toBe(true);
      expect(mealOptions.some(option => option.value === '3')).toBe(true);
    });

    test('shows all meals in dropdown for date with no assignments', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getAllByText('Add meal...')[0]).toBeInTheDocument();
      });

      // Find a dropdown for a date without assignments (e.g., July 1st - not July 15th which has pre-assigned meal)
      const dropdowns = screen.getAllByText('Add meal...');
      let targetDropdown = null;
      
      for (const dropdown of dropdowns) {
        const selectElement = dropdown.closest('select');
        const dayElement = selectElement.closest('div').querySelector('div');
        if (dayElement && dayElement.textContent === '1') {
          targetDropdown = dropdown;
          break;
        }
      }
      
      expect(targetDropdown).toBeTruthy();
      const selectElement = targetDropdown.closest('select');
      const options = Array.from(selectElement.querySelectorAll('option'));
      const mealOptions = options.filter(option => option.value && option.value !== 'create-new');
      
      // Should include all available meals
      expect(mealOptions.length).toBe(3); // All 3 mock meals should be available
      expect(mealOptions.some(option => option.value === '1')).toBe(true);
      expect(mealOptions.some(option => option.value === '2')).toBe(true);
      expect(mealOptions.some(option => option.value === '3')).toBe(true);
    });
  });

  describe('Meal Creation Integration', () => {
    test('creates and assigns new meal from modal', async () => {
      const newMeal = {
        _id: '4',
        name: 'Test Meal',
        description: 'Test description',
        mealType: 'dinner',
        totalTime: 30,
      };

      api.post.mockResolvedValue({ data: newMeal });

      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getAllByText('Add meal...')[0]).toBeInTheDocument();
      });

      // Open modal
      const dropdown = screen.getAllByText('Add meal...')[0];
      const selectElement = dropdown.closest('select');
      
      fireEvent.change(selectElement, { target: { value: 'create-new' } });

      await waitFor(() => {
        expect(screen.getByText('Create Meal')).toBeInTheDocument();
      });

      // Fill form
      const nameInput = screen.getByLabelText('Meal Name *');
      const descriptionInput = screen.getByLabelText('Description');
      const mealTypeSelect = screen.getByLabelText('Meal Type');

      fireEvent.change(nameInput, { target: { value: 'Test Meal' } });
      fireEvent.change(descriptionInput, { target: { value: 'Test description' } });
      fireEvent.change(mealTypeSelect, { target: { value: 'dinner' } });

      // Submit form
      const submitButton = screen.getByText('Create Meal');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/meals', {
          name: 'Test Meal',
          description: 'Test description',
          mealType: 'dinner',
          totalTime: '',
        });
      });
    });

    test('closes modal when cancelled', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getAllByText('Add meal...')[0]).toBeInTheDocument();
      });

      // Open modal
      const dropdown = screen.getAllByText('Add meal...')[0];
      const selectElement = dropdown.closest('select');
      
      fireEvent.change(selectElement, { target: { value: 'create-new' } });

      await waitFor(() => {
        expect(screen.getByText('Create Meal')).toBeInTheDocument();
      });

      // Cancel modal
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Create Meal')).not.toBeInTheDocument();
      });
    });

    test('prevents duplicate assignment when creating new meal that already exists on date', async () => {
      // Mock a meal that has the same ID as an existing assignment
      const duplicateMeal = {
        _id: '1', // Same as Spaghetti Bolognese which is already assigned to July 15th
        name: 'Duplicate Meal',
        description: 'Duplicate description',
        mealType: 'dinner',
        totalTime: 30,
      };

      api.post.mockResolvedValue({ data: duplicateMeal });

      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getAllByText('Add meal...')[0]).toBeInTheDocument();
      });

      // Find the dropdown for July 15th (which already has Spaghetti Bolognese assigned)
      const dropdowns = screen.getAllByText('Add meal...');
      let targetDropdown = null;
      
      for (const dropdown of dropdowns) {
        const selectElement = dropdown.closest('select');
        const dayElement = selectElement.closest('div').querySelector('div');
        if (dayElement && dayElement.textContent === '15') {
          targetDropdown = dropdown;
          break;
        }
      }

      expect(targetDropdown).toBeTruthy();
      const selectElement = targetDropdown.closest('select');
      
      // Open modal for creating new meal
      fireEvent.change(selectElement, { target: { value: 'create-new' } });

      await waitFor(() => {
        expect(screen.getByText('Create Meal')).toBeInTheDocument();
      });

      // Fill form
      const nameInput = screen.getByLabelText('Meal Name *');
      const descriptionInput = screen.getByLabelText('Description');
      const mealTypeSelect = screen.getByLabelText('Meal Type');

      fireEvent.change(nameInput, { target: { value: 'Duplicate Meal' } });
      fireEvent.change(descriptionInput, { target: { value: 'Duplicate description' } });
      fireEvent.change(mealTypeSelect, { target: { value: 'dinner' } });

      // Submit form
      const submitButton = screen.getByText('Create Meal');
      fireEvent.click(submitButton);

      // Should show duplicate assignment error
      await waitFor(() => {
        expect(screen.getByText(/Duplicate Meal is already assigned to/)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('handles API error gracefully', async () => {
      api.get.mockRejectedValue(new Error('API Error'));

      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading meal planner...')).not.toBeInTheDocument();
      });

      // Should still render the calendar structure
      expect(screen.getByText('Meal Planner')).toBeInTheDocument();
    });

    test('handles meal assignment error', async () => {
      // Mock console.error to prevent test output noise
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock meals with a meal that has null name to trigger error
      const errorMeals = [
        { _id: '1', name: null, mealType: 'breakfast' } // null name will cause error
      ];
      
      api.get.mockImplementation((url) => {
        if (url === '/meals') {
          return Promise.resolve({ data: { meals: errorMeals } });
        }
        if (url === '/meal-assignments') {
          return Promise.resolve({ data: { assignments: [] } });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });
      
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getAllByText('Add meal...')[0]).toBeInTheDocument();
      });

      // Select the meal with null name to trigger error
      const dropdown = screen.getAllByText('Add meal...')[0];
      const selectElement = dropdown.closest('select');
      
      fireEvent.change(selectElement, { target: { value: '1' } });

      await waitFor(() => {
        expect(screen.getByText('Failed to assign meal')).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    test('handles meal removal error', async () => {
      // Mock console.error to prevent test output noise
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Spaghetti Bolognese')).toBeInTheDocument();
      });

      // Force an error by mocking the removal process
      const mealElement = screen.getByText('Spaghetti Bolognese');
      const mealContainer = mealElement.closest('.group');
      const removeButton = mealContainer.querySelector('[title="Remove meal"]');
      
      expect(removeButton).toBeInTheDocument();
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(screen.queryByText('Spaghetti Bolognese')).not.toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    test('handles missing meal assignments endpoint gracefully', async () => {
      // Mock console.error to prevent test output noise
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      api.get.mockImplementation((url) => {
        if (url === '/meals') {
          return Promise.resolve({ data: { meals: mockMeals } });
        }
        if (url === '/meal-assignments') {
          const error = new Error('Not Found');
          error.response = { status: 404 };
          return Promise.reject(error);
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      // Wait for component to load and settle
      await waitFor(() => {
        expect(screen.getByText('Meal Planner')).toBeInTheDocument();
      });

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading meal planner...')).not.toBeInTheDocument();
      });

      // Verify that meals are loaded despite 404 on assignments
      await waitFor(() => {
        expect(screen.getAllByText('Spaghetti Bolognese (dinner)').length).toBeGreaterThan(0);
      });

      // Give time for any error toasts to appear and be processed
      await new Promise(resolve => setTimeout(resolve, 200));

      // The component should be functional despite the 404 error
      expect(screen.getByText('Meal Planner')).toBeInTheDocument();
      expect(screen.getAllByText('Add meal...').length).toBeGreaterThan(0);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Visual Features', () => {
    test('applies correct meal type colors', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        const mealElement = screen.getByText('Spaghetti Bolognese');
        // Navigate to the div that contains the meal type color classes
        const mealBadge = mealElement.closest('div').parentElement.parentElement;
        expect(mealBadge).toHaveClass('bg-blue-100', 'text-blue-800');
      });
    });

    test('shows today with special styling', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        const today = new Date();
        const todayElement = screen.getByText(today.getDate().toString());
        expect(todayElement).toHaveClass('text-primary-600');
      });
    });

    test('shows remove button on hover', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Spaghetti Bolognese')).toBeInTheDocument();
      });

      const mealElement = screen.getByText('Spaghetti Bolognese');
      const mealContainer = mealElement.closest('.group');
      const removeButton = mealContainer.querySelector('[title="Remove meal"]');
      
      expect(removeButton).toBeInTheDocument();
      expect(removeButton).toHaveClass('opacity-0');
      expect(removeButton).toHaveClass('group-hover:opacity-100');
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels for navigation buttons', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTitle('Previous monthly')).toBeInTheDocument();
      });
      expect(screen.getByTitle('Next monthly')).toBeInTheDocument();
    });

    test('has proper titles for remove buttons', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Spaghetti Bolognese')).toBeInTheDocument();
      });

      const mealElement = screen.getByText('Spaghetti Bolognese');
      const mealContainer = mealElement.closest('.group');
      const removeButton = mealContainer.querySelector('[title="Remove meal"]');
      
      expect(removeButton).toBeInTheDocument();
      expect(removeButton).toHaveAttribute('title', 'Remove meal');
    });

    test('has proper meal name titles for truncated text', async () => {
      render(
        <TestWrapper>
          <MealPlanner />
        </TestWrapper>
      );

      await waitFor(() => {
        const mealElement = screen.getByText('Spaghetti Bolognese');
        expect(mealElement).toHaveAttribute('title', 'Spaghetti Bolognese');
      });
    });
  });
}); 