require('dotenv').config();
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';
const API_KEY = 'testcompany_abcdefghijklmnopqrstuvwxyz123456';

async function testReventados() {
  try {
    console.log('🎲 Testing reventados list message...\n');

    const reventadosData = {
      recipients: ['50683186803'],
      listName: 'Lunes',
      reporter: 'Carlos López',
      numbers: [
        { number: '00', amount: 200, reventadoAmount: 100 },
        { number: '02', amount: 150, reventadoAmount: 150 },
        { number: '03', amount: 150, reventadoAmount: 150 },
        { number: '04', amount: 150, reventadoAmount: 150 },
        { number: '05', amount: 800, reventadoAmount: 700 },
        { number: '06', amount: 300, reventadoAmount: 300 },
        { number: '09', amount: 200, reventadoAmount: 200 },
        { number: '10', amount: 2150, reventadoAmount: 1800 },
        { number: '11', amount: 600, reventadoAmount: 600 },
        { number: '12', amount: 450, reventadoAmount: 450 },
        { number: '13', amount: 200, reventadoAmount: 200 },
        { number: '15', amount: 300, reventadoAmount: 300 },
        { number: '18', amount: 150, reventadoAmount: 150 },
        { number: '19', amount: 4600, reventadoAmount: 2400 },
        { number: '20', amount: 350, reventadoAmount: 250 },
        { number: '21', amount: 700, reventadoAmount: 700 },
        { number: '22', amount: 800, reventadoAmount: 800 },
        { number: '23', amount: 350, reventadoAmount: 350 },
        { number: '24', amount: 1250, reventadoAmount: 1050 },
        { number: '26', amount: 300, reventadoAmount: 300 },
        { number: '27', amount: 800, reventadoAmount: 800 },
        { number: '28', amount: 100, reventadoAmount: 100 },
        { number: '29', amount: 2200, reventadoAmount: 2100 },
        { number: '32', amount: 500, reventadoAmount: 500 },
        { number: '33', amount: 250, reventadoAmount: 250 },
        { number: '40', amount: 150, reventadoAmount: 150 },
        { number: '42', amount: 450, reventadoAmount: 350 },
        { number: '49', amount: 200, reventadoAmount: 200 },
        { number: '50', amount: 200, reventadoAmount: 200 },
        { number: '55', amount: 1000, reventadoAmount: 800 },
        { number: '60', amount: 600, reventadoAmount: 600 },
        { number: '62', amount: 300, reventadoAmount: 300 },
        { number: '63', amount: 500, reventadoAmount: 500 },
        { number: '65', amount: 100, reventadoAmount: 100 },
        { number: '69', amount: 150, reventadoAmount: 150 },
        { number: '75', amount: 700, reventadoAmount: 600 },
        { number: '89', amount: 100, reventadoAmount: 100 },
        { number: '91', amount: 300, reventadoAmount: 200 },
        { number: '98', amount: 100, reventadoAmount: 100 },
        { number: '99', amount: 700, reventadoAmount: 700 },
      ],
    };

    console.log('📤 Sending reventados list message...');
    console.log('   List Name:', reventadosData.listName);
    console.log('   Reporter:', reventadosData.reporter);
    console.log('   Recipients:', reventadosData.recipients.length);
    console.log('   Numbers:', reventadosData.numbers.length);

    const response = await axios.post(
      `${API_BASE_URL}/messages/send-list`,
      reventadosData,
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
    console.log('   Is Reventados:', response.data.isReventados);
    console.log('   Normal Total: ₡', response.data.normalTotal);
    console.log('   Reventados Total: ₡', response.data.reventadosTotal);
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
    console.log('*Lista: Reventado día Lunes*');
    console.log('A nombre de: Carlos López');
    console.log('');
    console.log('```');
    console.log('⁠ 00 = ₡200, R = ₡100, ⁠');
    console.log('⁠ 02 = ₡150, R = ₡150, ⁠');
    console.log('⁠ 03 = ₡150, R = ₡150, ⁠');
    console.log('⁠ 04 = ₡150, R = ₡150, ⁠');
    console.log('⁠ 05 = ₡800, R = ₡700, ⁠');
    console.log('⁠ 06 = ₡300, R = ₡300, ⁠');
    console.log('⁠ 09 = ₡200, R = ₡200, ⁠');
    console.log('⁠ 10 = ₡2,150, R = ₡1,800, ⁠');
    console.log('⁠ 11 = ₡600, R = ₡600, ⁠');
    console.log('⁠ 12 = ₡450, R = ₡450, ⁠');
    console.log('⁠ 13 = ₡200, R = ₡200, ⁠');
    console.log('⁠ 15 = ₡300, R = ₡300, ⁠');
    console.log('⁠ 18 = ₡150, R = ₡150, ⁠');
    console.log('⁠ 19 = ₡4,600, R = ₡2,400, ⁠');
    console.log('⁠ 20 = ₡350, R = ₡250, ⁠');
    console.log('⁠ 21 = ₡700, R = ₡700, ⁠');
    console.log('⁠ 22 = ₡800, R = ₡800, ⁠');
    console.log('⁠ 23 = ₡350, R = ₡350, ⁠');
    console.log('⁠ 24 = ₡1,250, R = ₡1,050, ⁠');
    console.log('⁠ 26 = ₡300, R = ₡300, ⁠');
    console.log('⁠ 27 = ₡800, R = ₡800, ⁠');
    console.log('⁠ 28 = ₡100, R = ₡100, ⁠');
    console.log('⁠ 29 = ₡2,200, R = ₡2,100, ⁠');
    console.log('⁠ 32 = ₡500, R = ₡500, ⁠');
    console.log('⁠ 33 = ₡250, R = ₡250, ⁠');
    console.log('⁠ 40 = ₡150, R = ₡150, ⁠');
    console.log('⁠ 42 = ₡450, R = ₡350, ⁠');
    console.log('⁠ 49 = ₡200, R = ₡200, ⁠');
    console.log('⁠ 50 = ₡200, R = ₡200, ⁠');
    console.log('⁠ 55 = ₡1,000, R = ₡800, ⁠');
    console.log('⁠ 60 = ₡600, R = ₡600, ⁠');
    console.log('⁠ 62 = ₡300, R = ₡300, ⁠');
    console.log('⁠ 63 = ₡500, R = ₡500, ⁠');
    console.log('⁠ 65 = ₡100, R = ₡100, ⁠');
    console.log('⁠ 69 = ₡150, R = ₡150, ⁠');
    console.log('⁠ 75 = ₡700, R = ₡600, ⁠');
    console.log('⁠ 89 = ₡100, R = ₡100, ⁠');
    console.log('⁠ 91 = ₡300, R = ₡200, ⁠');
    console.log('⁠ 98 = ₡100, R = ₡100, ⁠');
    console.log('⁠ 99 = ₡700, R = ₡700, ⁠');
    console.log('```');
    console.log('');
    console.log('Normal: ₡23,550');
    console.log('Reventados: ₡19,900');
    console.log('');
    console.log('Total: ₡43,450');

  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
  }
}

testReventados();
