import React, { useState } from 'react';
import { User, Lock, Save, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
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
  ];

  // Add master password tab for admin users
  const tabs = user?.role === 'admin' 
    ? [...baseTabs, { id: 'masterPassword', name: 'Master Password', icon: Shield }]
    : baseTabs;

  return (
    <div>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">Settings</h1>
        <p className="text-secondary-600">Manage your account settings and preferences</p>
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
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-secondary-700 hover:bg-secondary-100 hover:text-secondary-900'
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
                <h3 className="text-lg font-semibold text-secondary-900">
                  Profile Information
                </h3>
                <p className="text-sm text-secondary-600">
                  Update your account profile information
                </p>
              </div>
              <div className="card-body">
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">
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
                      <label className="block text-sm font-medium text-secondary-700 mb-1">
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
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
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
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      value={user?.username || ''}
                      className="input bg-secondary-50"
                      disabled
                    />
                    <p className="text-xs text-secondary-500 mt-1">
                      Username cannot be changed
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
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
                <h3 className="text-lg font-semibold text-secondary-900">
                  Change Password
                </h3>
                <p className="text-sm text-secondary-600">
                  Update your password to keep your account secure
                </p>
              </div>
              <div className="card-body">
                <form onSubmit={handlePasswordSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
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
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
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
                    <p className="text-xs text-secondary-500 mt-1">
                      Password must be at least 6 characters long
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
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

          {activeTab === 'masterPassword' && user?.role === 'admin' && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-secondary-900">
                  Master Password
                </h3>
                <p className="text-sm text-secondary-600">
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
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
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
                    <p className="text-xs text-secondary-500 mt-1">
                      Required for security verification
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
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
                    <p className="text-xs text-secondary-500 mt-1">
                      Must be at least 6 characters long and different from your regular password
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
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