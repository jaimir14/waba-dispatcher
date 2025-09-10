require('dotenv').config();
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';
const API_KEY = 'testcompany_abcdefghijklmnopqrstuvwxyz123456';

async function testConversationExpiryCron() {
  try {
    console.log('🕐 Testing Conversation Expiry Cron Job...\n');

    // Test manual trigger of expiry check
    console.log('📅 Step 1: Manually triggering conversation expiry check...');
    try {
      const expiryResponse = await axios.post(
        `${API_BASE_URL}/conversations/trigger-expiry-check`,
        {},
        {
          headers: {
            'x-api-key': API_KEY,
          },
        },
      );

      console.log('   ✅ Status:', expiryResponse.data.status);
      console.log('   📝 Message:', expiryResponse.data.message);
    } catch (error) {
      console.log(
        '   ❌ Error:',
        error.response?.data?.message || error.message,
      );
      console.log('   📊 Status Code:', error.response?.status || 'N/A');

      if (error.response?.data) {
        console.log(
          '   🔍 Response Data:',
          JSON.stringify(error.response.data, null, 2),
        );
      }
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test WhatsApp conversation window status check
    console.log(
      '📞 Step 2: Testing WhatsApp conversation window status check...',
    );
    try {
      const testPhoneNumber = '50688776655'; // Example phone number
      const windowResponse = await axios.post(
        `${API_BASE_URL}/conversations/test-window-status`,
        {
          phoneNumber: testPhoneNumber,
          companyName: 'testcompany',
        },
        {
          headers: {
            'x-api-key': API_KEY,
          },
        },
      );

      console.log('   ✅ Status:', windowResponse.data.status);
      console.log('   🔄 Is Active:', windowResponse.data.isActive);
      console.log(
        '   💬 Can Send Message:',
        windowResponse.data.canSendMessage,
      );
      console.log('   📝 Message:', windowResponse.data.message);
    } catch (error) {
      console.log(
        '   ❌ Error:',
        error.response?.data?.message || error.message,
      );
      console.log('   📊 Status Code:', error.response?.status || 'N/A');

      if (error.response?.data) {
        console.log(
          '   🔍 Response Data:',
          JSON.stringify(error.response.data, null, 2),
        );
      }
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Additional info
    console.log('ℹ️  Additional Information:');
    console.log('   🕘 Cron Schedule: Every day at 8:00 AM (0 8 * * *)');
    console.log('   🌍 Timezone: America/Mexico_City');
    console.log('   📋 Logic:');
    console.log(
      '      - Finds conversations expiring today or expired yesterday',
    );
    console.log('      - Excludes conversations expired more than 2 days ago');
    console.log(
      '      - Checks if WhatsApp conversation window is still active via API',
    );
    console.log(
      '      - Sends inicio_conversacion template if window is inactive',
    );
    console.log(
      '   🔧 Manual Trigger: POST /conversations/trigger-expiry-check',
    );
    console.log(
      '   🧪 Test Window Status: POST /conversations/test-window-status',
    );
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error('🔍 Response:', error.response.data);
    }
  }
}

// Run the test
console.log('🚀 Starting conversation expiry cron test...\n');
testConversationExpiryCron()
  .then(() => {
    console.log('\n✅ Test completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  });
