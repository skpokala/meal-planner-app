// Test MongoDB Script for Direct Execution
// This script will test the direct execution functionality

console.log("Starting MongoDB script execution test...");

// Test print function
print("Testing print function...");

// Get database info
const dbStats = await db.stats();
print("Database stats retrieved successfully");
printjson({ message: "Database statistics", stats: dbStats });

// Test a simple query
const userCount = await db.users.countDocuments();
print("Users count: " + userCount);

// Test ObjectId creation
const testId = ObjectId();
print("Generated ObjectId: " + testId);

// Test creating a test document (will be cleaned up)
const testDoc = {
  _id: testId,
  name: "Test Script Execution",
  timestamp: ISODate(),
  purpose: "Verifying direct script execution works",
  count: NumberInt(42),
  version: "1.0"
};

printjson(testDoc);

try {
  const result = await db.scriptTests.insertOne(testDoc);
  print("Test document inserted with ID: " + result.insertedId);
  
  // Find the document we just inserted
  const foundDoc = await db.scriptTests.findOne({ _id: testId });
  printjsononeline({ found: foundDoc !== null, document: foundDoc });
  
  // Clean up the test document
  await db.scriptTests.deleteOne({ _id: result.insertedId });
  print("Test document cleaned up successfully");
} catch (error) {
  print("Error during test: " + error.message);
}

// Test show collections (async)
print("Available collections in database:");
show("collections");

print("MongoDB script execution test completed successfully!"); 