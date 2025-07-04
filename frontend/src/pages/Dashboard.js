import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, ChefHat, Plus, Clock, Star, Settings } from 'lucide-react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [stats, setStats] = useState({
    familyMembers: 0,
    totalMeals: 0,
    plannedMeals: 0,
  });
  const [recentMeals, setRecentMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [familyResponse, mealStatsResponse, mealsResponse] = await Promise.all([
          api.get('/family-members'),
          api.get('/meals/stats/overview'),
          api.get('/meals?limit=5')
        ]);

        setStats({
          familyMembers: familyResponse.data.count,
          totalMeals: mealStatsResponse.data.stats.overview.totalMeals,
          plannedMeals: mealStatsResponse.data.stats.overview.plannedMeals,
        });

        setRecentMeals(mealsResponse.data.meals.slice(0, 5));
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const statCards = [
    {
      title: 'Family Members',
      value: stats.familyMembers,
      icon: Users,
      color: 'bg-primary-500',
      action: () => navigate('/family-members'),
    },
    {
      title: 'Total Meals',
      value: stats.totalMeals,
      icon: ChefHat,
      color: 'bg-success-500',
      action: () => navigate('/meals'),
    },
    {
      title: 'Planned Meals',
      value: stats.plannedMeals,
      icon: Calendar,
      color: 'bg-warning-500',
      action: () => navigate('/meal-planner'),
    },
  ];

  const formatDate = (dateString) => {
    // Parse the date string properly to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
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

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading dashboard..." />;
  }

  return (
    <div>
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-card text-white p-6">
        <h1 className="text-3xl font-bold mb-2">Welcome back!</h1>
        <p className="text-primary-100">
          Here's an overview of your family's meal planning activities.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
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
                    <p className="text-sm font-medium text-secondary-600 mb-1">
                      {card.title}
                    </p>
                    <p className="text-3xl font-bold text-secondary-900">
                      {card.value}
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

      {/* Recent Meals Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-secondary-900">
                Recent Meals
              </h3>
              <button
                onClick={() => navigate('/meal-planner')}
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
                <ChefHat className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
                <p className="text-secondary-600">No meals planned yet</p>
                <button
                  onClick={() => navigate('/meal-planner')}
                  className="mt-4 btn-primary"
                >
                  Plan Your First Meal
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentMeals.map((meal) => (
                  <div
                    key={meal._id}
                    className="flex items-center justify-between p-4 bg-secondary-50 rounded-card hover:bg-secondary-100 transition-colors"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-secondary-900">
                        {meal.name}
                      </h4>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`badge ${getMealTypeColor(meal.mealType)}`}>
                          {meal.mealType}
                        </span>
                        <span className="text-sm text-secondary-600">
                          {formatDate(meal.date)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {meal.rating && (
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="text-sm text-secondary-600 ml-1">
                            {meal.rating}
                          </span>
                        </div>
                      )}
                      {meal.totalTime > 0 && (
                        <div className="flex items-center text-sm text-secondary-600">
                          <Clock className="w-4 h-4 mr-1" />
                          {meal.totalTime}m
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
            <h3 className="text-lg font-semibold text-secondary-900">
              Quick Actions
            </h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => navigate('/family-members')}
                className="flex items-center p-4 bg-primary-50 hover:bg-primary-100 rounded-card transition-colors text-left"
              >
                <Users className="w-6 h-6 text-primary-600 mr-3" />
                <div>
                  <h4 className="font-medium text-secondary-900">
                    Manage Family Members
                  </h4>
                  <p className="text-sm text-secondary-600">
                    Add or edit family member profiles
                  </p>
                </div>
              </button>

              <button
                onClick={() => navigate('/meal-planner')}
                className="flex items-center p-4 bg-success-50 hover:bg-success-100 rounded-card transition-colors text-left"
              >
                <Calendar className="w-6 h-6 text-success-600 mr-3" />
                <div>
                  <h4 className="font-medium text-secondary-900">
                    Plan Meals
                  </h4>
                  <p className="text-sm text-secondary-600">
                    Create and schedule family meals
                  </p>
                </div>
              </button>

              <button
                onClick={() => navigate('/settings')}
                className="flex items-center p-4 bg-warning-50 hover:bg-warning-100 rounded-card transition-colors text-left"
              >
                <Settings className="w-6 h-6 text-warning-600 mr-3" />
                <div>
                  <h4 className="font-medium text-secondary-900">
                    View Settings
                  </h4>
                  <p className="text-sm text-secondary-600">
                    Configure app preferences
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 