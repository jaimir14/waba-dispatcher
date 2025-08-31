require('dotenv').config();
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';
const API_KEY = 'testcompany_abcdefghijklmnopqrstuvwxyz123456';

async function testEnhancedConversation() {
  try {
    console.log('🔄 Testing Enhanced Conversation Flow...\n');

    const testPhoneNumber = '50688776655';

    // Step 1: Start conversation with template
    console.log('📱 Step 1: Starting conversation with template...');
    try {
      const startResponse = await axios.post(
        `${API_BASE_URL}/conversations/start`,
        {
          to: testPhoneNumber,
          templateName: 'inicio_conversacion',
          parameters: ['Usuario'],
        },
        {
          headers: {
            'x-api-key': API_KEY,
          },
        },
      );

      console.log('   Status:', startResponse.data.status);
      console.log('   Message:', startResponse.data.message);
      if (startResponse.data.conversationId) {
        console.log('   Conversation ID:', startResponse.data.conversationId);
      }
    } catch (error) {
      console.log('   ❌ Error:', error.response?.data?.message || error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Step 2: Simulate user responding with "Si"
    console.log('✅ Step 2: Simulating user response "Si"...');
    try {
      const webhookResponse = await axios.post(
        `${API_BASE_URL}/webhook`,
        {
          object: 'whatsapp_business_account',
          entry: [
            {
              id: '123456789',
              changes: [
                {
                  value: {
                    messaging_product: 'whatsapp',
                    metadata: {
                      display_phone_number: '50688776655',
                      phone_number_id: '123456789',
                    },
                    contacts: [
                      {
                        profile: {
                          name: 'Test User',
                        },
                        wa_id: testPhoneNumber,
                      },
                    ],
                    messages: [
                      {
                        from: testPhoneNumber,
                        id: 'wamid.123',
                        timestamp: Math.floor(Date.now() / 1000),
                        type: 'text',
                        text: {
                          body: 'Si',
                        },
                      },
                    ],
                  },
                  field: 'messages',
                },
              ],
            },
          ],
        },
        {
          headers: {
            'x-hub-signature-256': 'sha256=test',
          },
        },
      );

      console.log('   Webhook Status:', webhookResponse.status);
    } catch (error) {
      console.log('   ❌ Webhook Error:', error.response?.data?.message || error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Step 3: Send a list message
    console.log('📋 Step 3: Sending list message...');
    try {
      const listResponse = await axios.post(
        `${API_BASE_URL}/messages/send-list`,
        {
          recipients: [testPhoneNumber],
          listName: 'Test List',
          reporter: 'Test Reporter',
          numbers: [
            { number: '01', amount: 250 },
            { number: '05', amount: 500 },
            { number: '10', amount: 1450 },
          ],
        },
        {
          headers: {
            'x-api-key': API_KEY,
          },
        },
      );

      console.log('   Status:', listResponse.data.status);
      console.log('   Message:', listResponse.data.message);
      console.log('   Results:', listResponse.data.results);
    } catch (error) {
      console.log('   ❌ Error:', error.response?.data?.message || error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Step 4: Simulate user responding with "Recibido"
    console.log('📥 Step 4: Simulating user response "Recibido"...');
    try {
      const webhookResponse = await axios.post(
        `${API_BASE_URL}/webhook`,
        {
          object: 'whatsapp_business_account',
          entry: [
            {
              id: '123456789',
              changes: [
                {
                  value: {
                    messaging_product: 'whatsapp',
                    metadata: {
                      display_phone_number: '50688776655',
                      phone_number_id: '123456789',
                    },
                    contacts: [
                      {
                        profile: {
                          name: 'Test User',
                        },
                        wa_id: testPhoneNumber,
                      },
                    ],
                    messages: [
                      {
                        from: testPhoneNumber,
                        id: 'wamid.124',
                        timestamp: Math.floor(Date.now() / 1000),
                        type: 'text',
                        text: {
                          body: 'Recibido',
                        },
                      },
                    ],
                  },
                  field: 'messages',
                },
              ],
            },
          ],
        },
        {
          headers: {
            'x-hub-signature-256': 'sha256=test',
          },
        },
      );

      console.log('   Webhook Status:', webhookResponse.status);
    } catch (error) {
      console.log('   ❌ Webhook Error:', error.response?.data?.message || error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Step 5: Check conversation status
    console.log('📊 Step 5: Checking conversation status...');
    try {
      const statusResponse = await axios.get(
        `${API_BASE_URL}/conversations/get`,
        {
          headers: {
            'x-api-key': API_KEY,
          },
          params: {
            phoneNumber: testPhoneNumber,
          },
        },
      );

      console.log('   Status:', statusResponse.data.status);
      if (statusResponse.data.conversation) {
        const conv = statusResponse.data.conversation;
        console.log('   Conversation Details:');
        console.log(`      Current Step: ${conv.currentStep}`);
        console.log(`      Is Active: ${conv.isActive}`);
        console.log(`      Last Message At: ${conv.lastMessageAt}`);
        console.log(`      Context: ${JSON.stringify(conv.context, null, 2)}`);
      }
    } catch (error) {
      console.log('   ❌ Error:', error.response?.data?.message || error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Step 6: Test session expiration check
    console.log('⏰ Step 6: Testing session expiration check...');
    try {
      const startResponse = await axios.post(
        `${API_BASE_URL}/conversations/start`,
        {
          to: testPhoneNumber,
          templateName: 'inicio_conversacion',
          parameters: ['Usuario'],
        },
        {
          headers: {
            'x-api-key': API_KEY,
          },
        },
      );

      console.log('   Status:', startResponse.data.status);
      console.log('   Message:', startResponse.data.message);
      if (startResponse.data.status === 'skipped') {
        console.log('   ✅ Session not expiring soon - correctly skipped!');
      }
    } catch (error) {
      console.log('   ❌ Error:', error.response?.data?.message || error.message);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
  }
}

testEnhancedConversation();
