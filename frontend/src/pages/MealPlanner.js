import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, Trash2, CalendarDays, CalendarCheck, List, Loader2, Plus } from 'lucide-react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import MealModal from '../components/MealModal';
import MealRecommendations from '../components/MealRecommendations';
import toast from 'react-hot-toast';

const VIEW_MODES = {
  MONTHLY: 'monthly',
  WEEKLY: 'weekly',
  DAILY: 'daily',
  LIST: 'list'
};

// Simple List View Component
const ListView = ({ 
  plannedMeals, 
  onMealRemove, 
  getMealTypeColor, 
  removingMeals 
}) => {
  // Get all planned meals and sort by date
  const allPlannedMeals = Object.entries(plannedMeals)
    .flatMap(([dateKey, dayMeals]) => 
      dayMeals.map(meal => ({
        ...meal,
        dateKey,
        date: new Date(dateKey)
      }))
    )
    .sort((a, b) => a.date - b.date);

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatMealType = (mealType) => {
    return mealType.charAt(0).toUpperCase() + mealType.slice(1);
  };

  if (allPlannedMeals.length === 0) {
    return (
      <div className="card">
        <div className="card-body text-center py-12">
          <Calendar className="w-16 h-16 text-secondary-400 dark:text-secondary-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-2">No Meals Planned</h3>
          <p className="text-secondary-600 dark:text-secondary-400">
            Switch to calendar view to start planning your meals.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-body">
        <div className="space-y-4">
          {allPlannedMeals.map((plannedMeal, index) => {
            const isNewDay = index === 0 || 
              allPlannedMeals[index - 1].dateKey !== plannedMeal.dateKey;
            
            return (
              <div key={plannedMeal._id}>
                {/* Date header for new day */}
                {isNewDay && (
                  <div className="flex items-center mb-3">
                    <div className="flex-1 border-t border-secondary-200 dark:border-secondary-700"></div>
                    <h3 className="px-4 text-sm font-semibold text-secondary-700 dark:text-secondary-300 bg-white dark:bg-secondary-800">
                      {formatDate(plannedMeal.date)}
                    </h3>
                    <div className="flex-1 border-t border-secondary-200 dark:border-secondary-700"></div>
                  </div>
                )}
                
                {/* Meal item */}
                <div className="flex items-center justify-between p-4 bg-secondary-50 dark:bg-secondary-900 rounded-lg border border-secondary-200 dark:border-secondary-700 hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors">
                  <div className="flex items-center space-x-4">
                    {/* Meal type badge */}
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${getMealTypeColor(plannedMeal.mealType)}`}>
                      {formatMealType(plannedMeal.mealType)}
                    </div>
                    
                    {/* Meal details */}
                    <div>
                      <h4 className="font-semibold text-secondary-900 dark:text-secondary-100">
                        {plannedMeal.meal?.name || 'Unknown Meal'}
                      </h4>
                      {plannedMeal.meal?.description && (
                        <p className="text-sm text-secondary-600 dark:text-secondary-400 mt-1">
                          {plannedMeal.meal.description}
                        </p>
                      )}
                      {plannedMeal.meal?.prepTime > 0 && (
                        <div className="flex items-center mt-2 text-sm text-secondary-500 dark:text-secondary-400">
                          <Clock className="w-4 h-4 mr-1" />
                          <span>{plannedMeal.meal.prepTime} minutes</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    {removingMeals.has(plannedMeal._id) ? (
                      <div className="p-2">
                        <Loader2 className="w-4 h-4 animate-spin text-secondary-500" />
                      </div>
                    ) : (
                      <button
                        onClick={() => onMealRemove(plannedMeal.date, plannedMeal._id)}
                        className="p-2 text-secondary-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                        title="Remove meal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const MealPlanner = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState(VIEW_MODES.MONTHLY);
  const [meals, setMeals] = useState([]);
  const [plannedMeals, setPlannedMeals] = useState({});
  
  // Meal modal state
  const [mealModalOpen, setMealModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedMealType, setSelectedMealType] = useState('dinner');
  
  // Loading states
  const [savingMeals, setSavingMeals] = useState(new Set());
  const [removingMeals, setRemovingMeals] = useState(new Set());

  const mealTypes = [
    { value: 'breakfast', label: 'Breakfast' },
    { value: 'lunch', label: 'Lunch' },
    { value: 'dinner', label: 'Dinner' },
    { value: 'snack', label: 'Snack' }
  ];

  // Get recommendations panel height based on view mode
  const getRecommendationsPanelHeight = (viewMode) => {
    switch (viewMode) {
      case VIEW_MODES.MONTHLY:
        // Monthly calendar height: day headers (~48px) + 6 rows of 128px each = ~816px
        return 'h-[816px]';
      case VIEW_MODES.WEEKLY:
        // Weekly view is typically shorter
        return 'h-[400px]';
      case VIEW_MODES.DAILY:
        // Daily view uses min-h-96 (384px) for cells plus headers
        return 'h-[432px]';
      case VIEW_MODES.LIST:
        // List view is variable height
        return 'h-auto max-h-[600px]';
      default:
        return 'h-auto';
    }
  };

  // Helper functions - all wrapped in useCallback with proper error handling
  const getStartOfWeek = useCallback((date) => {
    try {
      const startOfWeek = new Date(date);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day;
      startOfWeek.setDate(diff);
      return startOfWeek;
    } catch (error) {
      console.error('Error in getStartOfWeek:', error);
      return new Date();
    }
  }, []);

  const getEndOfWeek = useCallback((date) => {
    try {
      const endOfWeek = new Date(date);
      const day = endOfWeek.getDay();
      const diff = endOfWeek.getDate() + (6 - day);
      endOfWeek.setDate(diff);
      return endOfWeek;
    } catch (error) {
      console.error('Error in getEndOfWeek:', error);
      return new Date();
    }
  }, []);

  const getDaysInMonth = useCallback((date) => {
    try {
      const year = date.getFullYear();
      const month = date.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startingDayOfWeek = firstDay.getDay();

      const days = [];
      
      // Add empty cells for days before the first day of the month
      for (let i = 0; i < startingDayOfWeek; i++) {
        days.push(null);
      }
      
      // Add days of the month
      for (let day = 1; day <= daysInMonth; day++) {
        days.push(new Date(year, month, day));
      }
      
      return days;
    } catch (error) {
      console.error('Error in getDaysInMonth:', error);
      return [];
    }
  }, []);

  const getDaysInWeek = useCallback((date) => {
    try {
      const startOfWeek = getStartOfWeek(date);
      const days = [];
      
      for (let i = 0; i < 7; i++) {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + i);
        days.push(day);
      }
      
      return days;
    } catch (error) {
      console.error('Error in getDaysInWeek:', error);
      return [];
    }
  }, [getStartOfWeek]);

  const formatDateKey = useCallback((date) => {
    try {
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.error('Error formatting date key:', error);
      return '';
    }
  }, []);

  const formatMonthYear = useCallback((date) => {
    try {
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  }, []);

  const formatWeekRange = useCallback((date) => {
    try {
      const startOfWeek = getStartOfWeek(date);
      const endOfWeek = getEndOfWeek(date);
      
      if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
        return `${startOfWeek.toLocaleDateString('en-US', { month: 'long' })} ${startOfWeek.getDate()}-${endOfWeek.getDate()}, ${startOfWeek.getFullYear()}`;
      } else {
        return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${endOfWeek.getFullYear()}`;
      }
    } catch (error) {
      console.error('Error formatting week range:', error);
      return 'Invalid Date Range';
    }
  }, [getStartOfWeek, getEndOfWeek]);

  const formatDayDate = useCallback((date) => {
    try {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch (error) {
      console.error('Error formatting day date:', error);
      return 'Invalid Date';
    }
  }, []);

  const getPlannedMeals = useCallback((date) => {
    try {
      const dateKey = formatDateKey(date);
      return plannedMeals[dateKey] || [];
    } catch (error) {
      console.error('Error getting planned meals:', error);
      return [];
    }
  }, [plannedMeals, formatDateKey]);

  const getMealTypeColor = useCallback((mealType) => {
    const colors = {
      breakfast: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700',
      lunch: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700',
      dinner: 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700',
      snack: 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-700',
    };
    return colors[mealType] || 'bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
  }, []);

  const isToday = useCallback((date) => {
    try {
      const today = new Date();
      return date && date.toDateString() === today.toDateString();
    } catch (error) {
      console.error('Error checking if today:', error);
      return false;
    }
  }, []);

  const isPastDate = useCallback((date) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date && date < today;
    } catch (error) {
      console.error('Error checking if past date:', error);
      return false;
    }
  }, []);

  // Safe data fetching with better error handling
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all available meals (active only)
      const mealsResponse = await api.get('/meals', { 
        params: { active: true } 
      });
      setMeals(mealsResponse.data.meals || []);
      
      // Calculate date range for current view period
      let startDate, endDate;
      
      switch (viewMode) {
        case VIEW_MODES.DAILY:
          startDate = new Date(currentDate);
          endDate = new Date(currentDate);
          break;
        case VIEW_MODES.WEEKLY:
          startDate = getStartOfWeek(currentDate);
          endDate = getEndOfWeek(currentDate);
          break;
        case VIEW_MODES.LIST:
          // For list view, get wider range
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 30);
          endDate = new Date();
          endDate.setDate(endDate.getDate() + 90);
          break;
        case VIEW_MODES.MONTHLY:
        default:
          startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
          endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
          break;
      }
      
      const calendarResponse = await api.get('/meal-plans/calendar', {
        params: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        }
      });
      
      setPlannedMeals(calendarResponse.data.mealPlansByDate || {});
      
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(`Failed to load data: ${error.response?.data?.message || error.message}`);
      toast.error('Failed to load meal data');
    } finally {
      setLoading(false);
    }
  }, [currentDate, viewMode, getStartOfWeek, getEndOfWeek]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchData]);

  // Navigation functions
  const navigateMonth = useCallback((direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  }, []);

  const navigateWeek = useCallback((direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + (direction * 7));
      return newDate;
    });
  }, []);

  const navigateDay = useCallback((direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + direction);
      return newDate;
    });
  }, []);

  const navigate = useCallback((direction) => {
    switch (viewMode) {
      case VIEW_MODES.DAILY:
        navigateDay(direction);
        break;
      case VIEW_MODES.WEEKLY:
        navigateWeek(direction);
        break;
      case VIEW_MODES.MONTHLY:
        navigateMonth(direction);
        break;
      default:
        navigateMonth(direction);
    }
  }, [viewMode, navigateDay, navigateWeek, navigateMonth]);

  const getViewTitle = useCallback(() => {
    switch (viewMode) {
      case VIEW_MODES.DAILY:
        return formatDayDate(currentDate);
      case VIEW_MODES.WEEKLY:
        return formatWeekRange(currentDate);
      case VIEW_MODES.LIST:
        return 'Meal Plan List';
      case VIEW_MODES.MONTHLY:
      default:
        return formatMonthYear(currentDate);
    }
  }, [viewMode, currentDate, formatDayDate, formatWeekRange, formatMonthYear]);

  const getCurrentViewDays = useCallback(() => {
    switch (viewMode) {
      case VIEW_MODES.DAILY:
        return [currentDate];
      case VIEW_MODES.WEEKLY:
        return getDaysInWeek(currentDate);
      case VIEW_MODES.MONTHLY:
      default:
        return getDaysInMonth(currentDate);
    }
  }, [viewMode, currentDate, getDaysInWeek, getDaysInMonth]);

  // Meal selection handler
  const handleMealSelect = useCallback(async (date, mealId, mealType) => {
    try {
      if (mealId === 'create-new') {
        setSelectedDate(date);
        setSelectedMealType(mealType);
        setMealModalOpen(true);
        return;
      }

      if (!mealId || !mealType) return;

      const dateKey = formatDateKey(date);
      const selectedMeal = meals.find(meal => meal._id === mealId);
      
      if (!selectedMeal) {
        toast.error('Meal not found');
        return;
      }
      
      // Check for duplicate assignment
      const existingMealPlans = plannedMeals[dateKey] || [];
      if (existingMealPlans.some(plan => plan.meal._id === mealId && plan.mealType === mealType)) {
        toast.error(`${selectedMeal.name} (${mealType}) is already planned for ${date.toLocaleDateString()}`);
        return;
      }

      // Create temporary meal plan object for optimistic update
      const tempMealPlanId = `temp-${Date.now()}`;
      const optimisticMealPlan = {
        _id: tempMealPlanId,
        meal: selectedMeal,
        mealType: mealType,
        date: date.toISOString(),
        assignedTo: [],
        isCooked: false
      };

      // Optimistic update
      setPlannedMeals(prev => ({
        ...prev,
        [dateKey]: [...(prev[dateKey] || []), optimisticMealPlan]
      }));

      setSavingMeals(prev => new Set([...prev, tempMealPlanId]));
      toast.loading('Planning meal...', { id: tempMealPlanId });

      // Create meal plan
      const mealPlanData = {
        meal: selectedMeal._id,
        mealType: mealType,
        date: date.toISOString(),
        assignedTo: [],
        isCooked: false
      };

      const response = await api.post('/meal-plans', mealPlanData);
      
      // Replace optimistic update with real data
      if (response?.data?.mealPlan) {
        setPlannedMeals(prev => ({
          ...prev,
          [dateKey]: prev[dateKey]?.map(plan => 
            plan._id === tempMealPlanId ? response.data.mealPlan : plan
          ) || []
        }));
      }

      toast.success(`${selectedMeal.name} planned for ${date.toLocaleDateString()}`, { 
        id: tempMealPlanId 
      });

    } catch (error) {
      console.error('Error planning meal:', error);
      toast.error('Failed to plan meal. Please try again.');
      
      // Revert optimistic update on failure
      const dateKey = formatDateKey(date);
      setPlannedMeals(prev => ({
        ...prev,
        [dateKey]: prev[dateKey]?.filter(plan => !plan._id.startsWith('temp-')) || []
      }));
    } finally {
      setSavingMeals(prev => {
        const newSet = new Set(prev);
        newSet.delete(`temp-${Date.now()}`);
        return newSet;
      });
    }
  }, [meals, plannedMeals, formatDateKey]);

  // Meal removal handler
  const handleMealRemove = useCallback(async (date, mealPlanId) => {
    try {
      const dateKey = formatDateKey(date);
      const mealPlanToRemove = plannedMeals[dateKey]?.find(plan => plan._id === mealPlanId);
      
      if (!mealPlanToRemove) {
        toast.error('Meal plan not found');
        return;
      }

      setRemovingMeals(prev => new Set([...prev, mealPlanId]));
      toast.loading('Removing meal...', { id: `remove-${mealPlanId}` });

      // Optimistic update
      setPlannedMeals(prev => ({
        ...prev,
        [dateKey]: prev[dateKey]?.filter(plan => plan._id !== mealPlanId) || []
      }));

      await api.delete(`/meal-plans/${mealPlanId}`);
      
      toast.success('Meal removed from plan', { id: `remove-${mealPlanId}` });

    } catch (error) {
      console.error('Error removing meal plan:', error);
      
      // Revert optimistic update on failure
      const dateKey = formatDateKey(date);
      const mealPlanToRemove = plannedMeals[dateKey]?.find(plan => plan._id === mealPlanId);
      if (mealPlanToRemove) {
        setPlannedMeals(prev => ({
          ...prev,
          [dateKey]: [...(prev[dateKey] || []), mealPlanToRemove]
        }));
      }
      
      toast.error('Failed to remove meal. Please try again.');
    } finally {
      setRemovingMeals(prev => {
        const newSet = new Set(prev);
        newSet.delete(mealPlanId);
        return newSet;
      });
    }
  }, [plannedMeals, formatDateKey]);

  // Handle new meal creation
  const handleNewMealCreated = useCallback(async (newMeal) => {
    try {
      if (!newMeal || !newMeal._id) {
        console.error('Invalid meal data received:', newMeal);
        toast.error('Error: Invalid meal data received');
        return;
      }

      // Add the new meal to the meals list
      setMeals(prevMeals => [newMeal, ...prevMeals]);

      // Auto-plan the meal if we have a selected date and meal type
      if (selectedDate && selectedMealType) {
        const mealPlanData = {
          meal: newMeal._id,
          mealType: selectedMealType,
          date: selectedDate.toISOString(),
          assignedTo: [],
          isCooked: false
        };

        const response = await api.post('/meal-plans', mealPlanData);
        
        if (response?.data?.mealPlan) {
          const dateKey = formatDateKey(selectedDate);
          setPlannedMeals(prev => ({
            ...prev,
            [dateKey]: [...(prev[dateKey] || []), response.data.mealPlan]
          }));
          
          toast.success(`${newMeal.name} created and planned for ${selectedDate.toLocaleDateString()}`);
        } else {
          toast.success(`${newMeal.name} created successfully`);
        }
      } else {
        toast.success(`${newMeal.name} created successfully`);
      }
      
    } catch (error) {
      console.error('Error handling new meal creation:', error);
      toast.error('Meal created but failed to plan it. You can plan it manually.');
    }
  }, [selectedDate, selectedMealType, formatDateKey]);

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading meal planner..." />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="card">
          <div className="card-body text-center py-12">
            <h3 className="text-lg font-semibold text-error-900 mb-2">Error</h3>
            <p className="text-error-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 min-h-screen overflow-hidden">
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
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
                onClick={() => setViewMode(VIEW_MODES.MONTHLY)}
                className={`px-3 py-2 text-sm font-medium rounded-l-md border ${
                  viewMode === VIEW_MODES.MONTHLY
                    ? 'bg-primary-50 border-primary-200 text-primary-700 dark:bg-primary-900 dark:border-primary-800 dark:text-primary-300'
                    : 'bg-white border-secondary-300 text-secondary-700 hover:bg-secondary-50 dark:bg-secondary-800 dark:border-secondary-600 dark:text-secondary-300 dark:hover:bg-secondary-700'
                }`}
              >
                <Calendar className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode(VIEW_MODES.WEEKLY)}
                className={`px-3 py-2 text-sm font-medium border-t border-b ${
                  viewMode === VIEW_MODES.WEEKLY
                    ? 'bg-primary-50 border-primary-200 text-primary-700 dark:bg-primary-900 dark:border-primary-800 dark:text-primary-300'
                    : 'bg-white border-secondary-300 text-secondary-700 hover:bg-secondary-50 dark:bg-secondary-800 dark:border-secondary-600 dark:text-secondary-300 dark:hover:bg-secondary-700'
                }`}
              >
                <CalendarDays className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode(VIEW_MODES.DAILY)}
                className={`px-3 py-2 text-sm font-medium border-t border-b ${
                  viewMode === VIEW_MODES.DAILY
                    ? 'bg-primary-50 border-primary-200 text-primary-700 dark:bg-primary-900 dark:border-primary-800 dark:text-primary-300'
                    : 'bg-white border-secondary-300 text-secondary-700 hover:bg-secondary-50 dark:bg-secondary-800 dark:border-secondary-600 dark:text-secondary-300 dark:hover:bg-secondary-700'
                }`}
              >
                <CalendarCheck className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode(VIEW_MODES.LIST)}
                className={`px-3 py-2 text-sm font-medium rounded-r-md border ${
                  viewMode === VIEW_MODES.LIST
                    ? 'bg-primary-50 border-primary-200 text-primary-700 dark:bg-primary-900 dark:border-primary-800 dark:text-primary-300'
                    : 'bg-white border-secondary-300 text-secondary-700 hover:bg-secondary-50 dark:bg-secondary-800 dark:border-secondary-600 dark:text-secondary-300 dark:hover:bg-secondary-700'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        {viewMode !== VIEW_MODES.LIST && (
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="p-2 text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 dark:text-secondary-400 dark:hover:text-secondary-100 dark:hover:bg-secondary-700 rounded transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <h2 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
              {getViewTitle()}
            </h2>
            
            <button
              onClick={() => navigate(1)}
              className="p-2 text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 dark:text-secondary-400 dark:hover:text-secondary-100 dark:hover:bg-secondary-700 rounded transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Main Content - Flexbox Layout for better control */}
        <div className="flex flex-col xl:flex-row gap-6 h-full">
          {/* Calendar Content - Takes up 2/3 of the space */}
          <div className="flex-1 xl:flex-[2] min-w-0">
            <CalendarView
              viewMode={viewMode}
              days={getCurrentViewDays()}
              getPlannedMeals={getPlannedMeals}
              meals={meals}
              mealTypes={mealTypes}
              onMealSelect={handleMealSelect}
              onMealRemove={handleMealRemove}
              getMealTypeColor={getMealTypeColor}
              isToday={isToday}
              isPastDate={isPastDate}
              savingMeals={savingMeals}
              removingMeals={removingMeals}
              plannedMeals={plannedMeals}
            />
          </div>
          
          {/* AI Recommendations Sidebar - Height matches calendar */}
          <div className="xl:w-80 xl:min-w-0 xl:max-w-[320px] w-full">
            <div className="xl:sticky xl:top-4 h-full">
              <div className={`${getRecommendationsPanelHeight(viewMode)} bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden`} 
                   style={{ 
                     width: '320px', 
                     maxWidth: '320px', 
                     minWidth: '0', 
                     contain: 'layout style size'
                   }}>
                <MealRecommendations 
                  className="h-full w-full" 
                  maxRecommendations={4}
                  showFeedback={true}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Meal Modal */}
        <MealModal
          isOpen={mealModalOpen}
          onClose={() => {
            setMealModalOpen(false);
            setSelectedDate(null);
            setSelectedMealType('dinner');
          }}
          onMealCreated={handleNewMealCreated}
          mode="add"
        />
      </div>
    </div>
  );
};

// Calendar View Component
const CalendarView = ({ 
  viewMode, 
  days, 
  getPlannedMeals, 
  meals, 
  mealTypes,
  onMealSelect, 
  onMealRemove, 
  getMealTypeColor, 
  isToday, 
  isPastDate,
  savingMeals,
  removingMeals,
  plannedMeals
}) => {
  // Show list view for LIST mode
  if (viewMode === VIEW_MODES.LIST) {
    return (
      <ListView
        plannedMeals={plannedMeals}
        onMealRemove={onMealRemove}
        getMealTypeColor={getMealTypeColor}
        removingMeals={removingMeals}
      />
    );
  }

  const gridClasses = {
    [VIEW_MODES.MONTHLY]: 'grid-cols-7',
    [VIEW_MODES.WEEKLY]: 'grid-cols-7',
    [VIEW_MODES.DAILY]: 'grid-cols-1'
  };

  return (
    <div className="card">
      <div className={`card-body p-0 ${viewMode === VIEW_MODES.MONTHLY ? 'h-[816px]' : ''}`}>
        {/* Day headers for monthly/weekly view */}
        {(viewMode === VIEW_MODES.MONTHLY || viewMode === VIEW_MODES.WEEKLY) && (
          <div className="grid grid-cols-7 border-b border-secondary-200 dark:border-secondary-700">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-3 text-center text-sm font-medium text-secondary-700 dark:text-secondary-300 border-r border-secondary-200 dark:border-secondary-700 last:border-r-0">
                {day}
              </div>
            ))}
          </div>
        )}
        
        {/* Calendar grid */}
        <div className={`grid ${gridClasses[viewMode]} gap-0`}>
          {days.map((day, index) => (
            <DayCell
              key={day ? day.toISOString() : `empty-${index}`}
              date={day}
              plannedMeals={day ? getPlannedMeals(day) : []}
              meals={meals}
              mealTypes={mealTypes}
              onMealSelect={onMealSelect}
              onMealRemove={onMealRemove}
              getMealTypeColor={getMealTypeColor}
              isToday={day ? isToday(day) : false}
              isPastDate={day ? isPastDate(day) : false}
              savingMeals={savingMeals}
              removingMeals={removingMeals}
              viewMode={viewMode}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Day Cell Component
const DayCell = ({ 
  date, 
  plannedMeals, 
  meals, 
  mealTypes,
  onMealSelect, 
  onMealRemove, 
  getMealTypeColor, 
  isToday, 
  isPastDate,
  savingMeals,
  removingMeals,
  viewMode
}) => {
  const [showMealSelector, setShowMealSelector] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState('dinner');

  if (!date) {
    return <div className="h-32 border-r border-b border-secondary-200 dark:border-secondary-700"></div>;
  }

  const handleAddMeal = (mealType) => {
    setSelectedMealType(mealType);
    setShowMealSelector(true);
  };

  const handleMealSelection = (mealId) => {
    onMealSelect(date, mealId, selectedMealType);
    setShowMealSelector(false);
  };

  const availableMeals = meals.filter(meal => meal.active);
  const cellHeight = viewMode === VIEW_MODES.DAILY ? 'min-h-96' : 'h-32';
  
  return (
    <div className={`${cellHeight} border-r border-b border-secondary-200 dark:border-secondary-700 last:border-r-0 p-2 ${
      isToday ? 'bg-primary-50 dark:bg-primary-900/20' : isPastDate ? 'bg-secondary-50 dark:bg-secondary-800' : 'bg-white dark:bg-secondary-800'
    } overflow-hidden relative`}>
      {/* Date header */}
      <div className="flex items-center justify-between mb-2">
        <span className={`text-sm font-medium ${
          isToday ? 'text-primary-700 dark:text-primary-300' : isPastDate ? 'text-secondary-500 dark:text-secondary-400' : 'text-secondary-900 dark:text-secondary-100'
        }`}>
          {date.getDate()}
        </span>
        
        {/* Add meal dropdown */}
        <div className="relative">
          <select
            value=""
            onChange={(e) => e.target.value && handleAddMeal(e.target.value)}
            className="text-xs border-0 bg-transparent text-secondary-500 dark:text-secondary-400 cursor-pointer hover:text-secondary-700 dark:hover:text-secondary-300 focus:ring-0 focus:border-0 appearance-none"
            style={{
              backgroundImage: 'none',
              paddingRight: '0.5rem'
            }}
            title="Add meal"
          >
            <option value="">+</option>
            {mealTypes.map(type => (
              <option key={type.value} value={type.value}>
                Add {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Planned meals */}
      <div className="space-y-1">
        {plannedMeals.map((plan) => (
          <div
            key={plan._id}
            className={`text-xs p-1 rounded border ${getMealTypeColor(plan.mealType)} relative group`}
          >
            <div className="flex items-center justify-between">
              <span className="truncate flex-1 pr-1">
                {plan.meal?.name || 'Unknown Meal'}
              </span>
              {savingMeals.has(plan._id) || removingMeals.has(plan._id) ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <button
                  onClick={() => onMealRemove(date, plan._id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-red-200 dark:hover:bg-red-900/20 rounded"
                  title="Remove meal"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
            {plan.meal?.prepTime > 0 && (
              <div className="flex items-center mt-0.5 opacity-75">
                <Clock className="w-2.5 h-2.5 mr-1" />
                <span>{plan.meal.prepTime}m</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Meal selector modal */}
      {showMealSelector && (
        <div className="absolute inset-0 bg-white dark:bg-secondary-800 border border-secondary-300 dark:border-secondary-700 rounded shadow-lg z-10 p-2 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-secondary-700 dark:text-secondary-300">
              Add {selectedMealType}
            </span>
            <button
              onClick={() => setShowMealSelector(false)}
              className="text-secondary-400 dark:text-secondary-500 hover:text-secondary-600 dark:hover:text-secondary-400"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-1">
            <button
              onClick={() => handleMealSelection('create-new')}
              className="w-full text-left text-xs p-1 rounded hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-700"
            >
              + Create New Meal
            </button>
            
            {availableMeals.map((meal) => (
              <button
                key={meal._id}
                onClick={() => handleMealSelection(meal._id)}
                className="w-full text-left text-xs p-1 rounded hover:bg-secondary-50 dark:hover:bg-secondary-700 border border-secondary-200 dark:border-secondary-700 truncate text-secondary-900 dark:text-secondary-100"
                title={meal.description}
              >
                {meal.name}
                {meal.prepTime > 0 && (
                  <span className="text-secondary-500 dark:text-secondary-400 ml-1">({meal.prepTime}m)</span>
                )}
              </button>
            ))}
            
            {availableMeals.length === 0 && (
              <div className="text-xs text-secondary-500 dark:text-secondary-400 text-center py-2">
                No available meals
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MealPlanner; 