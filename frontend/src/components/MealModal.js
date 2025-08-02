import React, { useState, useEffect } from 'react';
import { X, Save, Clock, Plus, Trash2, RotateCcw } from 'lucide-react';
import api from '../services/api';
import LocationInput from './LocationInput';
import toast from 'react-hot-toast';

const MealModal = ({ meal, isOpen, onClose, onSave, onMealCreated, mode = 'edit' }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    prepTime: '',
    active: true,
    ingredients: [],
    cuisine: '',
    region: '',
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
  const [loading, setLoading] = useState(false);
  const [availableIngredients, setAvailableIngredients] = useState([]);
  const [loadingIngredients, setLoadingIngredients] = useState(false);
  
  // New ingredient modal state
  const [showNewIngredientModal, setShowNewIngredientModal] = useState(false);
  const [newIngredientData, setNewIngredientData] = useState({
    name: '',
    quantity: '',
    unit: 'lbs',
    store: ''
  });
  const [stores, setStores] = useState([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [currentIngredientIndex, setCurrentIngredientIndex] = useState(null);

  const isEditMode = mode === 'edit';
  const isAddMode = mode === 'add';

  const units = [
    { value: 'lbs', label: 'Pounds (lbs)' },
    { value: 'oz', label: 'Ounces (oz)' },
    { value: 'kg', label: 'Kilograms (kg)' },
    { value: 'g', label: 'Grams (g)' },
    { value: 'count', label: 'Count' },
    { value: 'cups', label: 'Cups' },
    { value: 'tbsp', label: 'Tablespoons (tbsp)' },
    { value: 'tsp', label: 'Teaspoons (tsp)' },
    { value: 'ml', label: 'Milliliters (ml)' },
    { value: 'l', label: 'Liters (l)' }
  ];

  const cuisineTypes = [
    { value: '', label: 'Select cuisine...' },
    { value: 'American', label: 'American' },
    { value: 'Italian', label: 'Italian' },
    { value: 'Mexican', label: 'Mexican' },
    { value: 'Chinese', label: 'Chinese' },
    { value: 'Japanese', label: 'Japanese' },
    { value: 'Indian', label: 'Indian' },
    { value: 'Thai', label: 'Thai' },
    { value: 'French', label: 'French' },
    { value: 'Mediterranean', label: 'Mediterranean' },
    { value: 'Greek', label: 'Greek' },
    { value: 'Korean', label: 'Korean' },
    { value: 'Vietnamese', label: 'Vietnamese' },
    { value: 'Spanish', label: 'Spanish' },
    { value: 'German', label: 'German' },
    { value: 'British', label: 'British' },
    { value: 'BBQ', label: 'BBQ' },
    { value: 'Fusion', label: 'Fusion' },
    { value: 'Other', label: 'Other' }
  ];

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && meal) {
        setFormData({
          name: meal.name || '',
          description: meal.description || '',
          prepTime: meal.prepTime || '',
          active: meal.active !== undefined ? meal.active : true,
          ingredients: meal.ingredients || [],
          cuisine: meal.cuisine || '',
          region: meal.region || '',
          location: meal.location || {
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
      } else if (isAddMode) {
        // Reset form for add mode
        setFormData({
          name: '',
          description: '',
          prepTime: '',
          active: true,
          ingredients: [],
          cuisine: '',
          region: '',
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
      }
      // Load available ingredients and stores
      loadAvailableIngredients();
      loadStores();
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

  const loadStores = async () => {
    try {
      setLoadingStores(true);
      const response = await api.get('/ingredients/stores/list');
      if (response.data.success) {
        setStores(response.data.stores || []);
      }
    } catch (error) {
      console.error('Error loading stores:', error);
      toast.error('Failed to load stores');
    } finally {
      setLoadingStores(false);
    }
  };

  const handleCreateNewIngredient = async () => {
    if (!newIngredientData.name.trim() || !newIngredientData.quantity || !newIngredientData.store) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const payload = {
        name: newIngredientData.name.trim(),
        quantity: parseFloat(newIngredientData.quantity),
        unit: newIngredientData.unit,
        store: newIngredientData.store
      };

      const response = await api.post('/ingredients', payload);
      if (response.data.success) {
        toast.success('Ingredient created successfully');
        
        // Refresh ingredients list
        await loadAvailableIngredients();
        
        // Auto-select the newly created ingredient if we have a current index
        if (currentIngredientIndex !== null && response.data.ingredient) {
          updateIngredient(currentIngredientIndex, 'ingredient', response.data.ingredient._id);
        }
        
        // Reset form
        setNewIngredientData({
          name: '',
          quantity: '',
          unit: 'lbs',
          store: ''
        });
        setShowNewIngredientModal(false);
        setCurrentIngredientIndex(null);
      }
    } catch (error) {
      console.error('Error creating ingredient:', error);
      const errorMessage = error.response?.data?.message || 'Failed to create ingredient';
      toast.error(errorMessage);
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
          ingredients: formData.ingredients
            .filter(ing => {
              // Only include ingredients with valid selected ingredient
              if (!ing.ingredient || ing.ingredient.trim() === '') {
                return false;
              }
              // Basic check for valid ObjectId format (24 character hex string)
              const trimmedId = ing.ingredient.trim();
              if (!/^[0-9a-fA-F]{24}$/.test(trimmedId)) {
                console.warn('Invalid ingredient ID format:', trimmedId);
                return false;
              }
              return true;
            })
            .map(ing => ({
              ingredient: ing.ingredient.trim(),
              quantity: ing.quantity === '' || ing.quantity === null || ing.quantity === undefined ? null : parseFloat(ing.quantity),
              unit: ing.unit === '' || ing.unit === null || ing.unit === undefined ? null : ing.unit,
              notes: ing.notes === '' || ing.notes === null || ing.notes === undefined ? null : ing.notes
            }))
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
          ingredients: formData.ingredients
            .filter(ing => {
              // Only include ingredients with valid selected ingredient
              if (!ing.ingredient || ing.ingredient.trim() === '') {
                return false;
              }
              // Basic check for valid ObjectId format (24 character hex string)
              const trimmedId = ing.ingredient.trim();
              if (!/^[0-9a-fA-F]{24}$/.test(trimmedId)) {
                console.warn('Invalid ingredient ID format:', trimmedId);
                return false;
              }
              return true;
            })
            .map(ing => ({
              ingredient: ing.ingredient.trim(),
              quantity: ing.quantity === '' || ing.quantity === null || ing.quantity === undefined ? null : parseFloat(ing.quantity),
              unit: ing.unit === '' || ing.unit === null || ing.unit === undefined ? null : ing.unit,
              notes: ing.notes === '' || ing.notes === null || ing.notes === undefined ? null : ing.notes
            }))
        };
        console.log('Creating meal with data:', JSON.stringify(mealData, null, 2));
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
      console.error('Error response data:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Validation errors:', error.response?.data?.errors);
      
      const errorMessage = error.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} meal`;
      toast.error(errorMessage);
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
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-secondary-200 dark:border-secondary-700">
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
            {isEditMode ? 'Edit Meal' : 'Add New Meal'}
          </h3>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-1 text-secondary-400 hover:text-secondary-600 dark:text-secondary-500 dark:hover:text-secondary-400 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Meal Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
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
            <label htmlFor="description" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
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
            <label htmlFor="prepTime" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
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

          {/* Cuisine and Region */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="cuisine" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                Cuisine Type
              </label>
              <select
                id="cuisine"
                name="cuisine"
                value={formData.cuisine}
                onChange={handleInputChange}
                className="input w-full"
                disabled={loading}
              >
                {cuisineTypes.map(cuisine => (
                  <option key={cuisine.value} value={cuisine.value}>
                    {cuisine.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="region" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                Region
              </label>
              <input
                type="text"
                id="region"
                name="region"
                value={formData.region}
                onChange={handleInputChange}
                className="input w-full"
                placeholder="e.g., Southern USA, Mediterranean"
                disabled={loading}
              />
            </div>
          </div>

          {/* Location Information */}
          <div className="border-t border-secondary-200 dark:border-secondary-700 pt-4">
            <LocationInput
              location={formData.location}
              onChange={(location) => setFormData(prev => ({ ...prev, location }))}
              label="Meal Origin/Popular Location"
            />
          </div>

          {/* Ingredients Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300">
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
            <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-3">
              Only ingredient selection is required. Quantity, unit, and notes are optional.
            </p>
            
            {formData.ingredients.length > 0 && (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {formData.ingredients.map((ingredient, index) => (
                  <div key={index} className="border border-secondary-200 dark:border-secondary-700 rounded-lg p-3 bg-secondary-50 dark:bg-secondary-900">
                    <div className="grid grid-cols-12 gap-3 items-start">
                      {/* Ingredient Selection */}
                      <div className="col-span-4">
                        <label className="block text-xs font-medium text-secondary-600 dark:text-secondary-400 mb-1">
                          Ingredient *
                        </label>
                        <div className="flex items-center space-x-1">
                          <select
                            value={ingredient.ingredient}
                            onChange={(e) => {
                              if (e.target.value === 'create-new') {
                                setCurrentIngredientIndex(index);
                                setShowNewIngredientModal(true);
                              } else {
                                updateIngredient(index, 'ingredient', e.target.value);
                              }
                            }}
                            disabled={loading || loadingIngredients}
                            className="select select-sm flex-1"
                          >
                            <option value="">Select ingredient...</option>
                            <option value="create-new" className="text-blue-600 font-medium">
                              + Create New Ingredient
                            </option>
                            {availableIngredients.map(ing => (
                              <option key={ing._id} value={ing._id}>
                                {ing.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => loadAvailableIngredients()}
                            disabled={loadingIngredients}
                            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            title="Refresh ingredients"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Quantity */}
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-secondary-600 dark:text-secondary-400 mb-1">
                          Quantity (Optional)
                        </label>
                        <input
                          type="number"
                          value={ingredient.quantity || ''}
                          onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                          disabled={loading}
                          className="input text-sm w-full"
                          placeholder="Amount"
                          min="0"
                          step="0.1"
                        />
                      </div>
                      
                      {/* Unit */}
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-secondary-600 dark:text-secondary-400 mb-1">
                          Unit (Optional)
                        </label>
                        <select
                          value={ingredient.unit}
                          onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                          disabled={loading}
                          className="select select-sm w-full"
                        >
                          <option value="">Select unit...</option>
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
                        <label className="block text-xs font-medium text-secondary-600 dark:text-secondary-400 mb-1">
                          Notes (Optional)
                        </label>
                        <input
                          type="text"
                          value={ingredient.notes}
                          onChange={(e) => updateIngredient(index, 'notes', e.target.value)}
                          disabled={loading}
                          className="input text-sm w-full"
                          placeholder="Add notes about this ingredient..."
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
              <div className="text-center py-4 text-secondary-500 dark:text-secondary-400 text-sm">
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
              <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300">
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

      {/* New Ingredient Modal */}
      {showNewIngredientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Create New Ingredient
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Ingredient Name *
                  </label>
                  <input
                    type="text"
                    value={newIngredientData.name}
                    onChange={(e) => setNewIngredientData({...newIngredientData, name: e.target.value})}
                    className="input w-full"
                    placeholder="Enter ingredient name"
                    maxLength={100}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newIngredientData.quantity}
                    onChange={(e) => setNewIngredientData({...newIngredientData, quantity: e.target.value})}
                    className="input w-full"
                    placeholder="Enter quantity"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Unit *
                  </label>
                  <select
                    value={newIngredientData.unit}
                    onChange={(e) => setNewIngredientData({...newIngredientData, unit: e.target.value})}
                    className="select w-full"
                  >
                    {units.map(unit => (
                      <option key={unit.value} value={unit.value}>
                        {unit.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Store *
                  </label>
                  <div className="flex items-center space-x-2">
                    <select
                      value={newIngredientData.store}
                      onChange={(e) => setNewIngredientData({...newIngredientData, store: e.target.value})}
                      required
                      className="select flex-1"
                    >
                      <option value="">Select a store...</option>
                      {stores.map(store => (
                        <option key={store._id} value={store._id}>
                          {store.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => loadStores()}
                      disabled={loadingStores}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                      title="Refresh stores"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                  {stores.length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      No stores available. Please add stores in Master Data → Stores first.
                    </p>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewIngredientModal(false);
                      setNewIngredientData({
                        name: '',
                        quantity: '',
                        unit: 'lbs',
                        store: ''
                      });
                      setCurrentIngredientIndex(null);
                    }}
                    className="btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateNewIngredient}
                    className="btn-primary"
                  >
                    Create Ingredient
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MealModal; 