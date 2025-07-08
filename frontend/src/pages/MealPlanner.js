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
  const [selectedMealType, setSelectedMealType] = useState('dinner');
  const [savingMeals, setSavingMeals] = useState(new Set());
  const [removingMeals, setRemovingMeals] = useState(new Set());

  const mealTypes = [
    { value: 'breakfast', label: 'Breakfast' },
    { value: 'lunch', label: 'Lunch' },
    { value: 'dinner', label: 'Dinner' },
    { value: 'snack', label: 'Snack' }
  ];

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch all available meals (active only)
      const mealsResponse = await api.get('/meals', { 
        params: { active: true } 
      });
      setMeals(mealsResponse.data.meals || []);
      
      // Fetch planned meals for current view period
      const { startDate, endDate } = getViewDateRange();
      
      const calendarResponse = await api.get('/meal-plans/calendar', {
        params: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        }
      });
      
      setPlannedMeals(calendarResponse.data.mealPlansByDate || {});
      
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
    const allMealPlans = [];
    
    // Collect all planned meals from all dates
    Object.entries(plannedMeals).forEach(([dateKey, mealPlans]) => {
      mealPlans.forEach(mealPlan => {
        allMealPlans.push({
          ...mealPlan,
          dateObj: new Date(dateKey)
        });
      });
    });
    
    // Sort by date
    allMealPlans.sort((a, b) => a.dateObj - b.dateObj);
    
    return allMealPlans;
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
      case VIEW_MODES.MONTHLY:
        navigateMonth(direction);
        break;
      default:
        navigateMonth(direction);
    }
  };

  const getViewTitle = () => {
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
  };

  const getCurrentViewDays = () => {
    switch (viewMode) {
      case VIEW_MODES.DAILY:
        return [currentDate];
      case VIEW_MODES.WEEKLY:
        return getDaysInWeek(currentDate);
      case VIEW_MODES.LIST:
        return getAllPlannedMeals();
      case VIEW_MODES.MONTHLY:
      default:
        return getDaysInMonth(currentDate);
    }
  };

  const handleMealSelect = async (date, mealId, mealType) => {
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
      isCooked: false,
      saving: true // Flag to show saving state
    };

    try {
      // Optimistic update - add meal plan to UI immediately
      setPlannedMeals(prev => ({
        ...prev,
        [dateKey]: [...(prev[dateKey] || []), optimisticMealPlan]
      }));

      // Track saving state
      setSavingMeals(prev => new Set([...prev, tempMealPlanId]));

      // Show immediate feedback
      toast.loading('Planning meal...', { id: tempMealPlanId });

      // Prepare meal plan data for backend
      const mealPlanData = {
        meal: selectedMeal._id,
        mealType: mealType,
        date: date.toISOString(),
        assignedTo: [],
        isCooked: false
      };

      // Create meal plan
      const response = await api.post('/meal-plans', mealPlanData);
      
      // Replace optimistic update with real data
      if (response?.data?.mealPlan) {
        setPlannedMeals(prev => ({
          ...prev,
          [dateKey]: prev[dateKey]?.map(plan => 
            plan._id === tempMealPlanId ? response.data.mealPlan : plan
          ) || []
        }));
      } else {
        // If no proper response, keep the optimistic update but remove saving flag
        setPlannedMeals(prev => ({
          ...prev,
          [dateKey]: prev[dateKey]?.map(plan => 
            plan._id === tempMealPlanId ? { ...plan, saving: false } : plan
          ) || []
        }));
      }

      // Show success
      toast.success(`${selectedMeal.name} planned for ${date.toLocaleDateString()}`, { 
        id: tempMealPlanId 
      });

      // Refresh data from server to ensure consistency
      await refreshPlannedMealsData();

    } catch (error) {
      console.error('Error planning meal:', error);
      
      // Revert optimistic update on failure
      setPlannedMeals(prev => ({
        ...prev,
        [dateKey]: prev[dateKey]?.filter(plan => plan._id !== tempMealPlanId) || []
      }));
      
      toast.error('Failed to plan meal. Please try again.', { id: tempMealPlanId });
    } finally {
      // Clear saving state
      setSavingMeals(prev => {
        const newSet = new Set(prev);
        newSet.delete(tempMealPlanId);
        return newSet;
      });
    }
  };

  const handleMealRemove = async (date, mealPlanId) => {
    const dateKey = formatDateKey(date);
    const mealPlanToRemove = plannedMeals[dateKey]?.find(plan => plan._id === mealPlanId);
    
    if (!mealPlanToRemove) {
      toast.error('Meal plan not found');
      return;
    }

    try {
      // Track removing state
      setRemovingMeals(prev => new Set([...prev, mealPlanId]));

      // Show immediate feedback
      toast.loading('Removing meal...', { id: `remove-${mealPlanId}` });

      // Optimistic update - remove from UI immediately
      setPlannedMeals(prev => ({
        ...prev,
        [dateKey]: prev[dateKey]?.filter(plan => plan._id !== mealPlanId) || []
      }));

      // Remove meal plan from backend
      await api.delete(`/meal-plans/${mealPlanId}`);
      
      toast.success('Meal removed from plan', { id: `remove-${mealPlanId}` });

      // Refresh data from server to ensure consistency
      await refreshPlannedMealsData();

    } catch (error) {
      console.error('Error removing meal plan:', error);
      
      // Revert optimistic update on failure
      setPlannedMeals(prev => ({
        ...prev,
        [dateKey]: [...(prev[dateKey] || []), mealPlanToRemove]
      }));
      
      toast.error('Failed to remove meal. Please try again.', { id: `remove-${mealPlanId}` });
    } finally {
      // Clear removing state
      setRemovingMeals(prev => {
        const newSet = new Set(prev);
        newSet.delete(mealPlanId);
        return newSet;
      });
    }
  };

  // Helper function to refresh planned meals data from server
  const refreshPlannedMealsData = async () => {
    try {
      const { startDate, endDate } = getViewDateRange();
      const calendarResponse = await api.get('/meal-plans/calendar', {
        params: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        }
      });
      
      setPlannedMeals(calendarResponse.data.mealPlansByDate || {});
    } catch (error) {
      console.error('Error refreshing planned meals:', error);
      // Don't show error toast as this is a background refresh
    }
  };

  const handleNewMealCreated = async (newMeal) => {
    try {
      if (!newMeal || !newMeal._id) {
        console.error('Invalid meal data received:', newMeal);
        toast.error('Error: Invalid meal data received');
        return;
      }

      console.log('New meal created in MealPlanner:', newMeal);
      
      // Add the new meal to the meals list
      setMeals(prevMeals => {
        console.log('Adding new meal to meals list');
        return [newMeal, ...prevMeals];
      });

      // Now plan this meal for the selected date if we have one
      if (selectedDate && selectedMealType) {
        console.log('Auto-planning new meal for selected date:', selectedDate, selectedMealType);
        
        // Create meal plan for the new meal
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
        
        // Refresh data to ensure consistency
        await refreshPlannedMealsData();
      } else {
        toast.success(`${newMeal.name} created successfully`);
      }
      
    } catch (error) {
      console.error('Error handling new meal creation:', error);
      toast.error('Meal created but failed to plan it. You can plan it manually.');
    }
  };

  const getMealTypeColor = (mealType) => {
    const colors = {
      breakfast: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      lunch: 'bg-green-100 text-green-800 border-green-200',
      dinner: 'bg-blue-100 text-blue-800 border-blue-200',
      snack: 'bg-purple-100 text-purple-800 border-purple-200',
    };
    return colors[mealType] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getPlannedMeals = (date) => {
    const dateKey = formatDateKey(date);
    return plannedMeals[dateKey] || [];
  };

  const isMealAlreadyPlanned = (date, mealId, mealType) => {
    const plans = getPlannedMeals(date);
    return plans.some(plan => plan.meal._id === mealId && plan.mealType === mealType);
  };

  const getAvailableMealsForDate = (date) => {
    // Filter out meals that are already planned for this date and meal type
    return meals.filter(meal => meal.active);
  };

  const isToday = (date) => {
    const today = new Date();
    return date && date.toDateString() === today.toDateString();
  };

  const isPastDate = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date && date < today;
  };

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading meal planner..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Meal Planner</h1>
          <p className="text-secondary-600">Plan your meals for the week ahead</p>
        </div>
        
        {/* View Mode Toggles */}
        <div className="flex items-center space-x-2">
          <div className="flex rounded-md shadow-sm">
            <button
              onClick={() => setViewMode(VIEW_MODES.MONTHLY)}
              className={`px-3 py-2 text-sm font-medium rounded-l-md border ${
                viewMode === VIEW_MODES.MONTHLY
                  ? 'bg-primary-50 border-primary-200 text-primary-700'
                  : 'bg-white border-secondary-300 text-secondary-700 hover:bg-secondary-50'
              }`}
            >
              <Calendar className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode(VIEW_MODES.WEEKLY)}
              className={`px-3 py-2 text-sm font-medium border-t border-b ${
                viewMode === VIEW_MODES.WEEKLY
                  ? 'bg-primary-50 border-primary-200 text-primary-700'
                  : 'bg-white border-secondary-300 text-secondary-700 hover:bg-secondary-50'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode(VIEW_MODES.DAILY)}
              className={`px-3 py-2 text-sm font-medium border-t border-b ${
                viewMode === VIEW_MODES.DAILY
                  ? 'bg-primary-50 border-primary-200 text-primary-700'
                  : 'bg-white border-secondary-300 text-secondary-700 hover:bg-secondary-50'
              }`}
            >
              <CalendarCheck className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode(VIEW_MODES.LIST)}
              className={`px-3 py-2 text-sm font-medium rounded-r-md border ${
                viewMode === VIEW_MODES.LIST
                  ? 'bg-primary-50 border-primary-200 text-primary-700'
                  : 'bg-white border-secondary-300 text-secondary-700 hover:bg-secondary-50'
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
            className="p-2 text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 rounded transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <h2 className="text-lg font-semibold text-secondary-900">
            {getViewTitle()}
          </h2>
          
          <button
            onClick={() => navigate(1)}
            className="p-2 text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 rounded transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Content based on view mode */}
      {viewMode === VIEW_MODES.LIST ? (
        <ListViewComponent 
          mealPlans={getAllPlannedMeals()}
          onRemove={handleMealRemove}
          removingMeals={removingMeals}
          getMealTypeColor={getMealTypeColor}
        />
      ) : (
        <CalendarViewComponent
          viewMode={viewMode}
          days={getCurrentViewDays()}
          getPlannedMeals={getPlannedMeals}
          meals={meals}
          mealTypes={mealTypes}
          onMealSelect={handleMealSelect}
          onMealRemove={handleMealRemove}
          isMealAlreadyPlanned={isMealAlreadyPlanned}
          getMealTypeColor={getMealTypeColor}
          isToday={isToday}
          isPastDate={isPastDate}
          savingMeals={savingMeals}
          removingMeals={removingMeals}
        />
      )}

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
  );
};

