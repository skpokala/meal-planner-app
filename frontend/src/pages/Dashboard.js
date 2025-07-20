import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, ChefHat, Plus, Clock } from 'lucide-react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import MealModal from '../components/MealModal';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { user, loading: authLoading, isAdmin, isSystemAdmin } = useAuth();
  

  
  const [stats, setStats] = useState({
    familyMembers: 0,
    activeMeals: 0,
    futureMealPlans: 0,
  });
  const [recentMeals, setRecentMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mealModalOpen, setMealModalOpen] = useState(false);

  const navigate = useNavigate();

  const fetchDashboardData = async (showRefreshIndicator = false) => {
    try {
      const apiCalls = [
        api.get('/meals', { params: { active: true } }),
        api.get('/meal-plans', { params: { future: true } })
      ];

      // Only fetch family members for admin users
      if (isAdmin()) {
        apiCalls.unshift(api.get('/family-members'));
      }

      const responses = await Promise.all(apiCalls);
      
      let familyResponse, mealsResponse, mealPlansResponse;
      if (isAdmin()) {
        [familyResponse, mealsResponse, mealPlansResponse] = responses;
      } else {
        [mealsResponse, mealPlansResponse] = responses;
      }

      setStats({
        familyMembers: isAdmin() ? (familyResponse?.data.count || familyResponse?.data.familyMembers?.length || 0) : 0,
        activeMeals: mealsResponse.data.count || mealsResponse.data.meals?.length || 0,
        futureMealPlans: mealPlansResponse.data.count || mealPlansResponse.data.mealPlans?.length || 0,
      });

      // Show recent meals for display
      setRecentMeals(mealsResponse.data.meals?.slice(0, 5) || []);
      
      if (showRefreshIndicator) {
        toast.success('Dashboard data refreshed');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };



  useEffect(() => {
    // Only fetch dashboard data if user is authenticated and auth loading is complete
    if (!authLoading && user) {
      // Reset stats to ensure fresh data
      setStats({
        familyMembers: 0,
        activeMeals: 0,
        futureMealPlans: 0,
      });
      setRecentMeals([]);
      setLoading(true);
      fetchDashboardData();
    } else if (!authLoading && !user) {
      navigate('/login');
    }
  }, [authLoading, user, navigate]);

  // Add effect to refresh data when component becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user && !authLoading) {
        fetchDashboardData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, authLoading]);

  const handleMealCreated = async (newMeal) => {
    try {
      setMealModalOpen(false);
      
      if (!newMeal || !newMeal._id) {
        console.error('Invalid meal data received:', newMeal);
        toast.error('Error: Invalid meal data received');
        return;
      }

      toast.success('Meal created successfully!');
      // Refresh dashboard data to reflect new meal
      await fetchDashboardData();
    } catch (error) {
      console.error('Error handling meal creation:', error);
      toast.error('Error updating dashboard');
    }
  };

  const statCards = [
    ...(isAdmin() ? [{
      title: 'Family Members',
      value: stats.familyMembers,
      icon: Users,
      color: 'bg-primary-500',
      action: () => navigate('/family-members'),
      description: 'Total family members'
    }] : []),
    {
      title: 'Active Meals',
      value: stats.activeMeals,
      icon: ChefHat,
      color: 'bg-success-500',
      action: () => navigate('/meals'),
      description: 'Available for planning'
    },
    {
      title: 'Future Meal Plans',
      value: stats.futureMealPlans,
      icon: Calendar,
      color: 'bg-warning-500',
      action: () => navigate('/meal-planner'),
      description: 'Saved for the future'
    },
  ];

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  if (authLoading || loading) {
    return <LoadingSpinner size="lg" text="Loading dashboard..." />;
  }

  if (!user) {
    return <LoadingSpinner size="lg" text="Redirecting to login..." />;
  }

  return (
    <div>
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-card text-white p-6">
        <h1 className="text-3xl font-bold mb-2 text-white">Welcome back!</h1>
        <p className="text-primary-100">
          Here's an overview of your family's meal planning activities.
        </p>
      </div>



      {/* Stats Grid */}
      <div className={`grid grid-cols-1 ${isSystemAdmin() ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-6 mt-6`}>
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className="card cursor-pointer hover:shadow-card-lg transition-shadow"
              onClick={card.action}
            >
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-secondary-600 dark:text-secondary-400 mb-1">
                      {card.title}
                    </p>
                    <p className="text-3xl font-bold text-secondary-900 dark:text-secondary-100">
                      {card.value}
                    </p>
                    <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
                      {card.description}
                    </p>
                  </div>
                  <div className={`p-3 rounded-full ${card.color}`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Meals and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
                Your Recent Meals
              </h3>
              <button
                onClick={() => setMealModalOpen(true)}
                className="btn-primary btn-sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Meal
              </button>
            </div>
          </div>
          <div className="card-body">
            {recentMeals.length === 0 ? (
              <div className="text-center py-8">
                <ChefHat className="w-12 h-12 text-secondary-400 dark:text-secondary-500 mx-auto mb-4" />
                <p className="text-secondary-600 dark:text-secondary-400">No meals created yet</p>
                <button
                  onClick={() => setMealModalOpen(true)}
                  className="mt-4 btn-primary"
                >
                  Create Your First Meal
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentMeals.map((meal) => (
                  <div
                    key={meal._id}
                    className="flex items-center justify-between p-4 bg-secondary-50 dark:bg-secondary-700 rounded-card hover:bg-secondary-100 dark:hover:bg-secondary-600 transition-colors"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-secondary-900 dark:text-secondary-100">
                        {meal.name}
                      </h4>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`badge ${meal.active ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-300'}`}>
                          {meal.active ? 'Active' : 'Inactive'}
                        </span>
                        {meal.createdAt && (
                          <span className="text-sm text-secondary-600 dark:text-secondary-400">
                            {formatDate(meal.createdAt)}
                          </span>
                        )}
                      </div>
                      {meal.description && (
                        <p className="text-sm text-secondary-600 dark:text-secondary-400 mt-1">
                          {meal.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {meal.prepTime > 0 && (
                        <div className="flex items-center text-sm text-secondary-600 dark:text-secondary-400">
                          <Clock className="w-4 h-4 mr-1" />
                          {meal.prepTime}m prep
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
              Quick Actions
            </h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 gap-4">
              {isAdmin() && (
                <button
                  onClick={() => navigate('/family-members')}
                  className="flex items-center p-4 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded-card transition-colors text-left"
                >
                  <Users className="w-6 h-6 text-primary-600 dark:text-primary-400 mr-3" />
                  <div>
                    <h4 className="font-medium text-secondary-900 dark:text-secondary-100">
                      Manage Family Members
                    </h4>
                    <p className="text-sm text-secondary-600 dark:text-secondary-400">
                      Add or edit family member profiles
                    </p>
                  </div>
                </button>
              )}

              <button
                onClick={() => navigate('/meals')}
                className="flex items-center p-4 bg-success-50 dark:bg-success-900/20 hover:bg-success-100 dark:hover:bg-success-900/30 rounded-card transition-colors text-left"
              >
                <ChefHat className="w-6 h-6 text-success-600 dark:text-success-400 mr-3" />
                <div>
                  <h4 className="font-medium text-secondary-900 dark:text-secondary-100">
                    Manage Meals
                  </h4>
                  <p className="text-sm text-secondary-600 dark:text-secondary-400">
                    Create and edit your meal collection
                  </p>
                </div>
              </button>

              <button
                onClick={() => navigate('/meal-planner')}
                className="flex items-center p-4 bg-warning-50 dark:bg-warning-900/20 hover:bg-warning-100 dark:hover:bg-warning-900/30 rounded-card transition-colors text-left"
              >
                <Calendar className="w-6 h-6 text-warning-600 dark:text-warning-400 mr-3" />
                <div>
                  <h4 className="font-medium text-secondary-900 dark:text-secondary-100">
                    Plan Meals
                  </h4>
                  <p className="text-sm text-secondary-600 dark:text-secondary-400">
                    Schedule meals for the future
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Meal Modal */}
      {mealModalOpen && (
        <MealModal
          isOpen={mealModalOpen}
          onClose={() => setMealModalOpen(false)}
          onMealCreated={handleMealCreated}
          mode="add"
        />
      )}
    </div>
  );
};

export default Dashboard; 