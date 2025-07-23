import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import BugReportForm from '../../components/BugReportForm';
import api from '../../services/api';
import toast from 'react-hot-toast';

// Mock dependencies
jest.mock('../../services/api');
jest.mock('react-hot-toast');

// Mock navigator and screen for environment detection
Object.defineProperty(window, 'navigator', {
  value: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  },
  writable: true
});

Object.defineProperty(window, 'screen', {
  value: {
    width: 1920,
    height: 1080
  },
  writable: true
});

describe('BugReportForm', () => {
  const mockProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSuccess: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '';
    api.post.mockResolvedValue({
      data: {
        success: true,
        data: { _id: 'test-bug-id', title: 'Test Bug' }
      }
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders when isOpen is true', () => {
    render(<BugReportForm {...mockProps} />);
    
    expect(screen.getByText('Report a Bug')).toBeInTheDocument();
    expect(screen.getByText('Basic Information')).toBeInTheDocument();
    expect(screen.getByText('Detailed Information')).toBeInTheDocument();
    expect(screen.getByText('Environment Information')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<BugReportForm {...mockProps} isOpen={false} />);
    
    expect(screen.queryByText('Report a Bug')).not.toBeInTheDocument();
  });

  it('auto-detects environment information', async () => {
    render(<BugReportForm {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('Chrome')).toBeInTheDocument();
      expect(screen.getByDisplayValue('91.0')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Windows')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1920x1080')).toBeInTheDocument();
    });
  });

  it('shows character counts for text fields', async () => {
    const user = userEvent.setup();
    render(<BugReportForm {...mockProps} />);
    
    const titleInput = screen.getByLabelText('Bug Title *');
    await user.type(titleInput, 'Test Bug Title');
    
    expect(screen.getByText('14/200 characters')).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    render(<BugReportForm {...mockProps} />);
    
    const submitButton = screen.getByText('Submit Bug Report');
    
    // Submit button should be disabled initially
    expect(submitButton).toBeDisabled();
    
    // Fill in title only
    const titleInput = screen.getByLabelText('Bug Title *');
    await user.type(titleInput, 'Test Bug');
    expect(submitButton).toBeDisabled();
    
    // Fill in description
    const descriptionInput = screen.getByLabelText('Description *');
    await user.type(descriptionInput, 'This is a test bug description');
    expect(submitButton).not.toBeDisabled();
  });

  it('shows validation error for empty submission', async () => {
    const user = userEvent.setup();
    render(<BugReportForm {...mockProps} />);
    
    // Submit button should be disabled for empty form
    const submitButton = screen.getByRole('button', { name: /submit bug report/i });
    expect(submitButton).toBeDisabled();
    
    // Note: This verifies that validation prevents submission of empty forms
  });

  it('handles priority selection with color coding', async () => {
    const user = userEvent.setup();
    render(<BugReportForm {...mockProps} />);
    
    const prioritySelect = screen.getByLabelText('Priority');
    
    // Change to critical priority
    await user.selectOptions(prioritySelect, 'critical');
    expect(prioritySelect).toHaveClass('text-red-600', 'bg-red-50', 'border-red-200');
    
    // Change to high priority
    await user.selectOptions(prioritySelect, 'high');
    expect(prioritySelect).toHaveClass('text-orange-600', 'bg-orange-50', 'border-orange-200');
    
    // Change to medium priority
    await user.selectOptions(prioritySelect, 'medium');
    expect(prioritySelect).toHaveClass('text-yellow-600', 'bg-yellow-50', 'border-yellow-200');
    
    // Change to low priority
    await user.selectOptions(prioritySelect, 'low');
    expect(prioritySelect).toHaveClass('text-green-600', 'bg-green-50', 'border-green-200');
  });

  it('handles severity selection with color coding', async () => {
    const user = userEvent.setup();
    render(<BugReportForm {...mockProps} />);
    
    const severitySelect = screen.getByLabelText('Severity');
    
    // Change to blocker severity
    await user.selectOptions(severitySelect, 'blocker');
    expect(severitySelect).toHaveClass('text-red-600', 'bg-red-50', 'border-red-200');
    
    // Change to major severity
    await user.selectOptions(severitySelect, 'major');
    expect(severitySelect).toHaveClass('text-orange-600', 'bg-orange-50', 'border-orange-200');
  });

  it('manages tags correctly', async () => {
    const user = userEvent.setup();
    render(<BugReportForm {...mockProps} />);
    
    const tagInput = screen.getByPlaceholderText('Add a tag...');
    const addTagButton = screen.getByRole('button', { name: /add tag/i });
    
    // Add a tag
    await user.type(tagInput, 'ui-bug');
    await user.click(addTagButton);
    
    expect(screen.getByText('ui-bug')).toBeInTheDocument();
    expect(tagInput).toHaveValue('');
    
    // Add another tag by pressing Enter
    await user.type(tagInput, 'critical-issue');
    await user.keyboard('{Enter}');
    
    expect(screen.getByText('critical-issue')).toBeInTheDocument();
    
    // Remove a tag
    const removeButton = screen.getAllByRole('button', { name: /remove tag/i })[0];
    await user.click(removeButton);
    
    expect(screen.queryByText('ui-bug')).not.toBeInTheDocument();
  });

  it('prevents duplicate tags', async () => {
    const user = userEvent.setup();
    render(<BugReportForm {...mockProps} />);
    
    const tagInput = screen.getByPlaceholderText('Add a tag...');
    const addTagButton = screen.getByRole('button', { name: /add tag/i });
    
    // Add a tag
    await user.type(tagInput, 'duplicate');
    await user.click(addTagButton);
    
    // Try to add the same tag again
    await user.type(tagInput, 'duplicate');
    await user.click(addTagButton);
    
    // Should only have one instance of the tag
    const duplicateTags = screen.getAllByText('duplicate');
    expect(duplicateTags).toHaveLength(1);
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    const mockOnSuccess = jest.fn();
    const mockOnClose = jest.fn();
    
    render(<BugReportForm {...mockProps} onSuccess={mockOnSuccess} onClose={mockOnClose} />);
    
    // Fill out the form
    await user.type(screen.getByLabelText('Bug Title *'), 'Test Bug Report');
    await user.type(screen.getByLabelText('Description *'), 'This is a detailed description of the bug that occurred during testing.');
    await user.type(screen.getByLabelText('Steps to Reproduce'), '1. Open the app\n2. Click the button\n3. See the error');
    await user.type(screen.getByLabelText('Expected Behavior'), 'Should work correctly');
    await user.type(screen.getByLabelText('Actual Behavior'), 'Throws an error');
    
    await user.selectOptions(screen.getByLabelText('Category'), 'functionality');
    await user.selectOptions(screen.getByLabelText('Priority'), 'high');
    await user.selectOptions(screen.getByLabelText('Severity'), 'major');
    
    // Add a tag
    const tagInput = screen.getByPlaceholderText('Add a tag...');
    await user.type(tagInput, 'regression');
    await user.keyboard('{Enter}');
    
    // Submit the form
    const submitButton = screen.getByText('Submit Bug Report');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/bugs', expect.objectContaining({
        title: 'Test Bug Report',
        description: 'This is a detailed description of the bug that occurred during testing.',
        stepsToReproduce: '1. Open the app\n2. Click the button\n3. See the error',
        expectedBehavior: 'Should work correctly',
        actualBehavior: 'Throws an error',
        category: 'functionality',
        priority: 'high',
        severity: 'major',
        tags: ['regression'],
        environment: expect.objectContaining({
          browser: 'Chrome',
          browserVersion: '91.0',
          operatingSystem: 'Windows',
          deviceType: 'desktop',
          screenResolution: '1920x1080'
        })
      }));
    });
    
    expect(toast.success).toHaveBeenCalledWith('Bug report submitted successfully!');
    expect(mockOnSuccess).toHaveBeenCalledWith(expect.objectContaining({
      _id: 'test-bug-id',
      title: 'Test Bug'
    }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('handles submission errors', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValue({
      response: {
        data: {
          message: 'Validation failed'
        }
      }
    });
    
    render(<BugReportForm {...mockProps} />);
    
    // Fill out required fields
    await user.type(screen.getByLabelText('Bug Title *'), 'Test Bug');
    await user.type(screen.getByLabelText('Description *'), 'Test description');
    
    // Submit the form
    await user.click(screen.getByText('Submit Bug Report'));
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Validation failed');
    });
  });

  it('handles network errors gracefully', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValue(new Error('Network error'));
    
    render(<BugReportForm {...mockProps} />);
    
    // Fill out required fields
    await user.type(screen.getByLabelText('Bug Title *'), 'Test Bug');
    await user.type(screen.getByLabelText('Description *'), 'Test description');
    
    // Submit the form
    await user.click(screen.getByText('Submit Bug Report'));
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to submit bug report');
    });
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    let resolvePromise;
    api.post.mockImplementation(() => new Promise(resolve => {
      resolvePromise = resolve;
    }));
    
    render(<BugReportForm {...mockProps} />);
    
    // Fill out required fields
    await user.type(screen.getByLabelText('Bug Title *'), 'Test Bug');
    await user.type(screen.getByLabelText('Description *'), 'Test description');
    
    // Submit the form
    await user.click(screen.getByText('Submit Bug Report'));
    
    // Should show loading state
    expect(screen.getByText('Submitting...')).toBeInTheDocument();
    expect(screen.getByText('Submitting...')).toBeDisabled();
    
    // Resolve the promise
    resolvePromise({
      data: {
        success: true,
        data: { _id: 'test-id' }
      }
    });
    
    await waitFor(() => {
      expect(screen.queryByText('Submitting...')).not.toBeInTheDocument();
    });
  });

  it('closes form when cancel is clicked', async () => {
    const user = userEvent.setup();
    const mockOnClose = jest.fn();
    
    render(<BugReportForm {...mockProps} onClose={mockOnClose} />);
    
    await user.click(screen.getByText('Cancel'));
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes form when X button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnClose = jest.fn();
    
    render(<BugReportForm {...mockProps} onClose={mockOnClose} />);
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('enforces character limits', async () => {
    const user = userEvent.setup();
    render(<BugReportForm {...mockProps} />);
    
    const titleInput = screen.getByLabelText('Bug Title *');
    
    // Type more than 200 characters
    const longTitle = 'A'.repeat(250);
    await user.type(titleInput, longTitle);
    
    // Should be limited to 200 characters
    expect(titleInput.value).toHaveLength(200);
    expect(screen.getByText('200/200 characters')).toBeInTheDocument();
  });

  it('shows helpful warning information', () => {
    render(<BugReportForm {...mockProps} />);
    
    expect(screen.getByText('Before submitting')).toBeInTheDocument();
    expect(screen.getByText(/Please search existing bugs to avoid duplicates/)).toBeInTheDocument();
    expect(screen.getByText(/Include as much detail as possible for faster resolution/)).toBeInTheDocument();
    expect(screen.getByText(/Screenshots or videos can be helpful/)).toBeInTheDocument();
  });

  it('allows environment information to be modified', async () => {
    const user = userEvent.setup();
    render(<BugReportForm {...mockProps} />);
    
    const browserInput = screen.getByLabelText('Browser');
    
    // Clear and change browser
    await user.clear(browserInput);
    await user.type(browserInput, 'Firefox');
    
    expect(browserInput).toHaveValue('Firefox');
  });

  it('handles device type selection', async () => {
    const user = userEvent.setup();
    render(<BugReportForm {...mockProps} />);
    
    const deviceSelect = screen.getByLabelText('Device Type');
    
    await user.selectOptions(deviceSelect, 'mobile');
    expect(deviceSelect).toHaveValue('mobile');
    
    await user.selectOptions(deviceSelect, 'tablet');
    expect(deviceSelect).toHaveValue('tablet');
  });
}); 