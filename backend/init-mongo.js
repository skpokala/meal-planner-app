// MongoDB initialization script
db = db.getSiblingDB('meal_planner');

// Clear existing data
print('Clearing existing data...');
db.meals.deleteMany({});
db.mealplans.deleteMany({});
db.familymembers.deleteMany({});
// Keep users for authentication

// Create collections
db.createCollection('users');
db.createCollection('familymembers');
db.createCollection('meals');
db.createCollection('mealplans');

// Create indexes
db.users.createIndex({ "username": 1 }, { unique: true });
db.users.createIndex({ "email": 1 }, { unique: true });
db.familymembers.createIndex({ "email": 1 }, { unique: true });
db.meals.createIndex({ "name": 1 });
db.meals.createIndex({ "active": 1 });
db.mealplans.createIndex({ "date": 1, "mealType": 1 });
db.mealplans.createIndex({ "meal": 1 });
db.mealplans.createIndex({ "meal": 1, "date": 1, "mealType": 1 }, { unique: true });

print('Database initialized successfully with new schema!'); 