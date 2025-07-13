import React, { useState, useEffect } from 'react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { Plus, Edit, Trash2, Search, Package } from 'lucide-react';
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
    store: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [storeFilter, setStoreFilter] = useState('');
  const [stores, setStores] = useState([]);

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

  useEffect(() => {
    fetchIngredients();
    fetchStores();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchIngredients = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (storeFilter) params.append('store', storeFilter);
      params.append('active', 'true');
      
      const response = await api.get(`/ingredients?${params}`);
      if (response.data.success) {
        setIngredients(response.data.ingredients);
      } else {
        setError('Failed to fetch ingredients');
        toast.error('Failed to load ingredients');
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

  const fetchStores = async () => {
    try {
      const response = await api.get('/ingredients/stores/list');
      if (response.data.success) {
        setStores(response.data.stores);
      }
    } catch (err) {
      console.error('Error fetching stores:', err);
      toast.error('Failed to load stores');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.quantity || !formData.store) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setError('');
      
      const payload = {
        name: formData.name.trim(),
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        store: formData.store
      };

      if (editingIngredient) {
        const response = await api.put(`/ingredients/${editingIngredient._id}`, payload);
        if (response.data.success) {
          toast.success('Ingredient updated successfully');
          fetchIngredients();
          resetForm();
        }
      } else {
        const response = await api.post('/ingredients', payload);
        if (response.data.success) {
          toast.success('Ingredient created successfully');
          fetchIngredients();
          resetForm();
        }
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
      store: ingredient.store?._id || ''
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
        fetchIngredients();
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
      store: ''
    });
    setEditingIngredient(null);
    setShowModal(false);
    setError('');
  };

  const handleSearch = () => {
    fetchIngredients();
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStoreFilter('');
    // Trigger refetch after clearing filters
    setTimeout(() => {
      fetchIngredients();
    }, 100);
  };

  if (loading && ingredients.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="py-6">
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

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Search and Filter Section */}
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
              {ingredients.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center text-gray-500 py-8">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p>No ingredients found. Add your first ingredient to get started!</p>
                  </td>
                </tr>
              ) : (
                ingredients.map((ingredient) => (
                  <tr key={ingredient._id}>
                    <td>
                      <div className="flex items-center space-x-2">
                        <Package className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{ingredient.name}</span>
                      </div>
                    </td>
                    <td className="text-gray-600">
                      {ingredient.quantity}
                    </td>
                    <td className="text-gray-600">
                      {units.find(u => u.value === ingredient.unit)?.label || ingredient.unit}
                    </td>
                    <td className="text-gray-600">
                      {ingredient.store?.name || 'Unknown Store'}
                    </td>
                    <td className="text-gray-500">
                      {new Date(ingredient.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(ingredient)}
                          className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                          title="Edit ingredient"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(ingredient._id)}
                          className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingIngredient ? 'Edit Ingredient' : 'Add New Ingredient'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ingredient Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                    className="input w-full"
                    placeholder="Enter ingredient name"
                    maxLength={100}
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
                  <select
                    value={formData.store}
                    onChange={(e) => setFormData({...formData, store: e.target.value})}
                    required
                    className="select w-full"
                  >
                    <option value="">Select a store...</option>
                    {stores.map(store => (
                      <option key={store._id} value={store._id}>
                        {store.name}
                      </option>
                    ))}
                  </select>
                  {stores.length === 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      No stores available. Please add stores in Master Data → Stores first.
                    </p>
                  )}
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
                    disabled={stores.length === 0}
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