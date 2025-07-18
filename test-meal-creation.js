const axios = require('axios');

// Test meal creation with empty quantity and unit
const testMealCreation = async () => {
  try {
    const mealData = {
      name: 'Test Meal',
      description: 'Test meal description',
      prepTime: 30,
      active: true,
      ingredients: [
        {
          ingredient: '507f1f77bcf86cd799439011', // dummy ingredient ID
          quantity: null, // empty quantity
          unit: null, // empty unit
          notes: 'test note'
        }
      ]
    };

    console.log('Testing meal creation with data:', JSON.stringify(mealData, null, 2));

    const response = await axios.post('http://localhost:3001/api/meals', mealData, {
      headers: {
        'Authorization': 'Bearer dummy-token-for-testing',
        'Content-Type': 'application/json'
      }
    });

    console.log('Success:', response.data);
  } catch (error) {
    console.error('Error details:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
  }
};

testMealCreation(); 