import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ReleaseNotesModal from '../ReleaseNotesModal';
import api from '../../services/api';

// Mock the API
jest.mock('../../services/api');

const mockReleaseNotes = [
  {
    _id: '1',
    version: '1.2.0',
    title: 'New Features Update',
    content: 'This release includes several new features and improvements to enhance your experience.',
    type: 'minor',
    author: 'Development Team',
    releaseDate: '2024-01-15T10:00:00Z',
    features: [
      { type: 'User Interface', description: 'Enhanced dashboard with new widgets' },
      { type: 'Performance', description: 'Improved loading times by 40%' }
    ],
    bugFixes: [
      { type: 'Authentication', description: 'Fixed login timeout issue' }
    ],
    improvements: [
      { type: 'Accessibility', description: 'Better screen reader support' }
    ],
    githubPullRequests: [
      { number: 123, title: 'Add new dashboard widgets', url: 'https://github.com/example/repo/pull/123' }
    ]
  },
  {
    _id: '2',
    version: '1.1.5',
    title: 'Bug Fixes',
    content: 'This patch release fixes several critical bugs.',
    type: 'patch',
    author: 'Bug Fix Team',
    releaseDate: '2024-01-10T14:30:00Z',
    features: [],
    bugFixes: [
      { type: 'Data Sync', description: 'Fixed data synchronization issues' }
    ],
    improvements: []
  }
];

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('ReleaseNotesModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Modal Visibility', () => {
    it('should not render when isOpen is false', () => {
      renderWithRouter(
        <ReleaseNotesModal isOpen={false} onClose={jest.fn()} releaseNotes={mockReleaseNotes} />
      );
      
      expect(screen.queryByText('New Features Update')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      renderWithRouter(
        <ReleaseNotesModal isOpen={true} onClose={jest.fn()} releaseNotes={mockReleaseNotes} />
      );
      
      expect(screen.getByText('New Features Update')).toBeInTheDocument();
    });
  });

  describe('Release Notes Content', () => {
    beforeEach(() => {
      renderWithRouter(
        <ReleaseNotesModal isOpen={true} onClose={jest.fn()} releaseNotes={mockReleaseNotes} />
      );
    });

    it('should display release version and title', () => {
      expect(screen.getByText('v1.2.0')).toBeInTheDocument();
      expect(screen.getByText('New Features Update')).toBeInTheDocument();
    });

    it('should display release type badge', () => {
      expect(screen.getByText('MINOR')).toBeInTheDocument();
    });

    it('should display author and date', () => {
      expect(screen.getByText('Development Team')).toBeInTheDocument();
      expect(screen.getByText('January 15, 2024')).toBeInTheDocument();
    });

    it('should display release content', () => {
      expect(screen.getByText(/This release includes several new features/)).toBeInTheDocument();
    });

    it('should display features section', () => {
      expect(screen.getByText('New Features')).toBeInTheDocument();
      expect(screen.getByText('User Interface')).toBeInTheDocument();
      expect(screen.getByText('Enhanced dashboard with new widgets')).toBeInTheDocument();
      expect(screen.getByText('Performance')).toBeInTheDocument();
      expect(screen.getByText('Improved loading times by 40%')).toBeInTheDocument();
    });

    it('should display bug fixes section', () => {
      expect(screen.getByText('Bug Fixes')).toBeInTheDocument();
      expect(screen.getByText('Authentication')).toBeInTheDocument();
      expect(screen.getByText('Fixed login timeout issue')).toBeInTheDocument();
    });

    it('should display improvements section', () => {
      expect(screen.getByText('Improvements')).toBeInTheDocument();
      expect(screen.getByText('Accessibility')).toBeInTheDocument();
      expect(screen.getByText('Better screen reader support')).toBeInTheDocument();
    });

    it('should display GitHub pull requests', () => {
      expect(screen.getByText('Related Pull Requests:')).toBeInTheDocument();
      expect(screen.getByText('#123')).toBeInTheDocument();
    });
  });

  describe('Multiple Release Notes Navigation', () => {
    beforeEach(() => {
      renderWithRouter(
        <ReleaseNotesModal isOpen={true} onClose={jest.fn()} releaseNotes={mockReleaseNotes} />
      );
    });

    it('should display progress indicator for multiple releases', () => {
      expect(screen.getByText('Release 1 of 2')).toBeInTheDocument();
    });

    it('should navigate to next release', async () => {
      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);
      
      // Wait for the navigation to complete
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Bug Fixes' })).toBeInTheDocument();
        expect(screen.getByText('v1.1.5')).toBeInTheDocument();
        expect(screen.getByText('Release 2 of 2')).toBeInTheDocument();
      });
    });

    it('should navigate to previous release', async () => {
      // Go to next release first
      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);
      
      // Wait for the state to update and Previous button to appear
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Bug Fixes' })).toBeInTheDocument();
        expect(screen.getByText('Previous')).toBeInTheDocument();
      });
      
      // Then go back to previous
      const prevButton = screen.getByText('Previous');
      fireEvent.click(prevButton);
      
      // Wait for the navigation to complete
      await waitFor(() => {
        expect(screen.getByText('New Features Update')).toBeInTheDocument();
        expect(screen.getByText('v1.2.0')).toBeInTheDocument();
      });
    });

    it('should show "Got it!" button on last release', async () => {
      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);
      
      // Wait for the navigation to complete and "Got it!" button to appear
      await waitFor(() => {
        expect(screen.getByText('Got it!')).toBeInTheDocument();
        expect(screen.queryByText('Next')).not.toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    const mockOnClose = jest.fn();

    beforeEach(() => {
      api.post.mockResolvedValue({ data: { success: true } });
    });

    it('should call onClose when close button is clicked', async () => {
      renderWithRouter(
        <ReleaseNotesModal isOpen={true} onClose={mockOnClose} releaseNotes={mockReleaseNotes} />
      );
      
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should call onClose when "Got it!" button is clicked', async () => {
      renderWithRouter(
        <ReleaseNotesModal isOpen={true} onClose={mockOnClose} releaseNotes={[mockReleaseNotes[0]]} />
      );
      
      const gotItButton = screen.getByText('Got it!');
      fireEvent.click(gotItButton);
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should mark release as viewed when closing', async () => {
      renderWithRouter(
        <ReleaseNotesModal isOpen={true} onClose={mockOnClose} releaseNotes={[mockReleaseNotes[0]]} />
      );
      
      const gotItButton = screen.getByText('Got it!');
      fireEvent.click(gotItButton);
      
      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/release-notes/1/mark-viewed');
      });
    });

    it('should mark release as viewed when navigating to next', async () => {
      renderWithRouter(
        <ReleaseNotesModal isOpen={true} onClose={mockOnClose} releaseNotes={mockReleaseNotes} />
      );
      
      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);
      
      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/release-notes/1/mark-viewed');
      });
    });
  });

  describe('API Integration', () => {
    it('should fetch unviewed release notes when no initial data provided', async () => {
      api.get.mockResolvedValue({
        data: { data: mockReleaseNotes }
      });

      renderWithRouter(
        <ReleaseNotesModal isOpen={true} onClose={jest.fn()} />
      );

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/release-notes/unviewed');
      });

      await waitFor(() => {
        expect(screen.getByText('New Features Update')).toBeInTheDocument();
      });
    });

    it('should show loading state while fetching data', async () => {
      api.get.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      renderWithRouter(
        <ReleaseNotesModal isOpen={true} onClose={jest.fn()} />
      );

      expect(screen.getByText('Loading release notes...')).toBeInTheDocument();
    });

    it('should handle API errors gracefully', async () => {
      api.get.mockRejectedValue(new Error('API Error'));

      renderWithRouter(
        <ReleaseNotesModal isOpen={true} onClose={jest.fn()} />
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load release notes')).toBeInTheDocument();
      });
    });

    it('should show message when no release notes available', async () => {
      api.get.mockResolvedValue({
        data: { data: [] }
      });

      renderWithRouter(
        <ReleaseNotesModal isOpen={true} onClose={jest.fn()} />
      );

      await waitFor(() => {
        expect(screen.getByText('No new release notes available')).toBeInTheDocument();
      });
    });
  });

  describe('Release Type Styling', () => {
    const testCases = [
      { type: 'major', expectedClass: 'text-red-500' },
      { type: 'minor', expectedClass: 'text-blue-500' },
      { type: 'patch', expectedClass: 'text-green-500' },
      { type: 'hotfix', expectedClass: 'text-orange-500' }
    ];

    testCases.forEach(({ type, expectedClass }) => {
      it(`should apply correct styling for ${type} release`, () => {
        const releaseWithType = {
          ...mockReleaseNotes[0],
          type,
          title: `${type} Release`
        };

        renderWithRouter(
          <ReleaseNotesModal isOpen={true} onClose={jest.fn()} releaseNotes={[releaseWithType]} />
        );

        const typeIcon = screen.getByText(type.toUpperCase()).parentElement.querySelector('svg');
        expect(typeIcon).toHaveClass(expectedClass);
      });
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      renderWithRouter(
        <ReleaseNotesModal isOpen={true} onClose={jest.fn()} releaseNotes={mockReleaseNotes} />
      );
    });

    it('should have proper ARIA attributes', () => {
      const modal = screen.getByRole('dialog', { hidden: true });
      expect(modal).toBeInTheDocument();
    });

    it('should focus management work correctly', () => {
      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      const nextButton = screen.getByText('Next');
      fireEvent.keyDown(nextButton, { key: 'Enter' });
      
      expect(screen.getByText('Bug Fixes')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle release notes without features, bugs, or improvements', () => {
      const minimalRelease = {
        _id: '3',
        version: '1.0.0',
        title: 'Minimal Release',
        content: 'Simple release with no detailed changes',
        type: 'patch',
        author: 'Team',
        releaseDate: '2024-01-01T00:00:00Z',
        features: [],
        bugFixes: [],
        improvements: []
      };

      renderWithRouter(
        <ReleaseNotesModal isOpen={true} onClose={jest.fn()} releaseNotes={[minimalRelease]} />
      );

      expect(screen.getByText('Minimal Release')).toBeInTheDocument();
      expect(screen.queryByText('New Features')).not.toBeInTheDocument();
      expect(screen.queryByText('Bug Fixes')).not.toBeInTheDocument();
      expect(screen.queryByText('Improvements')).not.toBeInTheDocument();
    });

    it('should handle long content gracefully', () => {
      const longContentRelease = {
        ...mockReleaseNotes[0],
        content: 'A'.repeat(1000)
      };

      renderWithRouter(
        <ReleaseNotesModal isOpen={true} onClose={jest.fn()} releaseNotes={[longContentRelease]} />
      );

      expect(screen.getByText('A'.repeat(1000))).toBeInTheDocument();
    });

    it('should handle single release note', () => {
      renderWithRouter(
        <ReleaseNotesModal isOpen={true} onClose={jest.fn()} releaseNotes={[mockReleaseNotes[0]]} />
      );

      expect(screen.queryByText('Release 1 of 1')).not.toBeInTheDocument();
      expect(screen.queryByText('Next')).not.toBeInTheDocument();
      expect(screen.queryByText('Previous')).not.toBeInTheDocument();
      expect(screen.getByText('Got it!')).toBeInTheDocument();
    });
  });
}); 