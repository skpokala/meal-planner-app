const mongoose = require('mongoose');
const Ingredient = require('../models/Ingredient');
const Store = require('../models/Store');
const User = require('../models/User');

require('dotenv').config();

const migrateIngredientStores = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/meal_planner', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');
    console.log('Starting ingredient stores migration...');

    // Get all ingredients that have string store values
    const ingredients = await mongoose.connection.collection('ingredients').find({
      store: { $type: 'string' }
    }).toArray();

    console.log(`Found ${ingredients.length} ingredients with string store values`);

    if (ingredients.length === 0) {
      console.log('No ingredients to migrate');
      return;
    }

    // Group ingredients by user and store name
    const userStoreMap = new Map();
    
    for (const ingredient of ingredients) {
      const userId = ingredient.createdBy.toString();
      const storeName = ingredient.store.trim();
      
      if (!userStoreMap.has(userId)) {
        userStoreMap.set(userId, new Map());
      }
      
      if (!userStoreMap.get(userId).has(storeName)) {
        userStoreMap.get(userId).set(storeName, []);
      }
      
      userStoreMap.get(userId).get(storeName).push(ingredient);
    }

    console.log(`Processing stores for ${userStoreMap.size} users`);

    let totalMigrated = 0;
    let totalStoresCreated = 0;

    // Process each user's stores
    for (const [userId, storeMap] of userStoreMap) {
      console.log(`\nProcessing user ${userId}...`);
      
      // Verify user exists
      const user = await User.findById(userId);
      if (!user) {
        console.log(`User ${userId} not found, skipping...`);
        continue;
      }

      for (const [storeName, ingredientList] of storeMap) {
        console.log(`  Processing store "${storeName}" with ${ingredientList.length} ingredients...`);
        
        // Check if store already exists for this user
        let store = await Store.findOne({
          name: { $regex: new RegExp(`^${storeName}$`, 'i') },
          createdBy: userId,
          isActive: true
        });

        // If store doesn't exist, create it
        if (!store) {
          // Create a basic address structure for migrated stores
          store = new Store({
            name: storeName,
            address: {
              street: 'Address not provided',
              city: 'City not provided',
              state: 'State not provided',
              zipCode: '00000',
              country: 'USA'
            },
            createdBy: userId,
            isActive: true
          });

          await store.save();
          totalStoresCreated++;
          console.log(`    Created new store: ${storeName}`);
        } else {
          console.log(`    Using existing store: ${storeName}`);
        }

        // Update all ingredients to reference the store ObjectId
        for (const ingredient of ingredientList) {
          await mongoose.connection.collection('ingredients').updateOne(
            { _id: ingredient._id },
            { $set: { store: store._id } }
          );
          totalMigrated++;
        }

        console.log(`    Updated ${ingredientList.length} ingredients`);
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total stores created: ${totalStoresCreated}`);
    console.log(`Total ingredients migrated: ${totalMigrated}`);
    console.log('Migration completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run migration if this script is executed directly
if (require.main === module) {
  migrateIngredientStores()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = migrateIngredientStores; 