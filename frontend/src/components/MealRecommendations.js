import React, { useState, useEffect } from 'react';
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

  console.log('🧠 MealRecommendations component rendered', { 
    user: !!user, 
    mealType, 
    maxRecommendations,
    recommendations: recommendations.length 
  });

  const fetchRecommendations = async () => {
    if (!user) return;

    console.log('🚀 fetchRecommendations called', { user: !!user, mealType, maxRecommendations });

    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No token found in localStorage');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (mealType) params.append('meal_type', mealType);
      if (currentMealId) params.append('meal_id', currentMealId);
      params.append('top_n', maxRecommendations.toString());

      console.log('📡 Making API request to /api/recommendations');

      const response = await fetch(`/api/recommendations?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setRecommendations(data.recommendations || []);
        setContext(data.context);
      } else {
        setError(data.message || 'Failed to load recommendations');
      }
    } catch (err) {
      console.error('❌ Error fetching recommendations:', err);
      
      // Fallback: Show sample recommendations when API is not available
      console.log('🔄 ML service unavailable, showing sample recommendations...');
      const sampleRecommendations = [
        {
          meal_id: 'sample_1',
          meal_name: 'Grilled Chicken Salad',
          meal_type: mealType || 'lunch',
          prep_time: 15,
          difficulty: 'easy',
          rating: 4.5,
          recommendation_type: 'popular',
          popularity_score: 0.85,
          ingredients: ['chicken breast', 'mixed greens', 'tomatoes', 'cucumber']
        },
        {
          meal_id: 'sample_2', 
          meal_name: 'Spaghetti Carbonara',
          meal_type: mealType || 'dinner',
          prep_time: 25,
          difficulty: 'medium',
          rating: 4.8,
          recommendation_type: 'popular',
          popularity_score: 0.92,
          ingredients: ['spaghetti', 'eggs', 'bacon', 'parmesan cheese']
        },
        {
          meal_id: 'sample_3',
          meal_name: 'Avocado Toast',
          meal_type: mealType || 'breakfast',
          prep_time: 5,
          difficulty: 'easy', 
          rating: 4.2,
          recommendation_type: 'popular',
          popularity_score: 0.78,
          ingredients: ['bread', 'avocado', 'lime', 'salt']
        },
        {
          meal_id: 'sample_4',
          meal_name: 'Beef Stir Fry',
          meal_type: mealType || 'dinner',
          prep_time: 20,
          difficulty: 'medium',
          rating: 4.6,
          recommendation_type: 'popular', 
          popularity_score: 0.83,
          ingredients: ['beef strips', 'bell peppers', 'broccoli', 'soy sauce']
        },
        {
          meal_id: 'sample_5',
          meal_name: 'Greek Yogurt Parfait',
          meal_type: mealType || 'breakfast',
          prep_time: 3,
          difficulty: 'easy',
          rating: 4.3,
          recommendation_type: 'popular',
          popularity_score: 0.75,
          ingredients: ['greek yogurt', 'berries', 'granola', 'honey']
        }
      ].slice(0, maxRecommendations);

      setRecommendations(sampleRecommendations);
      setContext({ 
        fallback: true, 
        message: 'ML service unavailable, showing popular meals',
        models_used: ['fallback_popular']
      });
      setError(''); // Clear error state so recommendations are shown
    } finally {
      setLoading(false);
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
      default: return '🍽️';
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
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      // Step 1: Check if meal already exists or create it
      let mealId;
      
      // Try to find existing meal with the same name
      const existingMealsResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5002'}/api/meals`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (existingMealsResponse.ok) {
        const existingMealsData = await existingMealsResponse.json();
        const existingMeal = existingMealsData.meals?.find(
          meal => meal.name.toLowerCase() === selectedRecommendation.meal_name.toLowerCase()
        );

        if (existingMeal) {
          mealId = existingMeal._id;
          console.log('📦 Found existing meal:', existingMeal.name);
        }
      }

      // Step 2: Create meal if it doesn't exist
      if (!mealId) {
        console.log('🆕 Creating new meal:', selectedRecommendation.meal_name);
        
        const mealData = {
          name: selectedRecommendation.meal_name,
          description: `Recommended meal with ${selectedRecommendation.ingredients?.slice(0, 3).join(', ')}`,
          prepTime: selectedRecommendation.prep_time || 30,
          active: true,
          ingredients: [], // We could populate this with ingredient data if available
          recipe: {
            difficulty: selectedRecommendation.difficulty || 'medium',
            servings: 4
          },
          tags: [selectedRecommendation.recommendation_type || 'recommended'],
          notes: `Added from AI recommendations (${selectedRecommendation.recommendation_type})`
        };

        const createMealResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5002'}/api/meals`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(mealData)
        });

        if (!createMealResponse.ok) {
          const errorData = await createMealResponse.json();
          throw new Error(errorData.message || 'Failed to create meal');
        }

        const newMealData = await createMealResponse.json();
        mealId = newMealData.meal._id;
        console.log('✅ Created new meal:', newMealData.meal.name);
      }

      // Step 3: Add to meal plan
      const mealPlanData = {
        meal: mealId,
        mealType: selectedMealType,
        date: new Date(selectedDate).toISOString(),
        assignedTo: [],
        isCooked: false,
        notes: `Added from AI recommendations`
      };

      const createMealPlanResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5002'}/api/meal-plans`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mealPlanData)
      });

      if (!createMealPlanResponse.ok) {
        const errorData = await createMealPlanResponse.json();
        throw new Error(errorData.message || 'Failed to add to meal plan');
      }

      const mealPlanResult = await createMealPlanResponse.json();
      console.log('📅 Added to meal plan:', mealPlanResult.mealPlan);

      // Success!
      toast.success(`✅ ${selectedRecommendation.meal_name} added to ${selectedMealType} on ${new Date(selectedDate).toLocaleDateString()}`);
      setShowMealPlanModal(false);
      setSelectedRecommendation(null);

    } catch (error) {
      console.error('Error adding to meal plan:', error);
      toast.error(`Failed to add to meal plan: ${error.message}`);
    } finally {
      setIsAddingToMealPlan(false);
    }
  };

  const getRecommendationTypeLabel = (type) => {
    switch (type) {
      case 'hybrid': return 'AI Personalized';
      case 'content_based': return 'Similar Meals';
      case 'collaborative_filtering': return 'Community Favorite';
      case 'popular': return 'Popular Choice';
      case 'fallback_popular': return 'Top Rated';
      default: return 'Recommended';
    }
  };

  useEffect(() => {
    console.log('🔄 MealRecommendations useEffect triggered', { user: !!user, mealType, currentMealId, maxRecommendations });
    
    if (user) {
      console.log('👤 User is authenticated, calling fetchRecommendations...');
      fetchRecommendations();
    } else {
      console.log('❌ No user found, not fetching recommendations');
    }
  }, [user, mealType, currentMealId, maxRecommendations]);

  // Fallback: Show sample recommendations immediately if we have a user but no recommendations after 2 seconds
  useEffect(() => {
    if (user && recommendations.length === 0 && !loading) {
      console.log('⏰ Setting up fallback timer for sample recommendations...');
      const timer = setTimeout(() => {
        console.log('🔄 Timer triggered - showing sample recommendations as ultimate fallback');
        const sampleRecommendations = [
          {
            meal_id: 'fallback_1',
            meal_name: 'Quick Grilled Chicken',
            meal_type: mealType || 'dinner',
            prep_time: 20,
            difficulty: 'easy',
            rating: 4.4,
            recommendation_type: 'popular',
            popularity_score: 0.88,
            ingredients: ['chicken breast', 'olive oil', 'herbs', 'lemon']
          },
          {
            meal_id: 'fallback_2', 
            meal_name: 'Pasta Primavera',
            meal_type: mealType || 'dinner',
            prep_time: 15,
            difficulty: 'easy',
            rating: 4.2,
            recommendation_type: 'popular',
            popularity_score: 0.82,
            ingredients: ['pasta', 'mixed vegetables', 'olive oil', 'garlic']
          },
          {
            meal_id: 'fallback_3',
            meal_name: 'Breakfast Smoothie',
            meal_type: mealType || 'breakfast',
            prep_time: 5,
            difficulty: 'easy', 
            rating: 4.0,
            recommendation_type: 'popular',
            popularity_score: 0.76,
            ingredients: ['banana', 'berries', 'yogurt', 'honey']
          }
        ].slice(0, maxRecommendations);

        setRecommendations(sampleRecommendations);
        setContext({ 
          fallback: true, 
          message: 'Showing fallback recommendations',
          models_used: ['fallback_timer']
        });
        setError(''); // Clear error state so recommendations are shown
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [user, recommendations.length, loading, mealType, maxRecommendations]);

  if (!user) return null;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              AI Meal Recommendations
            </h3>
          </div>
          <button
            onClick={fetchRecommendations}
            disabled={loading}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Refresh recommendations"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        {context && (
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {context.fallback ? (
              <span className="flex items-center text-yellow-600 dark:text-yellow-400">
                ⚠️ {context.message}
              </span>
            ) : (
              <span>
                Personalized for {mealType || 'any meal'} • 
                Models used: {context.models_used?.join(', ') || 'AI'}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="p-4">
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
            <div className="text-red-600 dark:text-red-400 mb-2">⚠️ {error}</div>
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
          <div className="space-y-4">
            {recommendations.map((recommendation, index) => (
              <div 
                key={recommendation.meal_id} 
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-lg">
                        {getRecommendationTypeIcon(recommendation.recommendation_type)}
                      </span>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        {recommendation.meal_name}
                      </h4>
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                        {getRecommendationTypeLabel(recommendation.recommendation_type)}
                      </span>
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {recommendation.meal_type && (
                        <span className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          {recommendation.meal_type}
                        </span>
                      )}
                      
                      {recommendation.prep_time && (
                        <span className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {recommendation.prep_time} min
                        </span>
                      )}
                      
                      {recommendation.difficulty && (
                        <span className={`flex items-center ${getDifficultyColor(recommendation.difficulty)}`}>
                          <ChefHat className="w-4 h-4 mr-1" />
                          {recommendation.difficulty}
                        </span>
                      )}
                      
                      {recommendation.rating > 0 && (
                        <span className="flex items-center">
                          <Star className="w-4 h-4 mr-1 text-yellow-500" />
                          {recommendation.rating}/5
                        </span>
                      )}
                    </div>

                    {recommendation.ingredients && recommendation.ingredients.length > 0 && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Ingredients: </span>
                        {recommendation.ingredients.slice(0, 3).join(', ')}
                        {recommendation.ingredients.length > 3 && ` +${recommendation.ingredients.length - 3} more`}
                      </div>
                    )}

                    {/* Recommendation score/confidence */}
                    {(recommendation.similarity_score || recommendation.prediction_score || recommendation.popularity_score) && (
                      <div className="mt-2">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Match confidence: {Math.round((recommendation.similarity_score || recommendation.prediction_score || recommendation.popularity_score) * 100)}%
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 mt-1">
                          <div 
                            className="bg-blue-600 h-1 rounded-full" 
                            style={{ 
                              width: `${Math.round((recommendation.similarity_score || recommendation.prediction_score || recommendation.popularity_score) * 100)}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Feedback buttons */}
                  {showFeedback && (
                    <div className="flex space-x-1 ml-4">
                      <button
                        onClick={() => handleFeedback(recommendation.meal_id, 'like')}
                        disabled={feedbackLoading[recommendation.meal_id]}
                        className={`p-2 rounded-full transition-colors ${
                          recommendation.user_feedback === 'like'
                            ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-green-600'
                        }`}
                        title="Like this recommendation"
                      >
                        <ThumbsUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleFeedback(recommendation.meal_id, 'dislike')}
                        disabled={feedbackLoading[recommendation.meal_id]}
                        className={`p-2 rounded-full transition-colors ${
                          recommendation.user_feedback === 'dislike'
                            ? 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-600'
                        }`}
                        title="Dislike this recommendation"
                      >
                        <ThumbsDown className="w-4 h-4" />
                      </button>
                      
                      {/* Add to Meal Plan button */}
                      <button
                        onClick={() => handleAddToMealPlan(recommendation)}
                        className="p-2 rounded-full transition-colors bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                        title="Add to meal plan"
                      >
                        <Calendar className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Meal Plan Modal */}
      {showMealPlanModal && selectedRecommendation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Add to Meal Plan
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Meal Type
                </label>
                <select
                  value={selectedMealType}
                  onChange={(e) => setSelectedMealType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
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
                    Add to Plan
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