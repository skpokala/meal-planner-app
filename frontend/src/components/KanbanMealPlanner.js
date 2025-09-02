import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, Coffee, Sun, Moon } from 'lucide-react';

const MEAL_TYPES = {
  BREAKFAST: { id: 'breakfast', label: 'Breakfast', icon: Coffee, color: 'bg-orange-100 dark:bg-orange-900/20' },
  LUNCH: { id: 'lunch', label: 'Lunch', icon: Sun, color: 'bg-yellow-100 dark:bg-yellow-900/20' },
  DINNER: { id: 'dinner', label: 'Dinner', icon: Moon, color: 'bg-blue-100 dark:bg-blue-900/20' }
};

const KanbanMealPlanner = ({ meals, existingMealPlans, onSaveMeal }) => {
  const [currentWeek, setCurrentWeek] = useState(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    return startOfWeek;
  });
  const [columns, setColumns] = useState({});
  const [draggedMeal, setDraggedMeal] = useState(null);
  
  // Initialize columns for each day of the week
  useEffect(() => {
    try {
      const newColumns = {};
      
      for (let i = 0; i < 7; i++) {
        const day = new Date(currentWeek);
        day.setDate(currentWeek.getDate() + i);
        day.setHours(0, 0, 0, 0);
        
        const dayKey = day.toISOString().split('T')[0];
        const dayName = day.toLocaleDateString('en-US', { weekday: 'long' });
        
        newColumns[dayKey] = {
          id: dayKey,
          title: dayName,
          date: day,
          meals: {
            breakfast: [],
            lunch: [],
            dinner: []
          }
        };
      }
      
      setColumns(newColumns);
    } catch (error) {
      console.error('Error initializing columns:', error);
      toast.error('Error setting up calendar view');
    }
  }, [currentWeek]);

  // Populate columns with existing meal plans
  useEffect(() => {
    if (existingMealPlans && existingMealPlans.length > 0 && Object.keys(columns).length > 0) {
      setColumns(prevColumns => {
        const updatedColumns = { ...prevColumns };
        
        existingMealPlans.forEach((mealPlan) => {
          try {
            // Handle different date formats
            let dateKey;
            if (typeof mealPlan.date === 'string') {
              dateKey = mealPlan.date.split('T')[0];
            } else if (mealPlan.date instanceof Date) {
              dateKey = mealPlan.date.toISOString().split('T')[0];
            } else {
              console.warn('Unknown date format:', mealPlan.date);
              return;
            }
            
            const mealType = mealPlan.mealType?.toLowerCase();
            
            if (updatedColumns[dateKey] && mealType && updatedColumns[dateKey].meals[mealType]) {
              // Find the meal details - handle both string ID and object with _id
              const mealId = typeof mealPlan.meal === 'string' ? mealPlan.meal : mealPlan.meal._id;
              const mealDetails = meals.find(m => m._id === mealId);
              
              if (mealDetails) {
                // Check if meal already exists to avoid duplicates
                const exists = updatedColumns[dateKey].meals[mealType].some(m => m._id === mealDetails._id);
                if (!exists) {
                  updatedColumns[dateKey].meals[mealType].push(mealDetails);
                }
              }
            }
          } catch (error) {
            console.error('Error processing meal plan:', mealPlan, error);
          }
        });
        
        return updatedColumns;
      });
    }
  }, [existingMealPlans, columns, meals]);

  const navigateWeek = (direction) => {
    setCurrentWeek(current => {
      const newDate = new Date(current);
      newDate.setDate(current.getDate() + (direction === 'next' ? 7 : -7));
      return newDate;
    });
  };

  // HTML5 Drag and Drop handlers
  const handleDragStart = (e, meal) => {
    setDraggedMeal(meal);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', meal._id);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dayId, mealType) => {
    e.preventDefault();
    
    if (!draggedMeal) {
      toast.error('No meal selected for dragging');
      return;
    }

    try {
      const dateObj = new Date(dayId + 'T00:00:00.000Z');
      if (isNaN(dateObj.getTime())) {
        throw new Error('Invalid date');
      }

      // Check if meal already exists in this section
      const existingMeals = columns[dayId]?.meals[mealType] || [];
      const mealExists = existingMeals.some(m => m._id === draggedMeal._id);
      
      if (mealExists) {
        toast.error(`${draggedMeal.name} is already planned for ${dayId} ${mealType}`);
        return;
      }

      onSaveMeal({
        mealId: draggedMeal._id,
        date: dateObj.toISOString(),
        mealType: mealType
      });

      toast.success(`${draggedMeal.name} added to ${dayId} for ${MEAL_TYPES[mealType.toUpperCase()].label}`);
      
      // Immediately add the meal to the column visually for instant feedback
      setColumns(prev => {
        const updatedColumns = { ...prev };
        if (updatedColumns[dayId] && updatedColumns[dayId].meals[mealType]) {
          updatedColumns[dayId].meals[mealType] = [
            ...updatedColumns[dayId].meals[mealType],
            draggedMeal
          ];
        }
        return updatedColumns;
      });
      
      setDraggedMeal(null);
    } catch (error) {
      console.error('Error saving meal:', error);
      toast.error('Failed to save meal');
    }
  };

  const handleDragEnd = () => {
    setDraggedMeal(null);
  };

  try {
    return (
      <div className="flex flex-col h-full">
        {/* Week Navigation */}
        <div className="flex items-center justify-between mb-6 px-4">
          <button
            onClick={() => navigateWeek('prev')}
            className="btn btn-ghost btn-sm flex items-center gap-1 sm:gap-2"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Previous Week</span>
            <span className="sm:hidden">Prev</span>
          </button>
          <h2 className="text-lg sm:text-xl font-semibold text-center px-2">
            Week of {currentWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </h2>
          <button
            onClick={() => navigateWeek('next')}
            className="btn btn-ghost btn-sm flex items-center gap-1 sm:gap-2"
          >
            <span className="hidden sm:inline">Next Week</span>
            <span className="sm:hidden">Next</span>
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Available Meals Palette */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 px-4">Available Meals</h3>
          <div className="px-4">
            {meals && meals.length > 0 ? (
              <div className="flex flex-wrap gap-2 sm:gap-3 pb-4">
                {meals.map((meal, index) => (
                  <div
                    key={meal._id || `meal-${index}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, meal)}
                    onDragEnd={handleDragEnd}
                    className="p-2 sm:p-3 rounded-lg bg-white dark:bg-secondary-800 shadow-sm border-2 border-dashed border-secondary-300 dark:border-secondary-600 cursor-grab hover:shadow-md transition-all hover:border-primary-400 dark:hover:border-primary-500 active:cursor-grabbing min-w-[120px] sm:min-w-[150px]"
                    title={`Drag ${meal.name} to a meal type section`}
                  >
                    <div className="font-medium text-secondary-900 dark:text-secondary-100 text-sm sm:text-base">
                      {meal.name}
                    </div>
                    {meal.description && (
                      <div className="text-xs sm:text-sm text-secondary-600 dark:text-secondary-400 mt-1 max-w-[100px] sm:max-w-[200px] truncate">
                        {meal.description}
                      </div>
                    )}
                    {meal.prepTime && meal.prepTime > 0 && (
                      <div className="text-xs text-secondary-500 dark:text-secondary-400 mt-1 sm:mt-2">
                        ⏱️ {meal.prepTime} min
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-secondary-500 dark:text-secondary-400 text-center py-4">
                No meals available
              </div>
            )}
          </div>
        </div>

        {/* Kanban Board */}
        {Object.keys(columns).length === 0 ? (
          <div className="text-center py-8 text-secondary-500 dark:text-secondary-400">
            Loading calendar...
          </div>
        ) : meals && meals.length > 0 ? (
          <div className="w-full">
            {/* Mobile: Horizontal scroll */}
            <div className="block lg:hidden">
              <div className="flex gap-3 overflow-x-auto pb-4" style={{ scrollbarWidth: 'thin' }}>
                {Object.values(columns).map(column => (
                  <div
                    key={column.id}
                    className="flex flex-col min-w-[280px] h-[500px]"
                  >
                    <div className="text-center p-3 bg-secondary-100 dark:bg-secondary-800 rounded-t-lg font-medium">
                      <div className="text-sm font-semibold">{column.title}</div>
                      <div className="text-xs text-secondary-600 dark:text-secondary-400">
                        {column.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    
                    {/* Meal Type Sections */}
                    <div className="flex-1 flex flex-col gap-2 p-3 bg-secondary-50 dark:bg-secondary-900/50 rounded-b-lg">
                      {Object.entries(MEAL_TYPES).map(([key, mealType]) => {
                        const Icon = mealType.icon;
                        const mealsInSection = column.meals[mealType.id] || [];
                        
                        return (
                          <div
                            key={mealType.id}
                            className={`flex-1 p-3 rounded-lg transition-all min-h-[100px] ${mealType.color} hover:bg-opacity-80`}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, column.id, mealType.id)}
                          >
                            {/* Section Header */}
                            <div className="flex items-center gap-2 mb-2 text-sm font-medium text-secondary-700 dark:text-secondary-300">
                              <Icon className="w-4 h-4" />
                              {mealType.label}
                            </div>
                            
                            {/* Meals in this section */}
                            {mealsInSection.length === 0 ? (
                              <div className="text-center text-secondary-500 dark:text-secondary-400 text-xs py-4">
                                Drop here
                              </div>
                            ) : (
                              mealsInSection.map((meal, index) => (
                                <div
                                  key={meal._id || `meal-${index}`}
                                  className="p-2 mb-2 rounded bg-white dark:bg-secondary-800 shadow-sm border border-secondary-200 dark:border-secondary-700 text-xs"
                                >
                                  <div className="font-medium truncate">{meal.name}</div>
                                </div>
                              ))
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Desktop: Grid layout */}
            <div className="hidden lg:grid lg:grid-cols-7 gap-4 h-full">
              {Object.values(columns).map(column => (
                <div
                  key={column.id}
                  className="flex flex-col h-full"
                >
                  <div className="text-center p-2 bg-secondary-100 dark:bg-secondary-800 rounded-t-lg font-medium">
                    {column.title}
                    <div className="text-sm text-secondary-600 dark:text-secondary-400">
                      {column.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  
                  {/* Meal Type Sections */}
                  <div className="flex-1 flex flex-col gap-2 p-2 bg-secondary-50 dark:bg-secondary-900/50 rounded-b-lg">
                    {Object.entries(MEAL_TYPES).map(([key, mealType]) => {
                      const Icon = mealType.icon;
                      const mealsInSection = column.meals[mealType.id] || [];
                      
                      return (
                        <div
                          key={mealType.id}
                          className={`flex-1 p-2 rounded-lg transition-all min-h-[80px] ${mealType.color} hover:bg-opacity-80`}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, column.id, mealType.id)}
                        >
                          {/* Section Header */}
                          <div className="flex items-center gap-2 mb-2 text-sm font-medium text-secondary-700 dark:text-secondary-300">
                            <Icon className="w-4 h-4" />
                            {mealType.label}
                          </div>
                          
                          {/* Meals in this section */}
                          {mealsInSection.length === 0 ? (
                            <div className="text-center text-secondary-500 dark:text-secondary-400 text-xs py-2">
                              Drop here
                            </div>
                          ) : (
                            mealsInSection.map((meal, index) => (
                              <div
                                key={meal._id || `meal-${index}`}
                                className="p-2 mb-1 rounded bg-white dark:bg-secondary-800 shadow-sm border border-secondary-200 dark:border-secondary-700 text-xs"
                              >
                                <div className="font-medium truncate">{meal.name}</div>
                              </div>
                            ))
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-secondary-500 dark:text-secondary-400">
            No meals available to plan
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error('Error rendering KanbanMealPlanner:', error);
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-2">Error rendering Kanban view</div>
          <div className="text-sm text-secondary-500">{error.message}</div>
          <button 
            onClick={() => window.location.reload()} 
            className="btn btn-primary btn-sm mt-4"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }
};

export default KanbanMealPlanner;
