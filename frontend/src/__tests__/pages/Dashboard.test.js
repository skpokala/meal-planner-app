import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Dashboard from '../../pages/Dashboard';
import api from '../../services/api';

// Mock dependencies
jest.mock('../../services/api');
jest.mock('react-hot-toast');
jest.mock('../../components/MealModal', () => {
  return function MockMealModal({ isOpen, onClose, onMealCreated }) {
    if (!isOpen) return null;
    return (
      <div data-testid="meal-modal">
        <button onClick={onClose}>Close Modal</button>
        <button onClick={() => onMealCreated({ _id: 'new-meal', name: 'New Meal' })}>
          Create Meal
        </button>
      </div>
    );
  };
});

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock data
const mockStats = {
  overview: {
    totalMeals: 25,
    plannedMeals: 15,
    cookedMeals: 10
  }
};

const mockMeals = [
  {
    _id: '1',
    name: 'Spaghetti Bolognese',
    description: 'Classic Italian pasta',
    mealType: 'dinner',
    date: '2023-12-01',
    totalTime: 45,
    rating: 4.5
  },
  {
    _id: '2',
    name: 'Pancakes',
    description: 'Fluffy breakfast pancakes',
    mealType: 'breakfast',
    date: '2023-12-02',
    totalTime: 20,
    rating: 4.0
  }
];

const mockFamilyMembers = [
  {
    _id: '1',
    firstName: 'John',
    lastName: 'Doe',
    relationship: 'self'
  },
  {
    _id: '2',
    firstName: 'Jane',
    lastName: 'Doe',
    relationship: 'spouse'
  }
];

const renderDashboard = () => {
  return render(
    <BrowserRouter>
      <Dashboard />
    </BrowserRouter>
  );
};

