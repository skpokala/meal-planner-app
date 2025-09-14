import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import ThemeToggle from '../components/ThemeToggle';
import TwoFactorVerification from '../components/TwoFactorVerification';
import api from '../services/api';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [temporaryToken, setTemporaryToken] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { username, password });
      
      if (response.data.requiresTwoFactor) {
        // 2FA is required, show verification screen
        setTemporaryToken(response.data.temporaryToken);
        setShowTwoFactor(true);
        try {
          toast.success(response.data.message);
        } catch (toastError) {
          // Fallback to console log if toast fails
          console.log('2FA required:', response.data.message);
        }
      } else {
        // No 2FA required, proceed with login
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        
        try {
          toast.success('Welcome back!');
        } catch (toastError) {
          console.log('Login successful!');
        }
        
        window.location.href = '/dashboard';
      }
    } catch (error) {
      // Check if this is a toast-related error and handle 2FA flow
      if (error.message && error.message.includes('qt.info is not a function')) {
        // This means the 2FA flow was triggered but toast failed
        // Check if we have a response with 2FA data
        if (error.response?.data?.requiresTwoFactor) {
          setTemporaryToken(error.response.data.temporaryToken);
          setShowTwoFactor(true);
          setLoading(false);
          return;
        }
      }
      
      const errorMessage = error.response?.data?.message || 'Login failed. Please try again.';
      try {
        toast.error(errorMessage);
      } catch (toastError) {
        console.log('Login error:', errorMessage);
      }
      
      // Reset 2FA state on error
      setShowTwoFactor(false);
      setTemporaryToken('');
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorSuccess = (data) => {
    // 2FA verification successful, complete login
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    
    // Reload the page to trigger the AuthContext to load the user
    window.location.href = '/dashboard';
  };

  const handleTwoFactorCancel = () => {
    // User cancelled 2FA, return to login form
    setShowTwoFactor(false);
    setTemporaryToken('');
    setPassword('');
  };

  // Show 2FA verification if required
  if (showTwoFactor) {
    return (
      <TwoFactorVerification
        temporaryToken={temporaryToken}
        onSuccess={handleTwoFactorSuccess}
        onCancel={handleTwoFactorCancel}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-100 dark:from-secondary-900 dark:to-secondary-800 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      {/* Theme Toggle - positioned in top right corner */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle variant="simple" />
      </div>
      
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex items-center justify-center">
            <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center">
              <Calendar className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold text-secondary-900 dark:text-secondary-100">
            Family Meal Planner
          </h2>
          <p className="mt-2 text-center text-sm text-secondary-600 dark:text-secondary-400">
            Sign in to your account
          </p>
        </div>

        <div className="card">
          <div className="card-body">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input"
                  placeholder="Enter your username"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input pr-10"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-secondary-400 hover:text-secondary-600 dark:text-secondary-500 dark:hover:text-secondary-400"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>


      </div>
    </div>
  );
};

export default Login; 