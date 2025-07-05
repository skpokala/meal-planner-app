import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import toast from 'react-hot-toast';
import EditMealModal from '../../components/EditMealModal';
import api from '../../services/api';

// Mock dependencies
jest.mock('../../services/api');
jest.mock('react-hot-toast');

describe('EditMealModal', () => {
  const mockMeal = {
    _id: '1',
    name: 'Spaghetti Bolognese',
    description: 'Classic Italian pasta',
    mealType: 'dinner',
    date: '2023-12-01',
    totalTime: 45
  };

  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    api.put.mockResolvedValue({ data: mockMeal });
  });

  const renderModal = (props = {}) => {
    const defaultProps = {
      meal: mockMeal,
      isOpen: true,
      onClose: mockOnClose,
      onSave: mockOnSave,
      ...props
    };
    return render(<EditMealModal {...defaultProps} />);
  };

  describe('Rendering', () => {
    it('renders nothing when isOpen is false', () => {
      const { container } = renderModal({ isOpen: false });
      expect(container).toBeEmptyDOMElement();
    });

    it('renders modal with meal data when isOpen is true', () => {
      renderModal();
      
      expect(screen.getByText('Edit Meal')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Spaghetti Bolognese')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Classic Italian pasta')).toBeInTheDocument();
      expect(screen.getByLabelText('Meal Type').value).toBe('dinner');
      expect(screen.getByDisplayValue('2023-12-01')).toBeInTheDocument();
      expect(screen.getByDisplayValue('45')).toBeInTheDocument();
    });

    it('renders all form fields', () => {
      renderModal();
      
      expect(screen.getByLabelText('Meal Name *')).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
      expect(screen.getByLabelText('Meal Type')).toBeInTheDocument();
      expect(screen.getByLabelText('Date')).toBeInTheDocument();
      expect(screen.getByLabelText('Total Time (minutes)')).toBeInTheDocument();
    });

    it('renders action buttons', () => {
      renderModal();
      
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Update Meal')).toBeInTheDocument();
      expect(screen.getByTitle('Close')).toBeInTheDocument();
    });

    it('renders meal type options', () => {
      renderModal();
      
      const mealTypeSelect = screen.getByLabelText('Meal Type');
      expect(mealTypeSelect).toBeInTheDocument();
      
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(4);
      expect(screen.getByText('Breakfast')).toBeInTheDocument();
      expect(screen.getByText('Lunch')).toBeInTheDocument();
      expect(screen.getByText('Dinner')).toBeInTheDocument();
      expect(screen.getByText('Snack')).toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('updates form fields when input values change', () => {
      renderModal();
      
      const nameInput = screen.getByLabelText('Meal Name *');
      fireEvent.change(nameInput, { target: { value: 'Updated Meal Name' } });
      expect(nameInput.value).toBe('Updated Meal Name');
      
      const descriptionInput = screen.getByLabelText('Description');
      fireEvent.change(descriptionInput, { target: { value: 'Updated description' } });
      expect(descriptionInput.value).toBe('Updated description');
      
      const mealTypeSelect = screen.getByLabelText('Meal Type');
      fireEvent.change(mealTypeSelect, { target: { value: 'breakfast' } });
      expect(mealTypeSelect.value).toBe('breakfast');
      
      const dateInput = screen.getByLabelText('Date');
      fireEvent.change(dateInput, { target: { value: '2023-12-15' } });
      expect(dateInput.value).toBe('2023-12-15');
      
      const timeInput = screen.getByLabelText('Total Time (minutes)');
      fireEvent.change(timeInput, { target: { value: '60' } });
      expect(timeInput.value).toBe('60');
    });

    it('populates form with meal data when modal opens', () => {
      const meal = {
        _id: '2',
        name: 'Test Meal',
        description: 'Test Description',
        mealType: 'lunch',
        date: '2023-12-10',
        totalTime: 30
      };
      
      renderModal({ meal });
      
      expect(screen.getByDisplayValue('Test Meal')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Description')).toBeInTheDocument();
      expect(screen.getByLabelText('Meal Type').value).toBe('lunch');
      expect(screen.getByDisplayValue('2023-12-10')).toBeInTheDocument();
      expect(screen.getByDisplayValue('30')).toBeInTheDocument();
    });

    it('resets form when meal changes', () => {
      const { rerender } = renderModal();
      
      // Change the name field
      const nameInput = screen.getByLabelText('Meal Name *');
      fireEvent.change(nameInput, { target: { value: 'Changed Name' } });
      expect(nameInput.value).toBe('Changed Name');
      
      // Rerender with new meal
      const newMeal = {
        _id: '2',
        name: 'New Meal',
        description: 'New Description',
        mealType: 'breakfast',
        date: '2023-12-10',
        totalTime: 20
      };
      
      rerender(
        <EditMealModal
          meal={newMeal}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );
      
      expect(screen.getByDisplayValue('New Meal')).toBeInTheDocument();
      expect(screen.getByDisplayValue('New Description')).toBeInTheDocument();
    });
  });

  describe('Modal Actions', () => {
    it('calls onClose when Cancel button is clicked', () => {
      renderModal();
      
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when X button is clicked', () => {
      renderModal();
      
      const closeButton = screen.getByTitle('Close');
      fireEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('does not close modal when clicking cancel during loading', async () => {
      // Create a promise that we can control
      let resolvePromise;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      api.put.mockReturnValue(promise);
      
      renderModal();
      
      // Start form submission to trigger loading state
      const submitButton = screen.getByText('Update Meal');
      fireEvent.click(submitButton);
      
      // Try to close modal while loading
      const closeButton = screen.getByTitle('Close');
      fireEvent.click(closeButton);
      
      // onClose should not be called during loading
      expect(mockOnClose).not.toHaveBeenCalled();
      
      // Resolve the promise to complete the test
      resolvePromise({ data: mockMeal });
      
      await waitFor(() => {
        expect(screen.queryByText('Updating...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('submits form with updated data', async () => {
      renderModal();
      
      // Update form fields
      fireEvent.change(screen.getByLabelText('Meal Name *'), { 
        target: { value: 'Updated Meal' } 
      });
      fireEvent.change(screen.getByLabelText('Description'), { 
        target: { value: 'Updated Description' } 
      });
      fireEvent.change(screen.getByLabelText('Meal Type'), { 
        target: { value: 'breakfast' } 
      });
      fireEvent.change(screen.getByLabelText('Date'), { 
        target: { value: '2023-12-15' } 
      });
      fireEvent.change(screen.getByLabelText('Total Time (minutes)'), { 
        target: { value: '60' } 
      });
      
      const submitButton = screen.getByText('Update Meal');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(api.put).toHaveBeenCalledWith('/meals/1', {
          name: 'Updated Meal',
          description: 'Updated Description',
          mealType: 'breakfast',
          date: '2023-12-15',
          totalTime: '60'
        });
      });
    });

    it('calls onSave and onClose after successful submission', async () => {
      const updatedMeal = { ...mockMeal, name: 'Updated Meal' };
      api.put.mockResolvedValue({ data: updatedMeal });
      
      renderModal();
      
      const submitButton = screen.getByText('Update Meal');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(updatedMeal);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
        expect(toast.success).toHaveBeenCalledWith('Meal updated successfully');
      });
    });

    it('shows loading state during submission', async () => {
      // Delay the API response
      let resolvePromise;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      api.put.mockReturnValue(promise);
      
      renderModal();
      
      const submitButton = screen.getByText('Update Meal');
      fireEvent.click(submitButton);
      
      // Check loading state
      expect(screen.getByText('Updating...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
      expect(screen.getByText('Cancel')).toBeDisabled();
      
      // Resolve the promise
      resolvePromise({ data: mockMeal });
      
      await waitFor(() => {
        expect(screen.queryByText('Updating...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Validation', () => {
    it('shows error when meal name is empty', async () => {
      renderModal();
      
      // Clear the name field
      fireEvent.change(screen.getByLabelText('Meal Name *'), { 
        target: { value: '' } 
      });
      
      const submitButton = screen.getByText('Update Meal');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Meal name is required');
        expect(api.put).not.toHaveBeenCalled();
      });
    });

    it('shows error when meal name is only whitespace', async () => {
      renderModal();
      
      // Set name to whitespace
      fireEvent.change(screen.getByLabelText('Meal Name *'), { 
        target: { value: '   ' } 
      });
      
      const submitButton = screen.getByText('Update Meal');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Meal name is required');
        expect(api.put).not.toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles API error during submission', async () => {
      api.put.mockRejectedValue(new Error('API Error'));
      
      renderModal();
      
      const submitButton = screen.getByText('Update Meal');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to update meal');
        expect(mockOnSave).not.toHaveBeenCalled();
        expect(mockOnClose).not.toHaveBeenCalled();
      });
    });

    it('resets loading state after error', async () => {
      api.put.mockRejectedValue(new Error('API Error'));
      
      renderModal();
      
      const submitButton = screen.getByText('Update Meal');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to update meal');
      });
      
      // Check that loading state is reset
      expect(screen.getByText('Update Meal')).toBeInTheDocument();
      expect(screen.queryByText('Updating...')).not.toBeInTheDocument();
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Edge Cases', () => {
    it('handles meal with missing optional fields', () => {
      const mealWithMissingFields = {
        _id: '1',
        name: 'Simple Meal',
        mealType: 'dinner'
        // description, date, totalTime are missing
      };
      
      renderModal({ meal: mealWithMissingFields });
      
      expect(screen.getByDisplayValue('Simple Meal')).toBeInTheDocument();
      expect(screen.getByLabelText('Meal Type').value).toBe('dinner');
      expect(screen.getByLabelText('Description').value).toBe('');
      expect(screen.getByLabelText('Date').value).toBe('');
      expect(screen.getByLabelText('Total Time (minutes)').value).toBe('');
    });

    it('handles null meal gracefully', () => {
      renderModal({ meal: null });
      
      expect(screen.getByText('Edit Meal')).toBeInTheDocument();
      expect(screen.getByLabelText('Meal Name *').value).toBe('');
    });
  });
}); 