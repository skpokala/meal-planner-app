import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Version from '../Version';
import api from '../../services/api';

// Mock the API service
jest.mock('../../services/api', () => ({
  get: jest.fn()
}));

describe('Version Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders frontend version', async () => {
    // Mock environment variable
    process.env.REACT_APP_VERSION = '1.1.0';
    
    // Mock backend API response
    api.get.mockResolvedValue({
      data: { version: '1.1.0' }
    });

    render(<Version />);
    
    await waitFor(() => {
      expect(screen.getByText('Version: v1.1.0')).toBeInTheDocument();
    });
  });

  test('renders both frontend and backend versions when different', async () => {
    // Mock environment variable
    process.env.REACT_APP_VERSION = '1.1.0';
    
    // Mock backend API response with different version
    api.get.mockResolvedValue({
      data: { version: '1.0.0' }
    });

    render(<Version />);
    
    await waitFor(() => {
      expect(screen.getByText('Frontend: v1.1.0')).toBeInTheDocument();
      expect(screen.getByText('Backend: v1.0.0')).toBeInTheDocument();
    });
  });

  test('handles API error gracefully', async () => {
    // Mock environment variable
    process.env.REACT_APP_VERSION = '1.1.0';
    
    // Mock API error
    api.get.mockRejectedValue(new Error('API Error'));

    render(<Version />);
    
    await waitFor(() => {
      expect(screen.getByText('Version: v1.1.0')).toBeInTheDocument();
    });
  });

  test('uses default version when environment variable is not set', async () => {
    // Clear environment variable
    delete process.env.REACT_APP_VERSION;
    
    // Mock backend API response
    api.get.mockResolvedValue({
      data: { version: '1.0.0' }
    });

    render(<Version />);
    
    await waitFor(() => {
      expect(screen.getByText('Frontend: vdev')).toBeInTheDocument();
      expect(screen.getByText('Backend: v1.0.0')).toBeInTheDocument();
    });
  });

  test('displays build time when available', async () => {
    // Mock environment variables
    process.env.REACT_APP_VERSION = '1.1.0';
    process.env.REACT_APP_BUILD_TIME = '2024-01-15T14:30:00Z';
    
    // Mock backend API response
    api.get.mockResolvedValue({
      data: { version: '1.1.0' }
    });

    render(<Version />);
    
    await waitFor(() => {
      expect(screen.getByText('Version: v1.1.0')).toBeInTheDocument();
      expect(screen.getByText(/Built: Jan 15, 2024/)).toBeInTheDocument();
    });
  });

  test('handles collapsed sidebar with build time in tooltip', async () => {
    // Mock environment variables
    process.env.REACT_APP_VERSION = '1.1.0';
    process.env.REACT_APP_BUILD_TIME = '2024-01-15T14:30:00Z';
    
    // Mock backend API response
    api.get.mockResolvedValue({
      data: { version: '1.1.0' }
    });

    render(<Version sidebarCollapsed={true} />);
    
    await waitFor(() => {
      const tooltipElement = screen.getByTitle(/Version: v1\.1\.0.*Built:/);
      expect(tooltipElement).toBeInTheDocument();
    });
  });
}); 