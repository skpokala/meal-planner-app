import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock, Users, Trash2 } from 'lucide-react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import MealModal from '../components/MealModal';
import toast from 'react-hot-toast';

const MealPlanner = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
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

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
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

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading meal planner..." />;
  }

  const days = getDaysInMonth(currentDate);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Meal Planner</h1>
          <p className="text-secondary-600">Plan your family meals on the calendar</p>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
              title="Previous month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <h2 className="text-xl font-semibold text-secondary-900">
              {formatMonthYear(currentDate)}
            </h2>
            
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
              title="Next month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="card">
        <div className="card-body p-0">
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-secondary-200">
            {dayNames.map(day => (
              <div key={day} className="p-3 text-center font-medium text-secondary-600 border-r border-secondary-200 last:border-r-0">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {days.map((date, index) => (
              <div
                key={index}
                className={`min-h-[120px] border-r border-b border-secondary-200 last:border-r-0 p-2 ${
                  !date ? 'bg-secondary-50' : ''
                } ${isToday(date) ? 'bg-primary-50' : ''}`}
              >
                {date && (
                  <>
                    {/* Date Number */}
                    <div className={`text-sm font-medium mb-2 ${
                      isToday(date) ? 'text-primary-600' : 'text-secondary-900'
                    }`}>
                      {date.getDate()}
                    </div>

                    {/* Assigned Meals */}
                    <div className="space-y-1 mb-2">
                      {getAssignedMeals(date).map((assignment) => (
                        <div
                          key={assignment._id}
                          className="group relative"
                        >
                          <div className={`text-xs px-2 py-1 rounded flex items-center justify-between ${getMealTypeColor(assignment.mealType)}`}>
                            <span className="truncate flex-1" title={assignment.meal.name}>
                              {assignment.meal.name}
                            </span>
                            <button
                              onClick={() => handleMealRemove(date, assignment._id)}
                              className="opacity-0 group-hover:opacity-100 ml-1 p-0.5 hover:bg-black hover:bg-opacity-10 rounded transition-opacity"
                              title="Remove meal"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Meal Selector Dropdown */}
                    <select
                      onChange={(e) => handleMealSelect(date, e.target.value)}
                      value=""
                      className="w-full text-xs border border-secondary-300 rounded px-2 py-1 hover:border-primary-300 focus:border-primary-500 focus:outline-none"
                    >
                      <option value="">Add meal...</option>
                      {meals.map(meal => (
                        <option key={meal._id} value={meal._id}>
                          {meal.name} ({meal.mealType})
                        </option>
                      ))}
                      <option value="create-new">+ Create new meal</option>
                    </select>
                  </>
                )}
              </div>
            ))}
          </div>
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
      />
    </div>
  );
};

export default MealPlanner; 