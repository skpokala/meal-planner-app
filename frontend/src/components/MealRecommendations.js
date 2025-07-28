import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Clock, Star, ChefHat, Users, ThumbsUp, ThumbsDown, RefreshCw, Lightbulb } from 'lucide-react';

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
  const [context, setContext] = useState(null);
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
    fetchRecommendations();
  }, [user, mealType, currentMealId, maxRecommendations]);

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
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MealRecommendations; 