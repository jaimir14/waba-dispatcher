require('dotenv').config();
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';
const API_KEY = 'testcompany_abcdefghijklmnopqrstuvwxyz123456';

async function testPricing() {
  try {
    console.log('💰 Testing pricing capture...\n');

    // Test 1: Send a template message and check if pricing is captured
    console.log('1️⃣ Sending template message...');
    const sendResponse = await axios.post(
      `${API_BASE_URL}/conversations/start`,
      {
        to: '50688776655',
        templateName: 'inicio_conversacion',
        parameters: ['Usuario'],
      },
      {
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('   Send Response:', sendResponse.data);

    // Test 2: Check message stats to see if pricing is captured
    console.log('\n2️⃣ Checking message stats...');
    const statsResponse = await axios.get(`${API_BASE_URL}/message-stats/by-month`, {
      headers: {
        'x-api-key': API_KEY,
      },
      params: {
        month: '2024-12', // Current month
      },
    });

    console.log('   Stats Response:', statsResponse.data);

    // Test 3: Check database directly (if possible)
    console.log('\n3️⃣ Why pricing might be 0:');
    console.log('   - WhatsApp API might not include pricing in initial response');
    console.log('   - Pricing comes from webhook status updates (sent, delivered, read)');
    console.log('   - Need to wait for webhook callbacks to get actual pricing');
    console.log('   - Failed messages have 0 cost by default');

  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
  }
}

testPricing();
