require('dotenv').config();
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';
const API_KEY = 'testcompany_abcdefghijklmnopqrstuvwxyz123456';

async function testMessagesByDay() {
  try {
    console.log('📅 Testing messages by day endpoint...\n');

    // Test different dates
    const dates = [
      '2024-12-25', // Today
      '2024-12-24', // Yesterday
      '2024-12-20', // Last week
    ];

    for (const date of dates) {
      console.log(`📅 Testing date: ${date}`);
      
      try {
        // Test 1: Get all messages for the day
        console.log('   🔍 Getting all messages...');
        const allMessagesResponse = await axios.get(`${API_BASE_URL}/messages/by-day`, {
          headers: {
            'x-api-key': API_KEY,
          },
          params: {
            date: date,
          },
        });

        console.log('   Status:', allMessagesResponse.data.status);
        console.log('   Message:', allMessagesResponse.data.message);
        
        if (allMessagesResponse.data.data) {
          const data = allMessagesResponse.data.data;
          console.log('   📊 Summary:');
          console.log(`      Company: ${data.companyName}`);
          console.log(`      Date: ${data.date}`);
          console.log(`      Total Messages: ${data.totalMessages}`);
          console.log('      Status Breakdown:');
          console.log(`         Pending: ${data.statusBreakdown.pending}`);
          console.log(`         Sent: ${data.statusBreakdown.sent}`);
          console.log(`         Delivered: ${data.statusBreakdown.delivered}`);
          console.log(`         Read: ${data.statusBreakdown.read}`);
          console.log(`         Failed: ${data.statusBreakdown.failed}`);

          if (data.messages.length > 0) {
            console.log('   📱 Sample Messages:');
            data.messages.slice(0, 3).forEach((message, index) => {
              console.log(`      ${index + 1}. ID: ${message.id}`);
              console.log(`         To: ${message.toPhoneNumber}`);
              console.log(`         Status: ${message.status}`);
              console.log(`         Template: ${message.templateName || 'Text Message'}`);
              console.log(`         Created: ${message.createdAt}`);
              if (message.pricing) {
                console.log(`         Pricing: ${JSON.stringify(message.pricing)}`);
              }
            });
          }
        }

        // Test 2: Get only failed messages
        console.log('\n   ❌ Getting failed messages only...');
        const failedMessagesResponse = await axios.get(`${API_BASE_URL}/messages/by-day`, {
          headers: {
            'x-api-key': API_KEY,
          },
          params: {
            date: date,
            status: 'failed',
          },
        });

        if (failedMessagesResponse.data.data) {
          console.log(`      Failed Messages: ${failedMessagesResponse.data.data.totalMessages}`);
        }

        // Test 3: Get only sent messages
        console.log('\n   ✅ Getting sent messages only...');
        const sentMessagesResponse = await axios.get(`${API_BASE_URL}/messages/by-day`, {
          headers: {
            'x-api-key': API_KEY,
          },
          params: {
            date: date,
            status: 'sent',
          },
        });

        if (sentMessagesResponse.data.data) {
          console.log(`      Sent Messages: ${sentMessagesResponse.data.data.totalMessages}`);
        }

      } catch (error) {
        console.log('   ❌ Error:', error.response?.data?.message || error.message);
      }
      
      console.log('\n' + '='.repeat(50) + '\n');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
  }
}

testMessagesByDay();
