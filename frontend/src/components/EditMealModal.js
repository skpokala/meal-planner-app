import React, { useState, useEffect } from 'react';
import { X, Save, Clock, Calendar as CalendarIcon } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const EditMealModal = ({ meal, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    mealType: 'dinner',
    date: '',
    totalTime: '',
  });
  const [loading, setLoading] = useState(false);

  const mealTypes = [
    { value: 'breakfast', label: 'Breakfast' },
    { value: 'lunch', label: 'Lunch' },
    { value: 'dinner', label: 'Dinner' },
    { value: 'snack', label: 'Snack' },
  ];

  useEffect(() => {
    if (meal && isOpen) {
      setFormData({
        name: meal.name || '',
        description: meal.description || '',
        mealType: meal.mealType || 'dinner',
        date: meal.date || '',
        totalTime: meal.totalTime || '',
      });
    }
  }, [meal, isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Meal name is required');
      return;
    }

    setLoading(true);
    try {
      const updatedMeal = await api.put(`/meals/${meal._id}`, formData);
      toast.success('Meal updated successfully');
      onSave(updatedMeal.data);
      onClose();
    } catch (error) {
      console.error('Error updating meal:', error);
      toast.error('Failed to update meal');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-secondary-200">
          <h3 className="text-lg font-semibold text-secondary-900">Edit Meal</h3>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-1 text-secondary-400 hover:text-secondary-600 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Meal Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-secondary-700 mb-1">
              Meal Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="input w-full"
              placeholder="Enter meal name"
              required
              disabled={loading}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-secondary-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="input w-full resize-none"
              rows={3}
              placeholder="Enter meal description"
              disabled={loading}
            />
          </div>

          {/* Meal Type */}
          <div>
            <label htmlFor="mealType" className="block text-sm font-medium text-secondary-700 mb-1">
              Meal Type
            </label>
            <select
              id="mealType"
              name="mealType"
              value={formData.mealType}
              onChange={handleInputChange}
              className="input w-full"
              disabled={loading}
            >
              {mealTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-secondary-700 mb-1">
              Date
            </label>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-4 h-4" />
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className="input w-full pl-10"
                disabled={loading}
              />
            </div>
          </div>

          {/* Total Time */}
          <div>
            <label htmlFor="totalTime" className="block text-sm font-medium text-secondary-700 mb-1">
              Total Time (minutes)
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-4 h-4" />
              <input
                type="number"
                id="totalTime"
                name="totalTime"
                value={formData.totalTime}
                onChange={handleInputChange}
                className="input w-full pl-10"
                placeholder="e.g., 30"
                min="0"
                disabled={loading}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-secondary-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex items-center"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Updating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Update Meal
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditMealModal; 