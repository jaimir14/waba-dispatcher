require('dotenv').config();
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';
const API_KEY = 'testcompany_abcdefghijklmnopqrstuvwxyz123456';

async function testListMessage() {
  try {
    console.log('📋 Testing list message endpoint...\n');

    const listMessageData = {
      recipients: ['50683186803'],
      listName: 'Lotería Nacional',
      reporter: 'Juan Pérez',
      numbers: [
        { number: '01', amount: 250 },
        { number: '05', amount: 500 },
        { number: '06', amount: 100 },
        { number: '10', amount: 1450 },
        { number: '13', amount: 100 },
        { number: '16', amount: 250 },
      ],
    };

    console.log('📤 Sending list message...');
    console.log('   List Name:', listMessageData.listName);
    console.log('   Reporter:', listMessageData.reporter);
    console.log('   Recipients:', listMessageData.recipients.length);
    console.log('   Numbers:', listMessageData.numbers.length);

    const response = await axios.post(
      `${API_BASE_URL}/messages/send-list`,
      listMessageData,
      {
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('\n📥 Response:');
    console.log('   Status:', response.data.status);
    console.log('   Message:', response.data.message);
    console.log('   Total Amount: ₡', response.data.totalAmount);
    console.log('   Currency:', response.data.currency);

    if (response.data.results) {
      console.log('\n📊 Results:');
      response.data.results.forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.recipient}: ${result.status}`);
        if (result.messageId) {
          console.log(`      Message ID: ${result.messageId}`);
        }
        if (result.error) {
          console.log(`      Error: ${result.error}`);
        }
      });
    }

    console.log('\n📝 Expected Message Format:');
    console.log('*Lista: Lotería Nacional*');
    console.log('A nombre de: Juan Pérez');
    console.log('```');
    console.log('01 = ₡250');
    console.log('05 = ₡500');
    console.log('06 = ₡100');
    console.log('10 = ₡1,450');
    console.log('13 = ₡100');
    console.log('16 = ₡250');
    console.log('```');
    console.log('*Total: ₡2,650*');

  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
  }
}

testListMessage();
