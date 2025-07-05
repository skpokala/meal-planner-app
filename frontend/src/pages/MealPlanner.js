import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock, Users, Trash2, Calendar, CalendarDays, CalendarCheck, List } from 'lucide-react';
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
  const [mealAssignments, setMealAssignments] = useState({});
  const [loading, setLoading] = useState(true);
  const [mealModalOpen, setMealModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch meals first (required)
      const mealsResponse = await api.get('/meals');
      setMeals(mealsResponse.data.meals || []);
      
      // Try to fetch meal assignments (optional - might not exist)
      try {
        const assignmentsResponse = await api.get('/meal-assignments');
        
        // Convert assignments array to date-keyed object for easier lookup
        const assignmentsMap = {};
        if (assignmentsResponse.data.assignments) {
          assignmentsResponse.data.assignments.forEach(assignment => {
            const dateKey = assignment.date;
            if (!assignmentsMap[dateKey]) {
              assignmentsMap[dateKey] = [];
            }
            assignmentsMap[dateKey].push(assignment);
          });
        }
        setMealAssignments(assignmentsMap);
      } catch (assignmentsError) {
        // Silently handle 404 for meal assignments - this endpoint might not exist
        if (assignmentsError.response?.status !== 404) {
          console.error('Error fetching meal assignments:', assignmentsError);
        }
        setMealAssignments({});
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load meal data');
    } finally {
      setLoading(false);
    }
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

  const getAllAssignments = () => {
    const allAssignments = [];
    
    // Collect all assignments from all dates
    Object.entries(mealAssignments).forEach(([dateKey, assignments]) => {
      assignments.forEach(assignment => {
        allAssignments.push({
          ...assignment,
          dateObj: new Date(dateKey)
        });
      });
    });
    
    // Sort by date
    allAssignments.sort((a, b) => a.dateObj - b.dateObj);
    
    return allAssignments;
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
        // For list view, we'll return all assignments sorted by date
        return getAllAssignments();
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

    try {
      const dateKey = formatDateKey(date);
      const selectedMeal = meals.find(meal => meal._id === mealId);
      
      if (!selectedMeal) {
        throw new Error('Meal not found');
      }
      
      // Check for duplicate assignment
      if (isMealAssignedToDate(date, mealId)) {
        toast.error(`${selectedMeal.name} is already assigned to ${date.toLocaleDateString()}`);
        return;
      }
      
      // Validate meal data
      if (!selectedMeal.name || !selectedMeal.mealType) {
        throw new Error('Invalid meal data');
      }
      
      // For now, we'll store assignments locally since the backend endpoint might not exist
      const newAssignment = {
        _id: `${mealId}-${dateKey}-${Date.now()}`,
        mealId: mealId,
        meal: selectedMeal,
        date: dateKey,
        mealType: selectedMeal.mealType
      };

      setMealAssignments(prev => ({
        ...prev,
        [dateKey]: [...(prev[dateKey] || []), newAssignment]
      }));

      toast.success(`${selectedMeal.name} added to ${date.toLocaleDateString()}`);
    } catch (error) {
      console.error('Error assigning meal:', error);
      toast.error('Failed to assign meal');
    }
  };

  const handleMealRemove = async (date, assignmentId) => {
    try {
      const dateKey = formatDateKey(date);
      setMealAssignments(prev => ({
        ...prev,
        [dateKey]: prev[dateKey]?.filter(assignment => assignment._id !== assignmentId) || []
      }));
      toast.success('Meal removed');
    } catch (error) {
      console.error('Error removing meal:', error);
      toast.error('Failed to remove meal');
    }
  };

  const handleNewMealCreated = (newMeal) => {
    setMeals(prev => [newMeal, ...prev]);
    
    if (selectedDate) {
      // Check for duplicate assignment
      if (isMealAssignedToDate(selectedDate, newMeal._id)) {
        toast.error(`${newMeal.name} is already assigned to ${selectedDate.toLocaleDateString()}`);
        return;
      }

      const dateKey = formatDateKey(selectedDate);
      const newAssignment = {
        _id: `${newMeal._id}-${dateKey}-${Date.now()}`,
        mealId: newMeal._id,
        meal: newMeal,
        date: dateKey,
        mealType: newMeal.mealType
      };

      setMealAssignments(prev => ({
        ...prev,
        [dateKey]: [...(prev[dateKey] || []), newAssignment]
      }));
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

  const getAssignedMeals = (date) => {
    const dateKey = formatDateKey(date);
    return mealAssignments[dateKey] || [];
  };

  const isMealAssignedToDate = (date, mealId) => {
    const assignedMeals = getAssignedMeals(date);
    return assignedMeals.some(assignment => assignment.mealId === mealId);
  };

  const getAvailableMealsForDate = (date) => {
    return meals.filter(meal => !isMealAssignedToDate(date, meal._id));
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
                days.map((assignment, index) => (
                  <div key={assignment._id} className="p-4 hover:bg-secondary-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="text-sm font-medium text-secondary-900">
                            {assignment.dateObj.toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMealTypeColor(assignment.mealType)}`}>
                            {assignment.mealType}
                          </span>
                        </div>
                        <div className="text-lg font-semibold text-secondary-900 mb-1">
                          {assignment.meal.name}
                        </div>
                        {assignment.meal.description && (
                          <div className="text-sm text-secondary-600 mb-2">
                            {assignment.meal.description}
                          </div>
                        )}
                        <div className="flex items-center gap-4 text-sm text-secondary-500">
                          {assignment.meal.recipe?.prepTime && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {assignment.meal.recipe.prepTime} mins prep
                            </div>
                          )}
                          {assignment.meal.servings && (
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {assignment.meal.servings} servings
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleMealRemove(assignment.dateObj, assignment._id)}
                        className="p-2 text-secondary-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove meal"
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
                        {getAssignedMeals(date).map((assignment) => (
                          <div
                            key={assignment._id}
                            className="group relative"
                          >
                            <div className={`px-2 py-1 rounded flex items-center justify-between ${getMealTypeColor(assignment.mealType)} ${
                              viewMode === VIEW_MODES.DAILY ? 'text-sm' : 'text-xs'
                            }`}>
                              <div className="flex-1 min-w-0">
                                <div className="truncate" title={assignment.meal.name}>
                                  {assignment.meal.name}
                                </div>
                                {viewMode === VIEW_MODES.DAILY && assignment.meal.description && (
                                  <div className="text-xs opacity-75 truncate">
                                    {assignment.meal.description}
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => handleMealRemove(date, assignment._id)}
                                className="opacity-0 group-hover:opacity-100 ml-1 p-0.5 hover:bg-black hover:bg-opacity-10 rounded transition-opacity"
                                title="Remove meal"
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
      />
    </div>
  );
};

export default MealPlanner; 