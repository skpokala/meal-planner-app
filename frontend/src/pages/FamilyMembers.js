import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, User, Users, Mail, Calendar, Heart, Shield, Key, UserCheck, UserX, Lock, Eye, EyeOff } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import LocationInput from '../components/LocationInput';
import LocationDisplay from '../components/LocationDisplay';
import LocationPrompt from '../components/LocationPrompt';
import toast from 'react-hot-toast';

const FamilyMembers = () => {
  const { canAssignAdminRole, canManageFamilyMembers } = useAuth();
  const [familyMembers, setFamilyMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [passwordMember, setPasswordMember] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    dateOfBirth: '',
    relationship: 'other',
    dietaryRestrictions: [],
    allergies: [],
    preferences: [],
    dislikes: [],
    hasLoginAccess: false,
    username: '',
    password: '',
    confirmPassword: '',
    role: 'user',
    useParentLocation: true,
    location: {
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
  const [passwordData, setPasswordData] = useState({
    password: '',
    confirmPassword: '',
    currentPassword: '',
  });

  useEffect(() => {
    fetchFamilyMembers();
  }, []);

  const fetchFamilyMembers = async () => {
    try {
      const response = await api.get('/family-members');
      setFamilyMembers(response.data.familyMembers);
    } catch (error) {
      console.error('Error fetching family members:', error);
      toast.error('Failed to load family members');
    } finally {
      setLoading(false);
    }
  };

  const checkUsernameAvailability = async (username) => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    setCheckingUsername(true);
    try {
      const response = await api.post('/auth/check-username', {
        username,
        excludeId: editingMember?._id,
      });
      setUsernameAvailable(response.data.available);
    } catch (error) {
      console.error('Error checking username:', error);
      setUsernameAvailable(null);
    } finally {
      setCheckingUsername(false);
    }
  };

  // Debounced username check
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.username && formData.hasLoginAccess) {
        checkUsernameAvailability(formData.username);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.username, formData.hasLoginAccess, editingMember]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate authentication fields
    if (formData.hasLoginAccess) {
      if (!formData.username) {
        toast.error('Username is required for login access');
        return;
      }
      
      if (!editingMember && !formData.password) {
        toast.error('Password is required for login access');
        return;
      }
      
      if (!editingMember && formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }
      
      if (usernameAvailable === false) {
        toast.error('Username is not available');
        return;
      }
    }

    try {
      const submitData = { ...formData };
      delete submitData.confirmPassword;
      
      // Don't send password if editing and not changing login access
      if (editingMember && !formData.password) {
        delete submitData.password;
      }

      if (editingMember) {
        await api.put(`/family-members/${editingMember._id}`, submitData);
        toast.success('Family member updated successfully');
      } else {
        await api.post('/family-members', submitData);
        toast.success('Family member added successfully');
      }
      
      setShowModal(false);
      setEditingMember(null);
      resetForm();
      fetchFamilyMembers();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to save family member';
      toast.error(errorMessage);
    }
  };

  const handleEdit = (member) => {
    setEditingMember(member);
    setFormData({
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      dateOfBirth: member.dateOfBirth.split('T')[0],
      relationship: member.relationship,
      dietaryRestrictions: member.dietaryRestrictions || [],
      allergies: member.allergies || [],
      preferences: member.preferences || [],
      dislikes: member.dislikes || [],
      hasLoginAccess: member.hasLoginAccess || false,
      username: member.username || '',
      password: '',
      confirmPassword: '',
      role: member.role || 'user',
      useParentLocation: member.useParentLocation !== undefined ? member.useParentLocation : true,
      location: member.location || {
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
    setUsernameAvailable(null);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this family member?')) {
      try {
        await api.delete(`/family-members/${id}`);
        toast.success('Family member deleted successfully');
        fetchFamilyMembers();
      } catch (error) {
        const errorMessage = error.response?.data?.message || 'Failed to delete family member';
        toast.error(errorMessage);
      }
    }
  };

  const handleToggleLogin = async (member) => {
    try {
      const response = await api.put(`/family-members/${member._id}/toggle-login`);
      toast.success(response.data.message);
      fetchFamilyMembers();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to toggle login access';
      toast.error(errorMessage);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordData.password !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      const submitData = {
        password: passwordData.password,
        ...(passwordData.currentPassword && { currentPassword: passwordData.currentPassword }),
      };
      
      await api.put(`/family-members/${passwordMember._id}/password`, submitData);
      toast.success('Password updated successfully');
      setShowPasswordModal(false);
      setPasswordMember(null);
      setPasswordData({ password: '', confirmPassword: '', currentPassword: '' });
      fetchFamilyMembers();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update password';
      toast.error(errorMessage);
    }
  };

  const openPasswordModal = (member) => {
    setPasswordMember(member);
    setPasswordData({ password: '', confirmPassword: '', currentPassword: '' });
    setShowPasswordModal(true);
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      dateOfBirth: '',
      relationship: 'other',
      dietaryRestrictions: [],
      allergies: [],
      preferences: [],
      dislikes: [],
      hasLoginAccess: false,
      username: '',
      password: '',
      confirmPassword: '',
      role: 'user',
      useParentLocation: true,
      location: {
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
    setUsernameAvailable(null);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLocationDetected = (detectedLocation) => {
    setFormData(prev => ({
      ...prev,
      location: detectedLocation,
      useParentLocation: false
    }));
    toast.success('Location detected successfully!');
  };

  const hasLocationData = (location) => {
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

  const getRelationshipColor = (relationship) => {
    const colors = {
      parent: 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300',
      child: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300',
      spouse: 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300',
      sibling: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300',
      grandparent: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300',
      other: 'bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-300',
    };
    return colors[relationship] || 'bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-300';
  };

  const getRoleColor = (role) => {
    return role === 'admin' 
      ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300'
      : 'bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-300';
  };

  const calculateAge = (dateOfBirth) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading family members..." />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Family Members</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage your family member profiles and access</p>
        </div>
        {canManageFamilyMembers() && (
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="btn-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Member
          </button>
        )}
      </div>

      {/* Family Members Grid */}
      {familyMembers.length === 0 ? (
        <div className="text-center py-12 mt-6">
          <Users className="w-16 h-16 text-secondary-400 dark:text-secondary-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-2">No family members yet</h3>
          <p className="text-secondary-600 dark:text-secondary-400 mb-6">Add your first family member to get started</p>
          {canManageFamilyMembers() && (
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="btn-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Family Member
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {familyMembers.map((member) => (
            <div key={member._id} className="card">
              <div className="card-body">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      member.hasLoginAccess 
                        ? 'bg-green-100 dark:bg-green-900/20' 
                        : 'bg-primary-100 dark:bg-primary-900/20'
                    }`}>
                      {member.hasLoginAccess ? (
                        <UserCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
                      ) : (
                        <User className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                      )}
                    </div>
                    <div className="ml-3">
                      <h3 className="font-semibold text-secondary-900 dark:text-secondary-100">
                        {member.firstName} {member.lastName}
                      </h3>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className={`badge ${getRelationshipColor(member.relationship)}`}>
                          {member.relationship}
                        </span>
                        {member.role === 'admin' && (
                          <span className={`badge ${getRoleColor(member.role)}`}>
                            <Shield className="w-3 h-3 mr-1" />
                            Admin
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {canManageFamilyMembers() && (
                      <>
                        <button
                          onClick={() => handleEdit(member)}
                          className="p-2 text-secondary-600 dark:text-secondary-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-card"
                          title="Edit member"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {member.hasLoginAccess && (
                          <button
                            onClick={() => openPasswordModal(member)}
                            className="p-2 text-secondary-600 dark:text-secondary-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-card"
                            title="Change password"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleToggleLogin(member)}
                          className={`p-2 rounded-card ${
                            member.hasLoginAccess
                              ? 'text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                              : 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                          }`}
                          title={member.hasLoginAccess ? 'Disable login' : 'Enable login'}
                        >
                          {member.hasLoginAccess ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDelete(member._id)}
                          className="p-2 text-secondary-600 dark:text-secondary-400 hover:text-error-600 dark:hover:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 rounded-card"
                          title="Delete member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-secondary-600 dark:text-secondary-400">
                    <Mail className="w-4 h-4 mr-2" />
                    {member.email}
                  </div>
                  <div className="flex items-center text-secondary-600 dark:text-secondary-400">
                    <Calendar className="w-4 h-4 mr-2" />
                    Age: {calculateAge(member.dateOfBirth)}
                  </div>
                  {member.hasLoginAccess && member.username && (
                    <div className="flex items-center text-secondary-600 dark:text-secondary-400">
                      <User className="w-4 h-4 mr-2" />
                      Username: {member.username}
                    </div>
                  )}
                  {member.hasLoginAccess && (
                    <div className="flex items-center text-green-600 dark:text-green-400">
                      <Lock className="w-4 h-4 mr-2" />
                      Login Access Enabled
                    </div>
                  )}
                  {member.dietaryRestrictions && member.dietaryRestrictions.length > 0 && (
                    <div className="flex items-start text-secondary-600 dark:text-secondary-400">
                      <Heart className="w-4 h-4 mr-2 mt-0.5" />
                      <div>
                        <span className="font-medium">Dietary:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {member.dietaryRestrictions.map((restriction, index) => (
                            <span key={index} className="badge badge-secondary">
                              {restriction}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <LocationDisplay
                    location={member.location}
                    useParentLocation={member.useParentLocation}
                    compact={true}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Member Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-secondary-800 rounded-card shadow-card-lg max-w-2xl w-full m-4 max-h-screen overflow-y-auto border border-secondary-200 dark:border-secondary-700">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-4">
                {editingMember ? 'Edit Family Member' : 'Add Family Member'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-secondary-800 dark:text-secondary-200">Basic Information</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
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
                        value={formData.lastName}
                        onChange={handleInputChange}
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
                      value={formData.email}
                      onChange={handleInputChange}
                      className="input"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleInputChange}
                        className="input"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                        Relationship
                      </label>
                      <select
                        name="relationship"
                        value={formData.relationship}
                        onChange={handleInputChange}
                        className="select"
                        required
                      >
                        <option value="parent">Parent</option>
                        <option value="child">Child</option>
                        <option value="spouse">Spouse</option>
                        <option value="sibling">Sibling</option>
                        <option value="grandparent">Grandparent</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Login Access */}
                <div className="space-y-4 border-t border-secondary-200 dark:border-secondary-700 pt-4">
                  <h4 className="text-md font-medium text-secondary-800 dark:text-secondary-200">Login Access</h4>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="hasLoginAccess"
                      name="hasLoginAccess"
                      checked={formData.hasLoginAccess}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label htmlFor="hasLoginAccess" className="text-sm font-medium text-secondary-700 dark:text-secondary-300">
                      Allow this family member to log in to the system
                    </label>
                  </div>

                  {formData.hasLoginAccess && (
                    <div className="space-y-4 bg-gray-50 dark:bg-secondary-700 p-4 rounded-card">
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                          Username
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleInputChange}
                            className={`input ${usernameAvailable === false ? 'border-error-300 dark:border-error-600' : ''} ${usernameAvailable === true ? 'border-success-300 dark:border-success-600' : ''}`}
                            placeholder="Enter username"
                            required
                          />
                          {checkingUsername && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              <LoadingSpinner size="sm" />
                            </div>
                          )}
                        </div>
                        {usernameAvailable === false && (
                          <p className="text-error-600 dark:text-error-400 text-sm mt-1">Username is not available</p>
                        )}
                        {usernameAvailable === true && (
                          <p className="text-success-600 dark:text-success-400 text-sm mt-1">Username is available</p>
                        )}
                      </div>

                      {!editingMember && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                              Password
                            </label>
                            <div className="relative">
                              <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                value={formData.password}
                                onChange={handleInputChange}
                                className="input pr-10"
                                placeholder="Enter password"
                                required
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary-400 hover:text-secondary-600 dark:text-secondary-500 dark:hover:text-secondary-400"
                              >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                              Confirm Password
                            </label>
                            <div className="relative">
                              <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleInputChange}
                                className="input pr-10"
                                placeholder="Confirm password"
                                required
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary-400 hover:text-secondary-600 dark:text-secondary-500 dark:hover:text-secondary-400"
                              >
                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {canAssignAdminRole() && (
                        <div>
                          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                            Role
                          </label>
                          <select
                            name="role"
                            value={formData.role}
                            onChange={handleInputChange}
                            className="select"
                          >
                            <option value="user">User</option>
                            <option value="admin">Administrator</option>
                          </select>
                          {formData.role === 'admin' && (
                            <p className="text-sm text-secondary-600 dark:text-secondary-400 mt-1">
                              Administrators can manage other family members and access admin features.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Location Information */}
                <div className="space-y-4 border-t border-secondary-200 dark:border-secondary-700 pt-6">
                  {!editingMember && !formData.useParentLocation && !hasLocationData(formData.location) && (
                    <LocationPrompt 
                      onLocationDetected={handleLocationDetected}
                      title="Set Family Member Location"
                      description="Automatically detect this family member's location for personalized meal recommendations."
                    />
                  )}
                  <LocationInput
                    location={formData.location}
                    onChange={(location) => setFormData(prev => ({ ...prev, location }))}
                    showInheritanceOption={true}
                    useParentLocation={formData.useParentLocation}
                    onInheritanceChange={(useParent) => setFormData(prev => ({ ...prev, useParentLocation: useParent }))}
                    label="Location Information"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingMember(null);
                      resetForm();
                    }}
                    className="btn-outline"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    {editingMember ? 'Update' : 'Add'} Member
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordModal && passwordMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-secondary-800 rounded-card shadow-card-lg max-w-md w-full m-4 border border-secondary-200 dark:border-secondary-700">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-4">
                Change Password for {passwordMember.firstName} {passwordMember.lastName}
              </h3>
              
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={passwordData.password}
                    onChange={handlePasswordInputChange}
                    className="input"
                    required
                    minLength={6}
                  />
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

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordModal(false);
                      setPasswordMember(null);
                      setPasswordData({ password: '', confirmPassword: '', currentPassword: '' });
                    }}
                    className="btn-outline"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Update Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FamilyMembers; 