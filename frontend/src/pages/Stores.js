import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { Plus, Edit, Trash2, Search, MapPin, Store as StoreIcon } from 'lucide-react';
import toast from 'react-hot-toast';

const Stores = () => {
  const { user } = useAuth();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'USA'
    }
  });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      params.append('active', 'true');
      
      const response = await api.get(`/stores?${params}`);
      if (response.data.success) {
        setStores(response.data.stores);
      } else {
        setError('Failed to fetch stores');
        toast.error('Failed to load stores');
      }
    } catch (err) {
      console.error('Error fetching stores:', err);
      const errorMessage = err.response?.data?.message || 'Failed to fetch stores';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.address.street.trim() || 
        !formData.address.city.trim() || !formData.address.state.trim() || 
        !formData.address.zipCode.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      
      if (editingStore) {
        // Update existing store
        const response = await api.put(`/stores/${editingStore._id}`, formData);
        if (response.data.success) {
          toast.success('Store updated successfully');
          fetchStores();
          resetForm();
        }
      } else {
        // Create new store
        const response = await api.post('/stores', formData);
        if (response.data.success) {
          toast.success('Store created successfully');
          fetchStores();
          resetForm();
        }
      }
    } catch (err) {
      console.error('Error saving store:', err);
      const errorMessage = err.response?.data?.message || 'Failed to save store';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (store) => {
    setEditingStore(store);
    setFormData({
      name: store.name,
      address: {
        street: store.address.street || '',
        city: store.address.city || '',
        state: store.address.state || '',
        zipCode: store.address.zipCode || '',
        country: store.address.country || 'USA'
      }
    });
    setShowModal(true);
  };

  const handleDelete = async (storeId) => {
    if (!window.confirm('Are you sure you want to delete this store?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await api.delete(`/stores/${storeId}`);
      if (response.data.success) {
        toast.success('Store deleted successfully');
        fetchStores();
      }
    } catch (err) {
      console.error('Error deleting store:', err);
      const errorMessage = err.response?.data?.message || 'Failed to delete store';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'USA'
      }
    });
    setEditingStore(null);
    setShowModal(false);
  };

  const handleSearch = () => {
    fetchStores();
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setTimeout(() => {
      fetchStores();
    }, 100);
  };

  const handleInputChange = (field, value) => {
    if (field === 'name') {
      setFormData(prev => ({ ...prev, name: value }));
    } else {
      setFormData(prev => ({
        ...prev,
        address: { ...prev.address, [field]: value }
      }));
    }
  };

  if (loading && stores.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <StoreIcon className="w-8 h-8 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Stores</h1>
            <p className="text-gray-600">Manage your store locations</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add New Store
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Search and Filters */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Stores
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, street, city, state, or ZIP..."
                  className="input pl-10 w-full"
                />
              </div>
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

      {/* Stores Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th>Store Name</th>
                <th>Address</th>
                <th>City, State</th>
                <th>ZIP Code</th>
                <th>Created Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {stores.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center text-gray-500 py-8">
                    <StoreIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p>No stores found. Add your first store to get started!</p>
                  </td>
                </tr>
              ) : (
                stores.map((store) => (
                  <tr key={store._id}>
                    <td>
                      <div className="flex items-center space-x-2">
                        <StoreIcon className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{store.name}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{store.address.street}</span>
                      </div>
                    </td>
                    <td className="text-gray-600">
                      {store.address.city}, {store.address.state}
                    </td>
                    <td className="text-gray-600">
                      {store.address.zipCode}
                    </td>
                    <td className="text-gray-500">
                      {new Date(store.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(store)}
                          className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                          title="Edit store"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(store._id)}
                          className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
                          title="Delete store"
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
          <div className="modal-content max-w-lg">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingStore ? 'Edit Store' : 'Add New Store'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Store Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                    className="input w-full"
                    placeholder="Enter store name"
                    maxLength={100}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    value={formData.address.street}
                    onChange={(e) => handleInputChange('street', e.target.value)}
                    required
                    className="input w-full"
                    placeholder="Enter street address"
                    maxLength={100}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      value={formData.address.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      required
                      className="input w-full"
                      placeholder="Enter city"
                      maxLength={50}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State *
                    </label>
                    <input
                      type="text"
                      value={formData.address.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      required
                      className="input w-full"
                      placeholder="Enter state"
                      maxLength={50}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ZIP Code *
                    </label>
                    <input
                      type="text"
                      value={formData.address.zipCode}
                      onChange={(e) => handleInputChange('zipCode', e.target.value)}
                      required
                      className="input w-full"
                      placeholder="Enter ZIP code"
                      maxLength={20}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      value={formData.address.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      className="input w-full"
                      placeholder="Enter country"
                      maxLength={50}
                    />
                  </div>
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
                    disabled={loading}
                    className="btn-primary"
                  >
                    {loading ? 'Saving...' : (editingStore ? 'Update Store' : 'Add Store')}
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

export default Stores; 