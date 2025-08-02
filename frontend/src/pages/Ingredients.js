import React, { useState, useEffect } from 'react';
import { Package, Plus, Edit, Trash2, Search, RotateCcw } from 'lucide-react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import LocationInput from '../components/LocationInput';
import LocationDisplay from '../components/LocationDisplay';
import { useStores } from '../contexts/StoresContext';
import toast from 'react-hot-toast';

const Ingredients = () => {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    unit: 'lbs',
    store: '',
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
    },
    seasonality: {
      availableMonths: [],
      notes: ''
    }
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [storeFilter, setStoreFilter] = useState('');
  
  // Use global stores context
  const { stores, fetchStores } = useStores();

  // Force re-render when stores change and modal is open
  useEffect(() => {
    if (showModal && stores.length > 0) {
      // Force component to re-render by updating a dummy state
      setFormData(prev => ({ ...prev }));
    }
  }, [stores, showModal]);

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

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  useEffect(() => {
    fetchIngredients();
    fetchStores();
  }, []);

  const fetchIngredients = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/ingredients');
      if (response.data.success) {
        setIngredients(response.data.ingredients);
      } else {
        setError('Failed to fetch ingredients');
      }
    } catch (err) {
      console.error('Error fetching ingredients:', err);
      const errorMessage = err.response?.data?.message || 'Failed to fetch ingredients';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.quantity || !formData.store) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        store: formData.store
      };

      let response;
      if (editingIngredient) {
        response = await api.put(`/ingredients/${editingIngredient._id}`, payload);
      } else {
        response = await api.post('/ingredients', payload);
      }

      if (response.data.success) {
        toast.success(`Ingredient ${editingIngredient ? 'updated' : 'added'} successfully`);
        await fetchIngredients();
        resetForm();
      }
    } catch (err) {
      console.error('Error saving ingredient:', err);
      const errorMessage = err.response?.data?.message || 'Failed to save ingredient';
      toast.error(errorMessage);
    }
  };

  const handleEdit = (ingredient) => {
    setEditingIngredient(ingredient);
    setFormData({
      name: ingredient.name,
      quantity: ingredient.quantity.toString(),
      unit: ingredient.unit,
      store: ingredient.store,
      location: ingredient.location || {
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
      },
      seasonality: ingredient.seasonality || {
        availableMonths: [],
        notes: ''
      }
    });
    setShowModal(true);
  };

  const handleDelete = async (ingredientId) => {
    if (!window.confirm('Are you sure you want to delete this ingredient?')) {
      return;
    }

    try {
      const response = await api.delete(`/ingredients/${ingredientId}`);
      if (response.data.success) {
        toast.success('Ingredient deleted successfully');
        await fetchIngredients();
      }
    } catch (err) {
      console.error('Error deleting ingredient:', err);
      const errorMessage = err.response?.data?.message || 'Failed to delete ingredient';
      toast.error(errorMessage);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      quantity: '',
      unit: 'lbs',
      store: '',
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
      },
      seasonality: {
        availableMonths: [],
        notes: ''
      }
    });
    setEditingIngredient(null);
    setShowModal(false);
  };

  const handleSearch = () => {
    // Filter ingredients based on search term and store filter
    // This would typically be done on the server side
    // For now, we'll re-fetch to get fresh data
    fetchIngredients();
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStoreFilter('');
    fetchIngredients();
  };

  // Filter ingredients based on search term and store filter
  const filteredIngredients = ingredients.filter(ingredient => {
    const matchesSearch = ingredient.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStore = !storeFilter || ingredient.store === storeFilter;
    return matchesSearch && matchesStore;
  });

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Package className="w-8 h-8 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Ingredients</h1>
            <p className="text-gray-600">Manage your ingredient inventory</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Ingredient
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Search and Filter */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Ingredients
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name..."
                  className="input pl-10 w-full"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Store
              </label>
              <select
                value={storeFilter}
                onChange={(e) => setStoreFilter(e.target.value)}
                className="select w-full"
              >
                <option value="">All Stores</option>
                {stores.map(store => (
                  <option key={store._id} value={store._id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end space-x-2">
              <button
                onClick={handleSearch}
                className="btn-success"
              >
                Search
              </button>
              <button
                onClick={handleClearFilters}
                className="btn-secondary"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Ingredients Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th>Name</th>
                <th>Quantity</th>
                <th>Unit</th>
                <th>Store</th>
                <th>Created Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {filteredIngredients.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center text-gray-500 py-8">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p>No ingredients found. Add your first ingredient to get started!</p>
                  </td>
                </tr>
              ) : (
                filteredIngredients.map(ingredient => (
                  <tr key={ingredient._id}>
                    <td className="font-medium text-gray-900">{ingredient.name}</td>
                    <td>{ingredient.quantity}</td>
                    <td>{ingredient.unit}</td>
                    <td>
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {ingredient.storeName || 'Unknown Store'}
                      </span>
                    </td>
                    <td>{new Date(ingredient.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(ingredient)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit ingredient"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(ingredient._id)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete ingredient"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-2xl">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingIngredient ? 'Edit Ingredient' : 'Add New Ingredient'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-800">Basic Information</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ingredient Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        required
                        maxLength={100}
                        className="input w-full"
                        placeholder="Enter ingredient name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.quantity}
                        onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                        required
                        className="input w-full"
                        placeholder="Enter quantity"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unit *
                      </label>
                      <select
                        value={formData.unit}
                        onChange={(e) => setFormData({...formData, unit: e.target.value})}
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Store *
                      </label>
                      <div className="flex items-center space-x-2">
                        <select
                          value={formData.store}
                          onChange={(e) => setFormData({...formData, store: e.target.value})}
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
                          onClick={() => fetchStores(true)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                          title="Refresh stores"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>
                      {stores.length === 0 && (
                        <p className="text-sm text-gray-500 mt-1">
                          No stores available. Please add stores in Master Data → Stores first.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Seasonality Information */}
                <div className="space-y-4 border-t border-gray-200 pt-6">
                  <h4 className="text-md font-medium text-gray-800">Seasonality</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Available Months (Optional)
                    </label>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                      {months.map(month => (
                        <label key={month.value} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={formData.seasonality.availableMonths.includes(month.value)}
                            onChange={(e) => {
                              const newMonths = e.target.checked
                                ? [...formData.seasonality.availableMonths, month.value]
                                : formData.seasonality.availableMonths.filter(m => m !== month.value);
                              setFormData({
                                ...formData,
                                seasonality: {
                                  ...formData.seasonality,
                                  availableMonths: newMonths
                                }
                              });
                            }}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm text-gray-700">{month.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Seasonality Notes (Optional)
                    </label>
                    <textarea
                      value={formData.seasonality.notes}
                      onChange={(e) => setFormData({
                        ...formData,
                        seasonality: {
                          ...formData.seasonality,
                          notes: e.target.value
                        }
                      })}
                      rows={2}
                      maxLength={200}
                      className="input w-full resize-none"
                      placeholder="e.g., Peak season June-July in California"
                    />
                  </div>
                </div>

                {/* Location Information */}
                <div className="border-t border-gray-200 pt-6">
                  <LocationInput
                    location={formData.location}
                    onChange={(location) => setFormData(prev => ({ ...prev, location }))}
                    label="Ingredient Source/Origin Location (Optional)"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                  >
                    {editingIngredient ? 'Update' : 'Add'} Ingredient
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

export default Ingredients; 