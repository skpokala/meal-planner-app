import React, { useState } from 'react';
import { Shield, Smartphone, Key, AlertCircle } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const TwoFactorVerification = ({ temporaryToken, onSuccess, onCancel }) => {
  const [totpToken, setTotpToken] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    console.log('2FA verification started:', { 
      useBackupCode, 
      hasTotpToken: !!totpToken, 
      hasBackupCode: !!backupCode,
      hasTemporaryToken: !!temporaryToken 
    });
    
    if (useBackupCode) {
      if (!backupCode || backupCode.length !== 8) {
        toast.error('Please enter a valid 8-character backup code');
        return;
      }
    } else {
      if (!totpToken || totpToken.length !== 6) {
        toast.error('Please enter a valid 6-digit code');
        return;
      }
    }

    setLoading(true);
    try {
      console.log('Making 2FA verification API call...');
      const response = await api.post('/2fa/verify', {
        temporaryToken,
        ...(useBackupCode ? { backupCode } : { token: totpToken })
      });
      console.log('2FA verification successful:', response.data);

      toast.success('Login successful!');
      onSuccess(response.data);
    } catch (error) {
      console.error('2FA verification error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      const errorMessage = error.response?.data?.message || 'Verification failed';
      console.log('Displaying error message:', errorMessage);
      toast.error(errorMessage);
      
      // Clear the input on error
      if (useBackupCode) {
        setBackupCode('');
      } else {
        setTotpToken('');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleBackupCode = () => {
    setUseBackupCode(!useBackupCode);
    setTotpToken('');
    setBackupCode('');
  };

  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <Shield className="w-12 h-12 text-primary-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-secondary-900 dark:text-secondary-100">
            Two-Factor Authentication
          </h2>
          <p className="mt-2 text-center text-sm text-secondary-600 dark:text-secondary-400">
            {useBackupCode 
              ? 'Enter one of your backup codes'
              : 'Enter the code from your authenticator app'
            }
          </p>
        </div>

        <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-lg p-6">
          <div className="space-y-6">
            {/* TOTP Code Input */}
            {!useBackupCode && (
              <div>
                <label htmlFor="totp" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                  <div className="flex items-center">
                    <Smartphone className="w-4 h-4 mr-2" />
                    Authenticator Code
                  </div>
                </label>
                <input
                  id="totp"
                  type="text"
                  value={totpToken}
                  onChange={(e) => setTotpToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full text-center text-2xl font-mono px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-secondary-700 dark:text-secondary-100"
                  onKeyPress={(e) => e.key === 'Enter' && handleVerify()}
                  autoComplete="one-time-code"
                  autoFocus
                />
                <p className="mt-2 text-xs text-secondary-500 dark:text-secondary-400 text-center">
                  The code refreshes every 30 seconds
                </p>
              </div>
            )}

            {/* Backup Code Input */}
            {useBackupCode && (
              <div>
                <label htmlFor="backup" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                  <div className="flex items-center">
                    <Key className="w-4 h-4 mr-2" />
                    Backup Code
                  </div>
                </label>
                <input
                  id="backup"
                  type="text"
                  value={backupCode}
                  onChange={(e) => setBackupCode(e.target.value.replace(/[^A-Fa-f0-9]/g, '').toUpperCase().slice(0, 8))}
                  placeholder="XXXXXXXX"
                  maxLength={8}
                  className="w-full text-center text-xl font-mono px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-secondary-700 dark:text-secondary-100"
                  onKeyPress={(e) => e.key === 'Enter' && handleVerify()}
                  autoFocus
                />
                <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-start">
                    <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-2 flex-shrink-0" />
                    <p className="text-xs text-yellow-700 dark:text-yellow-300">
                      Backup codes can only be used once. Make sure to generate new ones after using all of them.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-4">
              <button
                onClick={handleVerify}
                disabled={loading || (!useBackupCode && totpToken.length !== 6) || (useBackupCode && backupCode.length !== 8)}
                className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-secondary-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Verifying...
                  </div>
                ) : (
                  'Verify & Sign In'
                )}
              </button>

              {/* Toggle between TOTP and backup code */}
              <div className="text-center">
                <button
                  onClick={toggleBackupCode}
                  disabled={loading}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 transition-colors"
                >
                  {useBackupCode 
                    ? 'Use authenticator app instead' 
                    : 'Use a backup code instead'
                  }
                </button>
              </div>

              {/* Cancel button */}
              <div className="text-center">
                <button
                  onClick={onCancel}
                  disabled={loading}
                  className="text-sm text-secondary-600 dark:text-secondary-400 hover:text-secondary-800 dark:hover:text-secondary-300 transition-colors"
                >
                  Cancel and return to login
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Help Text */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
            Having trouble?
          </h4>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• Make sure your device's clock is accurate</li>
            <li>• Try refreshing the code in your authenticator app</li>
            <li>• Use a backup code if your authenticator isn't working</li>
            <li>• Contact support if you've lost access to both</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TwoFactorVerification; 