import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Meals from '../../pages/Meals';
import api from '../../services/api';
import { mockApiResponses } from '../utils/testUtils';

// Mock dependencies
jest.mock('../../services/api');
jest.mock('react-hot-toast');

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock data
const mockMeals = [
  {
    _id: '1',
    name: 'Spaghetti Bolognese',
    description: 'Classic Italian pasta',
    mealType: 'dinner',
    date: '2023-12-03',
    totalTime: 45,
    assignedTo: [{ _id: '1', firstName: 'John', lastName: 'Doe' }],
    rating: 4.5,
    isPlanned: true,
    isCooked: false
  },
  {
    _id: '2',
    name: 'Pancakes',
    description: 'Fluffy breakfast pancakes',
    mealType: 'breakfast',
    date: '2023-12-02',
    totalTime: 20,
    assignedTo: [],
    rating: 4.0,
    isPlanned: false,
    isCooked: true
  },
  {
    _id: '3',
    name: 'Caesar Salad',
    description: 'Fresh lunch salad',
    mealType: 'lunch',
    date: '2023-12-01',
    totalTime: 15,
    assignedTo: [],
    rating: null,
    isPlanned: true,
    isCooked: true
  }
];

const renderMeals = () => {
  return render(
    <BrowserRouter>
      <Meals />
    </BrowserRouter>
  );
};

