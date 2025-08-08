import React, { useState, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { Clock, Star, ChefHat, Users, ThumbsUp, ThumbsDown, RefreshCw, Lightbulb, Calendar, Plus } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const MealRecommendations = ({ 
  mealType = null, 
  currentMealId = null, 
  className = '', 
  showFeedback = true,
  maxRecommendations = 5 
}) => {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [context, setContext] = useState({});

  // Meal planning modal states
  const [showMealPlanModal, setShowMealPlanModal] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedMealType, setSelectedMealType] = useState('dinner');
  const [isAddingToMealPlan, setIsAddingToMealPlan] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState({});



  const fetchRecommendations = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Use the proper API service instead of raw fetch
      const response = await api.get('/meals');

      if (response.data.success && response.data.meals && response.data.meals.length > 0) {
        // Transform existing meals into recommendation format
        const mealRecommendations = response.data.meals
          .filter(meal => meal.active) // Only active meals
          .filter(meal => !mealType || meal.mealType === mealType) // Filter by meal type if specified
          .map(meal => ({
            meal_id: meal._id,
            meal_name: meal.name,
            meal_type: meal.meal_type || meal.mealType || 'dinner',
            prep_time: meal.prepTime || 30,
            difficulty: meal.difficulty || 'medium',
            rating: meal.rating || 4.2,
            recommendation_type: 'existing_meal',
            popularity_score: 0.8,
            ingredients: meal.ingredients?.slice(0, 4).map(ing => ing.ingredient?.name || 'ingredient').filter(Boolean) || [],
            description: meal.description || `Delicious ${meal.name.toLowerCase()}`
          }))
          .slice(0, maxRecommendations); // Limit to requested number

        setRecommendations(mealRecommendations);
        setContext({ 
          fallback: false, 
          message: `Showing ${mealRecommendations.length} of your existing meals`,
          models_used: ['existing_meals']
        });
        setError(''); // Clear any previous errors
      } else {
        // No meals found - show empty state
        setRecommendations([]);
        setContext({ 
          fallback: false, 
          message: 'No meals found. Create some meals to see recommendations!',
          models_used: ['empty']
        });
      }
      
    } catch (err) {
      console.error('❌ Error fetching meal recommendations:', err);
      setError('Failed to fetch meals');
      
      // Show empty state instead of fallback recommendations
      setRecommendations([]);
      setContext({ 
        fallback: true, 
        message: 'Unable to load recommendations. Please try again.',
        models_used: ['error']
      });
    } finally {
      flushSync(() => {
        setLoading(false);
      });
    }
  };

  const handleFeedback = async (mealId, feedbackType) => {
    if (!user) return;

    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No token found in localStorage for feedback');
      return;
    }

    if (feedbackLoading[mealId]) return;

    setFeedbackLoading(prev => ({ ...prev, [mealId]: true }));

    try {
      const response = await fetch('/api/recommendations/feedback', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          meal_id: mealId,
          feedback_type: feedbackType
        })
      });

      const data = await response.json();

      if (data.success) {
        // Update the recommendation to show feedback was recorded
        setRecommendations(prev => prev.map(rec => 
          rec.meal_id === mealId 
            ? { ...rec, user_feedback: feedbackType }
            : rec
        ));
      } else {
        console.error('Failed to record feedback:', data.message);
      }
    } catch (err) {
      console.error('Error recording feedback:', err);
    } finally {
      setFeedbackLoading(prev => ({ ...prev, [mealId]: false }));
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'text-green-600 dark:text-green-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'hard': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getRecommendationTypeIcon = (type) => {
    switch (type) {
      case 'hybrid': return '🧠';
      case 'content_based': return '🔍';
      case 'collaborative_filtering': return '👥';
      case 'popular': return '⭐';
      case 'fallback_popular': return '📈';
      case 'existing_meal': return '🍽️';
      default: return '🍽️';
    }
  };

  const getRecommendationTypeLabel = (type) => {
    switch (type) {
      case 'hybrid': return 'Personalized';
      case 'content_based': return 'Similar Taste';
      case 'collaborative_filtering': return 'Others Like';
      case 'popular': return 'Popular Choice';
      case 'fallback_popular': return 'Trending';
      case 'existing_meal': return 'Your Recipe';
      default: return 'Recommended';
    }
  };

  // Handle opening meal plan modal
  const handleAddToMealPlan = (recommendation) => {
    setSelectedRecommendation(recommendation);
    setSelectedDate(new Date().toISOString().split('T')[0]); // Default to today
    setSelectedMealType(recommendation.meal_type || 'dinner');
    setShowMealPlanModal(true);
  };

  // Handle adding recommendation to meal plan
  const handleConfirmAddToMealPlan = async () => {
    if (!selectedRecommendation || !selectedDate || !selectedMealType) {
      toast.error('Please select a date and meal type');
      return;
    }

    setIsAddingToMealPlan(true);
    
    try {
      console.log('📅 Adding existing meal to meal plan:', {
        mealId: selectedRecommendation.meal_id,
        mealName: selectedRecommendation.meal_name,
        date: selectedDate,
        mealType: selectedMealType
      });

      // Since we're only showing existing meals, we can directly add to meal plan
      const mealPlanData = {
        meal: selectedRecommendation.meal_id, // This is already an existing meal ID
        mealType: selectedMealType,
        date: new Date(selectedDate).toISOString(),
        assignedTo: [],
        isCooked: false,
        notes: `Added from recommendations`
      };

      // Use the proper API service instead of raw fetch
      const response = await api.post('/meal-plans', mealPlanData);
      console.log('✅ Successfully added to meal plan:', response.data.mealPlan);

      // Success!
      toast.success(
        `✅ ${selectedRecommendation.meal_name} added to ${selectedMealType} on ${new Date(selectedDate).toLocaleDateString()}`
      );
      setShowMealPlanModal(false);
      setSelectedRecommendation(null);

    } catch (error) {
      console.error('❌ Error adding to meal plan:', error);
      toast.error('Failed to add to meal plan. Please try again.');
    } finally {
      setIsAddingToMealPlan(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRecommendations();
    }
  }, [user, mealType, maxRecommendations]);

  if (!user) return null;

  return (
    <div 
      data-testid="meal-recommendations-root"
      className="flex flex-col h-full w-full"
      style={{
        maxWidth: '100%',
        minWidth: '0',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}>
      <div className={`p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
              AI Meal Recommendations
            </h3>
          </div>
          <button
            onClick={fetchRecommendations}
            disabled={loading}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
            title="Refresh recommendations"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        {context && (
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {context.fallback ? (
              <span className="flex items-center text-yellow-600 dark:text-yellow-400">
                ⚠️ <span className="ml-1 break-all">{context.message}</span>
              </span>
            ) : (
              <span className="break-words">
                Personalized for {mealType || 'any meal'} • 
                Models used: {context.models_used?.join(', ') || 'AI'}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 w-full" 
           style={{ 
             maxWidth: '100%', 
             overflow: 'auto hidden',
             boxSizing: 'border-box'
           }}>
        <div className="p-4 w-full" style={{ maxWidth: '100%', boxSizing: 'border-box' }}>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-6">
              <div className="text-red-600 dark:text-red-400 mb-2">Failed to fetch meals</div>
              <button
                onClick={fetchRecommendations}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Try again
              </button>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="text-center py-6 text-gray-500 dark:text-gray-400">
              <ChefHat className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No recommendations available yet.</p>
              <p className="text-sm mt-1">Try creating some meal plans to get personalized suggestions!</p>
            </div>
          ) : (
            <div className="space-y-4 w-full" style={{ maxWidth: '100%', boxSizing: 'border-box' }}>
              {recommendations.map((recommendation, index) => (
                <div 
                  key={recommendation.meal_id} 
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:shadow-md transition-shadow w-full"
                  data-testid={`meal-card-${recommendation.meal_id}`}
                  style={{ 
                    maxWidth: '100%', 
                    width: '100%',
                    overflow: 'hidden',
                    boxSizing: 'border-box'
                  }}
                >
                  {/* Content and buttons in stacked layout for better space management */}
                  <div className="w-full" style={{ maxWidth: '100%', boxSizing: 'border-box' }}>
                    {/* Header with meal name and type badge - stacked to prevent overflow */}
                    <div className="mb-2 w-full" style={{ maxWidth: '100%' }}>
                      <div className="flex items-center space-x-2 mb-1 w-full min-w-0" style={{ maxWidth: '100%' }}>
                        <span className="text-lg flex-shrink-0">
                          {getRecommendationTypeIcon(recommendation.recommendation_type)}
                        </span>
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate flex-1 text-sm min-w-0">
                          {recommendation.meal_name}
                        </h4>
                      </div>
                      <span className="inline-block text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 max-w-full truncate">
                        {getRecommendationTypeLabel(recommendation.recommendation_type)}
                      </span>
                    </div>

                    {/* Details in compact format - wrapped to prevent overflow */}
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-2 space-y-1 w-full" style={{ maxWidth: '100%' }}>
                      <div className="flex items-center flex-wrap gap-2 w-full">
                        {recommendation.meal_type && (
                          <span className="flex items-center flex-shrink-0">
                            <Users className="w-3 h-3 mr-1" />
                            <span className="truncate">{recommendation.meal_type}</span>
                          </span>
                        )}
                        {recommendation.prep_time && (
                          <span className="flex items-center flex-shrink-0">
                            <Clock className="w-3 h-3 mr-1" />
                            <span>{recommendation.prep_time}m</span>
                          </span>
                        )}
                        {recommendation.difficulty && (
                          <span className={`flex items-center flex-shrink-0 ${getDifficultyColor(recommendation.difficulty)}`}>
                            <ChefHat className="w-3 h-3 mr-1" />
                            <span className="truncate">{recommendation.difficulty}</span>
                          </span>
                        )}
                        {recommendation.rating > 0 && (
                          <span className="flex items-center flex-shrink-0">
                            <Star className="w-3 h-3 mr-1 text-yellow-500" />
                            <span>{recommendation.rating}/5</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Ingredients - truncated to save space */}
                    {recommendation.ingredients && recommendation.ingredients.length > 0 && (
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        <span className="font-medium">Ingredients: </span>
                        <span className="break-words">
                          {recommendation.ingredients.slice(0, 2).join(', ')}
                          {recommendation.ingredients.length > 2 && ` +${recommendation.ingredients.length - 2} more`}
                        </span>
                      </div>
                    )}

                    {/* Action buttons in horizontal layout to save vertical space */}
                    {showFeedback && (
                      <div className="flex items-center justify-center gap-1 pt-2 border-t border-gray-100 dark:border-gray-700 w-full max-w-full" style={{ maxWidth: '100%', boxSizing: 'border-box' }}>
                        <button
                          onClick={() => handleFeedback(recommendation.meal_id, 'like')}
                          disabled={feedbackLoading[recommendation.meal_id]}
                          className={`p-1 rounded-full transition-colors text-xs flex-shrink-0 ${
                            recommendation.user_feedback === 'like'
                              ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-green-600'
                          }`}
                          title="Like"
                        >
                          <ThumbsUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleFeedback(recommendation.meal_id, 'dislike')}
                          disabled={feedbackLoading[recommendation.meal_id]}
                          className={`p-1 rounded-full transition-colors text-xs flex-shrink-0 ${
                            recommendation.user_feedback === 'dislike'
                              ? 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-600'
                          }`}
                          title="Dislike"
                        >
                          <ThumbsDown className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleAddToMealPlan(recommendation)}
                          className="p-1 rounded-full transition-colors bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-xs flex-shrink-0"
                          title="Add to meal plan"
                        >
                          <Calendar className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* Confidence score - compact version */}
                    {(recommendation.similarity_score || recommendation.prediction_score || recommendation.popularity_score) && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                          <div 
                            className="bg-blue-600 h-1 rounded-full" 
                            style={{ 
                              width: `${Math.round((recommendation.similarity_score || recommendation.prediction_score || recommendation.popularity_score) * 100)}%` 
                            }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {Math.round((recommendation.similarity_score || recommendation.prediction_score || recommendation.popularity_score) * 100)}% match
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Meal Plan Modal */}
      {showMealPlanModal && selectedRecommendation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Add {selectedRecommendation.meal_name} to Meal Plan
              </h3>
              <button
                onClick={() => setShowMealPlanModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>

            <div className="mb-4">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-2xl">
                  {getRecommendationTypeIcon(selectedRecommendation.recommendation_type)}
                </span>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    {selectedRecommendation.meal_name}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedRecommendation.prep_time} min • {selectedRecommendation.difficulty}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Meal Type
                </label>
                <select
                  value={selectedMealType}
                  onChange={(e) => setSelectedMealType(e.target.value)}
                  className="select"
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                </select>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowMealPlanModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAddToMealPlan}
                disabled={isAddingToMealPlan}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {isAddingToMealPlan ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add to Meal Plan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MealRecommendations; 