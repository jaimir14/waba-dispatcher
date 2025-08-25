require('dotenv').config();
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';
const API_KEY = 'testcompany_abcdefghijklmnopqrstuvwxyz123456';

async function testMessageStats() {
  try {
    console.log('📊 Testing message statistics by month...\n');

    // Test different months
    const months = [
      '2024-01',
      '2024-02',
      '2024-03',
      '2024-12', // Current month
    ];

    for (const month of months) {
      console.log(`📅 Testing month: ${month}`);

      try {
        const response = await axios.get(
          `${API_BASE_URL}/message-stats/by-month`,
          {
            headers: {
              'x-api-key': API_KEY,
            },
            params: {
              month: month,
            },
          },
        );

        console.log('   Status:', response.data.status);
        console.log('   Message:', response.data.message);

        if (response.data.data) {
          const data = response.data.data;
          console.log('   📈 Statistics:');
          console.log(`      Company: ${data.companyName}`);
          console.log(`      Month: ${data.month}`);
          console.log(`      Total Messages: ${data.totalMessages}`);
          console.log(`      Total Cost: $${data.totalCost} ${data.currency}`);
          console.log('      📱 Message Breakdown:');
          console.log(`         Sent: ${data.messageBreakdown.sent}`);
          console.log(`         Delivered: ${data.messageBreakdown.delivered}`);
          console.log(`         Read: ${data.messageBreakdown.read}`);
          console.log(`         Failed: ${data.messageBreakdown.failed}`);
          console.log('      💰 Cost Breakdown:');
          console.log(`         Sent: $${data.costBreakdown.sent}`);
          console.log(`         Delivered: $${data.costBreakdown.delivered}`);
          console.log(`         Read: $${data.costBreakdown.read}`);
          console.log(`         Failed: $${data.costBreakdown.failed}`);
        }
      } catch (error) {
        console.log(
          '   ❌ Error:',
          error.response?.data?.message || error.message,
        );
      }

      console.log(''); // Empty line for readability
    }
  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
  }
}

testMessageStats();