describe('Meals Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.get.mockResolvedValue({ data: { meals: mockMeals } });
  });

  describe('Rendering', () => {
    it('renders the meals page header', async () => {
      renderMeals();
      
      await waitFor(() => {
        expect(screen.getByText('All Meals')).toBeInTheDocument();
        expect(screen.getByText('Browse and manage all your saved meals')).toBeInTheDocument();
        expect(screen.getByText('Add New Meal')).toBeInTheDocument();
      });
    });

    it('shows loading spinner initially', () => {
      renderMeals();
      expect(screen.getByText('Loading meals...')).toBeInTheDocument();
    });

    it('renders meals after loading', async () => {
      renderMeals();
      
      await waitFor(() => {
        expect(screen.getByText('Spaghetti Bolognese')).toBeInTheDocument();
        expect(screen.getByText('Pancakes')).toBeInTheDocument();
        expect(screen.getByText('Caesar Salad')).toBeInTheDocument();
      });
    });

    it('displays meal details correctly', async () => {
      renderMeals();
      
      await waitFor(() => {
        // Check meal type badges
        expect(screen.getByText('dinner')).toBeInTheDocument();
        expect(screen.getByText('breakfast')).toBeInTheDocument();
        expect(screen.getByText('lunch')).toBeInTheDocument();
        
        // Check descriptions
        expect(screen.getByText('Classic Italian pasta')).toBeInTheDocument();
        expect(screen.getByText('Fluffy breakfast pancakes')).toBeInTheDocument();
        
        // Check ratings
        expect(screen.getByText('4.5/5')).toBeInTheDocument();
        expect(screen.getByText('4/5')).toBeInTheDocument();
        
        // Check status badges
        expect(screen.getAllByText('Planned')).toHaveLength(2);
        expect(screen.getAllByText('Cooked')).toHaveLength(2);
      });
    });

    it('displays meal count correctly', async () => {
      renderMeals();
      
      await waitFor(() => {
        expect(screen.getByText('3 Meals')).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    it('filters meals by search term', async () => {
      renderMeals();
      
      await waitFor(() => {
        expect(screen.getByText('Spaghetti Bolognese')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText('Search meals...');
      fireEvent.change(searchInput, { target: { value: 'pancakes' } });
      
      await waitFor(() => {
        expect(screen.getByText('Pancakes')).toBeInTheDocument();
        expect(screen.queryByText('Spaghetti Bolognese')).not.toBeInTheDocument();
        expect(screen.queryByText('Caesar Salad')).not.toBeInTheDocument();
        expect(screen.getByText('1 Meal')).toBeInTheDocument();
      });
    });

    it('searches in meal descriptions', async () => {
      renderMeals();
      
      await waitFor(() => {
        expect(screen.getByText('Spaghetti Bolognese')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText('Search meals...');
      fireEvent.change(searchInput, { target: { value: 'italian' } });
      
      await waitFor(() => {
        expect(screen.getByText('Spaghetti Bolognese')).toBeInTheDocument();
        expect(screen.queryByText('Pancakes')).not.toBeInTheDocument();
        expect(screen.getByText('1 Meal')).toBeInTheDocument();
      });
    });

    it('shows no results message when search returns no matches', async () => {
      renderMeals();
      
      await waitFor(() => {
        expect(screen.getByText('Spaghetti Bolognese')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText('Search meals...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
      
      await waitFor(() => {
        expect(screen.getByText('No meals match your filters')).toBeInTheDocument();
        expect(screen.getByText('Try adjusting your search or filters')).toBeInTheDocument();
      });
    });
  });

  describe('Filter Functionality', () => {
    it('filters meals by meal type', async () => {
      renderMeals();
      
      await waitFor(() => {
        expect(screen.getByText('3 Meals')).toBeInTheDocument();
      });
      
      const mealTypeFilter = screen.getByDisplayValue('All Types');
      fireEvent.change(mealTypeFilter, { target: { value: 'breakfast' } });
      
      await waitFor(() => {
        expect(screen.getByText('Pancakes')).toBeInTheDocument();
        expect(screen.queryByText('Spaghetti Bolognese')).not.toBeInTheDocument();
        expect(screen.queryByText('Caesar Salad')).not.toBeInTheDocument();
        expect(screen.getByText('1 Meal')).toBeInTheDocument();
      });
    });

    it('combines search and filter', async () => {
      renderMeals();
      
      await waitFor(() => {
        expect(screen.getByText('3 Meals')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText('Search meals...');
      const mealTypeFilter = screen.getByDisplayValue('All Types');
      
      fireEvent.change(searchInput, { target: { value: 'salad' } });
      fireEvent.change(mealTypeFilter, { target: { value: 'lunch' } });
      
      await waitFor(() => {
        expect(screen.getByText('Caesar Salad')).toBeInTheDocument();
        expect(screen.queryByText('Spaghetti Bolognese')).not.toBeInTheDocument();
        expect(screen.queryByText('Pancakes')).not.toBeInTheDocument();
        expect(screen.getByText('1 Meal')).toBeInTheDocument();
      });
    });
  });

  describe('Sorting Functionality', () => {
    it('sorts meals by name', async () => {
      renderMeals();
      
      await waitFor(() => {
        expect(screen.getByText('3 Meals')).toBeInTheDocument();
      });
      
      const sortBySelect = screen.getByDisplayValue('Sort by Date');
      fireEvent.change(sortBySelect, { target: { value: 'name' } });
      
      const sortOrderSelect = screen.getByDisplayValue('Descending');
      fireEvent.change(sortOrderSelect, { target: { value: 'asc' } });
      
      await waitFor(() => {
        const mealCards = screen.getAllByText(/Spaghetti Bolognese|Pancakes|Caesar Salad/);
        expect(mealCards[0]).toHaveTextContent('Caesar Salad');
        expect(mealCards[1]).toHaveTextContent('Pancakes');
        expect(mealCards[2]).toHaveTextContent('Spaghetti Bolognese');
      });
    });

    it('sorts meals by rating', async () => {
      renderMeals();
      
      await waitFor(() => {
        expect(screen.getByText('3 Meals')).toBeInTheDocument();
      });
      
      const sortBySelect = screen.getByDisplayValue('Sort by Date');
      fireEvent.change(sortBySelect, { target: { value: 'rating' } });
      
      // Should sort by rating with highest first (desc)
      await waitFor(() => {
        const mealCards = screen.getAllByText(/Spaghetti Bolognese|Pancakes|Caesar Salad/);
        expect(mealCards[0]).toHaveTextContent('Spaghetti Bolognese'); // 4.5 rating
        expect(mealCards[1]).toHaveTextContent('Pancakes'); // 4.0 rating
        expect(mealCards[2]).toHaveTextContent('Caesar Salad'); // null rating (0)
      });
    });
  });

  describe('Actions', () => {
    it('navigates to meal planner when Add New Meal is clicked', async () => {
      renderMeals();
      
      await waitFor(() => {
        expect(screen.getByText('Add New Meal')).toBeInTheDocument();
      });
      
      const addButton = screen.getByText('Add New Meal');
      fireEvent.click(addButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/meal-planner');
    });

    it('opens edit modal when edit button is clicked', async () => {
      renderMeals();
      
      await waitFor(() => {
        expect(screen.getByText('Spaghetti Bolognese')).toBeInTheDocument();
      });
      
      const editButtons = screen.getAllByTitle('Edit meal');
      fireEvent.click(editButtons[0]);
      
      await waitFor(() => {
        expect(screen.getByText('Edit Meal')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Spaghetti Bolognese')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Classic Italian pasta')).toBeInTheDocument();
      });
    });

    it('closes edit modal when cancel button is clicked', async () => {
      renderMeals();
      
      await waitFor(() => {
        expect(screen.getByText('Spaghetti Bolognese')).toBeInTheDocument();
      });
      
      const editButtons = screen.getAllByTitle('Edit meal');
      fireEvent.click(editButtons[0]);
      
      await waitFor(() => {
        expect(screen.getByText('Edit Meal')).toBeInTheDocument();
      });
      
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Edit Meal')).not.toBeInTheDocument();
      });
    });

    it('closes edit modal when X button is clicked', async () => {
      renderMeals();
      
      await waitFor(() => {
        expect(screen.getByText('Spaghetti Bolognese')).toBeInTheDocument();
      });
      
      const editButtons = screen.getAllByTitle('Edit meal');
      fireEvent.click(editButtons[0]);
      
      await waitFor(() => {
        expect(screen.getByText('Edit Meal')).toBeInTheDocument();
      });
      
      const closeButton = screen.getByTitle('Close');
      fireEvent.click(closeButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Edit Meal')).not.toBeInTheDocument();
      });
    });

    it('updates meal when edit form is submitted', async () => {
      api.put.mockResolvedValue({ 
        data: { 
          _id: '1', 
          name: 'Updated Spaghetti', 
          description: 'Updated description',
          mealType: 'dinner',
          date: '2023-12-01',
          totalTime: 50
        } 
      });
      
      renderMeals();
      
      await waitFor(() => {
        expect(screen.getByText('Spaghetti Bolognese')).toBeInTheDocument();
      });
      
      const editButtons = screen.getAllByTitle('Edit meal');
      fireEvent.click(editButtons[0]);
      
      await waitFor(() => {
        expect(screen.getByText('Edit Meal')).toBeInTheDocument();
      });
      
      const nameInput = screen.getByDisplayValue('Spaghetti Bolognese');
      fireEvent.change(nameInput, { target: { value: 'Updated Spaghetti' } });
      
      const submitButton = screen.getByText('Update Meal');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(api.put).toHaveBeenCalledWith('/meals/1', {
          name: 'Updated Spaghetti',
          description: 'Classic Italian pasta',
          mealType: 'dinner',
          date: '2023-12-03',
          totalTime: 45
        });
        expect(toast.success).toHaveBeenCalledWith('Meal updated successfully');
        expect(screen.queryByText('Edit Meal')).not.toBeInTheDocument();
      });
    });

    it('handles API error when updating meal', async () => {
      api.put.mockRejectedValue(new Error('Update failed'));
      
      renderMeals();
      
      await waitFor(() => {
        expect(screen.getByText('Spaghetti Bolognese')).toBeInTheDocument();
      });
      
      const editButtons = screen.getAllByTitle('Edit meal');
      fireEvent.click(editButtons[0]);
      
      await waitFor(() => {
        expect(screen.getByText('Edit Meal')).toBeInTheDocument();
      });
      
      const submitButton = screen.getByText('Update Meal');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to update meal');
      });
    });

    it('shows validation error when meal name is empty', async () => {
      renderMeals();
      
      await waitFor(() => {
        expect(screen.getByText('Spaghetti Bolognese')).toBeInTheDocument();
      });
      
      const editButtons = screen.getAllByTitle('Edit meal');
      fireEvent.click(editButtons[0]);
      
      await waitFor(() => {
        expect(screen.getByText('Edit Meal')).toBeInTheDocument();
      });
      
      const nameInput = screen.getByDisplayValue('Spaghetti Bolognese');
      fireEvent.change(nameInput, { target: { value: '' } });
      
      const submitButton = screen.getByText('Update Meal');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Meal name is required');
        expect(api.put).not.toHaveBeenCalled();
      });
    });

    it('deletes meal when delete button is clicked and confirmed', async () => {
      renderMeals();
      
      // Mock window.confirm
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
      api.delete.mockResolvedValue({ data: { success: true } });
      
      await waitFor(() => {
        expect(screen.getByText('Spaghetti Bolognese')).toBeInTheDocument();
      });
      
      const deleteButtons = screen.getAllByTitle('Delete meal');
      fireEvent.click(deleteButtons[0]);
      
      expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete this meal?');
      
      await waitFor(() => {
        expect(api.delete).toHaveBeenCalledWith('/meals/1');
        expect(toast.success).toHaveBeenCalledWith('Meal deleted successfully');
      });
      
      confirmSpy.mockRestore();
    });

    it('does not delete meal when delete is cancelled', async () => {
      renderMeals();
      
      // Mock window.confirm to return false
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
      
      await waitFor(() => {
        expect(screen.getByText('Spaghetti Bolognese')).toBeInTheDocument();
      });
      
      const deleteButtons = screen.getAllByTitle('Delete meal');
      fireEvent.click(deleteButtons[0]);
      
      expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete this meal?');
      expect(api.delete).not.toHaveBeenCalled();
      
      confirmSpy.mockRestore();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no meals exist', async () => {
      api.get.mockResolvedValue({ data: { meals: [] } });
      
      renderMeals();
      
      await waitFor(() => {
        expect(screen.getByText('No meals saved yet')).toBeInTheDocument();
        expect(screen.getByText('Start by planning your first meal')).toBeInTheDocument();
        expect(screen.getByText('Plan Your First Meal')).toBeInTheDocument();
      });
    });

    it('navigates to meal planner from empty state', async () => {
      api.get.mockResolvedValue({ data: { meals: [] } });
      
      renderMeals();
      
      await waitFor(() => {
        expect(screen.getByText('Plan Your First Meal')).toBeInTheDocument();
      });
      
      const planButton = screen.getByText('Plan Your First Meal');
      fireEvent.click(planButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/meal-planner');
    });
  });

  describe('Error Handling', () => {
    it('handles API error when fetching meals', async () => {
      api.get.mockRejectedValue(new Error('API Error'));
      
      renderMeals();
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to load meals');
      });
    });

    it('handles API error when deleting meal', async () => {
      renderMeals();
      
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
      api.delete.mockRejectedValue(new Error('Delete failed'));
      
      await waitFor(() => {
        expect(screen.getByText('Spaghetti Bolognese')).toBeInTheDocument();
      });
      
      const deleteButtons = screen.getAllByTitle('Delete meal');
      fireEvent.click(deleteButtons[0]);
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to delete meal');
      });
      
      confirmSpy.mockRestore();
    });
  });
}); 