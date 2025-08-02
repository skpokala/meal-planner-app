import React, { useState } from 'react';
import { User, Lock, Save, Shield, MapPin } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import TwoFactorSetup from '../components/TwoFactorSetup';
import LocationInput from '../components/LocationInput';
import LocationDisplay from '../components/LocationDisplay';
import LocationPrompt from '../components/LocationPrompt';
import toast from 'react-hot-toast';

const Settings = () => {
  const { user, updateProfile, changePassword, setMasterPassword } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
  });

  const [locationData, setLocationData] = useState({
    location: user?.location || {
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'USA'
      },
      coordinates: {
        latitude: null,
        longitude: null
      },
      timezone: 'America/New_York'
    }
  });

  // Check if user has any meaningful location data
  const hasLocationData = () => {
    const location = locationData.location;
    if (!location) return false;
    
    const hasAddress = location.address && (
      location.address.street ||
      location.address.city ||
      location.address.state ||
      location.address.zipCode
    );
    
    const hasCoordinates = location.coordinates &&
      location.coordinates.latitude !== null &&
      location.coordinates.longitude !== null;
    
    return hasAddress || hasCoordinates;
  };

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [masterPasswordData, setMasterPasswordData] = useState({
    currentPassword: '',
    masterPassword: '',
    confirmMasterPassword: '',
  });

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await updateProfile(profileData);
      toast.success('Profile updated successfully');
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update profile';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await updateProfile(locationData);
      toast.success('Location updated successfully');
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update location';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationDetected = (detectedLocation) => {
    setLocationData({
      location: detectedLocation
    });
    toast.success('Location detected successfully!');
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    
    setLoading(true);
    
    try {
      await changePassword(passwordData.currentPassword, passwordData.newPassword);
      toast.success('Password changed successfully');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to change password';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLocationInputChange = (newLocation) => {
    setLocationData(prev => ({
      ...prev,
      location: newLocation
    }));
  };

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMasterPasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (masterPasswordData.masterPassword !== masterPasswordData.confirmMasterPassword) {
      toast.error('Master passwords do not match');
      return;
    }
    
    if (masterPasswordData.masterPassword.length < 6) {
      toast.error('Master password must be at least 6 characters long');
      return;
    }
    
    setLoading(true);
    
    try {
      await setMasterPassword(masterPasswordData.currentPassword, masterPasswordData.masterPassword);
      toast.success('Master password set successfully');
      setMasterPasswordData({
        currentPassword: '',
        masterPassword: '',
        confirmMasterPassword: '',
      });
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to set master password';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleMasterPasswordInputChange = (e) => {
    const { name, value } = e.target;
    setMasterPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const baseTabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'password', name: 'Password', icon: Lock },
    { id: 'twoFactor', name: '2FA', icon: Shield },
    { id: 'location', name: 'Location', icon: MapPin },
  ];

  // Add master password tab for admin users
  const tabs = user?.role === 'admin' 
    ? [...baseTabs, { id: 'masterPassword', name: 'Master Password', icon: Shield }]
    : baseTabs;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage your account settings and preferences</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-card transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-800 dark:text-primary-100'
                      : 'text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800 hover:text-secondary-900 dark:hover:text-secondary-100'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {activeTab === 'profile' && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
                  Profile Information
                </h3>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  Update your account profile information
                </p>
              </div>
              <div className="card-body">
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                                      <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  First Name
                </label>
                      <input
                        type="text"
                        name="firstName"
                        value={profileData.firstName}
                        onChange={handleProfileInputChange}
                        className="input"
                        required
                      />
                    </div>
                    <div>
                                      <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Last Name
                </label>
                      <input
                        type="text"
                        name="lastName"
                        value={profileData.lastName}
                        onChange={handleProfileInputChange}
                        className="input"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={profileData.email}
                      onChange={handleProfileInputChange}
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      value={user?.username || ''}
                      className="input bg-secondary-50"
                      disabled
                    />
                    <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
                      Username cannot be changed
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                      Role
                    </label>
                    <input
                      type="text"
                      value={user?.role || ''}
                      className="input bg-secondary-50"
                      disabled
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-primary"
                    >
                      {loading ? (
                        <>
                          <div className="spinner mr-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'password' && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
                  Change Password
                </h3>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  Update your password to keep your account secure
                </p>
              </div>
              <div className="card-body">
                <form onSubmit={handlePasswordSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordInputChange}
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordInputChange}
                      className="input"
                      required
                      minLength={6}
                    />
                    <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
                      Password must be at least 6 characters long
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordInputChange}
                      className="input"
                      required
                      minLength={6}
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-primary"
                    >
                      {loading ? (
                        <>
                          <div className="spinner mr-2" />
                          Changing...
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          Change Password
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'twoFactor' && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
                  Two-Factor Authentication
                </h3>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  Secure your account with an extra layer of protection
                </p>
              </div>
              <div className="card-body p-0">
                <TwoFactorSetup />
              </div>
            </div>
          )}

          {activeTab === 'location' && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
                  Location Settings
                </h3>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  Manage your account location and timezone
                </p>
              </div>
              <div className="card-body">
                {hasLocationData() ? (
                  <LocationDisplay location={locationData.location} />
                ) : (
                  <LocationPrompt onLocationDetected={handleLocationDetected} />
                )}
                <form onSubmit={handleLocationSubmit} className="space-y-6 mt-6">
                  <LocationInput
                    location={locationData.location}
                    onChange={handleLocationInputChange}
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-primary"
                    >
                      {loading ? (
                        <>
                          <div className="spinner mr-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Location
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'masterPassword' && user?.role === 'admin' && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
                  Master Password
                </h3>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  Set or update your master password for enhanced admin access
                </p>
              </div>
              <div className="card-body">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                  <div className="flex">
                    <Shield className="w-5 h-5 text-amber-600 mr-3 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-amber-800">Admin Feature</h4>
                      <p className="text-sm text-amber-700 mt-1">
                        Master password allows you to login with an alternative password. 
                        This can serve as a backup authentication method or for enhanced security.
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleMasterPasswordSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      name="currentPassword"
                      value={masterPasswordData.currentPassword}
                      onChange={handleMasterPasswordInputChange}
                      className="input"
                      required
                      placeholder="Enter your current password"
                    />
                    <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
                      Required for security verification
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                      Master Password
                    </label>
                    <input
                      type="password"
                      name="masterPassword"
                      value={masterPasswordData.masterPassword}
                      onChange={handleMasterPasswordInputChange}
                      className="input"
                      required
                      minLength={6}
                      placeholder="Enter your new master password"
                    />
                    <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
                      Must be at least 6 characters long and different from your regular password
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                      Confirm Master Password
                    </label>
                    <input
                      type="password"
                      name="confirmMasterPassword"
                      value={masterPasswordData.confirmMasterPassword}
                      onChange={handleMasterPasswordInputChange}
                      className="input"
                      required
                      minLength={6}
                      placeholder="Confirm your new master password"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-primary"
                    >
                      {loading ? (
                        <>
                          <div className="spinner mr-2" />
                          Setting...
                        </>
                      ) : (
                        <>
                          <Shield className="w-4 h-4 mr-2" />
                          Set Master Password
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings; 