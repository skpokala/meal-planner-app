import React, { useState, useEffect } from 'react';
import { Plus, ChefHat, Clock, Users } from 'lucide-react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const MealPlanner = () => {
  const [meals, setMeals] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [familyMembers, setFamilyMembers] = useState([]); // Used for future assignment features
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    mealType: 'dinner',
    date: new Date().toISOString().split('T')[0],
    assignedTo: [],
    ingredients: [],
    recipe: {
      prepTime: '',
      cookTime: '',
      servings: '',
      difficulty: 'medium',
      instructions: []
    }
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [mealsResponse, familyResponse] = await Promise.all([
        api.get('/meals'),
        api.get('/family-members')
      ]);
      
      setMeals(mealsResponse.data.meals);
      setFamilyMembers(familyResponse.data.familyMembers);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load meal data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/meals', formData);
      toast.success('Meal planned successfully');
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to plan meal';
      toast.error(errorMessage);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      mealType: 'dinner',
      date: new Date().toISOString().split('T')[0],
      assignedTo: [],
      ingredients: [],
      recipe: {
        prepTime: '',
        cookTime: '',
        servings: '',
        difficulty: 'medium',
        instructions: []
      }
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
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

  const filteredMeals = meals.filter(meal => {
    const mealDate = new Date(meal.date).toISOString().split('T')[0];
    return mealDate === selectedDate;
  });

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading meal planner..." />;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Meal Planner</h1>
          <p className="text-secondary-600">Plan and manage your family meals</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="btn-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Plan Meal
        </button>
      </div>

      {/* Date Selector */}
      <div className="card mt-6">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-secondary-700">
              Select Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input w-auto"
            />
          </div>
        </div>
      </div>

      {/* Meals for Selected Date */}
      <div className="card mt-6">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-secondary-900">
            Meals for {formatDate(selectedDate)}
          </h3>
        </div>
        <div className="card-body">
          {filteredMeals.length === 0 ? (
            <div className="text-center py-8">
              <ChefHat className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-secondary-900 mb-2">
                No meals planned
              </h3>
              <p className="text-secondary-600 mb-6">
                Add your first meal for {formatDate(selectedDate)}
              </p>
              <button
                onClick={() => {
                  resetForm();
                  setFormData(prev => ({ ...prev, date: selectedDate }));
                  setShowModal(true);
                }}
                className="btn-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Plan Meal
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMeals.map((meal) => (
                <div key={meal._id} className="border border-secondary-200 rounded-card p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-secondary-900">{meal.name}</h4>
                    <span className={`badge ${getMealTypeColor(meal.mealType)}`}>
                      {meal.mealType}
                    </span>
                  </div>
                  
                  {meal.description && (
                    <p className="text-sm text-secondary-600 mb-3">{meal.description}</p>
                  )}
                  
                  <div className="space-y-2 text-sm">
                    {meal.totalTime > 0 && (
                      <div className="flex items-center text-secondary-600">
                        <Clock className="w-4 h-4 mr-2" />
                        {meal.totalTime} minutes
                      </div>
                    )}
                    
                    {meal.assignedTo.length > 0 && (
                      <div className="flex items-center text-secondary-600">
                        <Users className="w-4 h-4 mr-2" />
                        {meal.assignedTo.length} family member(s)
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Planning Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-card shadow-card-lg max-w-2xl w-full m-4 max-h-screen overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-secondary-900 mb-4">
                Plan New Meal
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Meal Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="input"
                    required
                    placeholder="e.g., Spaghetti Bolognese"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="input"
                    rows="3"
                    placeholder="Brief description of the meal..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                      Meal Type
                    </label>
                    <select
                      name="mealType"
                      value={formData.mealType}
                      onChange={handleInputChange}
                      className="input"
                      required
                    >
                      <option value="breakfast">Breakfast</option>
                      <option value="lunch">Lunch</option>
                      <option value="dinner">Dinner</option>
                      <option value="snack">Snack</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      className="input"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                      Prep Time (min)
                    </label>
                    <input
                      type="number"
                      name="recipe.prepTime"
                      value={formData.recipe.prepTime}
                      onChange={handleInputChange}
                      className="input"
                      placeholder="30"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                      Cook Time (min)
                    </label>
                    <input
                      type="number"
                      name="recipe.cookTime"
                      value={formData.recipe.cookTime}
                      onChange={handleInputChange}
                      className="input"
                      placeholder="45"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                      Servings
                    </label>
                    <input
                      type="number"
                      name="recipe.servings"
                      value={formData.recipe.servings}
                      onChange={handleInputChange}
                      className="input"
                      placeholder="4"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Difficulty
                  </label>
                  <select
                    name="recipe.difficulty"
                    value={formData.recipe.difficulty}
                    onChange={handleInputChange}
                    className="input"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="btn-outline"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Plan Meal
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

export default MealPlanner; 