describe('Dashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url === '/family-members') {
        return Promise.resolve({ data: { count: 2, familyMembers: mockFamilyMembers } });
      }
      if (url === '/meals/stats/overview') {
        return Promise.resolve({ data: { stats: mockStats } });
      }
      if (url === '/meals?limit=5') {
        return Promise.resolve({ data: { meals: mockMeals } });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });
  });

  describe('Rendering', () => {
    it('renders the welcome section', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByText('Welcome back!')).toBeInTheDocument();
        expect(screen.getByText('Here\'s an overview of your family\'s meal planning activities.')).toBeInTheDocument();
      });
    });

    it('shows loading spinner initially', () => {
      renderDashboard();
      expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
    });

    it('renders all stat cards after loading', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByText('Family Members')).toBeInTheDocument();
        expect(screen.getByText('Total Meals')).toBeInTheDocument();
        expect(screen.getByText('Planned Meals')).toBeInTheDocument();
        
        // Verify Cooked Meals card is NOT present
        expect(screen.queryByText('Cooked Meals')).not.toBeInTheDocument();
      });
    });

    it('displays correct stat values', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument(); // Family Members count
        expect(screen.getByText('25')).toBeInTheDocument(); // Total Meals
        expect(screen.getByText('15')).toBeInTheDocument(); // Planned Meals
      });
    });

    it('renders recent meals section', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByText('Recent Meals')).toBeInTheDocument();
        expect(screen.getByText('Spaghetti Bolognese')).toBeInTheDocument();
        expect(screen.getByText('Pancakes')).toBeInTheDocument();
      });
    });

    it('renders quick actions section', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByText('Quick Actions')).toBeInTheDocument();
        expect(screen.getByText('Manage Family Members')).toBeInTheDocument();
        expect(screen.getByText('Plan Meals')).toBeInTheDocument();
        expect(screen.getByText('View Settings')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('navigates to family members when Family Members card is clicked', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByText('Family Members')).toBeInTheDocument();
      });
      
      const familyMembersCard = screen.getByText('Family Members').closest('div.card');
      fireEvent.click(familyMembersCard);
      
      expect(mockNavigate).toHaveBeenCalledWith('/family-members');
    });

    it('navigates to meals page when Total Meals card is clicked', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByText('Total Meals')).toBeInTheDocument();
      });
      
      const totalMealsCard = screen.getByText('Total Meals').closest('div.card');
      fireEvent.click(totalMealsCard);
      
      expect(mockNavigate).toHaveBeenCalledWith('/meals');
    });

    it('navigates to meal planner when Planned Meals card is clicked', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByText('Planned Meals')).toBeInTheDocument();
      });
      
      const plannedMealsCard = screen.getByText('Planned Meals').closest('div.card');
      fireEvent.click(plannedMealsCard);
      
      expect(mockNavigate).toHaveBeenCalledWith('/meal-planner');
    });

    it('opens meal modal when Add Meal button is clicked', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByText('Add Meal')).toBeInTheDocument();
      });
      
      const addMealButton = screen.getByText('Add Meal');
      fireEvent.click(addMealButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('meal-modal')).toBeInTheDocument();
      });
    });

    it('navigates to family members from quick actions', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByText('Manage Family Members')).toBeInTheDocument();
      });
      
      const manageButton = screen.getByText('Manage Family Members').closest('button');
      fireEvent.click(manageButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/family-members');
    });

    it('navigates to meal planner from quick actions', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByText('Plan Meals')).toBeInTheDocument();
      });
      
      const planButton = screen.getByText('Plan Meals').closest('button');
      fireEvent.click(planButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/meal-planner');
    });

    it('navigates to settings from quick actions', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByText('View Settings')).toBeInTheDocument();
      });
      
      const settingsButton = screen.getByText('View Settings').closest('button');
      fireEvent.click(settingsButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/settings');
    });
  });

  describe('Meal Modal', () => {
    it('opens and closes meal modal correctly', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByText('Add Meal')).toBeInTheDocument();
      });
      
      // Open modal
      const addMealButton = screen.getByText('Add Meal');
      fireEvent.click(addMealButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('meal-modal')).toBeInTheDocument();
      });
      
      // Close modal
      const closeButton = screen.getByText('Close Modal');
      fireEvent.click(closeButton);
      
      await waitFor(() => {
        expect(screen.queryByTestId('meal-modal')).not.toBeInTheDocument();
      });
    });

    it('creates meal and refreshes dashboard data', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByText('Add Meal')).toBeInTheDocument();
      });
      
      // Open modal
      const addMealButton = screen.getByText('Add Meal');
      fireEvent.click(addMealButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('meal-modal')).toBeInTheDocument();
      });
      
      // Create meal
      const createButton = screen.getByText('Create Meal');
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Meal created successfully!');
        expect(screen.queryByTestId('meal-modal')).not.toBeInTheDocument();
      });
      
      // Verify dashboard data refresh
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(6); // 3 initial + 3 refresh calls
      });
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no meals exist', async () => {
      // Mock empty meals response
      api.get.mockImplementation((url) => {
        if (url === '/family-members') {
          return Promise.resolve({ data: { count: 2, familyMembers: mockFamilyMembers } });
        }
        if (url === '/meals/stats/overview') {
          return Promise.resolve({ data: { stats: { overview: { totalMeals: 0, plannedMeals: 0, cookedMeals: 0 } } } });
        }
        if (url === '/meals?limit=5') {
          return Promise.resolve({ data: { meals: [] } });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });
      
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByText('No meals planned yet')).toBeInTheDocument();
        expect(screen.getByText('Plan Your First Meal')).toBeInTheDocument();
      });
      
      const planButton = screen.getByText('Plan Your First Meal');
      fireEvent.click(planButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('meal-modal')).toBeInTheDocument();
      });
    });
  });

  describe('Grid Layout', () => {
    it('renders stat cards in a 3-column grid on large screens', async () => {
      renderDashboard();
      
      await waitFor(() => {
        const statsGrid = screen.getByText('Family Members').closest('.card').parentElement;
        expect(statsGrid).toHaveClass('lg:grid-cols-3');
      });
    });

    it('renders exactly 3 stat cards', async () => {
      renderDashboard();
      
      await waitFor(() => {
        const statCards = document.querySelectorAll('.card.cursor-pointer');
        expect(statCards).toHaveLength(3);
      });
    });
  });

  describe('Recent Meals Display', () => {
    it('displays meal details correctly', async () => {
      renderDashboard();
      
      await waitFor(() => {
        // Check meal names
        expect(screen.getByText('Spaghetti Bolognese')).toBeInTheDocument();
        expect(screen.getByText('Pancakes')).toBeInTheDocument();
        
        // Check meal types
        expect(screen.getByText('dinner')).toBeInTheDocument();
        expect(screen.getByText('breakfast')).toBeInTheDocument();
        
        // Check ratings
        expect(screen.getByText('4.5')).toBeInTheDocument();
        expect(screen.getByText('4')).toBeInTheDocument();
        
        // Check timing
        expect(screen.getByText('45m')).toBeInTheDocument();
        expect(screen.getByText('20m')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles API error when fetching dashboard data', async () => {
      api.get.mockRejectedValue(new Error('API Error'));
      
      renderDashboard();
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to load dashboard data');
      });
    });

    it('handles partial API failures gracefully', async () => {
      api.get.mockImplementation((url) => {
        if (url === '/family-members') {
          return Promise.resolve({ data: { count: 2, familyMembers: mockFamilyMembers } });
        }
        if (url === '/meals/stats/overview') {
          return Promise.reject(new Error('Stats failed'));
        }
        if (url === '/meals?limit=5') {
          return Promise.resolve({ data: { meals: mockMeals } });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });
      
      renderDashboard();
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to load dashboard data');
      });
    });
  });

  describe('Data Formatting', () => {
    it('formats dates correctly', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByText('Recent Meals')).toBeInTheDocument();
        // The dates should be formatted as "Dec 1, 2023" and "Dec 2, 2023"
        // But since we're using ISO date strings, they should be formatted correctly
        expect(screen.getByText(/Dec \d+, \d{4}/)).toBeInTheDocument();
      });
    });

    it('applies correct meal type colors', async () => {
      renderDashboard();
      
      await waitFor(() => {
        const dinnerBadge = screen.getByText('dinner');
        expect(dinnerBadge).toHaveClass('bg-blue-100', 'text-blue-800');
        
        const breakfastBadge = screen.getByText('breakfast');
        expect(breakfastBadge).toHaveClass('bg-yellow-100', 'text-yellow-800');
      });
    });

    it('handles invalid dates gracefully', async () => {
      // Mock meals with invalid dates
      const mockMealsWithInvalidDates = [
        {
          _id: '1',
          name: 'Test Meal',
          mealType: 'dinner',
          date: 'invalid-date',
          totalTime: 30,
          rating: 4.0
        }
      ];
      
      api.get.mockImplementation((url) => {
        if (url === '/family-members') {
          return Promise.resolve({ data: { count: 2, familyMembers: mockFamilyMembers } });
        }
        if (url === '/meals/stats/overview') {
          return Promise.resolve({ data: { stats: mockStats } });
        }
        if (url === '/meals?limit=5') {
          return Promise.resolve({ data: { meals: mockMealsWithInvalidDates } });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });
      
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByText('Test Meal')).toBeInTheDocument();
        expect(screen.getByText('Invalid date')).toBeInTheDocument();
      });
    });
  });
}); 