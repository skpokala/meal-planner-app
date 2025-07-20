import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import TwoFactorVerification from '../../components/TwoFactorVerification';
import api from '../../services/api';
import toast from 'react-hot-toast';

// Mock dependencies
jest.mock('../../services/api');
jest.mock('react-hot-toast');

describe('TwoFactorVerification', () => {
  const mockProps = {
    temporaryToken: 'mock-temporary-token',
    onSuccess: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders the 2FA verification form', () => {
    render(<TwoFactorVerification {...mockProps} />);

    expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument();
    expect(screen.getByText('Enter the code from your authenticator app')).toBeInTheDocument();
    expect(screen.getByLabelText('Authenticator Code')).toBeInTheDocument();
    expect(screen.getByText('Verify & Sign In')).toBeInTheDocument();
  });

  it('renders help text and troubleshooting information', () => {
    render(<TwoFactorVerification {...mockProps} />);

    expect(screen.getByText('Having trouble?')).toBeInTheDocument();
    expect(screen.getByText(/Make sure your device's clock is accurate/)).toBeInTheDocument();
    expect(screen.getByText(/Try refreshing the code in your authenticator app/)).toBeInTheDocument();
    expect(screen.getByText(/Use a backup code if your authenticator isn't working/)).toBeInTheDocument();
  });

  describe('TOTP Code Input', () => {
    it('accepts only numeric input and limits to 6 digits', async () => {
      const user = userEvent.setup();
      render(<TwoFactorVerification {...mockProps} />);

      const totpInput = screen.getByPlaceholderText('000000');
      
      // Type mixed characters, should only accept numbers
      await user.type(totpInput, 'abc123def456');
      
      expect(totpInput.value).toBe('123456');
    });

    it('enables verify button when 6-digit code is entered', async () => {
      const user = userEvent.setup();
      render(<TwoFactorVerification {...mockProps} />);

      const totpInput = screen.getByPlaceholderText('000000');
      const verifyButton = screen.getByText('Verify & Sign In');

      expect(verifyButton).toBeDisabled();

      await user.type(totpInput, '12345');
      expect(verifyButton).toBeDisabled();

      await user.type(totpInput, '6');
      expect(verifyButton).not.toBeDisabled();
    });

    it('submits form when Enter key is pressed', async () => {
      const user = userEvent.setup();
      api.post.mockResolvedValueOnce({
        data: {
          success: true,
          token: 'new-auth-token',
          user: { id: 1, name: 'Test User' }
        }
      });

      render(<TwoFactorVerification {...mockProps} />);

      const totpInput = screen.getByPlaceholderText('000000');
      await user.type(totpInput, '123456');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/2fa/verify', {
          temporaryToken: 'mock-temporary-token',
          token: '123456'
        });
      });
    });
  });

  describe('Backup Code Input', () => {
    it('switches to backup code input mode', async () => {
      const user = userEvent.setup();
      render(<TwoFactorVerification {...mockProps} />);

      await user.click(screen.getByText('Use a backup code instead'));

      expect(screen.getByText('Enter one of your backup codes')).toBeInTheDocument();
      expect(screen.getByLabelText('Backup Code')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('XXXXXXXX')).toBeInTheDocument();
    });

    it('accepts only hexadecimal characters and limits to 8 characters', async () => {
      const user = userEvent.setup();
      render(<TwoFactorVerification {...mockProps} />);

      await user.click(screen.getByText('Use a backup code instead'));

      const backupInput = screen.getByPlaceholderText('XXXXXXXX');
      
      // Type mixed characters, should only accept hex and convert to uppercase
      await user.type(backupInput, 'abc123xyz789');
      
      expect(backupInput.value).toBe('ABC12378');
    });

    it('switches back to authenticator mode', async () => {
      const user = userEvent.setup();
      render(<TwoFactorVerification {...mockProps} />);

      await user.click(screen.getByText('Use a backup code instead'));
      await user.click(screen.getByText('Use authenticator app instead'));

      expect(screen.getByText('Enter the code from your authenticator app')).toBeInTheDocument();
      expect(screen.getByLabelText('Authenticator Code')).toBeInTheDocument();
    });

    it('shows backup code warning', async () => {
      const user = userEvent.setup();
      render(<TwoFactorVerification {...mockProps} />);

      await user.click(screen.getByText('Use a backup code instead'));

      expect(screen.getByText(/Backup codes can only be used once/)).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('successfully verifies TOTP code', async () => {
      const user = userEvent.setup();
      const mockResponseData = {
        success: true,
        token: 'new-auth-token',
        user: { id: 1, name: 'Test User', twoFactorEnabled: true }
      };

      api.post.mockResolvedValueOnce({ data: mockResponseData });

      render(<TwoFactorVerification {...mockProps} />);

      const totpInput = screen.getByPlaceholderText('000000');
      await user.type(totpInput, '123456');
      await user.click(screen.getByText('Verify & Sign In'));

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/2fa/verify', {
          temporaryToken: 'mock-temporary-token',
          token: '123456'
        });
        expect(toast.success).toHaveBeenCalledWith('Login successful!');
        expect(mockProps.onSuccess).toHaveBeenCalledWith(mockResponseData);
      });
    });

    it('successfully verifies backup code', async () => {
      const user = userEvent.setup();
      const mockResponseData = {
        success: true,
        token: 'new-auth-token',
        user: { id: 1, name: 'Test User', twoFactorEnabled: true }
      };

      api.post.mockResolvedValueOnce({ data: mockResponseData });

      render(<TwoFactorVerification {...mockProps} />);

      await user.click(screen.getByText('Use a backup code instead'));

      const backupInput = screen.getByPlaceholderText('XXXXXXXX');
      await user.type(backupInput, 'ABC12345');
      await user.click(screen.getByText('Verify & Sign In'));

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/2fa/verify', {
          temporaryToken: 'mock-temporary-token',
          backupCode: 'ABC12345'
        });
        expect(toast.success).toHaveBeenCalledWith('Login successful!');
        expect(mockProps.onSuccess).toHaveBeenCalledWith(mockResponseData);
      });
    });

    it('shows error for invalid TOTP code', async () => {
      const user = userEvent.setup();

      api.post.mockRejectedValueOnce({
        response: {
          data: { message: 'Invalid TOTP code or backup code' }
        }
      });

      render(<TwoFactorVerification {...mockProps} />);

      const totpInput = screen.getByPlaceholderText('000000');
      await user.type(totpInput, '000000');
      await user.click(screen.getByText('Verify & Sign In'));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Invalid TOTP code or backup code');
        expect(totpInput.value).toBe(''); // Input should be cleared
      });
    });

    it('shows error for invalid backup code', async () => {
      const user = userEvent.setup();

      api.post.mockRejectedValueOnce({
        response: {
          data: { message: 'Invalid TOTP code or backup code' }
        }
      });

      render(<TwoFactorVerification {...mockProps} />);

      await user.click(screen.getByText('Use a backup code instead'));

      const backupInput = screen.getByPlaceholderText('XXXXXXXX');
      await user.type(backupInput, 'ABCD1234');
      await user.click(screen.getByText('Verify & Sign In'));

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/2fa/verify', {
          temporaryToken: 'mock-temporary-token',
          backupCode: 'ABCD1234'
        });
        expect(toast.error).toHaveBeenCalledWith('Invalid TOTP code or backup code');
      });

      await waitFor(() => {
        expect(backupInput.value).toBe(''); // Input should be cleared
      });
    });

    it('shows generic error message for unknown errors', async () => {
      const user = userEvent.setup();

      api.post.mockRejectedValueOnce({
        response: null
      });

      render(<TwoFactorVerification {...mockProps} />);

      const totpInput = screen.getByPlaceholderText('000000');
      await user.type(totpInput, '123456');
      await user.click(screen.getByText('Verify & Sign In'));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Verification failed');
      });
    });

    it('shows loading state during verification', async () => {
      const user = userEvent.setup();

      // Mock a delayed response
      api.post.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      );

      render(<TwoFactorVerification {...mockProps} />);

      const totpInput = screen.getByPlaceholderText('000000');
      await user.type(totpInput, '123456');
      await user.click(screen.getByText('Verify & Sign In'));

      expect(screen.getByText('Verifying...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Verifying/ })).toBeDisabled();
    });
  });

  describe('Validation', () => {
    it('disables verify button for incomplete TOTP code', async () => {
      const user = userEvent.setup();
      render(<TwoFactorVerification {...mockProps} />);

      const totpInput = screen.getByPlaceholderText('000000');
      const verifyButton = screen.getByText('Verify & Sign In');
      
      expect(verifyButton).toBeDisabled();
      
      await user.type(totpInput, '123');
      expect(verifyButton).toBeDisabled();
      
      await user.type(totpInput, '456');
      expect(verifyButton).not.toBeDisabled();
    });

    it('disables verify button for incomplete backup code', async () => {
      const user = userEvent.setup();
      render(<TwoFactorVerification {...mockProps} />);

      await user.click(screen.getByText('Use a backup code instead'));

      const backupInput = screen.getByPlaceholderText('XXXXXXXX');
      const verifyButton = screen.getByText('Verify & Sign In');
      
      expect(verifyButton).toBeDisabled();
      
      await user.type(backupInput, 'ABC123');
      expect(verifyButton).toBeDisabled();
      
      await user.type(backupInput, '45');
      expect(verifyButton).not.toBeDisabled();
    });
  });

  describe('Cancel Functionality', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<TwoFactorVerification {...mockProps} />);

      await user.click(screen.getByText('Cancel and return to login'));

      expect(mockProps.onCancel).toHaveBeenCalled();
    });

    it('disables cancel button during verification', async () => {
      const user = userEvent.setup();

      // Mock a delayed response
      api.post.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      );

      render(<TwoFactorVerification {...mockProps} />);

      const totpInput = screen.getByPlaceholderText('000000');
      await user.type(totpInput, '123456');
      await user.click(screen.getByText('Verify & Sign In'));

      const cancelButton = screen.getByText('Cancel and return to login');
      expect(cancelButton).toBeDisabled();
    });
  });

  describe('Input Focus Management', () => {
    it('focuses TOTP input by default', () => {
      render(<TwoFactorVerification {...mockProps} />);

      const totpInput = screen.getByPlaceholderText('000000');
      expect(totpInput).toHaveFocus();
    });

    it('focuses backup code input when switching modes', async () => {
      const user = userEvent.setup();
      render(<TwoFactorVerification {...mockProps} />);

      await user.click(screen.getByText('Use a backup code instead'));

      const backupInput = screen.getByPlaceholderText('XXXXXXXX');
      expect(backupInput).toHaveFocus();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for inputs', () => {
      render(<TwoFactorVerification {...mockProps} />);

      expect(screen.getByLabelText('Authenticator Code')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('000000')).toHaveAttribute('autoComplete', 'one-time-code');
    });

    it('has proper ARIA labels for backup code input', async () => {
      const user = userEvent.setup();
      render(<TwoFactorVerification {...mockProps} />);

      await user.click(screen.getByText('Use a backup code instead'));

      expect(screen.getByLabelText('Backup Code')).toBeInTheDocument();
    });

    it('maintains proper heading hierarchy', () => {
      render(<TwoFactorVerification {...mockProps} />);

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('Two-Factor Authentication');
    });
  });

  describe('Toggle Behavior', () => {
    it('clears inputs when switching between modes', async () => {
      const user = userEvent.setup();
      render(<TwoFactorVerification {...mockProps} />);

      // Enter TOTP code
      const totpInput = screen.getByPlaceholderText('000000');
      await user.type(totpInput, '123456');

      // Switch to backup code
      await user.click(screen.getByText('Use a backup code instead'));

      // Switch back to TOTP
      await user.click(screen.getByText('Use authenticator app instead'));

      const newTotpInput = screen.getByPlaceholderText('000000');
      expect(newTotpInput.value).toBe('');
    });

    it('disables toggle buttons during loading', async () => {
      const user = userEvent.setup();

      // Mock a delayed response
      api.post.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      );

      render(<TwoFactorVerification {...mockProps} />);

      const totpInput = screen.getByPlaceholderText('000000');
      await user.type(totpInput, '123456');
      await user.click(screen.getByText('Verify & Sign In'));

      const toggleButton = screen.getByText('Use a backup code instead');
      expect(toggleButton).toBeDisabled();
    });
  });
}); 