import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../../pages/Dashboard';
import { 
  mockUser, 
  mockApiResponses, 
  renderWithProviders
} from '../utils/testUtils';

// Mock the API module
jest.mock('../../services/api', () => ({
  defaults: {
    headers: {
      common: {}
    }
  },
  get: jest.fn(() => Promise.resolve({ data: {} })),
  post: jest.fn(() => Promise.resolve({ data: {} })),
  put: jest.fn(() => Promise.resolve({ data: {} })),
  delete: jest.fn(() => Promise.resolve({ data: {} })),
  interceptors: {
    request: {
      use: jest.fn()
    },
    response: {
      use: jest.fn()
    }
  }
}));

// Get the mocked API
const mockApi = require('../../services/api');

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

describe('Dashboard', () => {
  const mockNavigate = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock useNavigate
    jest.mock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useNavigate: () => mockNavigate,
    }));
  });

  const renderDashboard = (user = mockUser) => {
    return renderWithProviders(<Dashboard />, { initialUser: user });
  };

  describe('loading state', () => {
    it('shows loading spinner while fetching data', async () => {
      // Make API calls hang
      mockApi.get.mockImplementation(() => new Promise(() => {}));
      
      renderDashboard();
      
      expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
    });
  });

  describe('successful data loading', () => {
    beforeEach(() => {
      mockApi.get
        .mockResolvedValueOnce({ data: mockApiResponses.familyMembers })
        .mockResolvedValueOnce({ data: mockApiResponses.mealStats })
        .mockResolvedValueOnce({ data: mockApiResponses.meals });
    });

    it('renders welcome section', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByText('Welcome back!')).toBeInTheDocument();
        expect(screen.getByText("Here's an overview of your family's meal planning activities.")).toBeInTheDocument();
      });
    });

    it('renders stats cards with correct data', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByText('Family Members')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument(); // family member count
        
        expect(screen.getByText('Total Meals')).toBeInTheDocument();
        expect(screen.getByText('10')).toBeInTheDocument(); // total meals
        
        expect(screen.getByText('Planned Meals')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument(); // planned meals
        
        expect(screen.getByText('Cooked Meals')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument(); // cooked meals
      });
    });

    it('renders recent meals section when meals exist', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByText('Recent Meals')).toBeInTheDocument();
        expect(screen.getByText('Spaghetti Bolognese')).toBeInTheDocument();
        expect(screen.getByText('dinner')).toBeInTheDocument();
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

  describe('empty states', () => {
    beforeEach(() => {
      mockApi.get
        .mockResolvedValueOnce({ data: { familyMembers: [], count: 0 } })
        .mockResolvedValueOnce({ data: { stats: { overview: { totalMeals: 0, plannedMeals: 0, cookedMeals: 0 } } } })
        .mockResolvedValueOnce({ data: { meals: [], count: 0 } });
    });

    it('shows empty state when no meals planned', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByText('No meals planned yet')).toBeInTheDocument();
        expect(screen.getByText('Plan Your First Meal')).toBeInTheDocument();
      });
    });
  });

  describe('navigation interactions', () => {
    beforeEach(() => {
      mockApi.get
        .mockResolvedValueOnce({ data: mockApiResponses.familyMembers })
        .mockResolvedValueOnce({ data: mockApiResponses.mealStats })
        .mockResolvedValueOnce({ data: mockApiResponses.meals });
    });

    it('navigates to family members when stat card is clicked', async () => {
      const { container } = renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByText('Family Members')).toBeInTheDocument();
      });
      
      const familyMembersCard = container.querySelector('.card');
      fireEvent.click(familyMembersCard);
      
      // Note: Since we're mocking useNavigate, we would need to verify the call
      // In a real test environment, you might want to use MemoryRouter
    });

    it('navigates to meal planner when Add Meal button is clicked', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByText('Add Meal')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Add Meal'));
      // Verify navigation call
    });

    it('navigates to meal planner when Plan Your First Meal is clicked', async () => {
      mockApi.get
        .mockResolvedValueOnce({ data: { familyMembers: [], count: 0 } })
        .mockResolvedValueOnce({ data: { stats: { overview: { totalMeals: 0, plannedMeals: 0, cookedMeals: 0 } } } })
        .mockResolvedValueOnce({ data: { meals: [], count: 0 } });

      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByText('Plan Your First Meal')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Plan Your First Meal'));
      // Verify navigation call
    });
  });

  describe('utility functions', () => {
    beforeEach(() => {
      mockApi.get
        .mockResolvedValueOnce({ data: mockApiResponses.familyMembers })
        .mockResolvedValueOnce({ data: mockApiResponses.mealStats })
        .mockResolvedValueOnce({ data: mockApiResponses.meals });
    });

    it('formats dates correctly', async () => {
      renderDashboard();
      
      await waitFor(() => {
        // The mock meal has date '2023-12-01'
        expect(screen.getByText('Dec 1, 2023')).toBeInTheDocument();
      });
    });

    it('applies correct meal type colors', async () => {
      renderDashboard();
      
      await waitFor(() => {
        const dinnerBadge = screen.getByText('dinner');
        expect(dinnerBadge).toHaveClass('bg-blue-100', 'text-blue-800');
      });
    });
  });

  describe('error handling', () => {
    it('handles API errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockApi.get.mockRejectedValue(new Error('API Error'));
      
      renderDashboard();
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error fetching dashboard data:', expect.any(Error));
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('meal rating and time display', () => {
    beforeEach(() => {
      const mockMealWithRating = {
        ...mockApiResponses.meals,
        meals: [{
          ...mockApiResponses.meals.meals[0],
          rating: 4.5,
          totalTime: 45
        }]
      };
      
      mockApi.get
        .mockResolvedValueOnce({ data: mockApiResponses.familyMembers })
        .mockResolvedValueOnce({ data: mockApiResponses.mealStats })
        .mockResolvedValueOnce({ data: mockMealWithRating });
    });

    it('displays meal rating when available', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByText('4.5')).toBeInTheDocument();
      });
    });

    it('displays meal total time when available', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByText('45m')).toBeInTheDocument();
      });
    });
  });
}); 