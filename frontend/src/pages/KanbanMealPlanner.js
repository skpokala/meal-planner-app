import React, { useState, useEffect } from 'react';
import { Calendar, List, Plus, CalendarDays, CalendarCheck, Kanban } from 'lucide-react';
import KanbanMealPlanner from '../components/KanbanMealPlanner';
import MealModal from '../components/MealModal';
import api from '../services/api';
import toast from 'react-hot-toast';

const KanbanMealPlannerPage = () => {
  const [meals, setMeals] = useState([]);
  const [existingMealPlans, setExistingMealPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mealModalOpen, setMealModalOpen] = useState(false);

  useEffect(() => {
    loadMeals();
  }, []);

  const loadMeals = async () => {
    try {
      // Get all available meals
      const mealsResponse = await api.get('/meals', { params: { active: true } });
      const availableMeals = mealsResponse.data.meals || [];

      // Get current week's start and end dates
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Calculate start of week (Sunday)
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      
      // Calculate end of week (Saturday)
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      // Get meal plans for the current week
      const startDateParam = startOfWeek.toISOString().split('T')[0];
      const endDateParam = endOfWeek.toISOString().split('T')[0];
      
      let mealPlansData = [];
      
      try {
        const calendarResponse = await api.get('/meal-plans/calendar', {
          params: {
            startDate: startDateParam,
            endDate: endDateParam
          }
        });
        
        if (calendarResponse.data && calendarResponse.data.mealPlans) {
          mealPlansData = calendarResponse.data.mealPlans;
        } else if (calendarResponse.data && calendarResponse.data.mealPlansByDate) {
          // Convert mealPlansByDate object to flat array
          const allMealPlans = [];
          Object.values(calendarResponse.data.mealPlansByDate).forEach(dateMealPlans => {
            if (Array.isArray(dateMealPlans)) {
              allMealPlans.push(...dateMealPlans);
            }
          });
          mealPlansData = allMealPlans;
        }
        
      } catch (error) {
        console.error('Failed to load meal plans:', error);
        mealPlansData = [];
      }

      // Store both available meals and existing meal plans
      setMeals(availableMeals);
      setExistingMealPlans(mealPlansData);
      
    } catch (error) {
      console.error('Failed to load meals:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load meals';
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMeal = async ({ mealId, date, mealType }) => {
    try {
      // Validate required fields
      if (!mealId) {
        throw new Error('Meal ID is required');
      }
      if (!date) {
        throw new Error('Date is required');
      }
      if (!mealType) {
        throw new Error('Meal type is required');
      }
      
      // Validate meal type format
      const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
      if (!validMealTypes.includes(mealType.toLowerCase())) {
        throw new Error(`Invalid meal type: ${mealType}. Must be one of: ${validMealTypes.join(', ')}`);
      }
      
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        throw new Error('Invalid date');
      }

      // Check if meal plan already exists
      const existingMealPlan = existingMealPlans.find(
        plan => {
          const planDate = plan.date.split('T')[0];
          const requestDate = date.split('T')[0];
          return plan.meal === mealId && 
                 planDate === requestDate && 
                 plan.mealType === mealType;
        }
      );

      if (existingMealPlan) {
        // Update existing meal plan
        const updateData = {
          meal: mealId,
          date: dateObj.toISOString(),
          mealType: mealType.toLowerCase(),
          assignedTo: existingMealPlan.assignedTo || [],
          isCooked: existingMealPlan.isCooked || false
        };
        
        await api.put(`/meal-plans/${existingMealPlan._id}`, updateData);
        toast.success('Meal plan updated');
      } else {
        // Create new meal plan
        const createData = {
          meal: mealId,
          date: dateObj.toISOString(),
          mealType: mealType.toLowerCase(),
          assignedTo: [],
          isCooked: false
        };
        
        await api.post('/meal-plans', createData);
        toast.success('Meal plan created');
      }
      
      await loadMeals(); // Refresh both meals and meal plans
    } catch (error) {
      console.error('Failed to save meal plan:', error);
      if (error.response?.status === 409) {
        toast.error('This meal is already planned for this date and meal type');
      } else {
        toast.error(error.message === 'Invalid date' ? 'Invalid date format' : 'Failed to save meal plan');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Calendar className="w-8 h-8 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Meal Planner</h1>
            <p className="text-gray-600 dark:text-gray-300">Plan your weekly meals</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setMealModalOpen(true)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Meal
          </button>
        </div>
      </div>

      {/* View Mode Toggles */}
      <div className="flex items-center space-x-2">
        <div className="flex rounded-md shadow-sm">
          <button
            onClick={() => window.location.href = '/meal-planner'}
            aria-label="Monthly view"
            className="px-3 py-2 text-sm font-medium rounded-l-md border border-secondary-300 text-secondary-700 hover:bg-secondary-50 dark:bg-secondary-800 dark:border-secondary-600 dark:text-secondary-300 dark:hover:bg-secondary-700"
          >
            <Calendar className="w-4 h-4" />
          </button>
          <button
            onClick={() => window.location.href = '/meal-planner/kanban'}
            aria-label="Weekly view (Kanban)"
            className="px-3 py-2 text-sm font-medium border-t border-b bg-primary-50 border-primary-200 text-primary-700 dark:bg-primary-900 dark:border-primary-800 dark:text-primary-300"
          >
            <Kanban className="w-4 h-4" />
          </button>
          <button
            onClick={() => window.location.href = '/meal-planner'}
            aria-label="Daily view"
            className="px-3 py-2 text-sm font-medium border-t border-b border-secondary-300 text-secondary-700 hover:bg-secondary-50 dark:bg-secondary-800 dark:border-secondary-600 dark:text-secondary-300 dark:hover:bg-secondary-700"
          >
            <CalendarCheck className="w-4 h-4" />
          </button>
          <button
            onClick={() => window.location.href = '/meal-planner'}
            aria-label="List view"
            className="px-3 py-2 text-sm font-medium rounded-r-md border-t border-b border-r border-secondary-300 text-secondary-700 hover:bg-secondary-50 dark:bg-secondary-800 dark:border-secondary-600 dark:text-secondary-300 dark:hover:bg-secondary-700"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1">
        <KanbanMealPlanner
          meals={meals}
          existingMealPlans={existingMealPlans}
          onSaveMeal={handleSaveMeal}
        />
      </div>

      {/* Meal Modal */}
      <MealModal
        isOpen={mealModalOpen}
        onClose={() => setMealModalOpen(false)}
        onMealCreated={(newMeal) => {
          setMeals(prev => [newMeal, ...prev]);
          setMealModalOpen(false);
          toast.success(`${newMeal.name} created successfully`);
        }}
        mode="add"
      />
    </div>
  );
};

export default KanbanMealPlannerPage;
