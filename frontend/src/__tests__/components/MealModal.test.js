import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import toast from 'react-hot-toast';
import MealModal from '../../components/MealModal';
import api from '../../services/api';

// Mock dependencies
jest.mock('../../services/api');
jest.mock('react-hot-toast');

describe('MealModal', () => {
  const mockMeal = {
    _id: '1',
    name: 'Spaghetti Bolognese',
    description: 'Classic Italian pasta',
    mealType: 'dinner',
    recipe: { prepTime: 45 }
  };

  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    api.put.mockResolvedValue({ data: mockMeal });
    api.post.mockResolvedValue({ data: { ...mockMeal, _id: '2' } });
  });

  const renderModal = (props = {}) => {
    const defaultProps = {
      meal: mockMeal,
      isOpen: true,
      onClose: mockOnClose,
      onSave: mockOnSave,
      mode: 'edit',
      ...props
    };
    return render(<MealModal {...defaultProps} />);
  };

  describe('Rendering', () => {
    it('renders nothing when isOpen is false', () => {
      const { container } = renderModal({ isOpen: false });
      expect(container).toBeEmptyDOMElement();
    });

    it('renders edit modal with meal data when mode is edit', () => {
      renderModal({ mode: 'edit' });
      
      expect(screen.getByText('Edit Meal')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Spaghetti Bolognese')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Classic Italian pasta')).toBeInTheDocument();
      expect(screen.getByLabelText('Meal Type').value).toBe('dinner');
      expect(screen.getByDisplayValue('45')).toBeInTheDocument();
    });

    it('renders add modal with empty form when mode is add', () => {
      renderModal({ mode: 'add', meal: null });
      
      expect(screen.getByText('Add New Meal')).toBeInTheDocument();
      expect(screen.getByLabelText('Meal Name *').value).toBe('');
      expect(screen.getByLabelText('Description').value).toBe('');
      expect(screen.getByLabelText('Meal Type').value).toBe('dinner');
      expect(screen.getByLabelText('Total Time (minutes)').value).toBe('');
    });

    it('renders all form fields without date field', () => {
      renderModal();
      
      expect(screen.getByLabelText('Meal Name *')).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
      expect(screen.getByLabelText('Meal Type')).toBeInTheDocument();
      expect(screen.getByLabelText('Total Time (minutes)')).toBeInTheDocument();
      expect(screen.queryByLabelText('Date')).not.toBeInTheDocument();
    });

    it('renders action buttons with correct text for edit mode', () => {
      renderModal({ mode: 'edit' });
      
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Update Meal')).toBeInTheDocument();
      expect(screen.getByTitle('Close')).toBeInTheDocument();
    });

    it('renders action buttons with correct text for add mode', () => {
      renderModal({ mode: 'add' });
      
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Create Meal')).toBeInTheDocument();
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
      
      const timeInput = screen.getByLabelText('Total Time (minutes)');
      fireEvent.change(timeInput, { target: { value: '60' } });
      expect(timeInput.value).toBe('60');
    });

    it('populates form with meal data in edit mode', () => {
      const meal = {
        _id: '2',
        name: 'Test Meal',
        description: 'Test Description',
        mealType: 'lunch',
        recipe: { prepTime: 30 }
      };
      
      renderModal({ meal, mode: 'edit' });
      
      expect(screen.getByDisplayValue('Test Meal')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Description')).toBeInTheDocument();
      expect(screen.getByLabelText('Meal Type').value).toBe('lunch');
      expect(screen.getByDisplayValue('30')).toBeInTheDocument();
    });

    it('resets form when switching from edit to add mode', () => {
      const { rerender } = renderModal({ mode: 'edit' });
      
      // Verify edit mode data is loaded
      expect(screen.getByDisplayValue('Spaghetti Bolognese')).toBeInTheDocument();
      
      // Switch to add mode
      rerender(
        <MealModal
          meal={null}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          mode="add"
        />
      );
      
      expect(screen.getByText('Add New Meal')).toBeInTheDocument();
      expect(screen.getByLabelText('Meal Name *').value).toBe('');
      expect(screen.getByLabelText('Description').value).toBe('');
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

    it('does not close modal when buttons are clicked during loading', async () => {
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

  describe('Form Submission - Edit Mode', () => {
    it('submits form with updated data in edit mode', async () => {
      renderModal({ mode: 'edit' });
      
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
          prepTime: '60'
        });
      });
    });

    it('calls onSave and onClose after successful edit', async () => {
      const updatedMeal = { ...mockMeal, name: 'Updated Meal' };
      api.put.mockResolvedValue({ data: updatedMeal });
      
      renderModal({ mode: 'edit' });
      
      const submitButton = screen.getByText('Update Meal');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(updatedMeal);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
        expect(toast.success).toHaveBeenCalledWith('Meal updated successfully');
      });
    });

    it('shows loading state during edit submission', async () => {
      // Delay the API response
      let resolvePromise;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      api.put.mockReturnValue(promise);
      
      renderModal({ mode: 'edit' });
      
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

  describe('Form Submission - Add Mode', () => {
    it('submits form with new meal data in add mode', async () => {
      renderModal({ mode: 'add', meal: null });
      
      // Fill form fields
      fireEvent.change(screen.getByLabelText('Meal Name *'), { 
        target: { value: 'New Meal' } 
      });
      fireEvent.change(screen.getByLabelText('Description'), { 
        target: { value: 'New Description' } 
      });
      fireEvent.change(screen.getByLabelText('Meal Type'), { 
        target: { value: 'lunch' } 
      });
      fireEvent.change(screen.getByLabelText('Total Time (minutes)'), { 
        target: { value: '45' } 
      });
      
      const submitButton = screen.getByText('Create Meal');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/meals', {
          name: 'New Meal',
          description: 'New Description',
          mealType: 'lunch',
          recipe: {
            prepTime: 45
          },
          date: new Date().toISOString().split('T')[0] // Today's date
        });
      });
    });

    it('calls onSave and onClose after successful creation', async () => {
              const newMeal = { _id: '2', name: 'New Meal', description: 'New Description', mealType: 'lunch', recipe: { prepTime: 45 } };
      api.post.mockResolvedValue({ data: newMeal });
      
      renderModal({ mode: 'add', meal: null });
      
      // Fill required field
      fireEvent.change(screen.getByLabelText('Meal Name *'), { 
        target: { value: 'New Meal' } 
      });
      
      const submitButton = screen.getByText('Create Meal');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(newMeal);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
        expect(toast.success).toHaveBeenCalledWith('Meal created successfully');
      });
    });

    it('shows loading state during add submission', async () => {
      // Delay the API response
      let resolvePromise;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      api.post.mockReturnValue(promise);
      
      renderModal({ mode: 'add', meal: null });
      
      // Fill required field
      fireEvent.change(screen.getByLabelText('Meal Name *'), { 
        target: { value: 'New Meal' } 
      });
      
      const submitButton = screen.getByText('Create Meal');
      fireEvent.click(submitButton);
      
      // Check loading state
      expect(screen.getByText('Creating...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
      expect(screen.getByText('Cancel')).toBeDisabled();
      
      // Resolve the promise
      resolvePromise({ data: { _id: '2', name: 'New Meal' } });
      
      await waitFor(() => {
        expect(screen.queryByText('Creating...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Validation', () => {
    it('shows error when meal name is empty in edit mode', async () => {
      renderModal({ mode: 'edit' });
      
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

    it('shows error when meal name is empty in add mode', async () => {
      renderModal({ mode: 'add', meal: null });
      
      const submitButton = screen.getByText('Create Meal');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Meal name is required');
        expect(api.post).not.toHaveBeenCalled();
      });
    });

    it('shows error when meal name is only whitespace', async () => {
      renderModal({ mode: 'add', meal: null });
      
      // Set name to whitespace
      fireEvent.change(screen.getByLabelText('Meal Name *'), { 
        target: { value: '   ' } 
      });
      
      const submitButton = screen.getByText('Create Meal');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Meal name is required');
        expect(api.post).not.toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles API error during edit submission', async () => {
      api.put.mockRejectedValue(new Error('API Error'));
      
      renderModal({ mode: 'edit' });
      
      const submitButton = screen.getByText('Update Meal');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to update meal');
        expect(mockOnSave).not.toHaveBeenCalled();
        expect(mockOnClose).not.toHaveBeenCalled();
      });
    });

    it('handles API error during add submission', async () => {
      api.post.mockRejectedValue(new Error('API Error'));
      
      renderModal({ mode: 'add', meal: null });
      
      // Fill required field
      fireEvent.change(screen.getByLabelText('Meal Name *'), { 
        target: { value: 'New Meal' } 
      });
      
      const submitButton = screen.getByText('Create Meal');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to create meal');
        expect(mockOnSave).not.toHaveBeenCalled();
        expect(mockOnClose).not.toHaveBeenCalled();
      });
    });

    it('resets loading state after edit error', async () => {
      api.put.mockRejectedValue(new Error('API Error'));
      
      renderModal({ mode: 'edit' });
      
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

    it('resets loading state after add error', async () => {
      api.post.mockRejectedValue(new Error('API Error'));
      
      renderModal({ mode: 'add', meal: null });
      
      // Fill required field
      fireEvent.change(screen.getByLabelText('Meal Name *'), { 
        target: { value: 'New Meal' } 
      });
      
      const submitButton = screen.getByText('Create Meal');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to create meal');
      });
      
      // Check that loading state is reset
      expect(screen.getByText('Create Meal')).toBeInTheDocument();
      expect(screen.queryByText('Creating...')).not.toBeInTheDocument();
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Edge Cases', () => {
    it('handles meal with missing optional fields in edit mode', () => {
      const mealWithMissingFields = {
        _id: '1',
        name: 'Simple Meal',
        mealType: 'dinner'
        // description, prepTime are missing
      };
      
      renderModal({ meal: mealWithMissingFields, mode: 'edit' });
      
      expect(screen.getByDisplayValue('Simple Meal')).toBeInTheDocument();
      expect(screen.getByLabelText('Meal Type').value).toBe('dinner');
      expect(screen.getByLabelText('Description').value).toBe('');
      expect(screen.getByLabelText('Total Time (minutes)').value).toBe('');
    });

    it('handles null meal gracefully in add mode', () => {
      renderModal({ meal: null, mode: 'add' });
      
      expect(screen.getByText('Add New Meal')).toBeInTheDocument();
      expect(screen.getByLabelText('Meal Name *').value).toBe('');
    });

    it('handles undefined mode gracefully (defaults to edit)', () => {
      renderModal({ mode: undefined });
      
      expect(screen.getByText('Edit Meal')).toBeInTheDocument();
      expect(screen.getByText('Update Meal')).toBeInTheDocument();
    });
  });
}); 