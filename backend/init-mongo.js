// MongoDB initialization script
db = db.getSiblingDB('meal_planner');

// Create collections
db.createCollection('users');
db.createCollection('familymembers');
db.createCollection('meals');

// Create indexes
db.users.createIndex({ "username": 1 }, { unique: true });
db.users.createIndex({ "email": 1 }, { unique: true });
db.familymembers.createIndex({ "email": 1 }, { unique: true });

print('Database initialized successfully!'); 