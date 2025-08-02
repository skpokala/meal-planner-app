const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../models/User');
const FamilyMember = require('../models/FamilyMember');
const Meal = require('../models/Meal');
const MealPlan = require('../models/MealPlan');
const Ingredient = require('../models/Ingredient');

// Default location structure
const defaultLocation = {
  address: {
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'USA'
  },
  coordinates: {
    latitude: null,
    longitude: null
  },
  timezone: 'America/New_York'
};

async function migrateLocationFields() {
  try {
    console.log('🚀 Starting location fields migration...');
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/meal-planner';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Migration 1: Add location field to Users
    console.log('📝 Migrating User documents...');
    const userUpdateResult = await User.updateMany(
      { location: { $exists: false } },
      { $set: { location: defaultLocation } }
    );
    console.log(`✅ Updated ${userUpdateResult.modifiedCount} User documents`);

    // Migration 2: Add location and useParentLocation fields to FamilyMembers
    console.log('📝 Migrating FamilyMember documents...');
    const familyMemberUpdateResult = await FamilyMember.updateMany(
      { $or: [{ location: { $exists: false } }, { useParentLocation: { $exists: false } }] },
      { 
        $set: { 
          location: defaultLocation,
          useParentLocation: true
        } 
      }
    );
    console.log(`✅ Updated ${familyMemberUpdateResult.modifiedCount} FamilyMember documents`);

    // Migration 3: Add location, cuisine, and region fields to Meals
    console.log('📝 Migrating Meal documents...');
    const mealUpdateResult = await Meal.updateMany(
      { $or: [{ location: { $exists: false } }, { cuisine: { $exists: false } }, { region: { $exists: false } }] },
      { 
        $set: { 
          location: defaultLocation,
          cuisine: '',
          region: ''
        } 
      }
    );
    console.log(`✅ Updated ${mealUpdateResult.modifiedCount} Meal documents`);

    // Migration 4: Add location field to MealPlans
    console.log('📝 Migrating MealPlan documents...');
    const mealPlanUpdateResult = await MealPlan.updateMany(
      { location: { $exists: false } },
      { $set: { location: defaultLocation } }
    );
    console.log(`✅ Updated ${mealPlanUpdateResult.modifiedCount} MealPlan documents`);

    // Migration 5: Add location and seasonality fields to Ingredients
    console.log('📝 Migrating Ingredient documents...');
    const ingredientUpdateResult = await Ingredient.updateMany(
      { $or: [{ location: { $exists: false } }, { seasonality: { $exists: false } }] },
      { 
        $set: { 
          location: defaultLocation,
          seasonality: {
            availableMonths: [],
            notes: ''
          }
        } 
      }
    );
    console.log(`✅ Updated ${ingredientUpdateResult.modifiedCount} Ingredient documents`);

    // Verify the migration by checking sample documents
    console.log('🔍 Verifying migration...');
    
    const sampleUser = await User.findOne({});
    const sampleFamilyMember = await FamilyMember.findOne({});
    const sampleMeal = await Meal.findOne({});
    const sampleMealPlan = await MealPlan.findOne({});
    const sampleIngredient = await Ingredient.findOne({});

    if (sampleUser && sampleUser.location) {
      console.log('✅ User location field verified');
    }
    if (sampleFamilyMember && sampleFamilyMember.location && sampleFamilyMember.useParentLocation !== undefined) {
      console.log('✅ FamilyMember location fields verified');
    }
    if (sampleMeal && sampleMeal.location && sampleMeal.cuisine !== undefined) {
      console.log('✅ Meal location and cuisine fields verified');
    }
    if (sampleMealPlan && sampleMealPlan.location) {
      console.log('✅ MealPlan location field verified');
    }
    if (sampleIngredient && sampleIngredient.location && sampleIngredient.seasonality) {
      console.log('✅ Ingredient location and seasonality fields verified');
    }

    console.log('🎉 Location fields migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateLocationFields()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = migrateLocationFields; 