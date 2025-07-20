import React, { useState, useEffect } from 'react';
import { Shield, Smartphone, Key, Download, AlertTriangle, CheckCircle } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const TwoFactorSetup = () => {
  const [status, setStatus] = useState({
    twoFactorEnabled: false,
    setupCompleted: false,
    loading: true
  });
  const [setupData, setSetupData] = useState(null);
  const [currentStep, setCurrentStep] = useState('check'); // check, password, qr, verify, complete
  const [password, setPassword] = useState('');
  const [totpToken, setTotpToken] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await api.get('/2fa/status');
      setStatus({ ...response.data, loading: false });
    } catch (error) {
      console.error('Failed to fetch 2FA status:', error);
      setStatus(prev => ({ ...prev, loading: false }));
      toast.error('Failed to load 2FA status');
    }
  };

  const initializeSetup = async () => {
    if (!password) {
      toast.error('Please enter your password');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/2fa/setup/init', { password });
      setSetupData(response.data);
      setCurrentStep('qr');
      toast.success('QR code generated. Scan with your authenticator app.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to initialize 2FA setup');
    } finally {
      setLoading(false);
    }
  };

  const verifySetup = async () => {
    if (!totpToken || totpToken.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/2fa/setup/verify', { token: totpToken });
      setBackupCodes(response.data.backupCodes);
      setCurrentStep('complete');
      toast.success('2FA enabled successfully!');
      fetchStatus(); // Refresh status
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to verify 2FA setup');
    } finally {
      setLoading(false);
    }
  };

  const disable2FA = async () => {
    if (!password) {
      toast.error('Please enter your password');
      return;
    }

    if (!window.confirm('Are you sure you want to disable 2FA? This will reduce your account security.')) {
      return;
    }

    setLoading(true);
    try {
      await api.post('/2fa/disable', { password });
      toast.success('2FA disabled successfully');
      fetchStatus();
      setCurrentStep('check');
      setPassword('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const regenerateBackupCodes = async () => {
    if (!password) {
      toast.error('Please enter your password');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/2fa/backup-codes/regenerate', { password });
      setBackupCodes(response.data.backupCodes);
      toast.success('New backup codes generated');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to regenerate backup codes');
    } finally {
      setLoading(false);
    }
  };

  const downloadBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'meal-planner-2fa-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Backup codes downloaded');
  };

  if (status.loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center mb-6">
          <Shield className="w-8 h-8 text-primary-600 mr-3" />
          <div>
            <h2 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
              Two-Factor Authentication
            </h2>
            <p className="text-secondary-600 dark:text-secondary-400">
              Secure your account with an extra layer of protection
            </p>
          </div>
        </div>

        {/* Current Status */}
        <div className={`p-4 rounded-lg mb-6 ${
          status.twoFactorEnabled 
            ? 'bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800'
            : 'bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
        }`}>
          <div className="flex items-center">
            {status.twoFactorEnabled ? (
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2" />
            )}
            <span className={`font-medium ${
              status.twoFactorEnabled 
                ? 'text-green-800 dark:text-green-200'
                : 'text-yellow-800 dark:text-yellow-200'
            }`}>
              2FA is {status.twoFactorEnabled ? 'enabled' : 'disabled'}
            </span>
          </div>
        </div>

        {/* Setup Flow */}
        {!status.twoFactorEnabled && currentStep === 'check' && (
          <div className="space-y-4">
            <p className="text-secondary-700 dark:text-secondary-300">
              Two-factor authentication adds an extra layer of security to your account. 
              You'll need an authenticator app like Google Authenticator or Authy.
            </p>
            <button
              onClick={() => setCurrentStep('password')}
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Enable 2FA
            </button>
          </div>
        )}

        {/* Password Verification Step */}
        {currentStep === 'password' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
              Verify Your Password
            </h3>
            <p className="text-secondary-600 dark:text-secondary-400">
              Please enter your current password to continue.
            </p>
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-secondary-700 dark:text-secondary-100"
                onKeyPress={(e) => e.key === 'Enter' && initializeSetup()}
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={initializeSetup}
                disabled={loading || !password}
                className="bg-primary-600 hover:bg-primary-700 disabled:bg-secondary-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {loading ? 'Generating...' : 'Continue'}
              </button>
              <button
                onClick={() => setCurrentStep('check')}
                className="bg-secondary-500 hover:bg-secondary-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* QR Code Step */}
        {currentStep === 'qr' && setupData && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
              Scan QR Code
            </h3>
            <p className="text-secondary-600 dark:text-secondary-400">
              Scan this QR code with your authenticator app:
            </p>
            
            <div className="flex flex-col items-center space-y-4">
              <div className="bg-white p-4 rounded-lg">
                <img src={setupData.qrCode} alt="2FA QR Code" className="w-64 h-64" />
              </div>
              
              <div className="text-center">
                <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-2">
                  Can't scan? Enter this code manually:
                </p>
                <code className="bg-secondary-100 dark:bg-secondary-700 px-2 py-1 rounded text-sm font-mono">
                  {setupData.manualEntryKey}
                </code>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-sm text-secondary-600 dark:text-secondary-400">
              <Smartphone className="w-4 h-4" />
              <span>Supported apps: Google Authenticator, Authy, 1Password, etc.</span>
            </div>

            <button
              onClick={() => setCurrentStep('verify')}
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              I've Added the Account
            </button>
          </div>
        )}

        {/* Verification Step */}
        {currentStep === 'verify' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
              Verify Setup
            </h3>
            <p className="text-secondary-600 dark:text-secondary-400">
              Enter the 6-digit code from your authenticator app:
            </p>
            <div>
              <input
                type="text"
                value={totpToken}
                onChange={(e) => setTotpToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="w-full text-center text-2xl font-mono px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-secondary-700 dark:text-secondary-100"
                onKeyPress={(e) => e.key === 'Enter' && verifySetup()}
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={verifySetup}
                disabled={loading || totpToken.length !== 6}
                className="bg-primary-600 hover:bg-primary-700 disabled:bg-secondary-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {loading ? 'Verifying...' : 'Verify & Enable'}
              </button>
              <button
                onClick={() => setCurrentStep('qr')}
                className="bg-secondary-500 hover:bg-secondary-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* Backup Codes Display */}
        {(currentStep === 'complete' || (status.twoFactorEnabled && backupCodes.length > 0)) && (
          <div className="space-y-4">
            <div className="flex items-center mb-4">
              <Key className="w-5 h-5 text-yellow-600 mr-2" />
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
                Backup Codes
              </h3>
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">Important!</p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Save these backup codes in a secure location. Each code can only be used once.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 p-4 bg-secondary-100 dark:bg-secondary-700 rounded-lg">
              {backupCodes.map((code, index) => (
                <code key={index} className="text-sm font-mono text-center py-1">
                  {code}
                </code>
              ))}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={downloadBackupCodes}
                className="flex items-center bg-secondary-600 hover:bg-secondary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Codes
              </button>
              {currentStep === 'complete' && (
                <button
                  onClick={() => {
                    setCurrentStep('check');
                    setPassword('');
                    setTotpToken('');
                    setBackupCodes([]);
                  }}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        )}

        {/* Management Options (when 2FA is enabled) */}
        {status.twoFactorEnabled && currentStep === 'check' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
              Manage 2FA
            </h3>
            
            <div className="space-y-3">
              {/* Regenerate Backup Codes */}
              <div className="border border-secondary-200 dark:border-secondary-700 rounded-lg p-4">
                <h4 className="font-medium text-secondary-900 dark:text-secondary-100 mb-2">
                  Backup Codes
                </h4>
                <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-3">
                  Generate new backup codes if you've lost the previous ones.
                </p>
                <div className="flex space-x-2 mb-3">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="flex-1 px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-secondary-700 dark:text-secondary-100"
                  />
                  <button
                    onClick={regenerateBackupCodes}
                    disabled={loading || !password}
                    className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-secondary-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    {loading ? 'Generating...' : 'Generate New'}
                  </button>
                </div>
              </div>

              {/* Disable 2FA */}
              <div className="border border-red-200 dark:border-red-800 rounded-lg p-4">
                <h4 className="font-medium text-red-900 dark:text-red-100 mb-2">
                  Disable Two-Factor Authentication
                </h4>
                <p className="text-sm text-red-600 dark:text-red-400 mb-3">
                  This will reduce your account security. Not recommended.
                </p>
                <div className="flex space-x-2">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="flex-1 px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-secondary-700 dark:text-secondary-100"
                  />
                  <button
                    onClick={disable2FA}
                    disabled={loading || !password}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-secondary-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    {loading ? 'Disabling...' : 'Disable 2FA'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TwoFactorSetup; 