// List View Component
const ListViewComponent = ({ mealPlans, onRemove, removingMeals, getMealTypeColor }) => {
  if (mealPlans.length === 0) {
    return (
      <div className="card">
        <div className="card-body text-center py-12">
          <Calendar className="w-16 h-16 text-secondary-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-secondary-900 mb-2">No meals planned</h3>
          <p className="text-secondary-600">Start planning your meals using the calendar view</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-semibold text-secondary-900">
          All Planned Meals ({mealPlans.length})
        </h3>
      </div>
      <div className="card-body">
        <div className="space-y-4">
          {mealPlans.map((plan) => (
            <div key={plan._id} className="flex items-center justify-between p-4 border border-secondary-200 rounded-card">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h4 className="font-semibold text-secondary-900">
                    {plan.meal?.name || 'Unknown Meal'}
                  </h4>
                  <span className={`badge ${getMealTypeColor(plan.mealType)}`}>
                    {plan.mealType}
                  </span>
                  {plan.isCooked && (
                    <span className="badge bg-green-100 text-green-800">Cooked</span>
                  )}
                </div>
                <div className="flex items-center space-x-4 text-sm text-secondary-600">
                  <span>{plan.dateObj.toLocaleDateString()}</span>
                  {plan.meal?.prepTime > 0 && (
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {plan.meal.prepTime} min
                    </div>
                  )}
                </div>
                {plan.meal?.description && (
                  <p className="text-sm text-secondary-600 mt-1">{plan.meal.description}</p>
                )}
              </div>
              <button
                onClick={() => onRemove(plan.dateObj, plan._id)}
                disabled={removingMeals.has(plan._id)}
                className="p-2 text-error-600 hover:text-error-900 hover:bg-error-50 rounded transition-colors disabled:opacity-50"
                title="Remove from plan"
              >
                {removingMeals.has(plan._id) ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Calendar View Component
const CalendarViewComponent = ({ 
  viewMode, 
  days, 
  getPlannedMeals, 
  meals, 
  mealTypes,
  onMealSelect, 
  onMealRemove, 
  isMealAlreadyPlanned, 
  getMealTypeColor, 
  isToday, 
  isPastDate,
  savingMeals,
  removingMeals
}) => {
  const gridClasses = {
    [VIEW_MODES.MONTHLY]: 'grid-cols-7',
    [VIEW_MODES.WEEKLY]: 'grid-cols-7',
    [VIEW_MODES.DAILY]: 'grid-cols-1'
  };

  return (
    <div className="card">
      <div className="card-body p-0">
        {/* Day headers for monthly/weekly view */}
        {(viewMode === VIEW_MODES.MONTHLY || viewMode === VIEW_MODES.WEEKLY) && (
          <div className="grid grid-cols-7 border-b border-secondary-200">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-3 text-center text-sm font-medium text-secondary-700 border-r border-secondary-200 last:border-r-0">
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
              isMealAlreadyPlanned={isMealAlreadyPlanned}
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
  isMealAlreadyPlanned, 
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
    return <div className="h-32 border-r border-b border-secondary-200"></div>;
  }

  const handleAddMeal = (mealType) => {
    setSelectedMealType(mealType);
    setShowMealSelector(true);
  };

  const handleMealSelection = (mealId) => {
    onMealSelect(date, mealId, selectedMealType);
    setShowMealSelector(false);
  };

  const availableMeals = meals.filter(meal => 
    meal.active && !isMealAlreadyPlanned(date, meal._id, selectedMealType)
  );

  const cellHeight = viewMode === VIEW_MODES.DAILY ? 'min-h-96' : 'h-32';
  
  return (
    <div className={`${cellHeight} border-r border-b border-secondary-200 last:border-r-0 p-2 ${
      isToday ? 'bg-primary-50' : isPastDate ? 'bg-secondary-50' : 'bg-white'
    } overflow-hidden relative`}>
      {/* Date header */}
      <div className="flex items-center justify-between mb-2">
        <span className={`text-sm font-medium ${
          isToday ? 'text-primary-700' : isPastDate ? 'text-secondary-500' : 'text-secondary-900'
        }`}>
          {date.getDate()}
        </span>
        
        {/* Add meal dropdown */}
        <div className="relative">
          <select
            value=""
            onChange={(e) => e.target.value && handleAddMeal(e.target.value)}
            className="text-xs border-0 bg-transparent text-secondary-500 cursor-pointer hover:text-secondary-700"
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
              {savingMeals.has(plan._id) ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : removingMeals.has(plan._id) ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <button
                  onClick={() => onMealRemove(date, plan._id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-red-200 rounded"
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
        <div className="absolute inset-0 bg-white border border-secondary-300 rounded shadow-lg z-10 p-2 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-secondary-700">
              Add {selectedMealType}
            </span>
            <button
              onClick={() => setShowMealSelector(false)}
              className="text-secondary-400 hover:text-secondary-600"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-1">
            <button
              onClick={() => handleMealSelection('create-new')}
              className="w-full text-left text-xs p-1 rounded hover:bg-primary-50 text-primary-600 border border-primary-200"
            >
              + Create New Meal
            </button>
            
            {availableMeals.map((meal) => (
              <button
                key={meal._id}
                onClick={() => handleMealSelection(meal._id)}
                className="w-full text-left text-xs p-1 rounded hover:bg-secondary-50 border border-secondary-200 truncate"
                title={meal.description}
              >
                {meal.name}
                {meal.prepTime > 0 && (
                  <span className="text-secondary-500 ml-1">({meal.prepTime}m)</span>
                )}
              </button>
            ))}
            
            {availableMeals.length === 0 && (
              <div className="text-xs text-secondary-500 text-center py-2">
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