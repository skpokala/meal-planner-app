import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, User, Users, Mail, Calendar, Heart } from 'lucide-react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const FamilyMembers = () => {
  const [familyMembers, setFamilyMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingMember) {
        await api.put(`/family-members/${editingMember._id}`, formData);
        toast.success('Family member updated successfully');
      } else {
        await api.post('/family-members', formData);
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
    });
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
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getRelationshipColor = (relationship) => {
    const colors = {
      parent: 'bg-blue-100 text-blue-800',
      child: 'bg-green-100 text-green-800',
      spouse: 'bg-purple-100 text-purple-800',
      sibling: 'bg-yellow-100 text-yellow-800',
      grandparent: 'bg-red-100 text-red-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[relationship] || 'bg-gray-100 text-gray-800';
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
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Family Members</h1>
          <p className="text-secondary-600">Manage your family member profiles</p>
        </div>
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
      </div>

      {/* Family Members Grid */}
      {familyMembers.length === 0 ? (
        <div className="text-center py-12 mt-6">
          <Users className="w-16 h-16 text-secondary-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-secondary-900 mb-2">No family members yet</h3>
          <p className="text-secondary-600 mb-6">Add your first family member to get started</p>
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
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {familyMembers.map((member) => (
            <div key={member._id} className="card">
              <div className="card-body">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-primary-600" />
                    </div>
                    <div className="ml-3">
                      <h3 className="font-semibold text-secondary-900">
                        {member.firstName} {member.lastName}
                      </h3>
                      <span className={`badge ${getRelationshipColor(member.relationship)}`}>
                        {member.relationship}
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(member)}
                      className="p-2 text-secondary-600 hover:text-primary-600 hover:bg-primary-50 rounded-card"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(member._id)}
                      className="p-2 text-secondary-600 hover:text-error-600 hover:bg-error-50 rounded-card"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-secondary-600">
                    <Mail className="w-4 h-4 mr-2" />
                    {member.email}
                  </div>
                  <div className="flex items-center text-secondary-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    Age: {calculateAge(member.dateOfBirth)}
                  </div>
                  {member.dietaryRestrictions.length > 0 && (
                    <div className="flex items-start text-secondary-600">
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
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-card shadow-card-lg max-w-md w-full m-4 max-h-screen overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-secondary-900 mb-4">
                {editingMember ? 'Edit Family Member' : 'Add Family Member'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
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
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
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
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
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

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
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
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
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
    </div>
  );
};

export default FamilyMembers; 