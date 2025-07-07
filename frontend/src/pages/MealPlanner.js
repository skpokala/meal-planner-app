import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Clock, Users, Trash2, Calendar, CalendarDays, CalendarCheck, List, Loader2 } from 'lucide-react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import MealModal from '../components/MealModal';
import toast from 'react-hot-toast';

const VIEW_MODES = {
  MONTHLY: 'monthly',
  WEEKLY: 'weekly',
  DAILY: 'daily',
  LIST: 'list'
};

const MealPlanner = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState(VIEW_MODES.MONTHLY);
  const [meals, setMeals] = useState([]);
  const [plannedMeals, setPlannedMeals] = useState({});
  const [loading, setLoading] = useState(true);
  const [mealModalOpen, setMealModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [savingMeals, setSavingMeals] = useState(new Set());
  const [removingMeals, setRemovingMeals] = useState(new Set());

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch all available meals (templates)
      const mealsResponse = await api.get('/meals/templates');
      setMeals(mealsResponse.data.meals || []);
      
      // Fetch planned meals for current view period
      const { startDate, endDate } = getViewDateRange();
      
      const calendarResponse = await api.get('/meals/calendar', {
        params: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        }
      });
      
      setPlannedMeals(calendarResponse.data.mealsByDate || {});
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load meal data');
    } finally {
      setLoading(false);
    }
  }, [currentDate, viewMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getViewDateRange = () => {
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
        // For list view, get wider range from 30 days ago to 90 days in future
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
    
    return { startDate, endDate };
  };

  const getDaysInMonth = (date) => {
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
  };

  const formatDateKey = (date) => {
    return date.toISOString().split('T')[0];
  };

  const formatMonthYear = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const formatWeekRange = (date) => {
    const startOfWeek = getStartOfWeek(date);
    const endOfWeek = getEndOfWeek(date);
    
    if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
      return `${startOfWeek.toLocaleDateString('en-US', { month: 'long' })} ${startOfWeek.getDate()}-${endOfWeek.getDate()}, ${startOfWeek.getFullYear()}`;
    } else {
      return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${endOfWeek.getFullYear()}`;
    }
  };

  const formatDayDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getStartOfWeek = (date) => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);
    return startOfWeek;
  };

  const getEndOfWeek = (date) => {
    const endOfWeek = new Date(date);
    const day = endOfWeek.getDay();
    const diff = endOfWeek.getDate() + (6 - day);
    endOfWeek.setDate(diff);
    return endOfWeek;
  };

  const getDaysInWeek = (date) => {
    const startOfWeek = getStartOfWeek(date);
    const days = [];
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    
    return days;
  };

  const getAllPlannedMeals = () => {
    const allMeals = [];
    
    // Collect all planned meals from all dates
    Object.entries(plannedMeals).forEach(([dateKey, meals]) => {
      meals.forEach(meal => {
        allMeals.push({
          ...meal,
          dateObj: new Date(dateKey)
        });
      });
    });
    
    // Sort by date
    allMeals.sort((a, b) => a.dateObj - b.dateObj);
    
    return allMeals;
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const navigateWeek = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + (direction * 7));
      return newDate;
    });
  };

  const navigateDay = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + direction);
      return newDate;
    });
  };

  const navigate = (direction) => {
    switch (viewMode) {
      case VIEW_MODES.DAILY:
        navigateDay(direction);
        break;
      case VIEW_MODES.WEEKLY:
        navigateWeek(direction);
        break;
      case VIEW_MODES.LIST:
        // List view doesn't need navigation
        break;
      case VIEW_MODES.MONTHLY:
      default:
        navigateMonth(direction);
        break;
    }
  };

  const getViewTitle = () => {
    switch (viewMode) {
      case VIEW_MODES.DAILY:
        return formatDayDate(currentDate);
      case VIEW_MODES.WEEKLY:
        return formatWeekRange(currentDate);
      case VIEW_MODES.LIST:
        return 'All Planned Meals';
      case VIEW_MODES.MONTHLY:
      default:
        return formatMonthYear(currentDate);
    }
  };

  const getCurrentViewDays = () => {
    switch (viewMode) {
      case VIEW_MODES.DAILY:
        return [currentDate];
      case VIEW_MODES.WEEKLY:
        return getDaysInWeek(currentDate);
      case VIEW_MODES.LIST:
        // For list view, we'll return all planned meals sorted by date
        return getAllPlannedMeals();
      case VIEW_MODES.MONTHLY:
      default:
        return getDaysInMonth(currentDate);
    }
  };

  const handleMealSelect = async (date, mealId) => {
    if (mealId === 'create-new') {
      setSelectedDate(date);
      setMealModalOpen(true);
      return;
    }

    if (!mealId) return;

    const dateKey = formatDateKey(date);
    const selectedMeal = meals.find(meal => meal._id === mealId);
    
    if (!selectedMeal) {
      toast.error('Meal not found');
      return;
    }
    
    // Check for duplicate assignment
    const existingMeals = plannedMeals[dateKey] || [];
    if (existingMeals.some(meal => meal.name === selectedMeal.name && meal.mealType === selectedMeal.mealType)) {
      toast.error(`${selectedMeal.name} (${selectedMeal.mealType}) is already planned for ${date.toLocaleDateString()}`);
      return;
    }

    // Create temporary meal object for optimistic update
    const tempMealId = `temp-${Date.now()}`;
    const optimisticMeal = {
      _id: tempMealId,
      name: selectedMeal.name,
      description: selectedMeal.description,
      mealType: selectedMeal.mealType,
      date: date.toISOString(),
      ingredients: selectedMeal.ingredients || [],
      recipe: selectedMeal.recipe || {},
      nutritionInfo: selectedMeal.nutritionInfo || {},
      tags: selectedMeal.tags || [],
      image: selectedMeal.image || '',
      isPlanned: true,
      isCooked: false,
      saving: true // Flag to show saving state
    };

    try {
      // Optimistic update - add meal to UI immediately
      setPlannedMeals(prev => ({
        ...prev,
        [dateKey]: [...(prev[dateKey] || []), optimisticMeal]
      }));

      // Track saving state
      setSavingMeals(prev => new Set([...prev, tempMealId]));

      // Show immediate feedback
      toast.loading('Planning meal...', { id: tempMealId });

      // Prepare meal data for backend
      const mealData = {
        name: selectedMeal.name,
        description: selectedMeal.description,
        mealType: selectedMeal.mealType,
        date: date.toISOString(),
        ingredients: selectedMeal.ingredients || [],
        recipe: selectedMeal.recipe || {},
        nutritionInfo: selectedMeal.nutritionInfo || {},
        tags: selectedMeal.tags || [],
        image: selectedMeal.image || '',
        isTemplate: false, // This is a planned instance, not a template
        isPlanned: true,
        isCooked: false
      };

      // Autosave to backend
      const response = await api.post('/meals', mealData);
      
      // Replace optimistic update with real data
      if (response?.data?.meal) {
        setPlannedMeals(prev => ({
          ...prev,
          [dateKey]: prev[dateKey]?.map(meal => 
            meal._id === tempMealId ? response.data.meal : meal
          ) || []
        }));
      } else {
        // If no proper response, keep the optimistic update but remove saving flag
        setPlannedMeals(prev => ({
          ...prev,
          [dateKey]: prev[dateKey]?.map(meal => 
            meal._id === tempMealId ? { ...meal, saving: false } : meal
          ) || []
        }));
      }

      // Show success
      toast.success(`${selectedMeal.name} planned for ${date.toLocaleDateString()}`, { 
        id: tempMealId 
      });

      // Refresh data from server to ensure consistency
      await refreshPlannedMealsData();

    } catch (error) {
      console.error('Error planning meal:', error);
      
      // Revert optimistic update on failure
      setPlannedMeals(prev => ({
        ...prev,
        [dateKey]: prev[dateKey]?.filter(meal => meal._id !== tempMealId) || []
      }));
      
      toast.error('Failed to plan meal. Please try again.', { id: tempMealId });
    } finally {
      // Clear saving state
      setSavingMeals(prev => {
        const newSet = new Set(prev);
        newSet.delete(tempMealId);
        return newSet;
      });
    }
  };

  const handleMealRemove = async (date, mealId) => {
    const dateKey = formatDateKey(date);
    const mealToRemove = plannedMeals[dateKey]?.find(meal => meal._id === mealId);
    
    if (!mealToRemove) {
      toast.error('Meal not found');
      return;
    }

    try {
      // Track removing state
      setRemovingMeals(prev => new Set([...prev, mealId]));

      // Show immediate feedback
      toast.loading('Removing meal...', { id: `remove-${mealId}` });

      // Optimistic update - remove from UI immediately
      setPlannedMeals(prev => ({
        ...prev,
        [dateKey]: prev[dateKey]?.filter(meal => meal._id !== mealId) || []
      }));

      // Autosave to backend
      await api.delete(`/meals/${mealId}`);
      
      toast.success('Meal removed from plan', { id: `remove-${mealId}` });

      // Refresh data from server to ensure consistency
      await refreshPlannedMealsData();

    } catch (error) {
      console.error('Error removing meal:', error);
      
      // Revert optimistic update on failure
      setPlannedMeals(prev => ({
        ...prev,
        [dateKey]: [...(prev[dateKey] || []), mealToRemove]
      }));
      
      toast.error('Failed to remove meal. Please try again.', { id: `remove-${mealId}` });
    } finally {
      // Clear removing state
      setRemovingMeals(prev => {
        const newSet = new Set(prev);
        newSet.delete(mealId);
        return newSet;
      });
    }
  };

  // Helper function to refresh planned meals data from server
  const refreshPlannedMealsData = async () => {
    try {
      const { startDate, endDate } = getViewDateRange();
      const calendarResponse = await api.get('/meals/calendar', {
        params: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        }
      });
      
      setPlannedMeals(calendarResponse.data.mealsByDate || {});
    } catch (error) {
      console.error('Error refreshing planned meals:', error);
      // Don't show error toast as this is a background refresh
    }
  };

  const handleNewMealCreated = async (newMeal) => {
    try {
      // Add to meals list
      setMeals(prev => [newMeal, ...prev]);
      
      // If a date was selected, also plan it for that date (already saved by modal)
      if (selectedDate) {
        const dateKey = formatDateKey(selectedDate);
        
        // Check if meal already exists in planned meals (may have been added by modal)
        const existingMeal = plannedMeals[dateKey]?.find(meal => meal._id === newMeal._id);
        
        if (!existingMeal) {
          setPlannedMeals(prev => ({
            ...prev,
            [dateKey]: [...(prev[dateKey] || []), newMeal]
          }));
        }
      }
      
      toast.success(`${newMeal.name} created and planned successfully`);
      
      // Refresh data from server to ensure consistency
      await refreshPlannedMealsData();
      
    } catch (error) {
      console.error('Error handling new meal:', error);
      toast.error('Error updating meal lists');
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

  const getPlannedMeals = (date) => {
    const dateKey = formatDateKey(date);
    return plannedMeals[dateKey] || [];
  };

  const isMealAlreadyPlanned = (date, mealName, mealType) => {
    const plannedForDate = getPlannedMeals(date);
    return plannedForDate.some(meal => meal.name === mealName && meal.mealType === mealType);
  };

  const getAvailableMealsForDate = (date) => {
    return meals.filter(meal => !isMealAlreadyPlanned(date, meal.name, meal.mealType));
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading meal planner..." />;
  }

  const days = getCurrentViewDays();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Meal Planner</h1>
          <p className="text-secondary-600">Plan your family meals on the calendar</p>
        </div>
        
        {/* View Toggle Buttons */}
        <div className="flex bg-secondary-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode(VIEW_MODES.MONTHLY)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === VIEW_MODES.MONTHLY
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-secondary-600 hover:text-secondary-900'
            }`}
            title="Monthly View"
          >
            <Calendar className="w-4 h-4" />
            Month
          </button>
          <button
            onClick={() => setViewMode(VIEW_MODES.WEEKLY)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === VIEW_MODES.WEEKLY
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-secondary-600 hover:text-secondary-900'
            }`}
            title="Weekly View"
          >
            <CalendarDays className="w-4 h-4" />
            Week
          </button>
          <button
            onClick={() => setViewMode(VIEW_MODES.DAILY)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === VIEW_MODES.DAILY
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-secondary-600 hover:text-secondary-900'
            }`}
            title="Daily View"
          >
            <CalendarCheck className="w-4 h-4" />
            Day
          </button>
          <button
            onClick={() => setViewMode(VIEW_MODES.LIST)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === VIEW_MODES.LIST
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-secondary-600 hover:text-secondary-900'
            }`}
            title="List View"
          >
            <List className="w-4 h-4" />
            List
          </button>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="flex items-center justify-between">
            {viewMode !== VIEW_MODES.LIST ? (
              <>
                <button
                  onClick={() => navigate(-1)}
                  className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
                  title={`Previous ${viewMode}`}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <h2 className="text-xl font-semibold text-secondary-900">
                  {getViewTitle()}
                </h2>
                
                <button
                  onClick={() => navigate(1)}
                  className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
                  title={`Next ${viewMode}`}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            ) : (
              <h2 className="text-xl font-semibold text-secondary-900 mx-auto">
                {getViewTitle()}
              </h2>
            )}
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="card">
        <div className="card-body p-0">
          {/* Day Headers - only show for monthly and weekly views */}
          {viewMode !== VIEW_MODES.DAILY && viewMode !== VIEW_MODES.LIST && (
            <div className={`grid ${viewMode === VIEW_MODES.WEEKLY ? 'grid-cols-7' : 'grid-cols-7'} border-b border-secondary-200`}>
              {dayNames.map(day => (
                <div key={day} className="p-3 text-center font-medium text-secondary-600 border-r border-secondary-200 last:border-r-0">
                  {day}
                </div>
              ))}
            </div>
          )}

          {/* Calendar Days or List View */}
          {viewMode === VIEW_MODES.LIST ? (
            /* List View */
            <div className="divide-y divide-secondary-200">
              {days.length === 0 ? (
                <div className="p-8 text-center">
                  <Calendar className="w-12 h-12 text-secondary-400 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-secondary-900 mb-2">No meals planned yet</h3>
                  <p className="text-secondary-600 mb-4">Start planning your meals by switching to calendar view and adding meals to specific dates.</p>
                  <button
                    onClick={() => setViewMode(VIEW_MODES.MONTHLY)}
                    className="btn-primary"
                  >
                    Go to Calendar View
                  </button>
                </div>
              ) : (
                days.map((meal, index) => (
                  <div key={meal._id} className={`p-4 hover:bg-secondary-50 transition-colors ${
                    meal.saving || savingMeals.has(meal._id) ? 'opacity-75' : ''
                  } ${removingMeals.has(meal._id) ? 'opacity-50' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {(meal.saving || savingMeals.has(meal._id)) && (
                            <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                          )}
                          {removingMeals.has(meal._id) && (
                            <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                          )}
                          <div className="text-sm font-medium text-secondary-900">
                            {meal.dateObj.toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMealTypeColor(meal.mealType)}`}>
                            {meal.mealType}
                          </span>
                          {(meal.saving || savingMeals.has(meal._id)) && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Saving...
                            </span>
                          )}
                          {removingMeals.has(meal._id) && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Removing...
                            </span>
                          )}
                        </div>
                        <div className="text-lg font-semibold text-secondary-900 mb-1">
                          {meal.name}
                        </div>
                        {meal.description && (
                          <div className="text-sm text-secondary-600 mb-2">
                            {meal.description}
                          </div>
                        )}
                        <div className="flex items-center gap-4 text-sm text-secondary-500">
                          {meal.recipe?.prepTime && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {meal.recipe.prepTime} mins prep
                            </div>
                          )}
                          {meal.recipe?.servings && (
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {meal.recipe.servings} servings
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleMealRemove(meal.dateObj, meal._id)}
                        disabled={removingMeals.has(meal._id) || meal.saving || savingMeals.has(meal._id)}
                        className={`p-2 rounded-lg transition-colors ${
                          removingMeals.has(meal._id) || meal.saving || savingMeals.has(meal._id)
                            ? 'cursor-not-allowed text-secondary-300 bg-secondary-100'
                            : 'text-secondary-400 hover:text-red-600 hover:bg-red-50'
                        }`}
                        title={removingMeals.has(meal._id) ? 'Removing...' : 'Remove meal'}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Calendar Grid */
            <div className={`grid ${
              viewMode === VIEW_MODES.DAILY 
                ? 'grid-cols-1' 
                : viewMode === VIEW_MODES.WEEKLY
                ? 'grid-cols-7'
                : 'grid-cols-7'
            }`}>
              {days.map((date, index) => (
                <div
                  key={index}
                  className={`${
                    viewMode === VIEW_MODES.DAILY 
                      ? 'min-h-[400px]' 
                      : 'min-h-[120px]'
                  } border-r border-b border-secondary-200 last:border-r-0 p-2 ${
                    !date ? 'bg-secondary-50' : ''
                  } ${isToday(date) ? 'bg-primary-50' : ''}`}
                >
                  {date && (
                    <>
                      {/* Date Display */}
                      <div className={`font-medium mb-2 ${
                        isToday(date) ? 'text-primary-600' : 'text-secondary-900'
                      } ${viewMode === VIEW_MODES.DAILY ? 'text-lg' : 'text-sm'}`}>
                        {viewMode === VIEW_MODES.DAILY 
                          ? date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                          : date.getDate()
                        }
                      </div>

                      {/* Assigned Meals */}
                      <div className={`space-y-1 mb-2 ${viewMode === VIEW_MODES.DAILY ? 'space-y-2' : ''}`}>
                        {getPlannedMeals(date).map((meal) => (
                          <div
                            key={meal._id}
                            className="group relative"
                          >
                            <div className={`px-2 py-1 rounded flex items-center justify-between ${getMealTypeColor(meal.mealType)} ${
                              viewMode === VIEW_MODES.DAILY ? 'text-sm' : 'text-xs'
                            } ${meal.saving ? 'opacity-75' : ''} ${removingMeals.has(meal._id) ? 'opacity-50' : ''}`}>
                              <div className="flex-1 min-w-0 flex items-center gap-1">
                                {(meal.saving || savingMeals.has(meal._id)) && (
                                  <Loader2 className="w-3 h-3 animate-spin text-primary-600" />
                                )}
                                {removingMeals.has(meal._id) && (
                                  <Loader2 className="w-3 h-3 animate-spin text-red-600" />
                                )}
                                <div className="truncate" title={meal.name}>
                                  {meal.name}
                                </div>
                                {viewMode === VIEW_MODES.DAILY && meal.description && (
                                  <div className="text-xs opacity-75 truncate">
                                    {meal.description}
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMealRemove(date, meal._id);
                                }}
                                disabled={removingMeals.has(meal._id) || meal.saving || savingMeals.has(meal._id)}
                                className={`ml-1 p-0.5 hover:bg-black hover:bg-opacity-10 rounded transition-opacity ${
                                  removingMeals.has(meal._id) || meal.saving || savingMeals.has(meal._id)
                                    ? 'cursor-not-allowed opacity-50'
                                    : 'opacity-0 group-hover:opacity-100 hover:text-red-600'
                                }`}
                                title={removingMeals.has(meal._id) ? 'Removing...' : 'Remove meal'}
                              >
                                <Trash2 className={viewMode === VIEW_MODES.DAILY ? 'w-4 h-4' : 'w-3 h-3'} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Meal Selector Dropdown */}
                      <select
                        onChange={(e) => handleMealSelect(date, e.target.value)}
                        value=""
                        className={`w-full border-0 border-t border-secondary-200 bg-transparent px-2 py-1 hover:bg-secondary-50 focus:bg-white focus:border-primary-300 focus:outline-none appearance-none cursor-pointer ${
                          viewMode === VIEW_MODES.DAILY ? 'text-sm' : 'text-xs'
                        }`}
                      >
                        <option value="">Add meal...</option>
                        {getAvailableMealsForDate(date).map((meal, mealIndex) => (
                          <option key={`day-${index}-meal-${mealIndex}-${meal._id}`} value={meal._id}>
                            {meal.name} ({meal.mealType})
                          </option>
                        ))}
                        <option key={`day-${index}-create-new`} value="create-new">+ Create new meal</option>
                      </select>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Meal Modal */}
      <MealModal
        meal={null}
        isOpen={mealModalOpen}
        onClose={() => {
          setMealModalOpen(false);
          setSelectedDate(null);
        }}
        onSave={handleNewMealCreated}
        mode="add"
        selectedDate={selectedDate}
        isTemplate={false}
      />
    </div>
  );
};

export default MealPlanner; 