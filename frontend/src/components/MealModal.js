import React, { useState, useEffect } from 'react';
import { X, Save, Clock, Plus, Trash2 } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const MealModal = ({ meal, isOpen, onClose, onSave, onMealCreated, mode = 'edit' }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    prepTime: '',
    active: true,
    ingredients: [],
  });
  const [loading, setLoading] = useState(false);
  const [availableIngredients, setAvailableIngredients] = useState([]);
  const [loadingIngredients, setLoadingIngredients] = useState(false);

  const isEditMode = mode === 'edit';
  const isAddMode = mode === 'add';

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && meal) {
        setFormData({
          name: meal.name || '',
          description: meal.description || '',
          prepTime: meal.prepTime || '',
          active: meal.active !== undefined ? meal.active : true,
          ingredients: meal.ingredients || [],
        });
      } else if (isAddMode) {
        // Reset form for add mode
        setFormData({
          name: '',
          description: '',
          prepTime: '',
          active: true,
          ingredients: [],
        });
      }
      // Load available ingredients
      loadAvailableIngredients();
    }
  }, [meal, isOpen, mode, isEditMode, isAddMode]);

  const loadAvailableIngredients = async () => {
    try {
      setLoadingIngredients(true);
      const response = await api.get('/ingredients?active=true');
      setAvailableIngredients(response.data.ingredients || []);
    } catch (error) {
      console.error('Error loading ingredients:', error);
      toast.error('Failed to load ingredients');
    } finally {
      setLoadingIngredients(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const addIngredient = () => {
    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { ingredient: '', quantity: '', unit: '', notes: '' }]
    }));
  };

  const removeIngredient = (index) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }));
  };

  const updateIngredient = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
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
      let response;
      if (isEditMode) {
        const mealData = {
          name: formData.name,
          description: formData.description,
          prepTime: parseInt(formData.prepTime) || 0,
          active: formData.active,
          ingredients: formData.ingredients.filter(ing => ing.ingredient) // Only include ingredients with selected ingredient
        };
        response = await api.put(`/meals/${meal._id}`, mealData);
        toast.success('Meal updated successfully');
      } else {
        // For creating new meals
        const mealData = {
          name: formData.name,
          description: formData.description,
          prepTime: parseInt(formData.prepTime) || 0,
          active: formData.active,
          ingredients: formData.ingredients.filter(ing => ing.ingredient) // Only include ingredients with selected ingredient
        };
        response = await api.post('/meals', mealData);
        toast.success('Meal created successfully');
      }
      
      // Call the appropriate callback with proper data
      const mealData = response.data.meal || response.data;
      console.log('MealModal: About to call callbacks with data:', mealData);
      
      try {
        if (onSave && typeof onSave === 'function') {
          console.log('MealModal: Calling onSave callback');
          onSave(mealData);
          console.log('MealModal: onSave callback completed');
        }
        if (onMealCreated && typeof onMealCreated === 'function') {
          console.log('MealModal: Calling onMealCreated callback');
          onMealCreated(mealData);
          console.log('MealModal: onMealCreated callback completed');
        }
      } catch (callbackError) {
        console.error('Error in meal callback:', callbackError);
        toast.error('Error occurred after saving meal');
        // Still close the modal even if callbacks fail
      }
      
      console.log('MealModal: About to close modal');
      onClose();
      console.log('MealModal: Modal close completed');
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} meal:`, error);
      toast.error(`Failed to ${isEditMode ? 'update' : 'create'} meal`);
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-secondary-200">
          <h3 className="text-lg font-semibold text-secondary-900">
            {isEditMode ? 'Edit Meal' : 'Add New Meal'}
          </h3>
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

          {/* Prep Time */}
          <div>
            <label htmlFor="prepTime" className="block text-sm font-medium text-secondary-700 mb-1">
              Prep Time (minutes)
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-4 h-4" />
              <input
                type="number"
                id="prepTime"
                name="prepTime"
                value={formData.prepTime}
                onChange={handleInputChange}
                className="input w-full pl-10"
                placeholder="0"
                min="0"
                disabled={loading}
              />
            </div>
          </div>

          {/* Ingredients Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-secondary-700">
                Ingredients (Optional)
              </label>
              <button
                type="button"
                onClick={addIngredient}
                disabled={loading || loadingIngredients}
                className="btn-secondary text-xs px-3 py-1"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Ingredient
              </button>
            </div>
            
            {formData.ingredients.length > 0 && (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {formData.ingredients.map((ingredient, index) => (
                  <div key={index} className="border border-secondary-200 rounded-lg p-3 bg-secondary-50">
                    <div className="grid grid-cols-12 gap-3 items-start">
                      {/* Ingredient Selection */}
                      <div className="col-span-4">
                        <label className="block text-xs font-medium text-secondary-600 mb-1">
                          Ingredient
                        </label>
                        <select
                          value={ingredient.ingredient}
                          onChange={(e) => updateIngredient(index, 'ingredient', e.target.value)}
                          disabled={loading || loadingIngredients}
                          className="select select-sm w-full"
                        >
                          <option value="">Select ingredient...</option>
                          {availableIngredients.map(ing => (
                            <option key={ing._id} value={ing._id}>
                              {ing.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {/* Quantity */}
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-secondary-600 mb-1">
                          Quantity
                        </label>
                        <input
                          type="number"
                          value={ingredient.quantity}
                          onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                          disabled={loading}
                          className="input text-sm w-full"
                          placeholder="0"
                          min="0"
                          step="0.1"
                        />
                      </div>
                      
                      {/* Unit */}
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-secondary-600 mb-1">
                          Unit
                        </label>
                        <select
                          value={ingredient.unit}
                          onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                          disabled={loading}
                          className="select select-sm w-full"
                        >
                          <option value="">Unit</option>
                          <option value="lbs">lbs</option>
                          <option value="oz">oz</option>
                          <option value="kg">kg</option>
                          <option value="g">g</option>
                          <option value="count">count</option>
                          <option value="cups">cups</option>
                          <option value="tbsp">tbsp</option>
                          <option value="tsp">tsp</option>
                          <option value="ml">ml</option>
                          <option value="l">l</option>
                        </select>
                      </div>
                      
                      {/* Notes */}
                      <div className="col-span-3">
                        <label className="block text-xs font-medium text-secondary-600 mb-1">
                          Notes
                        </label>
                        <input
                          type="text"
                          value={ingredient.notes}
                          onChange={(e) => updateIngredient(index, 'notes', e.target.value)}
                          disabled={loading}
                          className="input text-sm w-full"
                          placeholder="Optional notes"
                        />
                      </div>
                      
                      {/* Remove Button */}
                      <div className="col-span-1 pt-6">
                        <button
                          type="button"
                          onClick={() => removeIngredient(index)}
                          disabled={loading}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Remove ingredient"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {formData.ingredients.length === 0 && (
              <div className="text-center py-4 text-secondary-500 text-sm">
                No ingredients added yet. Click "Add Ingredient" to start.
              </div>
            )}
          </div>

          {/* Active Status */}
          <div>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                name="active"
                checked={formData.active}
                onChange={handleInputChange}
                disabled={loading}
                className="w-4 h-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-secondary-700">
                Active (available for meal planning)
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-4">
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
              className="btn-primary"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {isEditMode ? 'Update Meal' : 'Create Meal'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MealModal; 