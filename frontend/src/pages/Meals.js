import React, { useState, useEffect } from 'react';
import { Plus, ChefHat, Clock, Search, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import MealModal from '../components/MealModal';
import toast from 'react-hot-toast';

const Meals = () => {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [mealModalOpen, setMealModalOpen] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [modalMode, setModalMode] = useState('edit');
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);

  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'prepTime', label: 'Prep Time' },
    { value: 'createdAt', label: 'Created Date' },
  ];

  const activeFilters = [
    { value: 'all', label: 'All Meals' },
    { value: 'active', label: 'Active Only' },
    { value: 'inactive', label: 'Inactive Only' },
  ];

  useEffect(() => {
    fetchMeals();
  }, []);

  // Create mock recommendations after meals are loaded
  useEffect(() => {
    if (meals.length > 0) {
      fetchRecommendations();
    }
  }, [meals]);

  // Add effect to refresh data when component becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchMeals();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
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

  const fetchRecommendations = async () => {
    try {
      setRecommendationsLoading(true);
      
      const response = await api.get('/recommendations', {
        params: {
          top_n: 50, // Get more recommendations to match with meals
        },
      });

      if (response.data?.success && Array.isArray(response.data.recommendations)) {
        const recs = response.data.recommendations.map((rec) => ({
          meal_id: rec.meal_id || rec.mealId || rec._id,
          meal_name: rec.meal_name || rec.mealName || rec.name,
          meal_type: rec.meal_type || rec.mealType || 'dinner',
          prep_time: rec.prep_time ?? rec.prepTime ?? 0,
          difficulty: rec.difficulty || 'medium',
          rating: rec.rating ?? 0,
          recommendation_type: rec.recommendation_type || 'recommended',
          popularity_score: rec.popularity_score ?? 0,
          similarity_score: rec.similarity_score,
          prediction_score: rec.prediction_score,
          display_score: typeof rec.display_score === 'number' ? rec.display_score : undefined,
          ingredients: rec.ingredients || [],
          description: rec.description || '',
        }));
        
        setRecommendations(recs);
      } else {
        // Create mock recommendations based on actual meals
        createMockRecommendations();
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      
      // Create mock recommendations based on actual meals
      createMockRecommendations();
    } finally {
      setRecommendationsLoading(false);
    }
  };

  // Create mock recommendations that match actual meal IDs
  const createMockRecommendations = () => {
    const recommendationTypes = ['trending', 'popular', 'similar', 'recommended'];
    
    // Helper function to generate consistent "random" values based on meal ID
    const getConsistentValue = (mealId, base, range) => {
      // Use meal ID to generate a consistent pseudo-random value
      let hash = 0;
      for (let i = 0; i < mealId.length; i++) {
        const char = mealId.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      const normalized = Math.abs(hash) / 2147483647; // Normalize to 0-1
      return base + (normalized * range);
    };
    
    // Helper function to determine difficulty based on prep time and ingredients
    const getDifficulty = (meal) => {
      const prepTime = meal.prepTime || 0;
      const ingredientCount = meal.ingredients?.length || 0;
      
      // Simple logic: longer prep time + more ingredients = harder
      if (prepTime <= 20 && ingredientCount <= 3) return 'easy';
      if (prepTime <= 45 && ingredientCount <= 6) return 'medium';
      return 'hard';
    };
    
    // Helper function to determine recommendation type based on meal characteristics
    const getRecommendationType = (meal, index) => {
      const prepTime = meal.prepTime || 0;
      const ingredientCount = meal.ingredients?.length || 0;
      
      // Trending: Quick meals with few ingredients
      if (prepTime <= 20 && ingredientCount <= 3) return 'trending';
      // Popular: Medium complexity meals
      if (prepTime <= 45 && ingredientCount <= 6) return 'popular';
      // Similar: Complex meals
      if (prepTime > 45 || ingredientCount > 6) return 'similar';
      // Default fallback
      return 'recommended';
    };
    
    const mockRecommendations = meals.map((meal, index) => {
      const difficulty = getDifficulty(meal);
      const recommendationType = getRecommendationType(meal, index);
      
      // Generate consistent scores based on meal characteristics
      const baseScore = difficulty === 'easy' ? 0.8 : difficulty === 'medium' ? 0.75 : 0.7;
      const scoreVariation = getConsistentValue(meal._id, 0, 0.2); // 0-0.2 variation
      const finalScore = Math.min(1.0, baseScore + scoreVariation);
      
      return {
        meal_id: meal._id,
        meal_name: meal.name,
        meal_type: ['breakfast', 'lunch', 'dinner'][index % 3],
        prep_time: meal.prepTime || (15 + (index * 10)),
        difficulty: difficulty,
        rating: 3.5 + getConsistentValue(meal._id, 0, 1.5), // 3.5 to 5.0
        recommendation_type: recommendationType,
        popularity_score: 0.6 + getConsistentValue(meal._id, 0, 0.4), // 0.6 to 1.0
        similarity_score: 0.7 + getConsistentValue(meal._id, 0, 0.3), // 0.7 to 1.0
        prediction_score: 0.65 + getConsistentValue(meal._id, 0, 0.35), // 0.65 to 1.0
        display_score: finalScore, // Consistent score based on difficulty
        ingredients: meal.ingredients?.map(ing => ing.ingredient?.name || 'Unknown') || [],
        description: meal.description || 'A delicious meal',
      };
    });
    
    setRecommendations(mockRecommendations);
  };

  // Helper function to get recommendation data for a specific meal
  const getMealRecommendation = (mealId) => {
    return recommendations.find(rec => rec.meal_id === mealId);
  };

  // Helper function to get recommendation type icon
  const getRecommendationTypeIcon = (type) => {
    switch (type) {
      case 'trending':
        return '🔥';
      case 'similar':
        return '🔍';
      case 'popular':
        return '⭐';
      case 'recommended':
      default:
        return '💡';
    }
  };

  // Helper function to get difficulty color
  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return 'text-green-600 dark:text-green-400';
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'hard':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
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

  const handleToggleActive = async (meal) => {
    try {
      await api.put(`/meals/${meal._id}`, { active: !meal.active });
      toast.success(`Meal ${meal.active ? 'deactivated' : 'activated'} successfully`);
      fetchMeals();
    } catch (error) {
      console.error('Error toggling meal status:', error);
      toast.error('Failed to update meal status');
    }
  };

  const handleAddMeal = () => {
    setSelectedMeal(null);
    setModalMode('add');
    setMealModalOpen(true);
  };

  const handleEditMeal = (meal) => {
    setSelectedMeal(meal);
    setModalMode('edit');
    setMealModalOpen(true);
  };

  const handleCloseMealModal = () => {
    console.log('Closing meal modal');
    try {
      setMealModalOpen(false);
      setSelectedMeal(null);
      setModalMode('edit');
      console.log('Modal closed successfully');
    } catch (error) {
      console.error('Error closing modal:', error);
    }
  };

  const handleSaveMeal = (mealData) => {
    console.log('handleSaveMeal called with:', { mealData, modalMode });
    
    try {
      if (!mealData || !mealData._id) {
        console.error('Invalid meal data received:', mealData);
        toast.error('Error: Invalid meal data received');
        return;
      }

      if (modalMode === 'add') {
        console.log('Adding new meal to list');
        // Add new meal to the beginning of the array
        setMeals(prevMeals => {
          console.log('Previous meals count:', prevMeals.length);
          const newMeals = [mealData, ...prevMeals];
          console.log('New meals count:', newMeals.length);
          return newMeals;
        });
      } else {
        console.log('Updating existing meal in list');
        // Update existing meal in the array
        setMeals(prevMeals => 
          prevMeals.map(meal => 
            meal._id === mealData._id ? mealData : meal
          )
        );
      }
      
      console.log('Meal save completed successfully');
      
    } catch (error) {
      console.error('Error handling meal save:', error);
      toast.error('Failed to update meal list');
    }
  };

  const filteredAndSortedMeals = meals
    .filter(meal => {
      const matchesSearch = meal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           meal.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesActive = activeFilter === 'all' || 
                           (activeFilter === 'active' && meal.active) ||
                           (activeFilter === 'inactive' && !meal.active);
      return matchesSearch && matchesActive;
    })
    .sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'prepTime':
          aValue = a.prepTime || 0;
          bValue = b.prepTime || 0;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
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
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Meals</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage your meal collection</p>
        </div>
        <button
          onClick={handleAddMeal}
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 dark:text-secondary-500 w-4 h-4" />
              <input
                type="text"
                placeholder="Search meals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>

            {/* Active Filter */}
            <div>
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
                className="select"
              >
                {activeFilters.map(filter => (
                  <option key={filter.value} value={filter.value}>
                    {filter.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="select"
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
                className="select"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </div>
        </div>
      </div>


      {/* Meals List */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
            {filteredAndSortedMeals.length} Meal{filteredAndSortedMeals.length !== 1 ? 's' : ''}
          </h3>
        </div>
        <div className="card-body">
          {filteredAndSortedMeals.length === 0 ? (
            <div className="text-center py-12">
              <ChefHat className="w-16 h-16 text-secondary-400 dark:text-secondary-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-2">
                {meals.length === 0 ? 'No meals added yet' : 'No meals match your filters'}
              </h3>
              <p className="text-secondary-600 dark:text-secondary-400 mb-6">
                {meals.length === 0 
                  ? 'Start by adding your first meal' 
                  : 'Try adjusting your search or filters'}
              </p>
              <button
                onClick={handleAddMeal}
                className="btn-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Meal
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-secondary-200 dark:divide-secondary-700">
                <thead className="bg-secondary-50 dark:bg-secondary-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                      Ingredients
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                      Prep Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                      AI Recommendation
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                      Difficulty
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                      Match Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-secondary-800 divide-y divide-secondary-200 dark:divide-secondary-700">
                  {filteredAndSortedMeals.map((meal) => (
                    <tr key={meal._id} className="hover:bg-secondary-50 dark:hover:bg-secondary-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
                          {meal.name}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-secondary-600 dark:text-secondary-400 max-w-xs truncate">
                          {meal.description || 'No description'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-secondary-600 dark:text-secondary-400">
                          {meal.ingredients && meal.ingredients.length > 0 ? (
                            <div className="space-y-1">
                              {meal.ingredients.slice(0, 2).map((ingredient, index) => (
                                <div key={index} className="flex items-center space-x-1">
                                  <span className="font-medium">
                                    {ingredient.ingredient?.name || 'Unknown'}
                                  </span>
                                  {ingredient.quantity && (
                                    <span className="text-xs text-secondary-500 dark:text-secondary-400">
                                      ({ingredient.quantity} {ingredient.unit})
                                    </span>
                                  )}
                                </div>
                              ))}
                              {meal.ingredients.length > 2 && (
                                <div className="text-xs text-secondary-500 dark:text-secondary-400">
                                  +{meal.ingredients.length - 2} more
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-secondary-400 dark:text-secondary-500 italic">No ingredients</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-secondary-600 dark:text-secondary-400 flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {meal.prepTime || 0} min
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(() => {
                          const recommendation = getMealRecommendation(meal._id);
                          return recommendation ? (
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">
                                {getRecommendationTypeIcon(recommendation.recommendation_type)}
                              </span>
                              <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                                {recommendation.recommendation_type}
                              </span>
                            </div>
                          ) : (
                            <span className="text-secondary-400 dark:text-secondary-500 italic text-sm">
                              No AI data
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(() => {
                          const recommendation = getMealRecommendation(meal._id);
                          return recommendation ? (
                            <div className={`text-sm font-medium ${getDifficultyColor(recommendation.difficulty)}`}>
                              {recommendation.difficulty}
                            </div>
                          ) : (
                            <span className="text-secondary-400 dark:text-secondary-500 italic text-sm">
                              -
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(() => {
                          const recommendation = getMealRecommendation(meal._id);
                          return recommendation && recommendation.display_score ? (
                            <div className="flex items-center space-x-2">
                              <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div 
                                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                  style={{ 
                                    width: `${Math.max(0, Math.min(100, Math.round((recommendation.display_score || 0) * 100)))}%` 
                                  }}
                                ></div>
                              </div>
                              <span className="text-xs text-secondary-600 dark:text-secondary-400">
                                {Math.max(0, Math.min(100, Math.round((recommendation.display_score || 0) * 100)))}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-secondary-400 dark:text-secondary-500 italic text-sm">
                              -
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleActive(meal)}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            meal.active 
                              ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/30' 
                              : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/30'
                          } transition-colors cursor-pointer`}
                        >
                          {meal.active ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 mr-1" />
                              Inactive
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEditMeal(meal)}
                            className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300 p-1 rounded hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                            title="Edit meal"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteMeal(meal._id)}
                            className="text-error-600 dark:text-error-400 hover:text-error-900 dark:hover:text-error-300 p-1 rounded hover:bg-error-50 dark:hover:bg-error-900/20 transition-colors"
                            title="Delete meal"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Meal Modal */}
      <MealModal
        meal={selectedMeal}
        isOpen={mealModalOpen}
        onClose={handleCloseMealModal}
        onSave={handleSaveMeal}
        mode={modalMode}
      />
    </div>
  );
};

export default Meals; 