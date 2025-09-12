const axios = require('axios');

// Configuration
const BASE_URL = 'https://ticketnav-app.preview.emergentagent.com';

// Test user credentials (assuming we have a test agent)
const testAgent = {
  email: 'admin@example.com',
  password: 'admin123'
};

async function testMigration() {
  try {
    // 1. Login to get token
    console.log('Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth`, testAgent);
    const token = loginResponse.data.access_token;
    console.log('Login successful, token obtained');

    // 2. Run migration
    console.log('Running migration...');
    const migrationResponse = await axios.post(`${BASE_URL}/api/migrate-db`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Migration result:', migrationResponse.data);

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

// Run test
testMigration();