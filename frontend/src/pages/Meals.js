import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChefHat, Clock, Users, Search, Filter, Calendar as CalendarIcon, Star, Edit, Trash2 } from 'lucide-react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const Meals = () => {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMealType, setSelectedMealType] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const navigate = useNavigate();

  const mealTypes = [
    { value: '', label: 'All Types' },
    { value: 'breakfast', label: 'Breakfast' },
    { value: 'lunch', label: 'Lunch' },
    { value: 'dinner', label: 'Dinner' },
    { value: 'snack', label: 'Snack' },
  ];

  const sortOptions = [
    { value: 'date', label: 'Date' },
    { value: 'name', label: 'Name' },
    { value: 'mealType', label: 'Meal Type' },
    { value: 'rating', label: 'Rating' },
  ];

  useEffect(() => {
    fetchMeals();
  }, []);

  const fetchMeals = async () => {
    try {
      const response = await api.get('/meals');
      setMeals(response.data.meals);
    } catch (error) {
      console.error('Error fetching meals:', error);
      toast.error('Failed to load meals');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMeal = async (mealId) => {
    if (window.confirm('Are you sure you want to delete this meal?')) {
      try {
        await api.delete(`/meals/${mealId}`);
        toast.success('Meal deleted successfully');
        fetchMeals();
      } catch (error) {
        console.error('Error deleting meal:', error);
        toast.error('Failed to delete meal');
      }
    }
  };

  const getMealTypeColor = (mealType) => {
    const colors = {
      breakfast: 'bg-yellow-100 text-yellow-800',
      lunch: 'bg-green-100 text-green-800',
      dinner: 'bg-blue-100 text-blue-800',
      snack: 'bg-purple-100 text-purple-800',
    };
    return colors[mealType] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const filteredAndSortedMeals = meals
    .filter(meal => {
      const matchesSearch = meal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           meal.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedMealType === '' || meal.mealType === selectedMealType;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.date);
          bValue = new Date(b.date);
          break;
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'mealType':
          aValue = a.mealType;
          bValue = b.mealType;
          break;
        case 'rating':
          aValue = a.rating || 0;
          bValue = b.rating || 0;
          break;
        default:
          aValue = a.date;
          bValue = b.date;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading meals..." />;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">All Meals</h1>
          <p className="text-secondary-600">Browse and manage all your saved meals</p>
        </div>
        <button
          onClick={() => navigate('/meal-planner')}
          className="btn-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add New Meal
        </button>
      </div>

      {/* Filters and Search */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search meals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>

            {/* Meal Type Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-4 h-4" />
              <select
                value={selectedMealType}
                onChange={(e) => setSelectedMealType(e.target.value)}
                className="input pl-10 appearance-none"
              >
                {mealTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="input"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    Sort by {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="input"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Meals List */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-secondary-900">
            {filteredAndSortedMeals.length} Meal{filteredAndSortedMeals.length !== 1 ? 's' : ''}
          </h3>
        </div>
        <div className="card-body">
          {filteredAndSortedMeals.length === 0 ? (
            <div className="text-center py-12">
              <ChefHat className="w-16 h-16 text-secondary-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-secondary-900 mb-2">
                {meals.length === 0 ? 'No meals saved yet' : 'No meals match your filters'}
              </h3>
              <p className="text-secondary-600 mb-6">
                {meals.length === 0 
                  ? 'Start by planning your first meal' 
                  : 'Try adjusting your search or filters'}
              </p>
              <button
                onClick={() => navigate('/meal-planner')}
                className="btn-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Plan Your First Meal
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedMeals.map((meal) => (
                <div key={meal._id} className="border border-secondary-200 rounded-card p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-semibold text-secondary-900 flex-1 pr-2">
                      {meal.name}
                    </h4>
                    <span className={`badge ${getMealTypeColor(meal.mealType)} flex-shrink-0`}>
                      {meal.mealType}
                    </span>
                  </div>
                  
                  {meal.description && (
                    <p className="text-sm text-secondary-600 mb-3 line-clamp-2">
                      {meal.description}
                    </p>
                  )}
                  
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex items-center text-secondary-600">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {formatDate(meal.date)}
                    </div>
                    
                    {meal.totalTime > 0 && (
                      <div className="flex items-center text-secondary-600">
                        <Clock className="w-4 h-4 mr-2" />
                        {meal.totalTime} minutes
                      </div>
                    )}
                    
                    {meal.assignedTo && meal.assignedTo.length > 0 && (
                      <div className="flex items-center text-secondary-600">
                        <Users className="w-4 h-4 mr-2" />
                        {meal.assignedTo.length} family member(s)
                      </div>
                    )}
                    
                    {meal.rating && (
                      <div className="flex items-center text-secondary-600">
                        <Star className="w-4 h-4 mr-2 text-yellow-400 fill-current" />
                        {meal.rating}/5
                      </div>
                    )}
                  </div>
                  
                  {/* Status badges */}
                  <div className="flex items-center space-x-2 mb-4">
                    {meal.isPlanned && (
                      <span className="badge bg-blue-100 text-blue-800">Planned</span>
                    )}
                    {meal.isCooked && (
                      <span className="badge bg-green-100 text-green-800">Cooked</span>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-secondary-200">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => navigate(`/meal-planner?edit=${meal._id}`)}
                        className="p-2 text-secondary-600 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                        title="Edit meal"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteMeal(meal._id)}
                        className="p-2 text-secondary-600 hover:text-error-600 hover:bg-error-50 rounded transition-colors"
                        title="Delete meal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Meals; 