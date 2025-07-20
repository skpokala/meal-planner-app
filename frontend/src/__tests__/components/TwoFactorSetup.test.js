import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import TwoFactorSetup from '../../components/TwoFactorSetup';
import api from '../../services/api';
import toast from 'react-hot-toast';

// Mock dependencies
jest.mock('../../services/api');
jest.mock('react-hot-toast');

// Simple test suite focusing on core functionality
describe('TwoFactorSetup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock successful API response
    api.get.mockResolvedValue({
      data: {
        twoFactorEnabled: false,
        setupCompleted: false,
        backupCodesGenerated: false
      }
    });
  });

  it('renders without crashing', async () => {
    render(<TwoFactorSetup />);
    
    await waitFor(() => {
      expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument();
    });
  });

  it('shows 2FA status when loaded', async () => {
    render(<TwoFactorSetup />);
    
    await waitFor(() => {
      expect(screen.getByText('2FA is disabled')).toBeInTheDocument();
      expect(screen.getByText('Enable 2FA')).toBeInTheDocument();
    });
  });

  it('shows manage 2FA when enabled', async () => {
    api.get.mockResolvedValue({
      data: {
        twoFactorEnabled: true,
        setupCompleted: true,
        backupCodesGenerated: true
      }
    });

    render(<TwoFactorSetup />);
    
    await waitFor(() => {
      expect(screen.getByText('2FA is enabled')).toBeInTheDocument();
      expect(screen.getByText('Manage 2FA')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    api.get.mockRejectedValue(new Error('Network error'));

    render(<TwoFactorSetup />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to load 2FA status');
    });
  });
}); 